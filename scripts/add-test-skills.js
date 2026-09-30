const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestSkills() {
  try {
    // Find John Doe (assuming he's the first freelancer)
    const johnDoe = await prisma.users.findFirst({
      where: {
        firstName: 'John'
      },
      include: {
        role: true
      }
    });
    
    // Check if user has freelance role
    if (!johnDoe || johnDoe.role?.name !== 'freelance') {
      console.log('John Doe (freelancer) not found');
      return;
    }

    if (!johnDoe) {
      console.log('John Doe not found');
      return;
    }

    console.log('Found John Doe:', johnDoe.id, johnDoe.firstName, johnDoe.lastName);

    // Add some test skills
    const skills = [
      {
        name: 'React',
        category: 'Frontend',
        description: 'Expert in React development',
        userId: johnDoe.id
      },
      {
        name: 'Node.js',
        category: 'Backend',
        description: 'Full-stack Node.js development',
        userId: johnDoe.id
      },
      {
        name: 'TypeScript',
        category: 'Programming',
        description: 'TypeScript expert',
        userId: johnDoe.id
      },
      {
        name: 'PostgreSQL',
        category: 'Database',
        description: 'Database design and optimization',
        userId: johnDoe.id
      }
    ];

    // Note: This script needs updating - skills are now global, not user-specific
    // Skills should be created via /api/admin/skills or seed scripts
    // Users connect to existing skills, not create their own
    console.log('⚠️  Note: Skills are now global. Use /api/admin/skills to create skills.');
    console.log('⚠️  Users connect to existing skills via /api/skills POST endpoint.');
    
    for (const skill of skills) {
      // First, find or create the skill globally
      const existingSkill = await prisma.skills.findUnique({
        where: { name: skill.name }
      });
      
      if (!existingSkill) {
        console.log(`⚠️  Skill "${skill.name}" does not exist. Please create it via admin panel first.`);
        continue;
      }
      
      // Connect skill to user
      await prisma.users.update({
        where: { id: johnDoe.id },
        data: {
          skills: {
            connect: { id: existingSkill.id }
          }
        }
      });
      console.log('Connected skill to user:', existingSkill.name);
    }

    console.log('Successfully added test skills for John Doe');

  } catch (error) {
    console.error('Error adding skills:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSkills();
