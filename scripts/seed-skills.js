const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const skills = [
  {
    name: 'Web Development',
    description: 'Full-stack web development including frontend and backend technologies',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Mobile Development',
    description: 'iOS and Android app development',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'UI/UX Design',
    description: 'User interface and user experience design',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Graphic Design',
    description: 'Logo design, branding, and visual identity',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Content Writing',
    description: 'Blog posts, articles, and marketing copy',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Digital Marketing',
    description: 'SEO, social media marketing, and PPC campaigns',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Data Analysis',
    description: 'Data visualization and business intelligence',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Video Editing',
    description: 'Video production and post-production editing',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Translation',
    description: 'Multi-language translation services',
    proficiencyLevel: 'EXPERT'
  },
  {
    name: 'Virtual Assistant',
    description: 'Administrative and organizational support',
    proficiencyLevel: 'EXPERT'
  }
];

async function seedSkills() {
  try {
    console.log('Seeding skills...');
    
    for (const skill of skills) {
      await prisma.skills.upsert({
        where: { name: skill.name },
        update: {
          updatedAt: new Date()
        },
        create: {
          id: require('crypto').randomUUID(),
          name: skill.name,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });
      console.log(`Created/Updated skill: ${skill.name}`);
    }
    
    console.log('Skills seeding completed!');
  } catch (error) {
    console.error('Error seeding skills:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSkills(); 