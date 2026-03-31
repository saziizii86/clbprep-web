import { useLocation, useNavigate } from "react-router-dom";
import helloImg from "../images/hello.png";
import featureImg from "../images/feature.png";

import PricingPage, { type PlanKey } from "./pricing";

import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";

import PrivacyPolicy from "./privacy";
import TermsOfService from "./terms";
import RefundPolicy from "./refund";
import ContactPage from "./contact";

import React, { useEffect, useId, useMemo, useState } from "react";
import { Query } from "appwrite";

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
 * CLBPrep — Home Page
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:pointer-events-none disabled:opacity-50";
  const sizes = {
    md: "h-10 px-4",
    icon: "h-10 w-10",
  } as const;
  const variants: Record<ButtonVariant, string> = {
    default:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-lg hover:brightness-[1.03] active:brightness-95",
    secondary:
      "bg-white/70 text-slate-900 ring-1 ring-slate-200 hover:bg-white hover:shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-white/60",
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
        "inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
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
  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState<
    "home" | "pricing" | "purchase" | "privacy" | "terms" | "refund" | "contact"
  >("home");


const [userSubscription, setUserSubscription] = useState<{
  plan: string;
  status: string;
  endAt: string | null;
} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const page = params.get("page");

    if (page === "pricing") {
      setCurrentPage("pricing");
      navigate("/", { replace: true });
    }
  }, [location.search, navigate]);

useEffect(() => {
  if (currentPage !== "pricing") return;
  const load = async () => {
    try {
      const me = await account.get();
      const email = (me.email || "").trim().toLowerCase();
      const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", email),
      ]);
      if (res.documents.length) {
        const doc = res.documents[0] as any;
        setUserSubscription({
          plan: doc.subscriptionPlan || "basic",
          status: doc.subscriptionStatus || "inactive",
          endAt: doc.subscriptionEndAt || null,
        });
      }
    } catch {}
  };
  void load();
}, [currentPage]);

const API_BASE_URL =
  (import.meta.env.VITE_STRIPE_SERVER_URL || "").trim().replace(/\/+$/, "");

const handleProtectedPlanSelect = async (plan: PlanKey) => {
  try {
    const me = await account.get();
    const email = (me.email || "").trim().toLowerCase();

    // Load user's current subscription
    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", email),
    ]);

    const userDoc = res.documents.length ? res.documents[0] as any : null;
    const currentPlan = userDoc?.subscriptionPlan || "basic";
    const currentStatus = userDoc?.subscriptionStatus || "inactive";
    const endAt = userDoc?.subscriptionEndAt || null;

    const isActiveAIOnly =
      currentPlan === "ai-monthly" &&
      (currentStatus === "active" || currentStatus === "cancelling") &&
      (!endAt || new Date(endAt).getTime() > Date.now());

    const isUpgrade = isActiveAIOnly && plan !== "ai-monthly";
    const upgradeAmounts: Record<string, number> = {
      monthly: 10.00,
      bimonthly: 20.00,
      quarterly: 30.00,
    };

if (!API_BASE_URL || !/^https?:\/\//.test(API_BASE_URL)) {
  alert("Stripe server URL is missing or invalid. Please check VITE_STRIPE_SERVER_URL in .env");
  return;
}

