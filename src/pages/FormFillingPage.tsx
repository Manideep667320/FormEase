import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserProfile from '../components/UserProfile';
import { ArrowLeft, ChevronDown, Check, Download, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import VoiceAssistant from '../components/VoiceAssistant';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { generateFormPdf, downloadPdf } from '../lib/pdf-generator';
import type { FormSectionWithFields } from '../lib/firebaseService';

interface FormSection {
  id: number;
  title: string;
  isOpen: boolean;
}

interface FormField {
  label: string;
  name: string;
  type: string;
  options?: string[];
  fields?: FormField[];
}

type FormStructure = {
  [section: string]: FormField[];
};

type FieldStatus = 'proposed' | 'confirmed';

interface LocalFormSectionWithFields {
  id: number;
  title: string;
  fields: {
    id: string;
    sectionId: string;
    fieldKey: string;
    label: string;
    value?: string;
    required: boolean;
    type: string;
    options?: string[];
  }[];
}

import Success from './Succes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

const FormFillingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { formType } = useParams();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const navigate = useNavigate();

  const [formStructure, setFormStructure] = useState<FormStructure>({});
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({});
  const [sections, setSections] = useState<FormSection[]>([]);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getFormTitle = () => {
    switch (formType) {
      case 'passport':
        return 'Passport Application Form';
      case 'aadhaar':
        return 'Aadhaar Card Application Form';
      case 'voter id':
        return 'Voter ID Application Form';
      case 'custom':
        return 'Custom Application Form';
      default:
        return 'Application Form';
    }
  };

  const toggleSection = (id: number) => {
    setSections(sections.map(section =>
      section.id === id ? { ...section, isOpen: !section.isOpen } : section
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Manual user input is immediately marked as confirmed
    setFieldStatuses(prev => ({
      ...prev,
      [name]: 'confirmed'
    }));
  };

  // Confirm single field proposed by assistant
  const confirmField = (name: string) => {
    setFieldStatuses(prev => ({
      ...prev,
      [name]: 'confirmed'
    }));
    toast({
      title: 'Field Confirmed',
      description: `Marked ${name.replace(/_/g, ' ')} as user-verified.`,
      duration: 1500
    });
  };

  // Confirm all proposed fields in one click
  const confirmAllFields = () => {
    const updated: Record<string, FieldStatus> = {};
    Object.keys(formData).forEach(k => {
      if (formData[k]) updated[k] = 'confirmed';
    });
    setFieldStatuses(prev => ({ ...prev, ...updated }));
    toast({
      title: 'All Fields Confirmed',
      description: 'All populated fields marked as confirmed.',
      duration: 2000
    });
  };

  // Helper function to recursively transform fields and subfields
  const transformFields = (fields: any[]): FormField[] => {
    return fields.flatMap((field) => {
      if (field.subsection) {
        const subsectionFields = transformFields(field.fields || []);
        return [{
          label: field.subsection,
          name: field.subsection.replace(/\s+/g, '_').toLowerCase(),
          type: 'subsection',
          fields: subsectionFields
        }];
      } else if (field.section) {
        const subsectionFields = transformFields(field.fields || []);
        return [{
          label: field.section,
          name: field.section.replace(/\s+/g, '_').toLowerCase(),
          type: 'subsection',
          fields: subsectionFields
        }];
      } else {
        const transformedField: FormField = {
          label: field.field_name,
          name: field.field_name.replace(/\s+/g, '_').toLowerCase(),
          type: field.type || 'text',
        };
        if (field.options) {
          transformedField.options = field.options;
        }
        if (field.fields) {
          transformedField.fields = transformFields(field.fields);
        }
        return [transformedField];
      }
    });
  };

  // Load form JSON structure
  useEffect(() => {
    const loadFormStructure = async () => {
      try {
        let normalizedFormType = formType;
        if (formType === 'aadhaar') normalizedFormType = 'aadhar';
        if (formType === 'voter id') normalizedFormType = 'voterid';
        if (formType === 'passport') normalizedFormType = 'passport';

        const file = await import(`../data/${normalizedFormType}Form.json`);
        const structure = file.default;

        let newSections: FormSection[] = [];
        const transformedStructure: FormStructure = {};

        if (Array.isArray(structure.form_fields) && structure.form_fields.length > 0 && structure.form_fields[0].section) {
          newSections = structure.form_fields.map((section: any, idx: number) => ({
            id: idx + 1,
            title: section.section,
            isOpen: idx === 0
          }));

          for (const section of structure.form_fields) {
            transformedStructure[section.section] = transformFields(section.fields);
          }
        } else if (Array.isArray(structure.form_fields)) {
          newSections = [{
            id: 1,
            title: 'Form',
            isOpen: true
          }];
          transformedStructure['Form'] = transformFields(structure.form_fields);
        } else {
          newSections = Object.keys(structure).map((title, idx) => ({
            id: idx + 1,
            title,
            isOpen: idx === 0
          }));

          for (const sectionTitle of Object.keys(structure)) {
            const rawFields = structure[sectionTitle].form_fields || structure[sectionTitle];
            transformedStructure[sectionTitle] = transformFields(rawFields);
          }
        }

        setSections(newSections);
        setFormStructure(transformedStructure);
      } catch (error) {
        console.error('Error loading form JSON:', error);
      }
    };

    loadFormStructure();
  }, [formType]);

  // Load draft data if draftId is provided in URL
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId || !currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await apiRequest<any>({
          url: `/api/drafts/${draftId}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res && res.data) {
          setFormData(res.data);
          const initialStatuses: Record<string, FieldStatus> = {};
          Object.keys(res.data).forEach(k => {
            if (res.data[k]) initialStatuses[k] = 'confirmed';
          });
          setFieldStatuses(initialStatuses);
          toast({
            title: 'Draft loaded',
            description: `Loaded saved draft: ${res.name || 'Draft'}`
          });
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    };
    loadDraft();
  }, [draftId, currentUser, toast]);

  // Helper to render field status badge
  const renderFieldStatusBadge = (fieldName: string) => {
    if (!formData[fieldName]) return null;
    const status = fieldStatuses[fieldName] || 'proposed';

    if (status === 'proposed') {
      return (
        <span className="inline-flex items-center ml-2">
          <span className="inline-flex items-center text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
            Proposed by AI
            <button
              type="button"
              onClick={() => confirmField(fieldName)}
              className="ml-1.5 px-1 py-0.2 bg-amber-200/90 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold transition-colors"
              title="Click to confirm this extracted value"
            >
              ✓ Confirm
            </button>
          </span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center ml-2">
        <span className="inline-flex items-center text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600 mr-1" />
          Confirmed
        </span>
      </span>
    );
  };

  // Recursive rendering of fields with status badges
  const renderFields = (fields: FormField[]) => {
    return fields.map((field, idx) => {
      if (field.type === 'subsection' && field.fields && field.fields.length > 0) {
        return (
          <Collapsible key={idx} defaultOpen={true} className="mb-6 pl-4 border-l-4 border-primary rounded-md">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center p-2 bg-primary/10 rounded-md cursor-pointer select-none">
                <h3 className="text-lg font-semibold">{field.label}</h3>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="bg-white p-4 rounded-b-md border-t border-primary/50">
              {renderFields(field.fields)}
            </CollapsibleContent>
          </Collapsible>
        );
      } else if (field.type === 'radio' && field.options && field.options.length > 0) {
        return (
          <div key={idx} className="mb-4 p-2.5 rounded-md hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center mb-1">
              <label className="text-sm font-medium text-slate-800">
                {field.label}
              </label>
              {renderFieldStatusBadge(field.name)}
            </div>
            <div className="flex flex-col space-y-1 mt-1">
              {field.options.map((option, optionIdx) => (
                <label key={optionIdx} className="inline-flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name={field.name}
                    value={option}
                    checked={formData[field.name] === option}
                    onChange={handleInputChange}
                    className="form-radio text-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {field.fields && field.fields.length > 0 && (
              <div className="pl-4 border-l border-gray-300 mt-2">
                {renderFields(field.fields)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div key={idx} className="mb-4 p-2.5 rounded-md hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center mb-1">
              <label className="text-sm font-medium text-slate-800" htmlFor={field.name}>
                {field.label}
              </label>
              {renderFieldStatusBadge(field.name)}
            </div>
            <input
              type={field.type}
              name={field.name}
              id={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
            {field.fields && field.fields.length > 0 && (
              <div className="pl-4 border-l border-gray-300 mt-2">
                {renderFields(field.fields)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  // Memoized transform of formStructure and sections to VoiceAssistant format
  const voiceAssistantSections = useMemo<LocalFormSectionWithFields[]>(() => {
    return sections.map(section => {
      const fields = formStructure[section.title] || [];
      const transformField = (field: FormField): LocalFormSectionWithFields['fields'][number] => {
        return {
          id: `${section.id}-${field.name}`,
          sectionId: section.id.toString(),
          fieldKey: field.name,
          label: field.label,
          value: formData[field.name] || '',
          required: true,
          type: field.type,
          options: field.options,
        };
      };

      return {
        id: section.id,
        title: section.title,
        fields: fields.map(transformField)
      };
    });
  }, [sections, formStructure, formData]);

  // Handler for field updates from VoiceAssistant
  const onFieldUpdate = (_sectionId: number, fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    // Fields populated by assistant are tagged as 'proposed' until user confirms
    setFieldStatuses(prev => ({
      ...prev,
      [fieldKey]: 'proposed'
    }));
  };

  // Save Draft function
  const saveDraft = async () => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save a draft.',
        variant: 'destructive',
      });
      return;
    }

    const defaultDraftName = `Draft - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const draftName = prompt('Enter a name for your draft:', defaultDraftName);
    if (!draftName) return;

    try {
      const token = await currentUser.getIdToken();
      const draftPayload = {
        id: draftId || undefined,
        formTypeId: formType || 'passport',
        name: draftName.trim(),
        data: formData,
      };

      const res = await apiRequest<{ message: string; draft: any }>({
        url: draftId ? `/api/drafts/${draftId}` : '/api/drafts',
        method: draftId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: draftPayload,
      });

      if (!draftId && res?.draft?.id) {
        navigate(`/form/${formType}?draftId=${res.draft.id}`, { replace: true });
      }

      toast({
        title: 'Draft Saved',
        description: 'Your progress has been saved successfully in Neon Database.',
      });
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.error || 'Failed to save draft.';
      toast({
        title: 'Error Saving Draft',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Preparation PDF Download Handler
  const handleDownloadPreparationPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const sectionsForPdf: FormSectionWithFields[] = sections.map(section => ({
        id: String(section.id),
        formTypeId: formType || 'passport',
        title: section.title,
        order: section.id,
        fields: (formStructure[section.title] || []).map((field, idx) => {
          const val = formData[field.name];
          const st = fieldStatuses[field.name] || 'confirmed';
          return {
            id: String(idx + 1),
            sectionId: String(section.id),
            fieldKey: field.name,
            label: field.label,
            type: field.type,
            required: true,
            order: idx + 1,
            value: val ? `${val} [${st.toUpperCase()}]` : ''
          };
        })
      }));

      const pdfBytes = await generateFormPdf(`FormEase - ${getFormTitle()}`, sectionsForPdf);
      downloadPdf(pdfBytes, `${(formType || 'form').toLowerCase()}-preparation-draft.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Official preparation draft PDF downloaded successfully.'
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast({
        title: 'PDF Generation Failed',
        description: err.message || 'Could not generate PDF.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Open review modal
  const onFormSubmit = () => {
    setShowReviewModal(true);
  };

  // Finalize Submission
  const onFinalizeSubmission = async () => {
    const sectionsWithFields = sections.map(section => ({
      ...section,
      fields: (formStructure[section.title] || []).map(field => ({
        label: field.label,
        required: true,
        value: formData[field.name] || ''
      }))
    }));

    const formToSave = {
      formData,
      formStructure,
      sections: sectionsWithFields
    };
    localStorage.setItem('lastSubmittedForm', JSON.stringify(formToSave));

    // If authenticated, record in Neon PostgreSQL form_submissions
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        await apiRequest({
          url: '/api/submissions',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: {
            formId: formType || 'passport',
            formData
          }
        }).catch(() => {});
      } catch (_) {}
    }

    setShowReviewModal(false);
    setShowSuccessPopup(true);
  };

  // Summary Metrics
  const totalPopulated = Object.values(formData).filter(Boolean).length;
  const totalConfirmed = Object.keys(formData).filter(k => formData[k] && fieldStatuses[k] === 'confirmed').length;
  const totalProposed = Object.keys(formData).filter(k => formData[k] && fieldStatuses[k] === 'proposed').length;

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 -z-10 opacity-50" />
      <div className="absolute top-20 right-10 h-64 w-64 rounded-full bg-primary/5 -z-10" />
      <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-secondary/5 -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between p-6 bg-transparent">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full" style={{ backgroundImage: "url('/logo.jpeg')", backgroundSize: 'cover' }} />
          <span className="font-bold text-xl">FormEase</span>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser ? <UserProfile /> : (
            <Button className="bg-accent hover:bg-accent/90 text-white" onClick={() => setShowLoginModal(true)}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Form Title & Breadcrumb */}
      <div className="bg-secondary/10 p-4 border-b border-border/40">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          <Link to="/main" className="flex items-center text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <h1 className="text-2xl font-bold">{`Fill ${getFormTitle()}`}</h1>
          </Link>
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full bg-background border border-border/80 font-medium">
              Filled: <strong className="text-foreground">{totalPopulated}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              Confirmed: <strong>{totalConfirmed}</strong>
            </span>
            {totalProposed > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium animate-pulse">
                Proposed: <strong>{totalProposed}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form Preview */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-md rounded-lg border-border/60">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between mb-4 pb-2 border-b">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Form Preparation Sections</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Type values directly or use the conversational voice assistant on the right.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPreparationPdf}
                      disabled={isGeneratingPdf || totalPopulated === 0}
                      className="text-xs h-8"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isGeneratingPdf ? 'Generating...' : 'Prep PDF'}
                    </Button>
                  </div>
                </div>

                {/* Proposed Fields Banner */}
                {totalProposed > 0 && (
                  <div className="flex flex-wrap items-center justify-between p-3 mb-5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-sm gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                      <span>
                        <strong>{totalProposed}</strong> field{totalProposed > 1 ? 's were' : ' was'} extracted by the assistant. Please review & confirm before generating documents.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={confirmAllFields}
                      className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold h-7"
                    >
                      ✓ Confirm All Proposed
                    </Button>
                  </div>
                )}

                {totalPopulated > 0 && totalProposed === 0 && (
                  <div className="flex items-center p-2.5 mb-5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                    All {totalConfirmed} populated fields are user-verified and ready for submission review.
                  </div>
                )}

                {/* Sections Accordions */}
                {sections.map((section) => (
                  <Collapsible key={section.id} open={section.isOpen} onOpenChange={() => toggleSection(section.id)} className="mb-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center p-3.5 bg-secondary/10 hover:bg-secondary/15 rounded-lg transition-colors">
                        <div className="h-6 w-6 rounded-full bg-accent/20 text-accent mr-3 flex items-center justify-center text-xs font-bold">
                          {section.id}
                        </div>
                        <span className="font-semibold text-slate-800 text-sm sm:text-base">{section.title}</span>
                        <ChevronDown className={`ml-auto h-5 w-5 text-slate-500 transition-transform ${section.isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="bg-white p-4 rounded-b-lg border-x border-b border-secondary/20">
                      {renderFields(formStructure[section.title] || [])}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t">
                  <Button variant="outline" onClick={() => navigate('/main')}>
                    Back
                  </Button>
                  <div className="flex items-center space-x-3">
                    <Button variant="secondary" onClick={saveDraft}>
                      Save Draft
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white" onClick={onFormSubmit}>
                      Review & Submit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voice Assistant Panel */}
          <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
            <VoiceAssistant
              formCode={formType ? (formType === 'aadhaar' ? 'aadhaar' : formType === 'voter id' ? 'default' : formType) : ''}
              formSections={voiceAssistantSections}
              onFieldUpdate={onFieldUpdate}
              onFormSubmit={onFormSubmit}
            />
          </div>
        </div>
      </main>

      {/* Review & Pre-Flight Confirmation Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Review {getFormTitle()} Preparation
            </DialogTitle>
            <DialogDescription>
              Carefully verify your details before downloading your preparation copy or finalizing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border text-center">
              <div>
                <span className="text-xs text-muted-foreground block">Total Populated</span>
                <span className="text-lg font-bold text-slate-800">{totalPopulated}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Confirmed</span>
                <span className="text-lg font-bold text-emerald-700">{totalConfirmed}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Proposed by AI</span>
                <span className={`text-lg font-bold ${totalProposed > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{totalProposed}</span>
              </div>
            </div>

            {/* Preparation Disclaimer */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Application Preparation Notice:</strong> FormEase generates a verified preparation draft to help you navigate official forms without mistakes. Please transfer these verified fields to the official portal (e.g. <em>passportindia.gov.in</em> or <em>uidai.gov.in</em>).
              </span>
            </div>

            {/* Section Breakdown Review */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {sections.map(section => {
                const sectionFields = formStructure[section.title] || [];
                const populatedFields = sectionFields.filter(f => formData[f.name]);

                return (
                  <div key={section.id} className="border rounded-md p-3 bg-white">
                    <h4 className="font-semibold text-sm text-slate-900 mb-2 pb-1 border-b flex justify-between">
                      <span>{section.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {populatedFields.length} of {sectionFields.length} filled
                      </span>
                    </h4>
                    {populatedFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No fields filled in this section yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {populatedFields.map(f => (
                          <div key={f.name} className="p-1.5 rounded bg-slate-50 border flex justify-between items-start">
                            <span className="text-muted-foreground mr-2 font-medium">{f.label}:</span>
                            <span className="font-semibold text-slate-800 text-right truncate max-w-[50%]">
                              {formData[f.name]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Back to Edit
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleDownloadPreparationPdf}
                disabled={isGeneratingPdf || totalPopulated === 0}
                className="text-xs border-primary/40 text-primary hover:bg-primary/5"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {isGeneratingPdf ? 'Generating PDF...' : 'Download Preparation PDF'}
              </Button>
              <Button onClick={onFinalizeSubmission} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Finalize & Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent>
          <Success isModal onClose={() => setShowSuccessPopup(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormFillingPage;
