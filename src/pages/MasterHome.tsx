import React, { useEffect, useId, useMemo, useState } from "react";
import {
  Check,
  Headphones,
  BookOpen,
  Pencil,
  Mic,
  ArrowRight,
  Star,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Clock,
} from "lucide-react";

/**
 * CELPIP Master — Home Page
 * - Tailwind v3 compatible
 * - No external UI libs required
 */

// ------------------------
// Minimal UI primitives
// ------------------------
export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "default" | "secondary" | "ghost";
function Button({
  children,
  className,
  variant = "default",
  size = "md",
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "icon";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:pointer-events-none disabled:opacity-50";
  const sizes = {
    md: "h-10 px-4",
    icon: "h-10 w-10",
  } as const;
  const variants: Record<ButtonVariant, string> = {
    default: "bg-slate-950 text-white hover:bg-slate-950/90",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type={type ?? "button"}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border bg-white", className)}>{children}</div>;
}
function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}
function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-lg font-semibold", className)}>{children}</div>;
}

// Expose for simple unit tests if you add Vitest later
export const __test__ = { cn };

// ------------------------
// Page
// ------------------------
export default function CelpipMasterHome() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main>
        <Hero />
        <ComponentsSection />
        <WhyChoose />
        <SuccessStories />
        <Pricing />
        <CtaBand />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock body scroll when menu open (mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">CELPIP Master</div>
            <div className="text-xs text-slate-500">Practice platform</div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <a className="hover:text-slate-950" href="#practice">
            Practice Tests
          </a>
          <a className="hover:text-slate-950" href="#about">
            About CELPIP
          </a>
          <a className="hover:text-slate-950" href="#pricing">
            Pricing
          </a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" className="rounded-xl">
            Sign In
          </Button>
          <Button className="rounded-xl">
            Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl md:hidden text-slate-900"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden" id={panelId}>
          <div className="border-t bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <nav className="grid gap-3 text-sm text-slate-800">
                <a
                  className="rounded-xl px-3 py-2 hover:bg-slate-50"
                  href="#practice"
                  onClick={() => setOpen(false)}
                >
                  Practice Tests
                </a>
                <a
                  className="rounded-xl px-3 py-2 hover:bg-slate-50"
                  href="#about"
                  onClick={() => setOpen(false)}
                >
                  About CELPIP
                </a>
                <a
                  className="rounded-xl px-3 py-2 hover:bg-slate-50"
                  href="#pricing"
                  onClick={() => setOpen(false)}
                >
                  Pricing
                </a>

                <div className="mt-2 grid gap-2">
                  <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                    Sign In
                  </Button>
                  <Button className="w-full" onClick={() => setOpen(false)}>
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Canada’s #1 CELPIP prep platform
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Ace Your CELPIP Exam
            <br />
            <span className="text-slate-600">with Confidence</span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Comprehensive practice tests, expert tips, and personalized feedback to help you achieve your target score for
            Canadian immigration and citizenship.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button className="rounded-xl">
              Start Practicing Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="secondary" className="rounded-xl">
              Take Diagnostic Test
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">10,000+</div>
                <div className="text-xs text-slate-500">Students helped</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1 font-semibold text-slate-900">
                  4.8/5
                  <span className="ml-1 inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </span>
                </div>
                <div className="text-xs text-slate-500">Rating</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-b from-slate-200/60 to-white" />
          <div className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
            {/* Replace with your image asset */}
            <div className="aspect-[4/3] w-full bg-slate-100">
              <div className="grid h-full w-full place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-white shadow-sm" />
                  <div className="text-sm font-medium text-slate-700">Hero image</div>
                  <div className="text-xs text-slate-500">(Replace with your photo)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComponentsSection() {
  const items = useMemo(
    () => [
      {
        title: "Listening",
        desc: "Practice with real CELPIP listening scenarios and improve your comprehension skills.",
        icon: Headphones,
        cta: "Start Practice →",
      },
      {
        title: "Reading",
        desc: "Master reading comprehension with timed practice tests and detailed explanations.",
        icon: BookOpen,
        cta: "Start Practice →",
      },
      {
        title: "Writing",
        desc: "Enhance your writing skills with sample tasks and expert feedback.",
        icon: Pencil,
        cta: "Start Practice →",
      },
      {
        title: "Speaking",
        desc: "Boost confidence with speaking practice and AI-powered feedback.",
        icon: Mic,
        cta: "Start Practice →",
      },
    ],
    []
  );

  return (
    <section id="practice" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Master All Four Components</h2>
          <p className="mt-2 text-sm text-slate-600">Comprehensive practice for every section of the CELPIP test</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {items.map((it) => (
            <Card key={it.title} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-slate-50">
                  <it.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{it.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-slate-600">{it.desc}</p>
                <a
                  href="#"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:underline"
                >
                  {it.cta}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  const bullets = useMemo(
    () => [
      { icon: Check, text: "Full-length practice tests" },
      { icon: Sparkles, text: "Expert study materials" },
      { icon: Clock, text: "Mobile-friendly platform" },
      { icon: BarChart3, text: "Detailed performance analytics" },
      { icon: ShieldCheck, text: "Score predictions" },
      { icon: Check, text: "24/7 access" },
    ],
    []
  );

  return (
    <section id="about" className="bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
          {/* Replace with your image asset */}
          <div className="aspect-[16/9] bg-slate-100">
            <div className="grid h-full w-full place-items-center">
              <div className="text-center">
                <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-white shadow-sm" />
                <div className="text-sm font-medium text-slate-700">Feature image</div>
                <div className="text-xs text-slate-500">(Replace with your photo)</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Why Choose CELPIP Master?</h3>
          <p className="mt-2 text-sm text-slate-600">Everything you need to succeed in your CELPIP exam, all in one place.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {bullets.map((b) => (
              <div key={b.text} className="flex items-start gap-2 rounded-2xl bg-white p-3 shadow-sm">
                <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-xl bg-slate-50">
                  <b.icon className="h-4 w-4" />
                </div>
                <div className="text-sm text-slate-700">{b.text}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button className="rounded-xl">
              Explore Features <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SuccessStories() {
  const stories = useMemo(
    () => [
      {
        name: "Sarah Chen",
        score: "Achieved CLB 10",
        quote:
          "This platform helped me achieve my target score! The practice tests were exactly like the real exam.",
        initials: "SC",
      },
      {
        name: "Rajesh Kumar",
        score: "Achieved CLB 9",
        quote: "Excellent preparation materials. The speaking practice section was particularly helpful.",
        initials: "RK",
      },
      {
        name: "Maria Garcia",
        score: "Achieved CLB 11",
        quote: "I improved my score by 2 levels in just 3 weeks. Highly recommended!",
        initials: "MG",
      },
    ],
    []
  );

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h3 className="text-3xl font-semibold tracking-tight">Success Stories</h3>
          <p className="mt-2 text-sm text-slate-600">Join thousands who achieved their dream scores</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stories.map((s) => (
            <Card key={s.name} className="shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-700">“{s.quote}”</p>

                <div className="mt-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-sm font-semibold">
                    {s.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.score}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = useMemo(
    () => [
      {
        name: "Basic",
        price: "$29",
        sub: "1 Month Access",
        features: ["5 Full Practice Tests", "Basic Performance Analytics", "Study Materials"],
        popular: false,
      },
      {
        name: "Pro",
        price: "$49",
        sub: "3 Months Access",
        features: ["10 Full Practice Tests", "Advanced Analytics", "AI Speaking Feedback", "Email Support"],
        popular: true,
      },
      {
        name: "Premium",
        price: "$89",
        sub: "6 Months Access",
        features: ["Unlimited Practice Tests", "Priority Support", "1-on-1 Tutoring Session", "Score Guarantee"],
        popular: false,
      },
    ],
    []
  );

  return (
    <section id="pricing" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h3 className="text-3xl font-semibold tracking-tight">Choose Your Plan</h3>
          <p className="mt-2 text-sm text-slate-600">Flexible pricing to fit your preparation needs</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={cn(
                "relative shadow-sm",
                p.popular ? "border-slate-950 ring-2 ring-slate-950" : ""
              )}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="rounded-full">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-semibold">{p.price}</div>
                  <div className="text-xs text-slate-500">{p.sub}</div>
                </div>

                <div className="mt-5 space-y-3">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-md bg-white">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>{f}</div>
                    </div>
                  ))}
                </div>

                <Button
                  className={cn(
                    "mt-6 w-full rounded-xl",
                    p.popular ? "" : "bg-slate-900 text-white hover:bg-slate-900/90"
                  )}
                  variant={p.popular ? "default" : "secondary"}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 p-10 text-center text-white shadow-sm">
          <h4 className="text-2xl font-semibold">Ready to Start Your Success Journey?</h4>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/80">
            Get instant access to practice tests and study materials. No credit card required for trial.
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
            <Button className="w-full rounded-xl bg-white text-slate-950 hover:bg-white/90">Start Free Trial</Button>
            <Button variant="secondary" className="w-full rounded-xl bg-white/10 text-white hover:bg-white/15">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">CELPIP Master</div>
            </div>
            <p className="mt-3 text-sm text-slate-600">Your trusted partner for CELPIP exam success.</p>
          </div>

          <FooterCol title="Practice" links={["Listening Tests", "Reading Tests", "Writing Tests", "Speaking Tests"]} />
          <FooterCol title="Resources" links={["Study Guide", "Sample Questions", "Tips & Strategies", "Blog"]} />
          <FooterCol title="Support" links={["FAQ", "Contact Us", "Privacy Policy", "Terms of Service"]} />
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} CELPIP Master. All rights reserved. Not affiliated with Paragon Testing
          Enterprises.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {links.map((l) => (
          <li key={l}>
            <a className="hover:text-slate-950" href="#">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
