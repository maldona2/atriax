import {
  LandingHeader,
  HeroSection,
  ProblemSection,
  BenefitsSection,
  FeaturesSection,
  HowItWorksSection,
  TestimonialsSection,
  CustomerProfilesSection,
  PricingSection,
  FAQSection,
  CTASection,
  LandingFooter,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <BenefitsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CustomerProfilesSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
