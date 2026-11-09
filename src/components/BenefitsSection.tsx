import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  {
    title: "Speed",
    description: "Complete forms up to 10x faster than typing, saving valuable time on repetitive tasks.",
    items: ["Fill forms in seconds", "No more typing errors", "Quick form navigation", "Batch process multiple fields"]
  },
  {
    title: "Convenience",
    description: "Use your voice naturally to fill forms while multitasking or on the go.",
    items: ["Hands-free operation", "Works on mobile and desktop", "No training required", "Smart field detection"]
  },
  {
    title: "Accessibility",
    description: "Make form filling accessible to everyone, regardless of typing ability or physical limitations.",
    items: ["Helps users with disabilities", "Language detection", "Voice command controls", "Customizable speech settings"]
  }
];

const BenefitsSection = () => {
  const [activeBenefit, setActiveBenefit] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

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

      if (buttonsRef.current) {
        const btns = buttonsRef.current.children;
        gsap.fromTo(
          btns,
          { x: -50, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: buttonsRef.current,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }

      if (detailsRef.current) {
        gsap.fromTo(
          detailsRef.current,
          { y: 50, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: detailsRef.current,
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
    <section ref={sectionRef} id="benefits" className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Use Voice Forms?</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Experience the transformative benefits of voice-powered form completion
          </p>
        </div>
        
        <div ref={buttonsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => (
            <button
              key={index}
              className={`text-left p-4 rounded-lg transition-all duration-300 ${
                activeBenefit === index 
                ? "bg-primary text-white shadow-lg" 
                : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => setActiveBenefit(index)}
            >
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className={activeBenefit === index ? "text-white/90" : "text-foreground/70"}>
                {benefit.description}
              </p>
            </button>
          ))}
        </div>
        
        <div ref={detailsRef} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h3 className="text-2xl font-bold text-primary mb-6">{benefits[activeBenefit].title} Benefits</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits[activeBenefit].items.map((item, index) => (
              <li key={index} className="flex items-center">
                <div className="mr-3 bg-primary/10 rounded-full p-1">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
