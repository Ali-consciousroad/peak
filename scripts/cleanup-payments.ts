import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupPayments() {
  console.log('🧹 Cleaning up payment data...\n');

  try {
    // Find EUR currency
    const eurCurrency = await prisma.currencies.findFirst({
      where: { code: 'EUR' }
    });

    if (!eurCurrency) {
      console.error('❌ EUR currency not found in database');
      return;
    }

    console.log(`✅ Found EUR currency: ${eurCurrency.id}`);

    // Get all payments
    const payments = await prisma.payments.findMany({
      include: {
        currency: true
      }
    });

    console.log(`\n📊 Found ${payments.length} payments to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const payment of payments) {
      const updates: any = {};
      let needsUpdate = false;

      // Update currency to EUR if not already
      if (!payment.currencyId || payment.currency?.code !== 'EUR') {
        updates.currencyId = eurCurrency.id;
        needsUpdate = true;
        console.log(`  - Payment ${payment.id}: Updating currency to EUR`);
      }

      // Update paymentMethod from 'crypto' to 'bank_transfer' (standard method)
      if (payment.paymentMethod === 'crypto') {
        updates.paymentMethod = 'bank_transfer';
        needsUpdate = true;
        console.log(`  - Payment ${payment.id}: Updating paymentMethod from 'crypto' to 'bank_transfer'`);
      }

      if (needsUpdate) {
        await prisma.payments.update({
          where: { id: payment.id },
          data: updates
        });
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Updated: ${updated} payments`);
    console.log(`   - Skipped: ${skipped} payments (already correct)`);
    console.log(`\n📋 Summary:`);
    console.log(`   - All payments now use EUR currency`);
    console.log(`   - All 'crypto' payment methods changed to 'bank_transfer'`);
    console.log(`   - Legacy data cleaned up\n`);

  } catch (error) {
    console.error('❌ Error cleaning up payments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPayments()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

