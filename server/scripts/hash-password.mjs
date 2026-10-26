/**
 * Generate a bcrypt hash for the shop password.
 *
 * Usage:
 *   node scripts/hash-password.mjs "parola-ta"
 *   # or interactive (no password in shell history):
 *   node scripts/hash-password.mjs
 *
 * Put the printed line into server/.env or Azure App Settings as APP_PASSWORD_HASH.
 * Do NOT commit the plaintext password. Remove APP_PASSWORD after switching to the hash.
 */
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const ROUNDS = 12;

async function readPassword() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg;

  const rl = readline.createInterface({ input, output });
  try {
    const pwd = await rl.question('Parolă de hash-uit: ');
    return pwd.trim();
  } finally {
    rl.close();
  }
}

const password = await readPassword();
if (!password) {
  console.error('Parolă goală — anulat.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, ROUNDS);
console.log('');
console.log('Pune asta în .env / Azure App Settings:');
console.log(`APP_PASSWORD_HASH=${hash}`);
console.log('');
console.log('Apoi șterge APP_PASSWORD (nu mai e nevoie de parola în clar).');
