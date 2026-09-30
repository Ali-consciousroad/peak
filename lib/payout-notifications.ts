import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { formatFreelancerPayoutDetailsForAdmin } from '@/lib/payout-display';

/**
 * Notify all admins that they must complete an off-chain payout; message includes
 * freelancer bank / wallet details loaded fresh from their profile.
 */
export async function notifyAdminsPayoutActionRequired(params: {
  missionId: string | null;
  title: string;
  intro: string;
  freelancerId: string;
}): Promise<void> {
  try {
    const profile = await prisma.users.findUnique({
      where: { id: params.freelancerId },
      select: {
        preferredPaymentMethod: true,
        bankAccount: true,
        cryptoWalletAddress: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    if (!profile) {
      console.error('notifyAdminsPayoutActionRequired: freelancer not found', params.freelancerId);
      return;
    }

    const adminRole = await prisma.roles.findFirst({
      where: { name: 'admin' },
      select: { id: true }
    });
    if (!adminRole?.id) return;

    const admins = await prisma.users.findMany({
      where: { roleId: adminRole.id },
      select: { id: true }
    });
    if (admins.length === 0) return;

    const detail = formatFreelancerPayoutDetailsForAdmin(profile);
    const message = `${params.intro} ${detail}`;

    await prisma.notifications.createMany({
      data: admins.map((admin) => ({
        id: randomUUID(),
        userId: admin.id,
        type: 'payout_action_required',
        missionId: params.missionId,
        title: params.title,
        message,
        updatedAt: new Date()
      }))
    });
  } catch (e) {
    console.error('Failed to create admin payout notifications:', e);
  }
}
