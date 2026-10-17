import { Router } from 'express';
import { issueToken, verifyPassword } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const password = String(req.body?.password ?? '');
  if (!verifyPassword(password)) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return;
  }
  res.json({ token: issueToken() });
});
