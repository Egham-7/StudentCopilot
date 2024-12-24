import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import BlurIn from "@/components/magicui/blur-in";
import AnimatedGradientText from "@/components/magicui/animated-gradient-text";
import { cn } from "@/lib/utils";
import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { BorderBeam } from "@/components/magicui/border-beam";
import { FeaturesSection } from "@/components/custom/feature-section";
import BlurFade from "@/components/magicui/blur-fade";
import PricingCard from "@/components/custom/pricing-card";
import { StudentEventsList } from "../components/custom/student-event-list";
import { OrbitingCirclesLandingPage } from "../components/custom/orbiting-circles";
import { MenuItem } from "../components/custom/mobile-menu";
import { Menu } from "lucide-react";
import MobileMenu from "@/components/custom/mobile-menu";
import { useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export default function IndexPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems: MenuItem[] = [
    { label: "Features", id: "features" },
    { label: "Pricing", id: "pricing" },
    { label: "About", id: "about" },
    { label: "Contact", id: "contact" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const trustedTeams = [
    { src: "/cambridge.jpg", alt: "Cambridge University Logo" },
    { src: "/harvard.png", alt: "Harvard University Logo" },
    { src: "/mit.png", alt: "MIT University Logo" },
    { src: "oxford.svg", alt: "Oxford University Logo" },
    { src: "google.svg", alt: "Google Logo" },
  ];

  const pricingPlans = [
    {
      title: "Basic",
      price: 9,
      description: "For individual students",
      features: [
        "5 lectures per month",
        "Basic note-taking.",
        "24/7 support",
        "1 mock exam per module",
      ],
      buttonText: "Get Started",
    },
    {
      title: "Pro",
      price: 19,
      description: "For serious learners",
      features: [
        "Unlimited lectures",
        "Advanced note-taking",
        "Priority support",
        "Collaboration tools",
      ],
      buttonText: "Upgrade to Pro",
      isPopular: true,
    },
    {
      title: "Enterprise",
      price: 49,
      description: "For institutions",
      features: [
        "Custom features",
        "Dedicated account manager",
        "API access",
        "Bulk licensing",
      ],
      buttonText: "Contact Sales",
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 space-x-4 right-0 flex justify-between items-center p-6 bg-background z-10">
        <div>
          <BlurIn
            word="StudentCopilot"
            className="text-primary font-bold text-lg font-heading leading-normal md:text-xl"
          />
        </div>
        <div className="flex gap-3">
          <SignUpButton>
            <Button>Sign up</Button>
          </SignUpButton>
          <SignInButton>
            <Button variant="secondary">Sign in</Button>
          </SignInButton>
        </div>
        <Button
          variant="ghost"
          className="md:hidden text-foreground"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </Button>
      </header>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        items={menuItems}
        onItemClick={scrollToSection}
      />

      <main className="w-full flex flex-col mt-24 justify-center items-center p-4 bg-background text-foreground">
        <BlurFade inView delay={0.1}>
          <aside className="z-10 flex min-h-[7rem] items-center justify-center">
            <AnimatedGradientText>
              🎉 <hr className="mx-2 h-4 w-[1px] shrink-0 bg-border" />{" "}
              <span
                className={cn(
                  `inline animate-gradient bg-gradient-to-r from-primary via-accent to-primary bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-heading`
                )}
              >
                Introducing StudentCopilot
              </span>
              <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 text-foreground" />
            </AnimatedGradientText>
          </aside>
        </BlurFade>

        <BlurFade inView delay={0.2}>
          <section className="flex flex-col justify-center text-center items-center gap-10 p-6 md:p-8">
            <BlurIn
              word="StudentCopilot is the #1 way to supercharge your learning."
              className="text-primary font-heading font-bold text-2xl md:text-4xl xl:text-8xl"
            />
            <BlurIn
              word="Transform your lectures into powerful study tools."
              className="text-muted-foreground font-body text-sm md:text-xl"
            />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius)]">
              Get started for free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </section>
        </BlurFade>

        <BlurFade inView delay={0.3}>
          <section className="max-w-5xl mx-auto my-24 flex flex-col justify-center items-center px-7 lg:px-0 relative">
            <div className="relative rounded-2xl p-1 overflow-hidden">
              <BorderBeam />
              <HeroVideoDialog
                animationStyle="from-center"
                videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
                thumbnailSrc="https://startup-template-sage.vercel.app/hero-dark.png"
                thumbnailAlt="Hero Video"
              />
            </div>
          </section>
        </BlurFade>

        <BlurFade inView delay={0.4} className="w-full ">
          <section className="mx-auto max-w-5xl flex flex-col justify-center items-center px-7 py-4 lg:px-0 relative">
            <h3 className="font-bold text-foreground text-lg md:text-xl uppercase text-center mb-6">
              Trusted by Teams Around the World
            </h3>
            <ul className="flex flex-wrap justify-center items-center gap-8">
              {trustedTeams.map((team, index) => (
                <li key={index}>
                  <img
                    src={team.src}
                    alt={team.alt}
                    className="w-28 aspect-square object-contain h-8 dark:invert dark:brightness-0"
                  />
                </li>
              ))}
            </ul>
          </section>
        </BlurFade>

        <BlurFade inView delay={0.5} className="w-full">
          <FeaturesSection />
        </BlurFade>

        <BlurFade inView delay={0.6} className="w-full">
          <section className="w-full  mx-auto my-24 px-4">
            <h2 className="text-3xl font-bold text-center mb-8">
              Choose Your Plan
            </h2>
            <div className="flex flex-wrap justify-center gap-8">
              {pricingPlans.map((plan, index) => (
                <PricingCard key={index} {...plan} />
              ))}
            </div>
          </section>
        </BlurFade>

        <BlurFade inView delay={0.7} className="w-full">
          <section className="w-full my-24 px-4">
            <h2 className="text-3xl font-bold text-center mb-8 text-primary">
              Recent Student Activities
            </h2>

            <div className="flex justify-center items-center w-full gap-4">
              <OrbitingCirclesLandingPage />
              <StudentEventsList className="max-w-2xl mx-auto" />
            </div>
          </section>
        </BlurFade>
      </main>
    </>
  );
}
