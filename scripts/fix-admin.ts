import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking admin user...');

  // Find admin user by email
  const adminUser = await prisma.users.findFirst({
    where: {
      login: 'admin'
    }
  });

  if (!adminUser) {
    console.log('Admin user not found, creating...');
    
    // Create admin user
    const newAdmin = await prisma.users.create({
      data: {
        login: 'admin',
        password: 'placeholder',
        role: UserRole.ADMIN,
        clerkId: 'admin-clerk-id' // This will be updated when they sign in
      }
    });
    
    console.log('Created admin user:', newAdmin);
  } else {
    console.log('Found admin user:', adminUser);
    
    // Update admin user role if needed
    if (adminUser.role !== UserRole.ADMIN) {
      console.log('Updating admin user role...');
      await prisma.users.update({
        where: { id: adminUser.id },
        data: { role: UserRole.ADMIN }
      });
      console.log('Admin role updated!');
    } else {
      console.log('Admin user already has correct role');
    }
  }

  // List all users
  const allUsers = await prisma.users.findMany({
    select: {
      id: true,
      login: true,
      role: true,
      clerkId: true
    }
  });

  console.log('\nAll users:');
  allUsers.forEach(user => {
    console.log(`- ${user.login} (${user.role}) - ID: ${user.id} - Clerk: ${user.clerkId || 'Not linked'}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 