import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix missions that have contracts but status is still OPEN
 * These should be IN_PROGRESS
 */
async function fixMissionStatus() {
  try {
    console.log('🔍 Finding missions with contracts but status is OPEN...');

    // Find all missions that have contracts but status is OPEN
    const missionsWithContracts = await prisma.missions.findMany({
      where: {
        status: 'OPEN',
        contracts: {
          isNot: null
        }
      },
      include: {
        contracts: true
      }
    });

    console.log(`📋 Found ${missionsWithContracts.length} missions with contracts but status is OPEN`);

    if (missionsWithContracts.length === 0) {
      console.log('✅ No missions need fixing!');
      return;
    }

    // Update each mission to IN_PROGRESS
    for (const mission of missionsWithContracts) {
      console.log(`🔄 Updating mission "${mission.title}" (${mission.id}) from OPEN to IN_PROGRESS...`);
      
      await prisma.missions.update({
        where: { id: mission.id },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      });

      console.log(`✅ Updated mission "${mission.title}" to IN_PROGRESS`);
    }

    console.log(`\n✅ Successfully fixed ${missionsWithContracts.length} mission(s)!`);
  } catch (error) {
    console.error('❌ Error fixing mission status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMissionStatus()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
