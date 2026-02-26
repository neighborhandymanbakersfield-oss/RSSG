import { PrismaClient } from '@prisma/client';
import { UNACTIVATED_PASS_DATE } from '../utils/passPolicy';

export function startExpirationJob(prisma: PrismaClient) {
  setInterval(async () => {
    const now = new Date();

    const revoked = await prisma.accessPass.updateMany({
      where: {
        isRevoked: false,
        startsAt: { gt: UNACTIVATED_PASS_DATE },
        expiresAt: { lt: now },
      },
      data: {
        isRevoked: true,
      },
    });

    const deactivated = await prisma.user.updateMany({
      where: {
        role: 'TEMP',
        isActive: true,
        accessPasses: {
          none: {
            isRevoked: false,
            OR: [
              {
                startsAt: { gt: UNACTIVATED_PASS_DATE },
                expiresAt: { gt: now },
              },
              {
                startsAt: UNACTIVATED_PASS_DATE,
                expiresAt: UNACTIVATED_PASS_DATE,
              },
            ],
          },
        },
      },
      data: {
        isActive: false,
      },
    });

    if (revoked.count > 0 || deactivated.count > 0) {
      console.log(`Pass expiration job: revoked ${revoked.count}, deactivated ${deactivated.count}`);
    }
  }, 60 * 1000); // Every minute
}
