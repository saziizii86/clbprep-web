import React, { useMemo, useState } from "react";
import { ArrowLeft, Mail, Send, Sparkles } from "lucide-react";

function cn(...classes: Array<string | undefined | false | null>) {
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

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const supportEmail = "support@clbprep.com";

  const mailtoLink = useMemo(() => {
    const finalSubject = subject.trim() || "CLBPrep Support Request";

    const body = [
      name ? `Name: ${name}` : "",
      email ? `Email: ${email}` : "",
      "",
      message || "Hello CLBPrep Support,",
    ]
      .filter(Boolean)
      .join("\n");

    return `mailto:${supportEmail}?subject=${encodeURIComponent(
      finalSubject
    )}&body=${encodeURIComponent(body)}`;
  }, [name, email, subject, message]);

  const handleSend = () => {
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-900">
      <section className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">CLBPrep</div>
              <div className="text-xs text-slate-500">Contact our support team</div>
            </div>
          </div>

          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </section>

      <main>
        <section className="py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-6 md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight">Contact Us</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Need help with your account, pricing, practice tests, or technical issues?
                You can contact the CLBPrep support team using the form on this page.
              </p>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Support email</div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
                >
                  {supportEmail}
                </a>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <p>Use this page to send us your question through your email app.</p>
                <p>
                  When you click <span className="font-semibold text-slate-900">Send Message</span>,
                  your device will open an email draft addressed to our support team.
                </p>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <h2 className="text-xl font-semibold">Send a Message</h2>
              <p className="mt-2 text-sm text-slate-600">
                Fill in your details, then click the button below.
              </p>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here"
                    rows={7}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="pt-2">
                  <Button onClick={handleSend}>
                    Send Message
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}