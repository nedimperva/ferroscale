import { NextRequest, NextResponse } from "next/server";
import { checkContactRateLimit } from "@/lib/contact/rate-limit";
import { validateContactRequest } from "@/lib/contact/validation";
import { verifyCaptchaChallenge } from "@/lib/contact/captcha-store";

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
      },
      { status: 400 },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid request payload.",
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
      },
      { status: 403 },
    );
  }

  // For V1 this endpoint only validates and logs contact requests.
  console.info("[contact]", {
    name: body.name,
    email: body.email,
    message: body.message,
    context: body.context,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message: "Message received.",
    remaining: limit.remaining,
    resetAt: limit.resetAt,
  });
}
