import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/active', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, role: true },
  });

  res.json(users);
});

export default router;