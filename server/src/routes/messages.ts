import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/history', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { deleted: false },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      user: {
        select: { displayName: true, role: true },
      },
    },
  });

  const formatted = messages.map(m => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    userDisplayName: m.user.displayName,
    userRole: m.user.role,
  }));

  res.json(formatted);
});

export default router;