import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/** Keep sellers signed in for a work week; closing the tab still clears sessionStorage. */
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.WEBSITE_SITE_NAME);

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (isProd) {
    throw new Error('JWT_SECRET lipsește — setează-l în App Settings / .env');
  }
  console.warn('[auth] JWT_SECRET lipsește; folosesc secret de dezvoltare (doar local).');
  return 'dev-florarie-secret-change-me';
}

/** Fixed shop login name (default: jardin). Override with APP_USERNAME. */
export function getShopUsername(): string {
  const fromEnv = process.env.APP_USERNAME?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'jardin';
}

/** bcrypt hash from APP_PASSWORD_HASH (preferred). */
export function getPasswordHash(): string | null {
  const hash = process.env.APP_PASSWORD_HASH?.trim();
  return hash || null;
}

export function issueToken(): string {
  return jwt.sign({ role: 'seller' }, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

/**
 * Verify shop password against APP_PASSWORD_HASH (bcrypt).
 * Legacy APP_PASSWORD (plaintext) is accepted only outside production, with a warning.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  if (!password) return false;

  const hash = getPasswordHash();
  if (hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  const legacy = process.env.APP_PASSWORD;
  if (legacy && !isProd) {
    console.warn(
      '[auth] APP_PASSWORD_HASH lipsește — compar plaintext (doar local). Rulează: npm run hash-password',
    );
    return password === legacy;
  }

  console.error('[auth] Nici APP_PASSWORD_HASH, nici APP_PASSWORD (local) nu sunt setate.');
  return false;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export type AuthedRequest = Request & { user?: { role: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Neautentificat' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as { role: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sesiune invalidă sau expirată' });
  }
}
