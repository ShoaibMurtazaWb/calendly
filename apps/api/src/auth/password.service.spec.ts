import { PasswordService } from "./password.service";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("PasswordService", () => {
  const passwords = new PasswordService();

  it("hashes with argon2 and verifies the original password", async () => {
    const hash = await passwords.hash("correct-horse-battery");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await passwords.verify(hash, "correct-horse-battery")).toBe(true);
    expect(await passwords.verify(hash, "wrong-password-value")).toBe(false);
  });
});

describe("session tokens", () => {
  it("hashes tokens so the raw value is not recoverable from storage", () => {
    const token = generateSessionToken();
    const hashed = hashSessionToken(token);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hashed);
  });
});
