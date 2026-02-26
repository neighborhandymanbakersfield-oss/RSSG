import express from 'express';
import { PrismaClient, UserRole, PassType } from '@prisma/client';
import { PASS_DURATION_MS, UNACTIVATED_PASS_DATE } from '../utils/passPolicy';

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
  const { displayName, role, email, phone, isMasterAdmin } = req.body;

  // Check maxUsers
  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  const activeCount = await prisma.user.count({ where: { isActive: true } });
  if (activeCount >= settings!.maxUsers) {
    return res.status(400).json({ error: 'Max users reached' });
  }

  if (role === UserRole.TEMP && !settings!.allowNewTempUsers) {
    return res.status(400).json({ error: 'New TEMP users not allowed' });
  }

  const wantsMasterAdmin = Boolean(isMasterAdmin);
  if (wantsMasterAdmin && role !== UserRole.ADMIN) {
    return res.status(400).json({ error: 'Only ADMIN users can be Master Admins' });
  }

  if (wantsMasterAdmin) {
    const activeMasterAdminCount = await prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        isMasterAdmin: true,
        isActive: true,
      },
    });
    if (activeMasterAdminCount >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 active Master Admins allowed' });
    }
  }

  const user = await prisma.user.create({
    data: {
      displayName,
      role,
      email,
      phone,
      isActive: true,
      isMasterAdmin: wantsMasterAdmin,
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
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { displayName, role, email, phone, isActive, isMasterAdmin } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existingUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const nextRole = role ?? existingUser.role;
  const nextIsActive = typeof isActive === 'boolean' ? isActive : existingUser.isActive;
  const nextIsMasterAdmin = typeof isMasterAdmin === 'boolean' ? isMasterAdmin : existingUser.isMasterAdmin;

  if (nextIsMasterAdmin && nextRole !== UserRole.ADMIN) {
    return res.status(400).json({ error: 'Only ADMIN users can be Master Admins' });
  }

  const consumingNewMasterSlot = nextIsMasterAdmin
    && nextIsActive
    && !(existingUser.isMasterAdmin && existingUser.isActive);

  if (consumingNewMasterSlot) {
    const activeMasterAdminCount = await prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        isMasterAdmin: true,
        isActive: true,
        id: { not: userId },
      },
    });
    if (activeMasterAdminCount >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 active Master Admins allowed' });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { displayName, role, email, phone, isActive, isMasterAdmin },
  });

  res.json(user);
});

// POST /admin/passes - issue new pass
router.post('/passes', async (req, res) => {
  const { userId, type } = req.body;
  const adminId = (req as any).user.id;
  const parsedUserId = parseInt(userId);

  if (isNaN(parsedUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const tempUser = await prisma.user.findUnique({
    where: { id: parsedUserId },
  });
  if (!tempUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (tempUser.role !== UserRole.TEMP) {
    return res.status(400).json({ error: 'Passes can only be issued to TEMP users' });
  }

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

  if (!(type in PASS_DURATION_MS)) {
    return res.status(400).json({ error: 'Invalid pass type' });
  }

  // Keep only the newest pending pass per TEMP user to avoid accidental multiple queued passes.
  await prisma.accessPass.updateMany({
    where: {
      userId: parsedUserId,
      isRevoked: false,
      startsAt: UNACTIVATED_PASS_DATE,
      expiresAt: UNACTIVATED_PASS_DATE,
    },
    data: {
      isRevoked: true,
    },
  });

  const pass = await prisma.accessPass.create({
    data: {
      userId: parsedUserId,
      type,
      startsAt: UNACTIVATED_PASS_DATE,
      expiresAt: UNACTIVATED_PASS_DATE,
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
