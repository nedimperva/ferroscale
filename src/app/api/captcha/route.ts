import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/lib/contact/captcha-store";

export async function GET() {
  const challenge = createCaptchaChallenge();
  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
