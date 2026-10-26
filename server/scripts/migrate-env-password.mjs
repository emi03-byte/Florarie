/**
 * One-shot: APP_PASSWORD (plaintext in .env) -> APP_PASSWORD_HASH, then remove APP_PASSWORD.
 * Run: node scripts/migrate-env-password.mjs
 */
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  console.error('server/.env not found');
  process.exit(1);
}

let text = fs.readFileSync(envPath, 'utf8');
const m = text.match(/^APP_PASSWORD=(.*)$/m);
if (!m) {
  if (/^APP_PASSWORD_HASH=\S+/m.test(text)) {
    console.log('Already using APP_PASSWORD_HASH — nothing to do.');
    process.exit(0);
  }
  console.error('No APP_PASSWORD in .env');
  process.exit(1);
}

const plain = m[1].trim().replace(/^["']|["']$/g, '');
if (!plain) {
  console.error('Empty APP_PASSWORD');
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 12);
text = text.replace(/^APP_PASSWORD=.*\r?\n?/m, '');
if (/^APP_PASSWORD_HASH=/m.test(text)) {
  text = text.replace(/^APP_PASSWORD_HASH=.*$/m, `APP_PASSWORD_HASH=${hash}`);
} else {
  text = `APP_PASSWORD_HASH=${hash}\n${text}`;
}
text = text.replace(/\n{3,}/g, '\n\n');
fs.writeFileSync(envPath, text);
console.log('Migrated server/.env → APP_PASSWORD_HASH (plaintext APP_PASSWORD removed).');
