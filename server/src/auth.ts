import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Keep sellers signed in for a work week; closing the tab still clears sessionStorage. */
const TOKEN_TTL = '7d';

export function getAppPassword(): string {
  return process.env.APP_PASSWORD || 'florarie';
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-florarie-secret-change-me';
}

export function issueToken(): string {
  return jwt.sign({ role: 'seller' }, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyPassword(password: string): boolean {
  return password === getAppPassword();
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
