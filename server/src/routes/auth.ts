import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { issueToken, verifyPassword } from '../auth.js';

export const authRouter = Router();

/** Simple in-memory rate limit: max attempts per IP in a window. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0]!.trim();
  return req.socket.remoteAddress || 'unknown';
}

function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = clientIp(req);
  const now = Date.now();
  let entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Prea multe încercări. Încearcă din nou mai târziu.' });
    return;
  }
  next();
}

authRouter.post('/login', rateLimitLogin, async (req, res) => {
  const password = String(req.body?.password ?? '');
  const ok = await verifyPassword(password);
  if (!ok) {
    res.status(401).json({ error: 'Parolă incorectă' });
    return;
  }
  // Successful login: ease the counter a bit
  const ip = clientIp(req);
  const entry = attempts.get(ip);
  if (entry) entry.count = Math.max(0, entry.count - 5);

  res.json({ token: issueToken() });
});
