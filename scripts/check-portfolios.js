const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPortfolios() {
  try {
    console.log('📋 Checking existing portfolios...\n');

    const portfolios = await prisma.portfolios.findMany({
      include: {
        freelance: {
          include: {
            user: true
          }
        }
      }
    });

    console.log(`Found ${portfolios.length} portfolios:\n`);

    portfolios.forEach((portfolio, index) => {
      console.log(`${index + 1}. Portfolio ID: ${portfolio.id}`);
      console.log(`   Name: ${portfolio.name}`);
      console.log(`   URL: ${portfolio.projectUrl || 'No URL'}`);
      console.log(`   Description: ${portfolio.description || 'No description'}`);
      console.log(`   Owner: ${portfolio.freelance.user.login} (${portfolio.freelance.user.role})`);
      console.log(`   Created: ${portfolio.createdAt}`);
      console.log(`   Updated: ${portfolio.updatedAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking portfolios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPortfolios(); 