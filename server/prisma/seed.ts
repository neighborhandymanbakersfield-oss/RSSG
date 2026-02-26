import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create GlobalSettings if not exists
  const settings = await prisma.globalSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maxUsers: 15,
      allowNewTempUsers: true,
      enable24HourPass: true,
      enable3DayPass: true,
      enable7DayPass: true,
      enable30DayPass: true,
      enableEmailNotifications: true,
      enableSMSNotifications: true,
      defaultNotificationChannel: 'EMAIL',
      notificationThrottleMinutes: 5,
      requirePhoneForSMS: true,
      requireEmailForEmailNotifications: true,
    },
  });

  // Create Master Admin
  const masterAdmin = await prisma.user.upsert({
    where: { displayName: 'Jason Manuel' },
    update: {},
    create: {
      displayName: 'Jason Manuel',
      role: 'ADMIN',
      isMasterAdmin: true,
      isActive: true,
    },
  });

  // Create NotificationPreference for Master Admin
  await prisma.notificationPreference.upsert({
    where: { userId: masterAdmin.id },
    update: {},
    create: {
      userId: masterAdmin.id,
      channel: settings.defaultNotificationChannel,
      enabled: true,
    },
  });

  console.log('Seeded database');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });