/* passwords.js — bcrypt hashes Laravel and this service both accept, and the password rule.
   users.password (Laravel) and the credential account hold the same "$2y$" hash. */
import bcrypt from "bcryptjs";

// Laravel's default cost (BCRYPT_ROUNDS).
const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

/** "$2y$" like PHP's password_hash: the same algorithm as "$2b$", the prefix PHP verifies. */
export async function hashPassword(password) {
  const hash = await bcrypt.hash(password, ROUNDS);
  return hash.replace(/^\$2[ab]\$/, "$2y$");
}

/** Accepts the "$2y$" hashes Laravel writes, and "$2a$" / "$2b$". */
export async function verifyPassword({ hash, password }) {
  if (typeof hash !== "string" || !/^\$2[aby]\$\d\d\$/.test(hash)) return false;
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, "$2b$"));
}

/** The rule of Laravel's registration: Password::min(8)->mixedCase()->numbers()->symbols(). */
export function passwordProblem(password) {
  if (typeof password !== "string" || [...password].length < 8) return "TOO_SHORT";
  if (!/\p{Ll}/u.test(password) || !/\p{Lu}/u.test(password)) return "MIXED_CASE";
  if (!/\p{N}/u.test(password)) return "NUMBER";
  if (!/[\p{P}\p{S}]/u.test(password)) return "SYMBOL";
  // bcrypt only reads 72 bytes: anything longer would be silently cut.
  if (new TextEncoder().encode(password).length > 72) return "TOO_LONG";
  return null;
}
