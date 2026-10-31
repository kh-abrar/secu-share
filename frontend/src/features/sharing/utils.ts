const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "a@x.io, b@y.io; c@z.io" -> unique, lowercased, valid addresses */
export function parseEmails(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => EMAIL_RE.test(s)))];
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** 16 characters from a CSPRNG, without look-alike characters */
export function generatePassword(length = 16): string {
  // Rejection sampling keeps every character equally likely
  const limit = 256 - (256 % PASSWORD_CHARS.length);
  let out = "";
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < limit && out.length < length) out += PASSWORD_CHARS[b % PASSWORD_CHARS.length];
    }
  }
  return out;
}
