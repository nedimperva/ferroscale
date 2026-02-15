interface Challenge {
  answer: string;
  expiresAt: number;
}

const CAPTCHA_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

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

export function createCaptchaChallenge(): { challengeId: string; prompt: string } {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 2;
  const answer = String(left + right);
  const challengeId = crypto.randomUUID();
  const now = Date.now();

  challengeStore.set(challengeId, {
    answer,
    expiresAt: now + CAPTCHA_TTL_MS,
  });
  cleanupChallenges(now);

  return {
    challengeId,
    prompt: `${left} + ${right} = ?`,
  };
}

export function verifyCaptchaChallenge(challengeId: string, answer: string): boolean {
  const now = Date.now();
  const challenge = challengeStore.get(challengeId);

  if (!challenge || challenge.expiresAt <= now) {
    challengeStore.delete(challengeId);
    return false;
  }

  challengeStore.delete(challengeId);
  return challenge.answer === answer.trim();
}
