import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function accessControl(req: Request, res: Response, next: NextFunction) {
  const selectedUserId = req.headers['x-selected-user-id'] as string;
  if (!selectedUserId) {
    return res.status(401).json({ error: 'No selected user' });
  }

  const userId = parseInt(selectedUserId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    return res.status(403).json({ error: 'User not found or inactive' });
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.VIP) {
    // Allow
    (req as any).user = user;
    return next();
  }

  if (user.role === UserRole.TEMP) {
    // Check for valid pass
    const pass = await prisma.accessPass.findFirst({
      where: {
        userId: user.id,
        isRevoked: false,
        startsAt: { lte: new Date() },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pass) {
      return res.status(403).json({ error: 'Your Restaurant Superstar pass has expired or is not allowed.' });
    }

    // Check if pass type is enabled in GlobalSettings
    const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      return res.status(500).json({ error: 'Settings not found' });
    }

    const enabled = {
      HOURS_24: settings.enable24HourPass,
      DAYS_3: settings.enable3DayPass,
      DAYS_7: settings.enable7DayPass,
      DAYS_30: settings.enable30DayPass,
    }[pass.type];

    if (!enabled) {
      return res.status(403).json({ error: 'Your Restaurant Superstar pass has expired or is not allowed.' });
    }

    (req as any).user = user;
    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
}