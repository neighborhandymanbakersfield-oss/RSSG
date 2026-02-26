import express from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check if user is Master Admin
function requireMasterAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (user.role !== UserRole.ADMIN || !user.isMasterAdmin) {
    return res.status(403).json({ error: 'Master Admin required' });
  }
  next();
}

router.use(requireMasterAdmin);

// GET /master-settings
router.get('/', async (req, res) => {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  const tempUsers = await prisma.user.count({
    where: { isActive: true, role: 'TEMP' },
  });
  const activePasses = await prisma.accessPass.groupBy({
    by: ['type'],
    where: { isRevoked: false, expiresAt: { gt: new Date() } },
    _count: true,
  });
  const lastNotification = await prisma.notificationPreference.findFirst({
    orderBy: { lastNotifiedAt: 'desc' },
    select: { lastNotifiedAt: true },
  });

  res.json({
    settings,
    stats: {
      activeUsers,
      tempUsers,
      activePasses,
      lastNotificationAt: lastNotification?.lastNotifiedAt,
    },
  });
});

// PUT /master-settings
router.put('/', async (req, res) => {
  const data = req.body;
  const settings = await prisma.globalSettings.update({
    where: { id: 1 },
    data,
  });
  res.json(settings);
});

export default router;