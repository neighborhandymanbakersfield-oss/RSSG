import { PrismaClient } from '@prisma/client';
import sgMail from '@sendgrid/mail';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const prisma = new PrismaClient();

const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
const hasValidSendGridApiKey = !!sendgridApiKey && sendgridApiKey.startsWith('SG.');

if (hasValidSendGridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const snsClient = awsAccessKeyId && awsSecretAccessKey
  ? new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  })
  : null;

export async function sendNotifications(messageId: number) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: true },
  });
  if (!message) return;

  const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  if (!settings) return;

  if (!settings.enableEmailNotifications && !settings.enableSMSNotifications) return;

  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { notificationPreference: true },
  });

  for (const user of users) {
    if (user.id === message.userId) continue; // Don't notify sender

    const pref = user.notificationPreference;
    if (!pref || !pref.enabled) continue;

    const now = new Date();
    if (pref.lastNotifiedAt && (now.getTime() - pref.lastNotifiedAt.getTime()) < settings.notificationThrottleMinutes * 60 * 1000) {
      continue;
    }

    if (pref.channel === 'EMAIL' && settings.enableEmailNotifications) {
      if (!hasValidSendGridApiKey || !sendgridFromEmail) continue;
      if (settings.requireEmailForEmailNotifications && !user.email) continue;
      if (user.email) {
        await sgMail.send({
          to: user.email,
          from: sendgridFromEmail,
          subject: 'New message in Restaurant Superstar Group',
          text: `New message from ${message.user.displayName}: ${message.content}`,
        });
      }
    } else if (pref.channel === 'SMS' && settings.enableSMSNotifications) {
      if (!snsClient) continue;
      if (settings.requirePhoneForSMS && !user.phone) continue;
      if (user.phone) {
        const command = new PublishCommand({
          Message: `New message from ${message.user.displayName}: ${message.content}`,
          PhoneNumber: user.phone,
        });
        await snsClient.send(command);
      }
    }

    // Update lastNotifiedAt
    await prisma.notificationPreference.update({
      where: { userId: user.id },
      data: { lastNotifiedAt: now },
    });
  }
}
