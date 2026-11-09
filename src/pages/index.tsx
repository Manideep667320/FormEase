import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import GsapVoiceMotionGraphics from "@/components/GsapVoiceMotionGraphics";
import FeaturesSection from "@/components/FeaturesSection";
import BenefitsSection from "@/components/BenefitsSection";
import TestimonialsSection from "@/components/TestimonalSection"; 
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <GsapVoiceMotionGraphics />
        <FeaturesSection />
        <BenefitsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
