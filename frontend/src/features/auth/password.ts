// The password protects the encryption keys and cannot be reset, so require a strong one
export const PASSWORD_RULES: [string, (pw: string) => boolean][] = [
  ["At least 10 characters", (pw) => pw.length >= 10],
  ["Upper and lower case letters", (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw)],
  ["A number", (pw) => /\d/.test(pw)],
  ["A symbol", (pw) => /[^A-Za-z0-9]/.test(pw)],
];

export const isStrongPassword = (pw: string) => PASSWORD_RULES.every(([, test]) => test(pw)) && pw.length <= 256;
