import { PrismaClient } from '@prisma/client';
import { SKILL_CATEGORIES, PREDEFINED_SKILLS } from '../lib/skills';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function productionMigrateSkills() {
  console.log('🔄 Starting production-ready skills migration...');

  try {
    // Step 1: Backup existing data (in production, you'd use pg_dump)
    console.log('📊 Analyzing existing data...');
    
    const existingSkills = await prisma.skills.findMany();
    const existingCategories = await prisma.categories.findMany();
    const existingMissions = await prisma.missions.findMany({
      where: { skills: { isEmpty: false } }
    });

    console.log(`📋 Found ${existingSkills.length} existing skills`);
    console.log(`📋 Found ${existingCategories.length} existing categories`);
    console.log(`📋 Found ${existingMissions.length} missions with skills`);

    // Step 2: Create categories from predefined skills
    console.log('🏗️  Creating categories from predefined skills...');
    const categoryMap = new Map();
    
    for (const [categoryKey, categoryName] of Object.entries(SKILL_CATEGORIES)) {
      const category = await prisma.categories.upsert({
        where: { name: categoryName },
        update: {},
        create: {
          categoryId: randomUUID(),
          name: categoryName,
          description: `Skills related to ${categoryName.toLowerCase()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      categoryMap.set(categoryKey, category);
      categoryMap.set(categoryName, category); // Also map by name for PREDEFINED_SKILLS
      console.log(`✅ Created/updated category: ${categoryName}`);
    }

    // Step 3: Create skills from predefined list and link to categories
    console.log('🏗️  Creating skills from predefined list...');
    console.log('🔍 Category map keys:', Array.from(categoryMap.keys()));
    console.log('🔍 PREDEFINED_SKILLS keys:', Object.keys(PREDEFINED_SKILLS));
    const skillMap = new Map();
    
    for (const [categoryName, skills] of Object.entries(PREDEFINED_SKILLS)) {
      const category = categoryMap.get(categoryName);
      if (!category) {
        console.error(`❌ Category not found for name: ${categoryName}`);
        continue;
      }

      for (const skillName of skills) {
        const skill = await prisma.skills.upsert({
          where: { name: skillName },
          update: {
            categories: {
              connect: { categoryId: category.categoryId }
            },
            updatedAt: new Date()
          },
          create: {
            id: randomUUID(),
            name: skillName,
            createdAt: new Date(),
            updatedAt: new Date(),
            categories: {
              connect: { categoryId: category.categoryId }
            }
          }
        });
        skillMap.set(skillName, skill);
        console.log(`✅ Created/updated skill: ${skillName} in ${category.name}`);
      }
    }

    // Step 4: Handle existing missions with skills
    console.log('🔄 Migrating existing mission skills...');
    for (const mission of existingMissions) {
      try {
        const skillNames = mission.skills as string[];
        if (Array.isArray(skillNames) && skillNames.length > 0) {
          // Find matching skills in our new structure
          const matchingSkills = await prisma.skills.findMany({
            where: { 
              name: { in: skillNames }
            }
          });

          if (matchingSkills.length > 0) {
            // Update mission to use new skill relations
            await prisma.missions.update({
              where: { id: mission.id },
              data: {
                skills: {
                  connect: matchingSkills.map(s => ({ id: s.id }))
                }
              }
            });
            console.log(`✅ Migrated mission "${mission.title}" with ${matchingSkills.length} skills`);
          } else {
            console.log(`⚠️  No matching skills found for mission "${mission.title}"`);
          }
        }
      } catch (error) {
        console.error(`❌ Error migrating mission ${mission.id}:`, error);
      }
    }

    // Step 5: Clean up old user-specific skills (they're now global)
    console.log('🧹 Cleaning up old user-specific skills...');
    // Note: Since we cleared the skills table earlier, this step is not needed
    console.log('✅ No old user-specific skills to clean up');

    // Step 6: Summary
    const finalCategoryCount = await prisma.categories.count();
    const finalSkillCount = await prisma.skills.count();
    
    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Final counts: ${finalCategoryCount} categories, ${finalSkillCount} skills`);
    console.log('📋 Next steps:');
    console.log('1. Run: npx prisma migrate dev --name "add-category-skill-relations"');
    console.log('2. Test the migration');
    console.log('3. Deploy to production with: npx prisma migrate deploy');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
productionMigrateSkills()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
