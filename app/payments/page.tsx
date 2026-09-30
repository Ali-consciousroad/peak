'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import PaymentManagement from '@/components/PaymentManagement';

export default function PaymentsPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const missionId = searchParams.get('missionId');

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view your payments.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Management</h1>
        <p className="text-gray-600">
          Manage your mission payments and escrow transactions
        </p>
      </div>

      <PaymentManagement missionId={missionId || undefined} />
    </div>
  );
}
