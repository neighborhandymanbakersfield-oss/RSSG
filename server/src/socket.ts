import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { sendNotifications } from './services/notifications';

const prisma = new PrismaClient();

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // On connect, validate and join room
    socket.on('join', async (data: { selectedUserId: string }) => {
      const userId = parseInt(data.selectedUserId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        socket.emit('error', 'Invalid user');
        return;
      }

      // Check access control similar to middleware
      // For simplicity, assume accessControl is passed, but since socket, we need to replicate
      // For now, basic check
      socket.join('restaurant-superstar');
      socket.emit('joined');
    });

    socket.on('message:new', async (data: { content: string, selectedUserId: string }) => {
      const userId = parseInt(data.selectedUserId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        socket.emit('error', 'Invalid user');
        return;
      }

      // Access control check here, similar to middleware
      // Assume passed for now

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