// DB initial / test data 
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting enhanced database seeding...');

  // 0. Create roles first
  console.log('🔐 Creating roles...');
  await prisma.role.deleteMany({});
  
  const roles = await Promise.all([
    prisma.role.create({
      data: { name: 'client' }
    }),
    prisma.role.create({
      data: { name: 'freelance' }
    }),
    prisma.role.create({
      data: { name: 'admin' }
    }),
    prisma.role.create({
      data: { name: 'support' }
    })
  ]);

  // Get role IDs for later use
  const clientRole = roles.find(r => r.name === 'client')!;
  const freelanceRole = roles.find(r => r.name === 'freelance')!;
  const adminRole = roles.find(r => r.name === 'admin')!;
  const supportRole = roles.find(r => r.name === 'support')!;

  console.log('✅ Roles created successfully');

  // 0.1. Create currencies
  console.log('💰 Creating currencies...');
  await prisma.currency.deleteMany({});
  
  const currencies = await Promise.all([
    prisma.currency.create({
      data: { name: 'Euro', code: 'EUR', type: 'fiat' }
    }),
    prisma.currency.create({
      data: { name: 'Bitcoin', code: 'BTC', type: 'crypto' }
    }),
    prisma.currency.create({
      data: { name: 'Ethereum', code: 'ETH', type: 'crypto' }
    }),
    prisma.currency.create({
      data: { name: 'Tether', code: 'USDT', type: 'crypto' }
    }),
    prisma.currency.create({
      data: { name: 'USD Coin', code: 'USDC', type: 'crypto' }
    })
  ]);

  console.log('✅ Currencies created successfully');

  // 1. Create users with roleId (using upsert to handle existing users)
  const john = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {
      clerkId: "user_2xXvzzlq3M8oswM9rdWHvgeKhe8", // Real Clerk ID
      firstName: "John",
      lastName: "Doe",
      description: "He is an AI Engineer.",
      vat: "FR12345678900",
      cryptoWalletAddress: "0x123...",
      phoneNumber: "+33612345678",
      address: "123 Main St",
      bankAccount: "FR1420041010050500013M02606",
      roleId: freelanceRole.id,
    },
    create: {
      email: "john.doe@example.com",
      clerkId: "user_2xXvzzlq3M8oswM9rdWHvgeKhe8", // Real Clerk ID
      firstName: "John",
      lastName: "Doe",
      description: "He is an AI Engineer.",
      vat: "FR12345678900",
      cryptoWalletAddress: "0x123...",
      phoneNumber: "+33612345678",
      address: "123 Main St",
      bankAccount: "FR1420041010050500013M02606",
      roleId: freelanceRole.id,
    },
  });

  const company = await prisma.user.upsert({
    where: { email: "company.inc@example.com" },
    update: {
      clerkId: "user_2xXvzuUFQEKhVIQMAiv7vNteujC", // Real Clerk ID
      firstName: "Marty",
      lastName: "Mcfly",
      companyName: "Tech Solutions Inc",
      vat: "FR98765432100",
      phoneNumber: "+33687654321",
      address: "456 Business Ave",
      bankAccount: "BE68539007547034",
      roleId: clientRole.id,
    },
    create: {
      email: "company.inc@example.com",
      clerkId: "user_2xXvzuUFQEKhVIQMAiv7vNteujC", // Real Clerk ID
      firstName: "Marty",
      lastName: "Mcfly",
      companyName: "Tech Solutions Inc",
      vat: "FR98765432100",
      phoneNumber: "+33687654321",
      address: "456 Business Ave",
      bankAccount: "BE68539007547034",
      roleId: clientRole.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      clerkId: "user_2xXvzyRhW9EumCPml6fF6pV7kE8", // Real Clerk ID
      firstName: "Damavand",
      lastName: "Admin",
      phoneNumber: "+33600000000",
      address: "Damavand HQ",
      roleId: adminRole.id,
    },
    create: {
      email: "admin@example.com",
      clerkId: "user_2xXvzyRhW9EumCPml6fF6pV7kE8", // Real Clerk ID
      firstName: "Damavand",
      lastName: "Admin",
      phoneNumber: "+33600000000",
      address: "Damavand HQ",
      roleId: adminRole.id,
    },
  });

  const support = await prisma.user.upsert({
    where: { email: "support@example.com" },
    update: {
      clerkId: "user_2xXvzzlid0sAeOODgIIKoXu3dnK", // Real Clerk ID
      firstName: "Support",
      lastName: "Team",
      phoneNumber: "+33600000001",
      address: "Support Center",
      roleId: supportRole.id,
    },
    create: {
      email: "support@example.com",
      clerkId: "user_2xXvzzlid0sAeOODgIIKoXu3dnK", // Real Clerk ID
      firstName: "Support",
      lastName: "Team",
      phoneNumber: "+33600000001",
      address: "Support Center",
      roleId: supportRole.id,
    },
  });

  // Create Ali Dindar (client)
  const ali = await prisma.user.upsert({
    where: { email: "ali.d.tic@gmail.com" },
    update: {
      clerkId: "user_313NFQKxgnuTabiv5H0BQOr5xMt", // Real Clerk ID
      firstName: "Ali",
      lastName: "Dindar",
      companyName: "Jean Valjean and co.",
      phoneNumber: "+33611111111",
      address: "789 Client St",
      roleId: clientRole.id,
    },
    create: {
      email: "ali.d.tic@gmail.com",
      clerkId: "user_313NFQKxgnuTabiv5H0BQOr5xMt", // Real Clerk ID
      firstName: "Ali",
      lastName: "Dindar",
      companyName: "Jean Valjean and co.",
      phoneNumber: "+33611111111",
      address: "789 Client St",
      roleId: clientRole.id,
    },
  });

  // Create Ali Dindar (freelancer) - ali_dindar@live.be
  const aliFreelancer = await prisma.user.upsert({
    where: { email: "ali_dindar@live.be" },
    update: {
      clerkId: "user_311RI6zR2ILZSbWwaCm0Y4FL4jh", // Real Clerk ID
      firstName: "Ali",
      lastName: "Dindar",
      phoneNumber: "+33633333333",
      address: "456 Freelancer St",
      roleId: freelanceRole.id,
    },
    create: {
      email: "ali_dindar@live.be",
      clerkId: "user_311RI6zR2ILZSbWwaCm0Y4FL4jh", // Real Clerk ID
      firstName: "Ali",
      lastName: "Dindar",
      phoneNumber: "+33633333333",
      address: "456 Freelancer St",
      roleId: freelanceRole.id,
    },
  });

  // Create Pardis (client)
  const pardis = await prisma.user.upsert({
    where: { email: "ali.d.tic+test@gmail.com" },
    update: {
      firstName: "Pardis",
      lastName: "",
      companyName: "Pardis Creative Studio",
      phoneNumber: "+33622222222",
      address: "321 Test Ave",
      roleId: clientRole.id,
    },
    create: {
      email: "ali.d.tic+test@gmail.com",
      firstName: "Pardis",
      lastName: "",
      companyName: "Pardis Creative Studio",
      phoneNumber: "+33622222222",
      address: "321 Test Ave",
      roleId: clientRole.id,
    },
  });

  console.log('✅ All users created successfully');

  // 2. Create categories - delete existing and recreate
  await prisma.category.deleteMany({});

  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Web Development", description: "Frontend and backend development" },
    }),
    prisma.category.create({
      data: { name: "Mobile Development", description: "iOS and Android development" },
    }),
    prisma.category.create({
      data: { name: "Design", description: "UI/UX and graphic design" },
    }),
    prisma.category.create({
      data: { name: "Content Management", description: "CMS and content creation" },
    }),
    prisma.category.create({
      data: { name: "System Administration", description: "Platform and system management" },
    }),
  ]);

  console.log('✅ Categories created successfully');

  // 3. Create missions - delete existing and recreate (handle foreign key constraints)
  await prisma.contract.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.mission.deleteMany({});

  // Tech Solutions missions (existing)
  const techSolutionsMissions = await Promise.all([
    prisma.mission.create({
      data: {
        title: "E-commerce Platform Development",
        status: "OPEN",
        dailyRate: 500.00,
        timeframe: 30,
        description: "E-commerce Platform Development - Need a full-stack developer to build a modern e-commerce platform with React, Node.js, and PostgreSQL.",
        clientId: company.id,
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-02-15"),
        categories: {
          connect: [{ categoryId: categories[0].categoryId }]
        }
      },
    }),
    prisma.mission.create({
      data: {
        title: "Mobile App Development",
        status: "OPEN",
        dailyRate: 400.00,
        timeframe: 20,
        description: "Mobile App Development - Looking for an experienced mobile developer to create a cross-platform app using React Native.",
        clientId: company.id,
        startDate: new Date("2025-01-20"),
        endDate: new Date("2025-02-10"),
        categories: {
          connect: [{ categoryId: categories[1].categoryId }]
        }
      },
    }),
    prisma.mission.create({
      data: {
        title: "AI-Powered Analytics Dashboard",
        status: "IN_PROGRESS",
        dailyRate: 600.00,
        timeframe: 45,
        description: "AI-Powered Analytics Dashboard - Seeking a data scientist and full-stack developer to build an analytics platform with machine learning capabilities.",
        clientId: company.id,
        startDate: new Date("2025-01-10"),
        endDate: new Date("2025-02-25"),
        categories: {
          connect: [{ categoryId: categories[0].categoryId }]
        }
      },
    }),
  ]);

  // Ali Dindar missions (new)
  const aliMissions = await Promise.all([
    prisma.mission.create({
      data: {
        title: "Website Redesign",
        status: "OPEN",
        dailyRate: 350.00,
        timeframe: 25,
        description: "Website Redesign - Need a designer to redesign our company website with modern UI/UX principles. Looking for someone with experience in Figma and modern design trends.",
        clientId: ali.id,
        startDate: new Date("2025-01-25"),
        endDate: new Date("2025-02-20"),
      },
    }),
    prisma.mission.create({
      data: {
        title: "Logo Design",
        status: "OPEN",
        dailyRate: 400.00,
        timeframe: 15,
        description: "Logo Design - Looking for a graphic designer to create a new company logo and brand identity. Need someone with strong branding experience.",
        clientId: ali.id,
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-02-15"),
      },
    }),
  ]);

  // Pardis missions (new)
  const pardisMissions = await Promise.all([
    prisma.mission.create({
      data: {
        title: "Content Management System",
        status: "OPEN",
        dailyRate: 300.00,
        timeframe: 20,
        description: "Content Management System - Need a developer to build a custom CMS for our blog. Should include user management, content editing, and publishing workflow.",
        clientId: pardis.id,
        startDate: new Date("2025-01-30"),
        endDate: new Date("2025-02-20"),
      },
    }),
  ]);

  const allMissions = [...techSolutionsMissions, ...aliMissions, ...pardisMissions];

  console.log('✅ All missions created successfully');

  // 4. Create skills for John (freelancer) - delete existing and recreate
  await prisma.review.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.skill.deleteMany({});

  // First, get the Development category
  const devCategory = await prisma.category.findFirst({
    where: { name: "Web Development" }
  });

  const skills = await Promise.all([
    prisma.skill.create({
      data: {
        name: "React",
        description: "Frontend development with React",
        categories: devCategory ? {
          connect: { categoryId: devCategory.categoryId }
        } : undefined,
        users: {
          connect: { id: john.id }
        }
      },
    }),
    prisma.skill.create({
      data: {
        name: "Node.js",
        description: "Backend development with Node.js",
        categories: devCategory ? {
          connect: { categoryId: devCategory.categoryId }
        } : undefined,
        users: {
          connect: { id: john.id }
        }
      },
    }),
    prisma.skill.create({
      data: {
        name: "PostgreSQL",
        description: "Database management with PostgreSQL",
        categories: devCategory ? {
          connect: { categoryId: devCategory.categoryId }
        } : undefined,
        users: {
          connect: { id: john.id }
        }
      },
    }),
  ]);

  console.log('✅ Skills created successfully');

  console.log('✅ Skills and services merged successfully');

  // 6. Create portfolio for John (freelancer) - delete existing and recreate
  await prisma.portfolio.deleteMany({});

  const portfolio = await prisma.portfolio.create({
    data: {
      projectName: "E-commerce Platform",
      name: "Modern E-commerce Solution",
      description: "A full-featured e-commerce platform built with React, Node.js, and PostgreSQL",
      url: "https://example-ecommerce.com",
      userId: john.id,
    },
  });

  console.log('✅ Portfolio created successfully');

  // 7. Create a contract (using new schema - freelancer + admin)
  const contract = await prisma.contract.create({
    data: {
      contractTerms: "Standard freelance contract terms with milestone-based payments",
      dailyRate: 500.00, // Match the mission's daily rate
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-02-15"),
      isActive: true,
      missionId: techSolutionsMissions[0].id,
      freelancerId: john.id, // John Doe (freelancer) is assigned to this contract
      adminId: admin.id, // Admin approves the contract
    },
  });

  console.log('✅ Contract created successfully');

  // 8. Create currencies
  const eurCurrency = await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: {
      name: 'Euro',
      code: 'EUR',
      type: 'fiat'
    }
  });

  console.log('✅ Currencies created successfully');

  // 9. Create payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        status: "PENDING",
        amount: 2500.00,
        currencyId: eurCurrency.id,
        paymentMethod: "BANK_TRANSFER",
        transactionDate: new Date("2025-01-15"),
        missionId: techSolutionsMissions[0].id,
        userId: company.id,
      },
    }),
    prisma.payment.create({
      data: {
        status: "COMPLETED",
        amount: 5000.00,
        currencyId: eurCurrency.id,
        paymentMethod: "CRYPTO",
        transactionDate: new Date("2025-01-10"),
        missionId: techSolutionsMissions[2].id,
        userId: company.id,
      },
    }),
  ]);

  console.log('✅ Payments created successfully');

  // 9. Create offers
  const offer = await prisma.offer.create({
    data: {
      status: "PENDING",
      dailyRate: 450.00,
      proposalText: "I have extensive experience in e-commerce development and can deliver this project on time and within budget.",
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-02-15"),
      freelancerId: john.id,
      missionId: techSolutionsMissions[1].id,
    },
  });

  console.log('✅ Offer created successfully');

  // 10. Create reviews
  const review = await prisma.review.create({
    data: {
      content: "Excellent work! John delivered the project on time and exceeded our expectations.",
      rating: 5,
      reviewerId: company.id,
      receiverId: john.id,
    },
  });

  console.log('✅ Review created successfully');

  // 11. Create conversation and message (matching class diagram)
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: company.id },
          { userId: john.id }
        ]
      }
    }
  });

  const message = await prisma.message.create({
    data: {
      content: "Hi John, I'm interested in your proposal for the mobile app development project.",
      senderId: company.id,
      conversationId: conversation.id,
    },
  });

  console.log('✅ Message created successfully');

  console.log('🎉 Enhanced database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Users: 6 (${john.email}, ${company.email}, ${admin.email}, ${support.email}, ${ali.email}, ${pardis.email})`);
  console.log(`   - Missions: ${allMissions.length} (Tech Solutions: 3, Ali: 2, Pardis: 1)`);
  console.log(`   - Skills: ${skills.length} (John Doe)`);
  console.log(`   - Services: Merged into Skills`);
  console.log(`   - Portfolio: 1 (John Doe)`);
  console.log(`   - Contract: 1 (John Doe)`);
  console.log(`   - Payments: ${payments.length}`);
  console.log(`   - Offer: 1 (John Doe)`);
  console.log(`   - Review: 1`);
  console.log(`   - Message: 1`);
  console.log('\n🎯 User Data Distribution:');
  console.log(`   - John Doe (Freelancer): Skills, Services, Portfolio, Contract, Offer`);
  console.log(`   - Tech Solutions (Client): 3 Missions`);
  console.log(`   - Ali Dindar (Client): 2 Missions`);
  console.log(`   - Pardis (Client): 1 Mission`);
  console.log(`   - Admin: System access`);
  console.log(`   - Support: Demo user`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
