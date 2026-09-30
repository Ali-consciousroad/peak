import { PrismaClient } from '@prisma/client';
import { SKILL_CATEGORIES, PREDEFINED_SKILLS } from '../lib/skills';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedCategoriesAndSkills() {
  console.log('🌱 Seeding categories and skills...');

  try {
    // First, create categories
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
      console.log(`✅ Created/updated category: ${categoryName}`);
    }

    // Then, create skills and link them to categories
    for (const [categoryName, skills] of Object.entries(PREDEFINED_SKILLS)) {
      // Find category by name (PREDEFINED_SKILLS uses category name as key)
      const category = Array.from(categoryMap.values()).find(cat => cat.name === categoryName);
      if (!category) {
        console.error(`❌ Category not found for: ${categoryName}`);
        continue;
      }

      for (const skillName of skills) {
        await prisma.skills.upsert({
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
        console.log(`✅ Created/updated skill: ${skillName} in ${category.name}`);
      }
    }

    console.log('🎉 Categories and skills seeded successfully!');
    
    // Show summary
    const categoryCount = await prisma.categories.count();
    const skillCount = await prisma.skills.count();
    console.log(`📊 Summary: ${categoryCount} categories, ${skillCount} skills`);

  } catch (error) {
    console.error('❌ Error seeding categories and skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCategoriesAndSkills()
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
