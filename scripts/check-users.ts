import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking existing users in database...\n');

  try {
    const users = await prisma.users.findMany({
      include: {
        client: true,
        freelance: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Clerk ID: ${user.clerkId || 'Not set'}`);
      console.log(`   Login: ${user.login}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      
      if (user.freelance) {
        console.log(`   Freelancer: ${user.freelance.firstName} ${user.freelance.lastName}`);
        console.log(`   VAT: ${user.freelance.vat || 'Not set'}`);
      }
      
      if (user.client) {
        console.log(`   Client Company: ${user.client.company}`);
        console.log(`   VAT: ${user.client.vat || 'Not set'}`);
      }
      
      console.log('');
    });

    // Summary
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Role Summary:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });

    const freelancersWithNames = users.filter(user => 
      user.freelance && 
      user.freelance.firstName && 
      user.freelance.lastName &&
      user.freelance.firstName !== 'First' &&
      user.freelance.lastName !== 'Last'
    );

    console.log(`\n✅ Freelancers with proper names: ${freelancersWithNames.length}`);
    console.log(`❌ Freelancers with default names: ${users.filter(u => u.freelance).length - freelancersWithNames.length}`);

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 