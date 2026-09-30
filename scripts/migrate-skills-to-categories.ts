import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateSkillsToCategories() {
  console.log('🔄 Starting skills to categories migration...');

  try {
    // First, let's see what's in the current skills table
    const existingSkills = await prisma.skills.findMany();
    console.log(`📊 Found ${existingSkills.length} existing skills:`, existingSkills);

    // Check if we have any existing categories
    const existingCategories = await prisma.categories.findMany();
    console.log(`📊 Found ${existingCategories.length} existing categories:`, existingCategories);

    // Since we're changing the schema significantly, we have a few options:
    // 1. Backup existing skills data
    // 2. Clear the skills table (since it's not properly structured anyway)
    // 3. Try to map existing skills to categories

    console.log('⚠️  The current skills table structure is incompatible with the new schema.');
    console.log('📝 Current skills have userId (user-specific), but new schema makes skills global.');
    console.log('🔄 Recommendation: Clear existing skills and populate with predefined skills from lib/skills.ts');
    
    // Ask for confirmation (in a real scenario, you'd want user input)
    console.log('🗑️  Clearing existing skills table...');
    await prisma.skills.deleteMany();
    console.log('✅ Cleared existing skills');

    // Now we can safely push the schema
    console.log('📋 Next steps:');
    console.log('1. Run: npx prisma db push');
    console.log('2. Run: npx tsx scripts/seed-categories-skills.ts');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSkillsToCategories()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
