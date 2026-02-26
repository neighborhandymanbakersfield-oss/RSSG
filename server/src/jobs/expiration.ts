import { PrismaClient } from '@prisma/client';

export function startExpirationJob(prisma: PrismaClient) {
  setInterval(async () => {
    const expiredPasses = await prisma.accessPass.findMany({
      where: {
        isRevoked: false,
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredPasses.length > 0) {
      console.log(`Found ${expiredPasses.length} expired passes`);
      // Optionally, mark them or log
    }
  }, 60 * 1000); // Every minute
}