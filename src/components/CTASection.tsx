import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CTASection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { y: 50, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: contentRef.current,
              start: "top 85%",
              end: "bottom 15%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }

      if (statsRef.current) {
        const stats = statsRef.current.children;
        gsap.fromTo(
          stats,
          { y: 40, opacity: 0, scale: 0.88 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.12,
            ease: "back.out(1.5)",
            scrollTrigger: {
              trigger: statsRef.current,
              start: "top 85%",
              end: "bottom 15%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        <div ref={contentRef} className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Form Experience?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of users who save time and increase productivity with voice-powered forms.
          </p>
          
          <Button 
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 h-auto group font-bold shadow-lg hover:shadow-2xl transition-all"
          >
            <Mic className="mr-2 w-5 h-5 transition-transform group-hover:scale-125" />
            Start Filling With Your Voice!
          </Button>
          
          <div ref={statsRef} className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm">
              <h3 className="text-3xl font-extrabold">10x</h3>
              <p className="opacity-80 text-sm mt-1">Faster Form Filling</p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm">
              <h3 className="text-3xl font-extrabold">99%</h3>
              <p className="opacity-80 text-sm mt-1">Accuracy Rate</p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm">
              <h3 className="text-3xl font-extrabold">5k+</h3>
              <p className="opacity-80 text-sm mt-1">Happy Users</p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm">
              <h3 className="text-3xl font-extrabold">24/7</h3>
              <p className="opacity-80 text-sm mt-1">Support Available</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
