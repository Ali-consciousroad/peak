const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestReview() {
  try {
    // Find John Doe
    const johnDoe = await prisma.users.findFirst({
      where: {
        role: 'freelance',
        firstName: 'John'
      }
    });

    if (!johnDoe) {
      console.log('John Doe not found');
      return;
    }

    // Find a client to be the reviewer
    const client = await prisma.users.findFirst({
      where: {
        role: 'client'
      }
    });

    if (!client) {
      console.log('No client found to be reviewer');
      return;
    }

    console.log('Found John Doe:', johnDoe.id);
    console.log('Found client reviewer:', client.id);

    // Add a test review
    const review = await prisma.reviews.create({
      data: {
        rating: 4.5,
        comment: 'Excellent work! John delivered high-quality code and was very professional.',
        reviewerId: client.id,
        revieweeId: johnDoe.id
      }
    });

    console.log('Created review:', review.id, 'with rating:', review.rating);

    // Add another review
    const review2 = await prisma.reviews.create({
      data: {
        rating: 5.0,
        comment: 'Outstanding developer! Highly recommend.',
        reviewerId: client.id,
        revieweeId: johnDoe.id
      }
    });

    console.log('Created second review:', review2.id, 'with rating:', review2.rating);

    console.log('Successfully added test reviews for John Doe');

  } catch (error) {
    console.error('Error adding reviews:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestReview();
