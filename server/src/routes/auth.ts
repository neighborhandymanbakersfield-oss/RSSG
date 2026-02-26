import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.GROUP_LOGIN_USERNAME || password !== process.env.GROUP_LOGIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.groupSession.create({
    data: {
      sessionToken,
      expiresAt,
    },
  });

  res.cookie('sessionToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true });
});

export default router;