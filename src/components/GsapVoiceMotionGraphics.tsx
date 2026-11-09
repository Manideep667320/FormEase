import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mic, Sparkles, FileCheck, Volume2, Cpu } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export const GsapVoiceMotionGraphics: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveBarsRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const packet1Ref = useRef<HTMLDivElement>(null);
  const packet2Ref = useRef<HTMLDivElement>(null);
  const packet3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Scrubbed Motion Graphics Timeline - Bidirectional (Forward on scroll down, Reverse on scroll up)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "bottom 20%",
          scrub: 1.2,
        },
      });

      // Frequency bars animation: expands as you scroll down; reverses on scroll up
      const bars = waveBarsRef.current ? waveBarsRef.current.children : [];
      if (bars.length > 0) {
        tl.fromTo(
          bars,
          { scaleY: 0.25, opacity: 0.4 },
          {
            scaleY: 1.8,
            opacity: 1,
            stagger: {
              each: 0.04,
              from: "center",
            },
            ease: "sine.inOut",
          },
          0
        );
      }

      // Orb rotation & scaling
      if (orbRef.current) {
        tl.fromTo(
          orbRef.current,
          { rotate: 0, scale: 0.88, filter: "drop-shadow(0 0 0px rgba(124, 58, 237, 0))" },
          {
            rotate: 360,
            scale: 1.12,
            filter: "drop-shadow(0 10px 25px rgba(234, 88, 12, 0.25))",
            ease: "power1.inOut",
          },
          0
        );
      }

      // Data packets travel from Voice Mic into the Form card
      if (packet1Ref.current) {
        tl.fromTo(
          packet1Ref.current,
          { x: -110, y: 30, opacity: 0, scale: 0.6 },
          { x: 0, y: 0, opacity: 1, scale: 1, ease: "power2.out" },
          0.1
        );
      }

      if (packet2Ref.current) {
        tl.fromTo(
          packet2Ref.current,
          { x: -130, y: -20, opacity: 0, scale: 0.6 },
          { x: 0, y: 0, opacity: 1, scale: 1, ease: "power2.out" },
          0.25
        );
      }

      if (packet3Ref.current) {
        tl.fromTo(
          packet3Ref.current,
          { x: -120, y: 40, opacity: 0, scale: 0.6 },
          { x: 0, y: 0, opacity: 1, scale: 1, ease: "power2.out" },
          0.4
        );
      }

      // Form document receives data and settles into view
      if (formCardRef.current) {
        tl.fromTo(
          formCardRef.current,
          { y: 50, opacity: 0.5, scale: 0.94, rotateY: -8 },
          { y: 0, opacity: 1, scale: 1, rotateY: 0, ease: "power2.out" },
          0.15
        );
      }

      // Continuous subtle audio wave idle pulse
      if (bars.length > 0) {
        gsap.to(bars, {
          height: () => `${Math.floor(20 + Math.random() * 45)}px`,
          repeat: -1,
          yoyo: true,
          duration: 0.8,
          ease: "sine.inOut",
          stagger: {
            each: 0.05,
            from: "random",
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 28 balanced audio frequency bar heights
  const initialHeights = [
    18, 26, 38, 48, 62, 75, 90, 100, 85, 70, 52, 68, 88, 96,
    96, 88, 68, 52, 70, 85, 100, 90, 75, 62, 48, 38, 26, 18
  ];

  return (
    <section
      ref={containerRef}
      className="relative py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 overflow-hidden border-y border-slate-200/80"
    >
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
            From Spoken Voice to Structured Forms
          </h2>
          <p className="text-base md:text-lg text-slate-600">
            Scroll down to watch voice audio synthesize into validated government form fields.
            Scroll back up to watch the animation flow gracefully reverse.
          </p>
        </div>

        {/* Interactive Motion Graphic Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* Left: Voice Frequency Emitter & Orb */}
          <div className="lg:col-span-5 flex flex-col items-center text-center">
            <div className="relative mb-6">
              {/* Rotating Orb Ring */}
              <div
                ref={orbRef}
                className="w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center p-3 relative shadow-sm"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg relative">
                  <Mic className="w-14 h-14 md:w-16 md:h-16 text-white animate-pulse" />
                  <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-accent border border-accent/30 shadow-xs">
                    LIVE ASR
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Volume2 className="w-4 h-4 text-accent" />
              <span>Multi-Language Audio Stream (9 Indic Languages)</span>
            </div>

            {/* GSAP Soundwave Frequency Spectrum */}
            <div
              ref={waveBarsRef}
              className="flex items-center justify-center gap-1.5 h-24 w-full max-w-md px-4 py-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm backdrop-blur-sm"
            >
              {initialHeights.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h * 0.45}px` }}
                  className="w-1.5 md:w-2 rounded-full bg-gradient-to-t from-primary via-accent to-orange-400 transition-all origin-bottom"
                />
              ))}
            </div>
          </div>

          {/* Center: Dynamic Data Stream Packets */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-3 py-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              NLP Intelligence Pipeline
            </div>

            <div
              ref={packet1Ref}
              className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-between text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-slate-500">Name:</span>
                <span className="text-slate-900 font-bold">"Rahul Sharma"</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                VALIDATED
              </span>
            </div>

            <div
              ref={packet2Ref}
              className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-between text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-slate-500">DOB:</span>
                <span className="text-slate-900 font-bold">"14-08-1996"</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                PROPOSED
              </span>
            </div>

            <div
              ref={packet3Ref}
              className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-between text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="text-slate-500">PIN:</span>
                <span className="text-slate-900 font-bold">"500081"</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-primary font-bold border border-purple-200">
                CONFIRMED
              </span>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Flow reverses direction on upward scroll ↑
            </div>
          </div>

          {/* Right: Synthesized Application Document Preview */}
          <div className="lg:col-span-4 flex justify-center">
            <div
              ref={formCardRef}
              className="w-full max-w-sm rounded-2xl bg-white text-slate-900 p-6 shadow-xl border border-slate-200 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Application Prep Draft</h4>
                    <p className="text-[11px] text-slate-500">Government Verification Copy</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Ready
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-semibold text-slate-800">Rahul Sharma</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date of Birth</span>
                  <span className="font-semibold text-slate-800">14 August 1996</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Address PIN</span>
                  <span className="font-semibold text-slate-800">500081 (Madhapur, HYD)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Verification</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> 100% User Confirmed
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-full py-2 bg-gradient-to-r from-primary to-accent text-white font-semibold text-xs rounded-lg text-center shadow-xs">
                  Generate Preparation PDF
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GsapVoiceMotionGraphics;
