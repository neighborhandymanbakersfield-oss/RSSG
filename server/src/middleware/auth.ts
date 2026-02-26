import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authenticateGroupSession(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies.sessionToken;
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token' });
  }

  const session = await prisma.groupSession.findUnique({
    where: { sessionToken },
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Extend session if needed, but for now, just proceed
  next();
}