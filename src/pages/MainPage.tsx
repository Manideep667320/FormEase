import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import UserProfile from '../components/UserProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { LoginForm } from '../components/LoginForm';
import { useNavigate } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Github, Plus, Sparkles, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import DraftManager from '../components/DraftManager';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div
                className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"
                style={{
                  backgroundImage: "url('/logo.jpeg')",
                  backgroundSize: 'cover',
                }}
              />
              <span className="font-bold text-xl">FormEase</span>
            </div>
            <p className="text-gray-400 mb-4">
              Revolutionizing form filling with powerful voice recognition technology.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Github size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-400 hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  API
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Integrations
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 py-6 text-gray-400 text-sm text-center">
          <p>&copy; {currentYear} FormEase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const MainPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFormName, setCustomFormName] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchToken = async () => {
      if (currentUser && 'getIdToken' in currentUser) {
        const token = await currentUser.getIdToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
    };
    fetchToken();
  }, [currentUser]);

  const forms = [
    {
      id: 'passport',
      title: 'Passport Application',
      category: 'Travel & Identity',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Apply for fresh passport, reissue, or renewal with automated voice guidance.',
      imageSrc: '/form-logo.png',
    },
    {
      id: 'aadhaar',
      title: 'Aadhaar Card',
      category: 'National ID',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Update demographic particulars, address corrections, or enrollment information.',
      imageSrc: '/form-logo1.jpg',
    },
    {
      id: 'voter id',
      title: 'Voter ID (EPIC)',
      category: 'Elections & Civic',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'New voter registration (Form 6), constituency shift, or EPIC details update.',
      imageSrc: '/form-logo2.png',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSelectForm = (formId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    navigate(`/form/${formId}`);
  };

  const handleStartCustomForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setShowCustomModal(false);
    navigate('/form/custom');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="flex items-center justify-between p-6 shadow-sm bg-white/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border border-primary/20"
              style={{ backgroundImage: `url('/logo.jpeg')`, backgroundSize: 'cover' }}
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{
                backgroundImage: "url('/logo.jpeg')",
                backgroundSize: 'cover',
              }}
            />
          )}
          <h1 className="text-xl font-bold text-primary">FormEase</h1>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <UserProfile />
          ) : (
            <Button className="bg-accent hover:bg-accent/90 text-white" onClick={() => setShowLoginModal(true)}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-gradient">
          Complete Government Forms with Voice
        </h2>
        <p className="text-foreground/80 max-w-2xl mb-10">
          Our AI assistant helps you fill out complex forms using just your voice. No typing required - simply talk to our assistant.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
          {forms.map((form, index) => (
            <Card
              key={index}
              className="group relative h-full rounded-2xl p-6 bg-white/90 backdrop-blur-md border border-slate-200/90 hover:border-primary/50 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden text-center cursor-pointer"
              onClick={() => handleSelectForm(form.id)}
            >
              {/* Top ambient accent glow on hover */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardContent className="flex flex-col items-center flex-grow p-0 pt-2">
                <span className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border mb-4 ${form.badgeColor}`}>
                  {form.category}
                </span>

                <div className="h-16 w-16 rounded-2xl mb-4 flex items-center justify-center bg-gray-50 border border-slate-100 overflow-hidden group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  {form.imageSrc ? (
                    <img src={form.imageSrc} alt={`${form.title} icon`} className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="flex-grow flex flex-col w-full">
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {form.title}
                  </h3>
                  <p className="text-sm text-foreground/70 mb-5 flex-grow">
                    {form.description}
                  </p>

                  <Button
                    className="w-full bg-accent hover:bg-primary text-white font-semibold text-sm h-10 rounded-xl mt-auto shadow-sm group-hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectForm(form.id);
                    }}
                  >
                    <span>Start Voice Assistant</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom Form / Add Your Own Form Card */}
          <Card
            className="group relative h-full rounded-2xl p-6 bg-gradient-to-br from-primary/5 via-white to-accent/5 border-2 border-dashed border-primary/40 hover:border-primary shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer overflow-hidden text-center"
            onClick={() => {
              if (!currentUser) {
                setShowLoginModal(true);
                return;
              }
              setShowCustomModal(true);
            }}
          >
            {/* Top ambient glow line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity" />

            <CardContent className="flex flex-col items-center flex-grow p-0 pt-2">
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border mb-4 bg-purple-50 text-primary border-purple-200">
                Create Custom
              </span>

              <div className="h-16 w-16 rounded-full mb-4 flex items-center justify-center bg-primary/10 border-2 border-primary/20 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xs">
                <Plus className="w-8 h-8 transition-transform group-hover:scale-110" />
              </div>

              <div className="flex-grow flex flex-col w-full">
                <h3 className="text-lg font-bold text-foreground mb-1 flex items-center justify-center gap-1.5 group-hover:text-primary transition-colors">
                  Custom Form
                  <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                </h3>
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-2">
                  Add Your Own Form
                </p>
                <p className="text-sm text-foreground/70 mb-5 flex-grow">
                  Upload or specify any government, municipal, or academic form. Fill custom fields with our conversational voice assistant.
                </p>

                <Button
                  className="w-full bg-accent hover:bg-primary text-white font-semibold text-sm h-10 rounded-xl mt-auto shadow-sm group-hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!currentUser) {
                      setShowLoginModal(true);
                      return;
                    }
                    setShowCustomModal(true);
                  }}
                >
                  <span>Add Custom Form</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {currentUser && authToken && (
          <section className="w-full max-w-4xl mt-12">
            <DraftManager authToken={authToken} />
          </section>
        )}
      </main>

      <Footer />

      {/* Custom Form Modal */}
      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <Sparkles className="w-5 h-5 text-accent" />
              Add Your Own Custom Form
            </DialogTitle>
            <DialogDescription>
              Specify your form particulars. FormEase will synthesize the field structure and guide you with voice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartCustomForm} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1 block text-left">
                Form Title / Document Name
              </label>
              <Input
                placeholder="e.g. Income Certificate, Driving License, Scholarship"
                value={customFormName}
                onChange={(e) => setCustomFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1 block text-left">
                Issuing Department / Authority (Optional)
              </label>
              <Input
                placeholder="e.g. Revenue Dept, Transport Authority, University"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
              />
            </div>

            <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-xs text-foreground/80 space-y-1.5 text-left">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Custom Voice Assistance Included:
              </div>
              <p>• Multi-language voice dictation (Hindi, Telugu, Tamil & 6 more)</p>
              <p>• Automatic field extraction and user confirmation workflow</p>
              <p>• Downloadable preparation draft PDF</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-accent hover:bg-primary text-white font-semibold"
              >
                Launch Voice Form
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <LoginForm onSuccess={() => setShowLoginModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainPage;
