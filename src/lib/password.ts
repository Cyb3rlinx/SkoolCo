import { createHash } from "node:crypto";

/**
 * Checks a password against HIBP Pwned Passwords using k-anonymity:
 * only the first 5 chars of the SHA-1 hash are sent; the password never leaves.
 * Fails OPEN: if HIBP is unreachable we do not block the user.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body
      .split("\n")
      .some((line) => line.split(":")[0].trim().toUpperCase() === suffix);
  } catch {
    return false;
  }
}
