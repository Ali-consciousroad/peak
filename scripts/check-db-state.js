const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseState() {
  console.log('🔍 Checking Database State...\n');

  try {
    // Check skills table
    console.log('1. Checking Skills table...');
    const skills = await prisma.skills.findMany();
    console.log(`   Found ${skills.length} skills`);
    if (skills.length > 0) {
      console.log('   Sample skill:', {
        id: skills[0].id,
        name: skills[0].name,
        description: skills[0].description,
        // Check if these fields exist
        hasCreatedAt: 'createdAt' in skills[0],
        hasUpdatedAt: 'updatedAt' in skills[0],
        hasFreelanceId: 'freelanceId' in skills[0],
      });
    }
    console.log('');

    // Check services table
    console.log('2. Checking Services table...');
    const services = await prisma.service.findMany();
    console.log(`   Found ${services.length} services`);
    if (services.length > 0) {
      console.log('   Sample service:', {
        id: services[0].id,
        name: services[0].name,
        price: services[0].price,
        description: services[0].description,
        // Check if these fields exist
        hasProficiencyLevel: 'proficiencyLevel' in services[0],
        hasSkillId: 'skillId' in services[0],
      });
    }
    console.log('');

    // Check freelancers
    console.log('3. Checking Freelancers...');
    const freelancers = await prisma.freelance.findMany();
    console.log(`   Found ${freelancers.length} freelancers`);
    if (freelancers.length > 0) {
      console.log(`   Sample freelancer ID: ${freelancers[0].id}`);
    }
    console.log('');

    console.log('✅ Database state check completed!');

  } catch (error) {
    console.error('❌ Error checking database state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDatabaseState(); 