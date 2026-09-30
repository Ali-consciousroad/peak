import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Linking admin user...');

  // Find the admin user in database
  const adminUser = await prisma.users.findFirst({
    where: {
      login: 'admin',
      role: UserRole.ADMIN
    }
  });

  if (!adminUser) {
    console.log('Admin user not found in database');
    return;
  }

  console.log('Found admin user in database:', adminUser);

  // You need to provide the actual Clerk user ID here
  // You can get this from the debug page or browser console
  const clerkUserId = process.argv[2];
  
  if (!clerkUserId) {
    console.log('\n❌ Please provide the Clerk user ID as an argument');
    console.log('To get the Clerk user ID:');
    console.log('1. Go to http://localhost:3001/debug');
    console.log('2. Login as admin@example.com');
    console.log('3. Copy the "userId" from the Clerk User Info section');
    console.log('4. Run: npx tsx scripts/link-admin.ts YOUR_CLERK_USER_ID');
    return;
  }

  console.log('Linking Clerk user ID:', clerkUserId);

  // Update the admin user with the correct Clerk ID
  await prisma.users.update({
    where: { id: adminUser.id },
    data: { clerkId: clerkUserId }
  });

  console.log('✅ Admin user linked successfully!');

  // Verify the update
  const updatedAdmin = await prisma.users.findUnique({
    where: { id: adminUser.id }
  });

  console.log('Updated admin user:', updatedAdmin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 