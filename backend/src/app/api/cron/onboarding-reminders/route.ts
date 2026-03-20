import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import prisma from "@/lib/prisma";
import { sendEmail, onboardingReminderEmailHtml } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/onboarding-reminders?secret=CRON_SECRET
 *
 * Called daily by an external cron service. Sends reminder emails
 * to users approaching their profile completion deadline.
 *
 *   Deadline - 7 days → "Reminder" email
 *   Deadline - 3 days → "Urgent" email
 *   Deadline - 1 day  → "Final Warning" email
 *
 * Protected by CRON_SECRET env var (not JWT auth).
 * Skips users who received a reminder in the last 23 hours.
 */
export const GET = createHandler({ public: true }, async (req) => {
  // Verify cron secret
  const secret = new URL(req.url).searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return jsonError("Unauthorized", 401);
  }

  const now = new Date();
  const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

  // Find users with pending profiles approaching deadline
  const users = await prisma.user.findMany({
    where: {
      profileComplete: false,
      accountDisabled: false,
      profileDeadline: { not: null },
      onboardingComplete: true, // Only remind users who've completed onboarding but not full profile
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lt: twentyThreeHoursAgo } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profileDeadline: true,
      lastReminderSentAt: true,
    },
  });

  let emailsSent = 0;

  for (const user of users) {
    if (!user.profileDeadline) continue;

    const msRemaining = user.profileDeadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    // Only send at specific intervals: 7, 3, 1 days
    if (daysRemaining !== 7 && daysRemaining !== 3 && daysRemaining !== 1) {
      continue;
    }

    try {
      await sendEmail(
        user.email,
        daysRemaining === 1
          ? "⚠️ Final Warning: Complete Your KnowAI Profile Today"
          : daysRemaining <= 3
          ? "⏰ Urgent: Your Profile Deadline is Approaching"
          : "📋 Reminder: Complete Your KnowAI Profile",
        onboardingReminderEmailHtml(`${user.firstName} ${user.lastName}`, daysRemaining)
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastReminderSentAt: now },
      });

      emailsSent++;
      logger.info({ userId: user.id, daysRemaining }, "Onboarding reminder sent");
    } catch (err) {
      logger.error({ userId: user.id, err }, "Failed to send onboarding reminder");
    }
  }

  return jsonOk({
    success: true,
    processed: users.length,
    emailsSent,
    timestamp: now.toISOString(),
  });
});
