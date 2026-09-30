import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dummyReviews = [
  {
    content: "Excellent work! Ali delivered exactly what was promised and on time. Very professional and responsive throughout the project. Would definitely work with again.",
    rating: 5,
  },
  {
    content: "Great freelancer with strong technical skills. The project was completed successfully and communication was clear. Highly recommend!",
    rating: 5,
  },
  {
    content: "Good work overall, but there were some minor delays. The final product met our requirements though.",
    rating: 4,
  },
  {
    content: "Outstanding service! The freelancer went above and beyond to ensure the project was perfect. Very satisfied with the results.",
    rating: 5,
  },
  {
    content: "Professional and reliable. The work quality was excellent and the freelancer was very responsive to feedback.",
    rating: 5,
  },
  {
    content: "The client was clear with requirements and provided timely feedback. Payment was prompt and communication was professional. Great to work with!",
    rating: 5,
  },
  {
    content: "Good client, but sometimes slow to respond. Overall a positive experience working together.",
    rating: 4,
  },
  {
    content: "Excellent client! Very organized, clear communication, and fair expectations. Would love to work together again.",
    rating: 5,
  },
  {
    content: "The project was well-defined and the client was responsive. Some scope changes but handled professionally.",
    rating: 4,
  },
];

async function seedReviews() {
  console.log('🌱 Seeding dummy review data...');

  try {
    // Find the company.inc@example.com user (client)
    const companyInc = await prisma.users.findUnique({
      where: { email: 'company.inc@example.com' },
    });

    if (!companyInc) {
      console.log('❌ company.inc@example.com not found. Please make sure the user exists.');
      return;
    }

    // Find all users (to get freelancers and other clients)
    const allUsers = await prisma.users.findMany({
      include: {
        role: true,
      },
    });

    // Find freelancers
    const freelancers = allUsers.filter(
      (user) => user.role?.name === 'freelance' && user.id !== companyInc.id
    );

    // Find other clients
    const otherClients = allUsers.filter(
      (user) => user.role?.name === 'client' && user.id !== companyInc.id
    );

    // Find missions where company.inc is involved
    const missions = await prisma.missions.findMany({
      where: {
        OR: [
          { clientId: companyInc.id },
          {
            contract: {
              OR: [
                { freelancerId: companyInc.id },
                { adminId: companyInc.id },
              ],
            },
          },
        ],
      },
      include: {
        contract: {
          include: {
            freelancer: true,
            admin: true,
          },
        },
      },
      take: 10, // Limit to 10 missions
    });

    console.log(`📊 Found ${missions.length} missions for company.inc@example.com`);
    console.log(`👥 Found ${freelancers.length} freelancers`);
    console.log(`👥 Found ${otherClients.length} other clients`);

    if (missions.length === 0) {
      console.log('⚠️  No missions found. Creating reviews without mission association...');
    }

    let reviewCount = 0;

    // Create reviews FROM company.inc TO freelancers (reviews written by client)
    for (let i = 0; i < Math.min(freelancers.length, 5); i++) {
      const freelancer = freelancers[i];
      const reviewData = dummyReviews[i % dummyReviews.length];
      const mission = missions[i % missions.length] || null;

      // Check if review already exists
      const existingReview = await prisma.reviews.findFirst({
        where: {
          reviewerId: companyInc.id,
          receiverId: freelancer.id,
          missionId: mission?.id || null,
        },
      });

      if (!existingReview) {
        await prisma.reviews.create({
          data: {
            content: reviewData.content,
            rating: reviewData.rating,
            reviewerId: companyInc.id,
            receiverId: freelancer.id,
            missionId: mission?.id || null,
          },
        });
        reviewCount++;
        console.log(
          `✅ Created review from ${companyInc.email} to ${freelancer.email} (rating: ${reviewData.rating})`
        );
      }
    }

    // Create reviews FROM freelancers TO company.inc (reviews received by client)
    for (let i = 0; i < Math.min(freelancers.length, 4); i++) {
      const freelancer = freelancers[i];
      const reviewData = dummyReviews[(i + 5) % dummyReviews.length];
      const mission = missions[i % missions.length] || null;

      // Check if review already exists
      const existingReview = await prisma.reviews.findFirst({
        where: {
          reviewerId: freelancer.id,
          receiverId: companyInc.id,
          missionId: mission?.id || null,
        },
      });

      if (!existingReview) {
        await prisma.reviews.create({
          data: {
            content: reviewData.content,
            rating: reviewData.rating,
            reviewerId: freelancer.id,
            receiverId: companyInc.id,
            missionId: mission?.id || null,
          },
        });
        reviewCount++;
        console.log(
          `✅ Created review from ${freelancer.email} to ${companyInc.email} (rating: ${reviewData.rating})`
        );
      }
    }

    // Create some reviews between other users (to populate the general reviews page)
    for (let i = 0; i < Math.min(freelancers.length, 3); i++) {
      for (let j = 0; j < Math.min(otherClients.length, 2); j++) {
        const reviewer = freelancers[i];
        const receiver = otherClients[j];
        const reviewData = dummyReviews[(i + j) % dummyReviews.length];
        const mission = missions[(i + j) % missions.length] || null;

        // Check if review already exists
        const existingReview = await prisma.reviews.findFirst({
          where: {
            reviewerId: reviewer.id,
            receiverId: receiver.id,
            missionId: mission?.id || null,
          },
        });

        if (!existingReview && reviewer.id !== receiver.id) {
          await prisma.reviews.create({
            data: {
              content: reviewData.content,
              rating: reviewData.rating,
              reviewerId: reviewer.id,
              receiverId: receiver.id,
              missionId: mission?.id || null,
            },
          });
          reviewCount++;
          console.log(
            `✅ Created review from ${reviewer.email} to ${receiver.email} (rating: ${reviewData.rating})`
          );
        }
      }
    }

    console.log(`\n🎉 Successfully created ${reviewCount} dummy reviews!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Reviews written by company.inc@example.com: ${await prisma.reviews.count({ where: { reviewerId: companyInc.id } })}`);
    console.log(`   - Reviews received by company.inc@example.com: ${await prisma.reviews.count({ where: { receiverId: companyInc.id } })}`);
    console.log(`   - Total reviews in system: ${await prisma.reviews.count()}`);

  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedReviews()
  .then(() => {
    console.log('✅ Review seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Review seeding failed:', error);
    process.exit(1);
  });

