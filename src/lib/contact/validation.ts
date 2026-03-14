export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  challengeId: string;
  challengeAnswer: string;
  context?: string;
}

export interface ContactValidationIssue {
  field: keyof ContactRequest | "root";
  message: string;
  messageKey?: string;
}

export type ContactValidationResult =
  | { ok: true; issues: []; data: ContactRequest }
  | { ok: false; issues: ContactValidationIssue[]; data: null };

/**
 * Email regex requires:
 *  - local part (no spaces or @)
 *  - domain with at least one dot
 *  - TLD of 2+ characters (rejects a@b.c)
 *  - total length capped at 254 (RFC 5321)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX_LENGTH = 254;

/** Strip HTML tags from a string to prevent injection in logs/emails. */
function sanitizePlainText(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function validateContactRequest(payload: Partial<ContactRequest>): ContactValidationResult {
  const issues: ContactValidationIssue[] = [];

  if (!payload.name || payload.name.trim().length < 2 || payload.name.trim().length > 80) {
    issues.push({
      field: "name",
      message: "Name must be between 2 and 80 characters.",
      messageKey: "contact.validation.nameRange",
    });
  }

  if (
    !payload.email ||
    payload.email.length > EMAIL_MAX_LENGTH ||
    !EMAIL_REGEX.test(payload.email)
  ) {
    issues.push({
      field: "email",
      message: "Enter a valid email address.",
      messageKey: "contact.validation.emailInvalid",
    });
  }

  if (!payload.message || payload.message.trim().length < 10 || payload.message.trim().length > 1500) {
    issues.push({
      field: "message",
      message: "Message must be between 10 and 1500 characters.",
      messageKey: "contact.validation.messageRange",
    });
  }

  if (!payload.challengeId) {
    issues.push({
      field: "challengeId",
      message: "Captcha challenge is required.",
      messageKey: "contact.validation.challengeRequired",
    });
  }

  if (!payload.challengeAnswer) {
    issues.push({
      field: "challengeAnswer",
      message: "Captcha answer is required.",
      messageKey: "contact.validation.answerRequired",
    });
  }

  if (payload.context && payload.context.length > 3000) {
    issues.push({
      field: "context",
      message: "Context payload is too large.",
      messageKey: "contact.validation.contextTooLarge",
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues, data: null };
  }

  return {
    ok: true,
    issues: [],
    data: {
      name: payload.name!.trim(),
      email: payload.email!.trim(),
      message: payload.message!.trim(),
      challengeId: payload.challengeId!,
      challengeAnswer: payload.challengeAnswer!,
      context: payload.context ? sanitizePlainText(payload.context).slice(0, 3000) : undefined,
    },
  };
}
