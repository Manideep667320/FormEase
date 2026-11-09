import React, { useEffect, useRef } from "react";
import { Check, Mic, Clock, Lock, Globe, MessageSquare } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: <Mic className="w-6 h-6 text-primary" />,
    title: "Voice Recognition",
    description: "Advanced AI that understands natural language and converts speech to text with incredible accuracy."
  },
  {
    icon: <Clock className="w-6 h-6 text-primary" />,
    title: "10x Faster",
    description: "Complete forms in seconds rather than minutes. Save time and increase productivity."
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: "Secure & Private",
    description: "Your voice data is encrypted and processed securely. We never store your voice recordings."
  },
  {
    icon: <Globe className="w-6 h-6 text-primary" />,
    title: "Works Everywhere",
    description: "Compatible with any website that has forms. No need for special integrations."
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-primary" />,
    title: "Smart Formatting",
    description: "Automatically formats your speech into the appropriate fields including dates and numbers."
  },
  {
    icon: <Check className="w-6 h-6 text-primary" />,
    title: "Validation",
    description: "Ensures form fields are correctly filled before submission to prevent errors."
  }
];

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 85%",
              end: "bottom 15%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }

      const cards = cardsRef.current ? cardsRef.current.children : [];
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 60, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="py-20 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Voice Features</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Our intelligent voice recognition technology makes form filling effortless
          </p>
        </div>
        
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
