import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendReminderNotification } from '../bot';

export function startCronJobs() {
  // Check reminders every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const dueReminders = await prisma.reminder.findMany({
        where: {
          isActive: true,
          nextDate: { gte: now, lte: oneHourLater },
        },
        include: { user: { select: { telegramId: true } } },
      });

      for (const reminder of dueReminders) {
        try {
          await sendReminderNotification(
            Number(reminder.user.telegramId),
            reminder.title,
            reminder.amount ? Number(reminder.amount) : undefined
          );

          const nextDate = computeNextDate(reminder.nextDate, reminder.recurrence);
          if (reminder.recurrence === 'once') {
            await prisma.reminder.update({ where: { id: reminder.id }, data: { isActive: false } });
          } else {
            await prisma.reminder.update({ where: { id: reminder.id }, data: { nextDate } });
          }
        } catch (err) {
          console.error(`Failed to send reminder ${reminder.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Cron job failed (DB unavailable?):', err);
    }
  });

  console.log('Cron jobs started');
}

function computeNextDate(current: Date, recurrence: string): Date {
  const next = new Date(current);
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
