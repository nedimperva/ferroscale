"use client";

import { FormEvent, useState } from "react";

interface CaptchaPayload {
  challengeId: string;
  prompt: string;
}

interface ContactFormProps {
  context?: string;
  compact?: boolean;
}

export function ContactForm({ context, compact }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  async function loadCaptcha() {
    setCaptchaLoading(true);
    try {
      const response = await fetch("/api/captcha", { cache: "no-store" });
      const payload = (await response.json()) as CaptchaPayload;
      setCaptcha(payload);
      setFeedback("");
    } catch {
      setCaptcha(null);
      setFeedback("Unable to load CAPTCHA challenge. Please refresh.");
      setStatus("error");
    } finally {
      setCaptchaLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captcha) {
      await loadCaptcha();
      setStatus("error");
      setFeedback("CAPTCHA challenge loaded. Please solve it and submit again.");
      return;
    }

    setStatus("loading");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          challengeId: captcha.challengeId,
          challengeAnswer,
          context,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setStatus("error");
        setFeedback(payload.message ?? "Unable to send your message.");
        setChallengeAnswer("");
        await loadCaptcha();
        return;
      }

      setStatus("success");
      setFeedback("Message received. Thanks for reporting.");
      setMessage("");
      setChallengeAnswer("");
      await loadCaptcha();
    } catch {
      setStatus("error");
      setFeedback("Network error while sending message.");
    }
  }

  return (
    <div className={compact ? "" : "rounded-lg border border-border-strong bg-surface p-5"}>
      {!compact && (
        <>
          <h2 className="text-lg font-semibold">Report a Formula or Data Issue</h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Send suspected calculation issues with context. Rate-limited and protected with CAPTCHA.
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} className={compact ? "grid gap-3" : "mt-4 grid gap-3 md:max-w-2xl"}>
        <div className={compact ? "grid gap-2" : "grid gap-2 md:grid-cols-2"}>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-foreground-secondary">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-foreground-secondary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm"
              required
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-foreground-secondary">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={`rounded-md border border-border-strong bg-surface px-2 py-2 text-sm ${compact ? "min-h-24" : "min-h-28"}`}
            required
            minLength={10}
            maxLength={1500}
          />
        </label>

        <div className="grid gap-1">
          <label className="text-xs font-medium text-foreground-secondary" htmlFor="captcha-answer">
            CAPTCHA: {captcha?.prompt ?? "Loading..."}
          </label>
          {!captcha ? (
            <button
              type="button"
              onClick={() => void loadCaptcha()}
              disabled={captchaLoading}
              className="w-fit rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-60"
            >
              {captchaLoading ? "Loading challenge..." : "Load CAPTCHA challenge"}
            </button>
          ) : null}
          <input
            id="captcha-answer"
            type="text"
            value={challengeAnswer}
            onChange={(event) => setChallengeAnswer(event.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className={compact
            ? "w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            : "w-fit rounded-md bg-foreground px-4 py-2 font-medium text-background hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {status === "loading" ? "Sending..." : "Send report"}
        </button>
      </form>

      {feedback ? (
        <p
          className={`mt-3 text-sm ${status === "success" ? "text-green-text" : status === "error" ? "text-red-text" : "text-foreground-secondary"}`}
          aria-live="polite"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
