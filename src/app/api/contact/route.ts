import { NextRequest, NextResponse } from "next/server";
import { checkContactRateLimit } from "@/lib/contact/rate-limit";
import { validateContactRequest } from "@/lib/contact/validation";
import { verifyCaptchaChallenge } from "@/lib/contact/captcha-store";

const RESEND_API_URL = "https://api.resend.com/emails";

function getEnv(upper: string, lower: string): string | undefined {
  return process.env[upper] ?? process.env[lower];
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildEmailText(body: {
  name: string;
  email: string;
  message: string;
  context?: string;
}): string {
  const parts = [
    "New FerroScale contact report",
    "",
    `Name: ${body.name}`,
    `Email: ${body.email}`,
    "",
    "Message:",
    body.message,
  ];

  if (body.context) {
    parts.push("", "Context:", body.context);
  }

  return parts.join("\n");
}

async function sendContactEmail(body: {
  name: string;
  email: string;
  message: string;
  context?: string;
}) {
  const apiKey = getEnv("RESEND_API_KEY", "resend_api_key");
  const from = getEnv("RESEND_FROM", "resend_from");
  const toRaw = getEnv("RESEND_TO", "resend_to") ?? from;

  if (!apiKey || !from || !toRaw) {
    return {
      ok: false as const,
      status: 500,
      messageKey: "contact.api.notConfigured",
      message:
        "Contact service is not configured. Set RESEND_API_KEY, RESEND_FROM, and optionally RESEND_TO.",
    };
  }

  const to = parseRecipients(toRaw);
  if (to.length === 0) {
    return {
      ok: false as const,
      status: 500,
      messageKey: "contact.api.recipientEmpty",
      message: "Contact service recipient list is empty.",
    };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[FerroScale] User report from ${body.name}`,
      text: buildEmailText(body),
      reply_to: body.email,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      details = payload.message ?? payload.error ?? "";
    } catch {
      /* noop */
    }
    return {
      ok: false as const,
      status: 502,
      messageKey: details ? "contact.api.deliveryFailedWithReason" : "contact.api.deliveryFailed",
      messageValues: details ? { details } : undefined,
      message: details ? `Failed to deliver message (${details}).` : "Failed to deliver message.",
    };
  }

  return { ok: true as const };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkContactRateLimit(ip);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many requests. Try again later.",
        messageKey: "contact.api.tooManyRequests",
      },
      {
        status: 429,
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid JSON payload.",
        messageKey: "contact.api.invalidJson",
      },
      { status: 400 },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid request payload.",
        messageKey: "contact.api.invalidPayload",
      },
      { status: 400 },
    );
  }

  const validated = validateContactRequest(payload as Record<string, unknown>);
  if (validated.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Validation failed.",
        messageKey: "contact.api.validationFailed",
        issues: validated,
      },
      { status: 422 },
    );
  }

  const body = payload as {
    name: string;
    email: string;
    message: string;
    challengeId: string;
    challengeAnswer: string;
    context?: string;
  };

  const captchaOk = verifyCaptchaChallenge(body.challengeId, body.challengeAnswer);
  if (!captchaOk) {
    return NextResponse.json(
      {
        ok: false,
        message: "Captcha validation failed.",
        messageKey: "contact.api.captchaFailed",
      },
      { status: 403 },
    );
  }

  const emailResult = await sendContactEmail(body);
  if (!emailResult.ok) {
    console.error("[contact] delivery failed", {
      name: body.name,
      email: body.email,
      reason: emailResult.message,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        ok: false,
        message: emailResult.message,
        messageKey: emailResult.messageKey,
        messageValues: emailResult.messageValues,
      },
      { status: emailResult.status },
    );
  }

  console.info("[contact] delivered", {
    name: body.name,
    email: body.email,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message: "Message received.",
    messageKey: "contact.api.messageReceived",
    remaining: limit.remaining,
    resetAt: limit.resetAt,
  });
}
