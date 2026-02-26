import express from 'express';
import { PrismaClient, UserRole, PassType, NotificationChannel } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check if user is ADMIN
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin required' });
  }
  next();
}

router.use(requireAdmin);

// GET /admin/users - list all users
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      notificationPreference: true,
      accessPasses: {
        where: { isRevoked: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  res.json(users);
});

// POST /admin/users - create new user
router.post('/users', async (req, res) => {
  const { displayName, role, email, phone } = req.body;

  // Check maxUsers
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  const activeCount = await prisma.user.count({ where: { isActive: true } });
  if (activeCount >= settings!.maxUsers) {
    return res.status(400).json({ error: 'Max users reached' });
  }

  if (role === UserRole.TEMP && !settings!.allowNewTempUsers) {
    return res.status(400).json({ error: 'New TEMP users not allowed' });
  }

  const user = await prisma.user.create({
    data: {
      displayName,
      role,
      email,
      phone,
      isActive: true,
    },
  });

  // Create notification preference
  await prisma.notificationPreference.create({
    data: {
      userId: user.id,
      channel: settings!.defaultNotificationChannel,
      enabled: true,
    },
  });

  res.json(user);
});

// PATCH /admin/users/:id - update user
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { displayName, role, email, phone, isActive } = req.body;

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { displayName, role, email, phone, isActive },
  });

  res.json(user);
});

// POST /admin/passes - issue new pass
router.post('/passes', async (req, res) => {
  const { userId, type } = req.body;
  const adminId = (req as any).user.id;

  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  const enabledMap: Record<PassType, boolean> = {
    HOURS_24: settings!.enable24HourPass,
    DAYS_3: settings!.enable3DayPass,
    DAYS_7: settings!.enable7DayPass,
    DAYS_30: settings!.enable30DayPass,
  };
  const enabled = enabledMap[type as PassType];

  if (!enabled) {
    return res.status(400).json({ error: 'Pass type not enabled' });
  }

  const durationMap: Record<PassType, number> = {
    HOURS_24: 24 * 60 * 60 * 1000,
    DAYS_3: 3 * 24 * 60 * 60 * 1000,
    DAYS_7: 7 * 24 * 60 * 60 * 1000,
    DAYS_30: 30 * 24 * 60 * 60 * 1000,
  };
  const duration = durationMap[type as PassType];

  const pass = await prisma.accessPass.create({
    data: {
      userId: parseInt(userId),
      type,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      createdByAdminId: adminId,
    },
  });

  res.json(pass);
});

// PATCH /admin/passes/:id/revoke - revoke pass
router.patch('/passes/:id/revoke', async (req, res) => {
  const { id } = req.params;

  const pass = await prisma.accessPass.update({
    where: { id: parseInt(id) },
    data: { isRevoked: true },
  });

  res.json(pass);
});

export default router;