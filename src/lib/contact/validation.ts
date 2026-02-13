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
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactRequest(payload: Partial<ContactRequest>): ContactValidationIssue[] {
  const issues: ContactValidationIssue[] = [];

  if (!payload.name || payload.name.trim().length < 2 || payload.name.trim().length > 80) {
    issues.push({
      field: "name",
      message: "Name must be between 2 and 80 characters.",
    });
  }

  if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
    issues.push({
      field: "email",
      message: "Enter a valid email address.",
    });
  }

  if (!payload.message || payload.message.trim().length < 10 || payload.message.trim().length > 1500) {
    issues.push({
      field: "message",
      message: "Message must be between 10 and 1500 characters.",
    });
  }

  if (!payload.challengeId) {
    issues.push({
      field: "challengeId",
      message: "Captcha challenge is required.",
    });
  }

  if (!payload.challengeAnswer) {
    issues.push({
      field: "challengeAnswer",
      message: "Captcha answer is required.",
    });
  }

  if (payload.context && payload.context.length > 3000) {
    issues.push({
      field: "context",
      message: "Context payload is too large.",
    });
  }

  return issues;
}
