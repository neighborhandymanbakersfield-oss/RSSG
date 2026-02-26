import { Server, Socket } from 'socket.io';
import { PrismaClient, UserRole } from '@prisma/client';
import { sendNotifications } from './services/notifications';
import { UNACTIVATED_PASS_DATE, getPassExpiry } from './utils/passPolicy';

const prisma = new PrismaClient();

async function canUserAccessChat(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return false;

  if (user.role === UserRole.ADMIN || user.role === UserRole.VIP) {
    return true;
  }

  if (user.role !== UserRole.TEMP) {
    return false;
  }

  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  if (!settings) return false;

  const now = new Date();

  await prisma.accessPass.updateMany({
    where: {
      userId,
      isRevoked: false,
      startsAt: { gt: UNACTIVATED_PASS_DATE },
      expiresAt: { lte: now },
    },
    data: {
      isRevoked: true,
    },
  });

  let pass = await prisma.accessPass.findFirst({
    where: {
      userId,
      isRevoked: false,
      startsAt: { lte: now },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!pass) {
    const pendingPass = await prisma.accessPass.findFirst({
      where: {
        userId,
        isRevoked: false,
        startsAt: UNACTIVATED_PASS_DATE,
        expiresAt: UNACTIVATED_PASS_DATE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingPass) {
      const startsAt = now;
      const expiresAt = getPassExpiry(pendingPass.type, startsAt);

      pass = await prisma.accessPass.update({
        where: { id: pendingPass.id },
        data: { startsAt, expiresAt },
      });
    }
  }

  if (!pass) return false;

  const enabled = {
    HOURS_24: settings.enable24HourPass,
    DAYS_3: settings.enable3DayPass,
    DAYS_7: settings.enable7DayPass,
    DAYS_30: settings.enable30DayPass,
  }[pass.type];

  return Boolean(enabled);
}

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // On connect, validate and join room
    socket.on('join', async (data: { selectedUserId: string }) => {
      const userId = parseInt(data.selectedUserId);
      if (isNaN(userId)) {
        socket.emit('error', 'Invalid user');
        return;
      }

      const allowed = await canUserAccessChat(userId);
      if (!allowed) {
        socket.emit('error', 'Your Restaurant Superstar pass has expired or is not allowed.');
        return;
      }
      socket.join('restaurant-superstar');
      socket.emit('joined');
    });

    socket.on('message:new', async (data: { content: string, selectedUserId: string }) => {
      const userId = parseInt(data.selectedUserId);
      if (isNaN(userId)) {
        socket.emit('error', 'Invalid user');
        return;
      }

      const allowed = await canUserAccessChat(userId);
      if (!allowed) {
        socket.emit('error', 'Your Restaurant Superstar pass has expired or is not allowed.');
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        socket.emit('error', 'Invalid user');
        return;
      }

      const message = await prisma.message.create({
        data: {
          userId,
          content: data.content,
        },
        include: { user: { select: { displayName: true, role: true } } },
      });

      const payload = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        userDisplayName: message.user.displayName,
        userRole: message.user.role,
      };

      io.to('restaurant-superstar').emit('message:new', payload);

      // Send notifications
      await sendNotifications(message.id);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}
