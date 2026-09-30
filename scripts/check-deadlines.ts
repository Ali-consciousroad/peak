import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOverdueMissions() {
  try {
    console.log('🕐 Checking for overdue missions...');

    // Find missions that are overdue (past deadline but not yet marked as overdue)
    const overdueMissions = await prisma.missions.findMany({
      where: {
        status: 'IN_PROGRESS',
        deadline: { lte: new Date() }
      },
      include: {
        client: true,
        contract: {
          include: {
            freelancer: true
          }
        },
        payments: true
      }
    });

    console.log(`📋 Found ${overdueMissions.length} overdue missions`);

    for (const mission of overdueMissions) {
      console.log(`⏰ Mission "${mission.title}" is overdue (deadline: ${mission.deadline})`);
      
      // Update mission status to OVERDUE
      await prisma.missions.update({
        where: { id: mission.id },
        data: {
          status: 'OVERDUE'
        }
      });

      console.log(`✅ Updated mission "${mission.title}" to OVERDUE status`);
    }

    // Find missions that are past grace period and need admin review
    const expiredMissions = await prisma.missions.findMany({
      where: {
        status: 'OVERDUE',
        gracePeriodEnd: { lte: new Date() },
      },
      include: {
        client: true,
        contract: {
          include: {
            freelancer: true
          }
        },
        payments: true
      }
    });

    console.log(`📋 Found ${expiredMissions.length} missions past grace period`);

    for (const mission of expiredMissions) {
      console.log(`💸 Mission "${mission.title}" is past grace period, processing auto-refund...`);
      
      // Calculate refund amount (unpaid portion)
      const totalPaid = mission.payments.reduce((sum, payment) => {
        if (['RELEASED_1', 'RELEASED_2', 'COMPLETED'].includes(payment.status)) {
          return sum + Number(payment.amount);
        }
        return sum;
      }, 0);

      const totalAmount = Number(mission.dailyRate) * mission.timeframe;
      const refundAmount = totalAmount - totalPaid;

      if (refundAmount > 0) {
        console.log(`💰 Refunding ${refundAmount} EUR to client for mission "${mission.title}"`);
        
        // Create refund payment record
        await prisma.payments.create({
          data: {
            amount: refundAmount,
            paymentMethod: 'AUTO_REFUND',
            transactionDate: new Date(),
            missionId: mission.id,
            status: 'COMPLETED',
            userId: mission.clientId,
            currencyId: mission.payments[0]?.currencyId || null
          }
        });

        // Update mission status to REFUNDED
        await prisma.missions.update({
          where: { id: mission.id },
          data: {
            status: 'REFUNDED'
          }
        });

        console.log(`✅ Mission "${mission.title}" marked as REFUNDED and refund processed`);
      } else {
        console.log(`ℹ️ No refund needed for mission "${mission.title}" (already fully paid)`);
        
        // Just mark as refunded
        await prisma.missions.update({
          where: { id: mission.id },
          data: {
            status: 'REFUNDED'
          }
        });
      }
    }

    console.log('🎉 Deadline checking completed successfully!');

  } catch (error) {
    console.error('❌ Error checking deadlines:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkOverdueMissions();
