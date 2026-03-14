interface Challenge {
  answer: string;
  expiresAt: number;
  attempts: number;
}

const CAPTCHA_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;
const MAX_ATTEMPTS_PER_CHALLENGE = 3;

const challengeStore = new Map<string, Challenge>();

function cleanupChallenges(now: number): void {
  for (const [key, value] of challengeStore.entries()) {
    if (value.expiresAt <= now) {
      challengeStore.delete(key);
    }
  }

  if (challengeStore.size <= MAX_ENTRIES) {
    return;
  }

  const sorted = [...challengeStore.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const overflow = challengeStore.size - MAX_ENTRIES;
  for (let index = 0; index < overflow; index += 1) {
    challengeStore.delete(sorted[index][0]);
  }
}

type CaptchaOp = "+" | "-" | "\u00D7";

/**
 * Generate a math challenge using mixed operations (+, -, ×) with larger
 * numbers. This produces a much wider answer space than simple single-digit
 * addition, making brute-force impractical.
 */
export function createCaptchaChallenge(): { challengeId: string; prompt: string } {
  const ops: CaptchaOp[] = ["+", "-", "\u00D7"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let left: number;
  let right: number;
  let answer: number;

  switch (op) {
    case "+":
      left = Math.floor(Math.random() * 41) + 10;
      right = Math.floor(Math.random() * 41) + 10;
      answer = left + right;
      break;
    case "-":
      left = Math.floor(Math.random() * 41) + 20;
      right = Math.floor(Math.random() * (left - 1)) + 1;
      answer = left - right;
      break;
    case "\u00D7":
      left = Math.floor(Math.random() * 9) + 2;
      right = Math.floor(Math.random() * 9) + 2;
      answer = left * right;
      break;
  }

  const challengeId = crypto.randomUUID();
  const now = Date.now();

  challengeStore.set(challengeId, {
    answer: String(answer),
    expiresAt: now + CAPTCHA_TTL_MS,
    attempts: 0,
  });
  cleanupChallenges(now);

  return {
    challengeId,
    prompt: `${left} ${op} ${right} = ?`,
  };
}

export function verifyCaptchaChallenge(challengeId: string, answer: string): boolean {
  const now = Date.now();
  const challenge = challengeStore.get(challengeId);

  if (!challenge || challenge.expiresAt <= now) {
    challengeStore.delete(challengeId);
    return false;
  }

  challenge.attempts += 1;
  if (challenge.attempts > MAX_ATTEMPTS_PER_CHALLENGE) {
    challengeStore.delete(challengeId);
    return false;
  }

  const correct = challenge.answer === answer.trim();
  if (correct) {
    challengeStore.delete(challengeId);
  }
  return correct;
}
