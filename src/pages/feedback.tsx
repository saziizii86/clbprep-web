import React, { useState, useRef } from "react";
import { functions } from "../appwrite";
import {
  ArrowLeft, MessageSquare, Send, Sparkles,
  Paperclip, X, FileText, Image, File,
  CheckCircle, AlertCircle, Loader2, Lock
} from "lucide-react";

const FUNCTION_ID = "69ae201700398cefccd9";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function Button({
  children, className, variant = "default", type, disabled, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" }) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:pointer-events-none disabled:opacity-60 h-10 px-5";
  const variants = {
    default: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-lg hover:brightness-105 active:brightness-95",
    secondary: "bg-white/70 text-slate-900 ring-1 ring-slate-200 hover:bg-white hover:shadow-sm",
  };
  return (
    <button type={type ?? "button"} disabled={disabled} className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm", className)}>
      {children}
    </div>
  );
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (file.type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (file.type.includes("text")) return <FileText className="h-4 w-4 text-slate-500" />;
  return <File className="h-4 w-4 text-slate-400" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Status = "idle" | "sending" | "success" | "error";

// userEmail and userName are passed from userHome (already loaded from Appwrite)
export default function FeedbackPage({
  onBack,
  userEmail = "",
  userName = "",
}: {
  onBack: () => void;
  userEmail?: string;
  userName?: string;
}) {
  const supportEmail = "support@clbprep.com";

  const [feedbackType, setFeedbackType] = useState("General Feedback");
  const [message, setMessage]           = useState("");
  const [attachments, setAttachments]   = useState<File[]>([]);
  const [dragOver, setDragOver]         = useState(false);
  const [status, setStatus]             = useState<Status>("idle");
  const [errorMsg, setErrorMsg]         = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => !attachments.find((a) => a.name === f.name && a.size === f.size)
    );
    setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const removeAttachment = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const handleSend = async () => {
    if (!message.trim()) {
      setErrorMsg("Please write a message before sending.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");

    const attachmentNote =
      attachments.length > 0
        ? attachments.map((f) => `• ${f.name} (${formatBytes(f.size)})`).join("\n")
        : "None";

    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          name:         userName  || "Anonymous",
          email:        userEmail || "",
          feedbackType,
          message:      message.trim(),
          attachments:  attachmentNote,
        }),
        false,
      );

      if (execution.status === "completed") {
        const response = JSON.parse(execution.responseBody || "{}");
        if (response.ok) {
          setStatus("success");
          setFeedbackType("General Feedback");
          setMessage("");
          setAttachments([]);
        } else {
          throw new Error(response.error || "Unknown error");
        }
      } else {
        throw new Error("Function failed: " + execution.status);
      }
    } catch (err: any) {
      console.error("Function error:", err);
      setStatus("error");
      setErrorMsg("Failed to send. Please email us directly at " + supportEmail);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm sm:h-10 sm:w-10">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">CLBPrep</div>
              <div className="text-xs text-slate-500">Share your feedback</div>
            </div>
          </div>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </header>

      {/* Page body */}
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">

          {/* Left info card */}
          <Card className="h-fit p-6 sm:p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Feedback</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Share your suggestions, report bugs, or tell us how we can improve CLBPrep.
              Your feedback helps us make the platform better.
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Direct email</div>
              <a href={`mailto:${supportEmail}`} className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700">
                {supportEmail}
              </a>
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <p>Send bug reports, improvement ideas, or general comments.</p>
              <p>You can attach screenshots or documents to help explain your issue.</p>
              <p>Your feedback is sent <span className="font-medium text-slate-800">directly</span> — no email client opens.</p>
            </div>
          </Card>

          {/* Right form card */}
          <Card className="p-6 sm:p-8">

            {status === "success" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Feedback sent!</h2>
                <p className="max-w-xs text-sm text-slate-600">
                  Thanks for taking the time. We'll review your message and get back to you if needed.
                </p>
                <Button variant="secondary" onClick={() => setStatus("idle")} className="mt-2">
                  Send another
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Send Feedback</h2>
                <p className="mt-1 text-sm text-slate-500">Sent directly — no email app will open.</p>

                <div className="mt-6 grid gap-4">

                  {/* ── Name + Email: auto-filled & locked ── */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        Your Name
                        <Lock className="h-3 w-3 text-slate-400" />
                      </label>
                      <input
                        type="text"
                        value={userName}
                        readOnly
                        tabIndex={-1}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed select-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        Your Email
                        <Lock className="h-3 w-3 text-slate-400" />
                      </label>
                      <input
                        type="email"
                        value={userEmail}
                        readOnly
                        tabIndex={-1}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  {/* Feedback Type */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Feedback Type</label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option>General Feedback</option>
                      <option>Bug Report</option>
                      <option>Feature Request</option>
                      <option>Content Suggestion</option>
                      <option>Design / UI Feedback</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); setErrorMsg(""); }}
                      placeholder="Write your feedback here..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Attachments <span className="font-normal text-slate-400">(optional, up to 5 — filenames included in email)</span>
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition",
                        dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
                      )}
                    >
                      <Paperclip className="h-5 w-5 text-slate-400" />
                      <p className="text-center text-slate-500">
                        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-400">Images, PDFs, TXT, DOC — any file type</p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    {attachments.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {attachments.map((file, i) => (
                          <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              {getFileIcon(file)}
                              <span className="truncate text-slate-700">{file.name}</span>
                              <span className="shrink-0 text-xs text-slate-400">{formatBytes(file.size)}</span>
                            </div>
                            <button type="button" onClick={() => removeAttachment(i)} className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Error banner */}
                  {errorMsg && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-1">
                    <Button onClick={handleSend} disabled={status === "sending"} className="w-full sm:w-auto">
                      {status === "sending" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                      ) : (
                        <>Send Feedback <Send className="h-4 w-4" /></>
                      )}
                    </Button>
                  </div>

                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
