import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Download, ArrowLeft } from "lucide-react";
import { generateFormPdf, downloadPdf } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";

interface SuccessProps {
  isModal?: boolean;
  onClose?: () => void;
}

export default function Success({ isModal = false, onClose }: SuccessProps) {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  
  // In a real application, you would fetch the submitted form data
  // from the API using the submissionId
  useEffect(() => {
    // Retrieve actual form data from local storage
    const storedFormData = localStorage.getItem('lastSubmittedForm');
    if (storedFormData) {
      try {
        setFormData(JSON.parse(storedFormData));
      } catch (e) {
        console.error("Failed to parse stored form data");
      }
    }
  }, [submissionId]);
  
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    
    try {
      if (!formData) {
        throw new Error("No form data available for PDF generation");
      }
      
      // Debug log to check formData.sections structure
      console.log("formData.sections:", formData.sections);
      
      // Sanitize formData.sections to ensure fields is iterable
      const sanitizedSections = (formData.sections || []).map((section: any) => ({
        ...section,
        fields: Array.isArray(section.fields) ? section.fields : []
      }));

      const pdfBytes = await generateFormPdf("Completed Form", sanitizedSections);
      downloadPdf(pdfBytes, "completed-form.pdf");
      
      toast({
        title: "PDF Generated",
        description: "Your form has been successfully downloaded as a PDF."
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const resetForm = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };
  
  return (
    <main className={isModal ? "p-4" : "flex-grow container mx-auto px-4 py-8 md:px-8"}>
      <div className={isModal ? "max-w-md mx-auto" : "max-w-lg mx-auto"}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden shadow-md">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-12 w-12 text-success" />
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Form Submitted Successfully</h2>
              
              <p className="text-gray-600 mb-8">
                Your form has been completed and submitted successfully. You can download a copy for your records.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="flex items-center justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Fill Another Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
