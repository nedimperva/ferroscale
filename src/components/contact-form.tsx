"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

interface CaptchaPayload {
  challengeId: string;
  prompt: string;
}

interface ContactFormProps {
  context?: string;
  compact?: boolean;
}

export function ContactForm({ context, compact }: ContactFormProps) {
  const t = useTranslations("contact.form");
  const rootT = useTranslations();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  async function fetchWithRetry<T>(url: string, init?: RequestInit, retries = 2): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        const response = await fetch(url, init);
        return (await response.json()) as T;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  async function loadCaptcha() {
    setCaptchaLoading(true);
    try {
      const payload = await fetchWithRetry<CaptchaPayload>("/api/captcha", { cache: "no-store" });
      setCaptcha(payload);
      setFeedback("");
    } catch {
      setCaptcha(null);
      setFeedback(t("feedback.captchaLoadFailed"));
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
      setFeedback(t("feedback.captchaLoaded"));
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

      let payload: {
        ok?: boolean;
        message?: string;
        messageKey?: string;
        messageValues?: Record<string, string | number>;
      };
      try {
        payload = await response.json();
      } catch {
        setStatus("error");
        setFeedback(t("feedback.sendFailed"));
        setChallengeAnswer("");
        await loadCaptcha();
        return;
      }

      if (!response.ok || !payload.ok) {
        setStatus("error");
        const serverMessage = payload.messageKey
          ? rootT(payload.messageKey, payload.messageValues)
          : payload.message;
        setFeedback(serverMessage ?? t("feedback.sendFailed"));
        setChallengeAnswer("");
        await loadCaptcha();
        return;
      }

      setStatus("success");
      const successMessage = payload.messageKey
        ? rootT(payload.messageKey, payload.messageValues)
        : payload.message;
      setFeedback(successMessage ?? t("feedback.messageReceived"));
      setMessage("");
      setChallengeAnswer("");
      await loadCaptcha();
    } catch (err) {
      setStatus("error");
      const isNetworkError =
        err instanceof TypeError || (err instanceof DOMException && err.name === "AbortError");
      setFeedback(isNetworkError ? t("feedback.networkError") : t("feedback.sendFailed"));
    }
  }

  return (
    <div className={compact ? "" : "rounded-lg border border-border-strong bg-surface p-5"}>
      {!compact && (
        <>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            {t("description")}
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} className={compact ? "grid gap-3" : "mt-4 grid gap-3 md:max-w-2xl"}>
        <div className={compact ? "grid gap-2" : "grid gap-2 md:grid-cols-2"}>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-foreground-secondary">{t("name")}</span>
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
            <span className="text-xs font-medium text-foreground-secondary">{t("email")}</span>
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
          <span className="text-xs font-medium text-foreground-secondary">{t("message")}</span>
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
            {t("captcha", { prompt: captcha?.prompt ?? t("captchaLoading") })}
          </label>
          {!captcha ? (
            <button
              type="button"
              onClick={() => void loadCaptcha()}
              disabled={captchaLoading}
              className="w-fit rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-60"
            >
              {captchaLoading ? t("loadingCaptcha") : t("loadCaptcha")}
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
          {status === "loading" ? t("sending") : t("send")}
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