const res2 = await fetch(`${API_BASE_URL}/create-checkout-session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    planKey: plan,
    email: me.email || "",
    name: me.name || "",
    appwriteUserId: me.$id || "",
    isUpgrade,
    upgradeAmount: isUpgrade ? upgradeAmounts[plan] : undefined,
    currentSubscriptionEndAt: isUpgrade ? endAt : undefined,
  }),
});

    const data = await res2.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert(data?.error || "Failed to start checkout.");
    }
  } catch {
    sessionStorage.setItem("postLoginRedirect", "pricing");
    navigate("/login");
  }
};

  const handlePricingBack = async () => {
    try {
      const me = await account.get();
      const email = (me.email || "").trim().toLowerCase();

      const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", email),
      ]);

      const role = res.documents.length ? (res.documents[0] as any).role : "user";

      navigate(role === "admin" ? "/admin" : "/userhome");
    } catch {
      setCurrentPage("home");
    }
  };

  // ✅ NEW: handles skill card clicks — logs in users go to dashboard with skill open,
  // guests go to login
  const handleSkillClick = async (skill: string) => {
    try {
      await account.get();
      navigate(`/userhome?skill=${skill}`);
    } catch {
      navigate("/login");
    }
  };

if (currentPage === "pricing") {
  return (
    <PricingPage
      onBackHome={() => {
        void handlePricingBack();
      }}
      onSelectPlan={handleProtectedPlanSelect}
      currentPlan={userSubscription?.plan}
      currentStatus={userSubscription?.status}
      subscriptionEndAt={userSubscription?.endAt}
    />
  );
}



  if (currentPage === "privacy") {
    return <PrivacyPolicy onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "terms") {
    return <TermsOfService onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "refund") {
    return <RefundPolicy onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "contact") {
    return <ContactPage onBack={() => setCurrentPage("home")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-900">
      <SiteHeader
        onOpenPricing={() => setCurrentPage("pricing")}
        onOpenContact={() => setCurrentPage("contact")}
      />

      <main>
        <Hero />
        {/* ✅ Pass handler down to ComponentsSection */}
        <ComponentsSection onSkillClick={handleSkillClick} />
        <WhyChoose />
        <FaqSection />
      </main>

      <SiteFooter onOpenPage={(page) => setCurrentPage(page)} />
    </div>
  );
}

function SiteHeader({
  onOpenPricing,
  onOpenContact,
}: {
  onOpenPricing: () => void;
  onOpenContact: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        <a href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">CLBPrep</div>
            <div className="text-xs text-slate-500">CELPIP practice platform</div>
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
          <button
            type="button"
            className="hover:text-slate-950"
            onClick={onOpenPricing}
          >
            Pricing
          </button>
          <button
            type="button"
            className="hover:text-slate-950"
            onClick={onOpenContact}
          >
            Contact
          </button>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button className="rounded-xl" onClick={() => navigate("/login")}>
            Sign Up / Login <ArrowRight className="ml-2 h-4 w-4" />
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
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    onOpenPricing();
                  }}
                >
                  Pricing
                </button>

                <div className="mt-2 grid gap-2">
                  <Button variant="secondary" className="w-full" onClick={() => { setOpen(false); navigate('/login'); }}>
                    Sign In
                  </Button>
                  <Button className="w-full" onClick={() => { setOpen(false); navigate('/login'); }}>
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
  const navigate = useNavigate();
  return (
    <section className="bg-gradient-to-b from-slate-100 via-blue-50/70 to-indigo-50/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-1.5 text-xs font-semibold shadow-md shadow-indigo-100 ring-1 ring-indigo-100/60">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Canada's #1 CELPIP Prep Platform
            </span>
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="rounded-xl" onClick={() => navigate("/login")}>
              Start Practicing Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-b from-slate-200/60 to-white" />
          <div className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
            <div className="aspect-[4/3] w-full bg-slate-100">
              <img
                src={helloImg}
                alt="CLBPrep illustration"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ✅ Accept onSkillClick prop
function ComponentsSection({ onSkillClick }: { onSkillClick: (skill: string) => void }) {
  const items = useMemo(
    () => [
      {
        title: "Listening",
        desc: "Practice CELPIP listening scenarios and build stronger comprehension through focused audio-based tasks.",
        icon: Headphones,
        cardClass: "border-blue-200 bg-blue-50/75",
        iconClass: "bg-blue-100 text-blue-600",
        hoverClass: "hover:border-blue-400 hover:shadow-blue-100",
      },
      {
        title: "Reading",
        desc: "Improve reading speed and accuracy with correspondence, diagrams, information texts, and viewpoints.",
        icon: BookOpen,
        cardClass: "border-green-200 bg-green-50/75",
        iconClass: "bg-green-100 text-green-600",
        hoverClass: "hover:border-green-400 hover:shadow-green-100",
      },
      {
        title: "Writing",
        desc: "Strengthen your email and survey writing with guided practice, structure support, and feedback tools.",
        icon: Pencil,
        cardClass: "border-purple-200 bg-purple-50/75",
        iconClass: "bg-purple-100 text-purple-600",
        hoverClass: "hover:border-purple-400 hover:shadow-purple-100",
      },
      {
        title: "Speaking",
        desc: "Build speaking confidence with targeted tasks, timed responses, and AI-supported speaking practice.",
        icon: Mic,
        cardClass: "border-orange-200 bg-orange-50/75",
        iconClass: "bg-orange-100 text-orange-600",
        hoverClass: "hover:border-orange-400 hover:shadow-orange-100",
      },
    ],
    []
  );

  return (
    <section id="practice" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Master All Four Components</h2>
          <p className="mt-2 text-sm text-slate-600">
            Focused practice for every section of the CELPIP test
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {items.map((it) => (
            // ✅ Each card is now a clickable button
            <button
              key={it.title}
              type="button"
              onClick={() => onSkillClick(it.title.toLowerCase())}
              className="group w-full text-left"
            >
              <Card
                className={cn(
                  "h-full shadow-sm transition-all duration-200",
                  "group-hover:-translate-y-1 group-hover:shadow-md",
                  it.cardClass,
                  it.hoverClass
                )}
              >
                <CardHeader className="pb-3">
                  <div className={cn("mb-3 grid h-11 w-11 place-items-center rounded-2xl", it.iconClass)}>
                    <it.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{it.title}</CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-slate-600">{it.desc}</p>
                  {/* ✅ "Start practicing" hint appears on hover */}
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-blue-600">
                    Start practicing <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  const navigate = useNavigate();
  const bullets = useMemo(
    () => [
      { icon: Check, text: "Practice tests (all 4 skills)" },
      { icon: Check, text: "Full mock exams (timed)" },
      { icon: Sparkles, text: "AI scoring & feedback (Writing/Speaking)" },
      { icon: BarChart3, text: "Detailed results & analytics" },
      { icon: ShieldCheck, text: "Answer review & corrections" },
      { icon: Clock, text: "24/7 access" },
    ],
    []
  );

  return (
    <section id="about" className="bg-gradient-to-b from-slate-50 to-indigo-50/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
<div className="bg-slate-100">
  <img
    src={featureImg}
    alt="CLBPrep features"
    className="w-full object-contain"
    loading="lazy"
  />
</div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Why Choose CLBPrep?</h3>
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
            <Button className="rounded-xl" onClick={() => navigate("/login")}>
              Explore Features <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = useMemo(
    () => [
      {
        q: "Can I study one skill at a time on this platform?",
        a: "Yes. You can focus on Listening, Reading, Writing, or Speaking individually, depending on the area you want to improve.",
      },
      {
        q: "Do all paid plans include the same materials?",
        a: "Yes. Weekly, monthly, and three-month plans all unlock the same premium materials. The only difference is the access duration.",
      },
      {
        q: "Does the platform include full mock exams?",
        a: "Yes. You can practice with full mock exams as well as individual skill-based activities to build confidence step by step.",
      },
      {
        q: "Can I use this platform even if my English level is still developing?",
        a: "Yes. The platform is suitable for both beginners and more advanced learners because you can choose simple practice or full timed preparation.",
      },
      {
        q: "How can this platform help with Writing and Speaking?",
        a: "It provides practice tasks and feedback-focused tools so you can improve organization, clarity, and response quality over time.",
      },
      {
        q: "Can I return later and continue from where I left off?",
        a: "Yes. The platform is designed for ongoing preparation, so you can continue your study across different sessions.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-slate-200/70 bg-white scroll-mt-24">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h3 className="text-3xl font-semibold tracking-tight">FAQs</h3>
          <p className="mt-2 text-sm text-slate-600">
            Common questions about plans, materials, and preparation.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 text-left font-medium text-slate-900"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span>{item.q}</span>
                  <span
                    className={cn(
                      "text-xl leading-none text-slate-400 transition-transform",
                      isOpen ? "rotate-45" : ""
                    )}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <p className="mt-3 pr-6 text-sm leading-7 text-slate-600">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SiteFooter({
  onOpenPage,
}: {
  onOpenPage: (page: "privacy" | "terms" | "refund" | "contact") => void;
}) {
  return (
    <footer className="border-t border-white/10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[1.5rem] bg-white/10 p-5 backdrop-blur">
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold">CLBPrep</div>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/80">
                Your trusted partner for CELPIP exam success.
              </p>
            </div>

            <FooterCol
              title="Practice"
              links={["Listening Tests", "Reading Tests", "Writing Tests", "Speaking Tests"]}
            />
            <FooterCol
              title="Resources"
              links={["Study Guide", "Sample Questions", "Tips & Strategies"]}
            />

            {/* Legal links */}
            <div>
              <div className="text-sm font-semibold text-white">Support</div>
              <ul className="mt-2 space-y-1.5 text-xs text-white/80">
                <li>
                  <a className="transition hover:text-white" href="#faq">
                    FAQ
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenPage("contact")}
                    className="transition hover:text-white text-white/80 text-xs"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenPage("privacy")}
                    className="transition hover:text-white text-white/80 text-xs">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenPage("terms")}
                    className="transition hover:text-white text-white/80 text-xs">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenPage("refund")}
                    className="transition hover:text-white text-white/80 text-xs">
                    Refund Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 border-t border-white/15 pt-4 text-center text-[11px] text-white/70">
            © {new Date().getFullYear()} CLBPrep. All rights reserved. CLBPrep is an independent study platform and is not affiliated with, endorsed by, or connected to Paragon Testing Enterprises or CELPIP..
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  const navigate = useNavigate();

  const handleProtectedFooterClick = async () => {
    try {
      const me = await account.get();
      const email = (me.email || "").trim().toLowerCase();

      const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", email),
      ]);

      const role = res.documents.length ? (res.documents[0] as any).role : "user";

      navigate(role === "admin" ? "/admin" : "/userhome");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-2 space-y-1.5 text-xs text-white/80">
        {links.map((l) => (
          <li key={l}>
            <button
              type="button"
              onClick={() => {
                void handleProtectedFooterClick();
              }}
              className="text-left transition hover:text-white"
            >
              {l}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
