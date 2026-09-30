"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AccountStatusPage() {
  const { userId, signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      // First, delete from our database if user exists
      if (userData?.id) {
        const response = await fetch(`/api/users/${userData.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log('User deleted from database');
        }
      }

      // Then try to delete from Clerk
      if (user) {
        await user.delete();
        console.log('User deleted from Clerk');
        signOut();
        router.push("/");
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. You may need to verify your email first or contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Not signed in</h1>
            <p className="text-gray-600 dark:text-gray-300">Please sign in to view your account status.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Account Status</h1>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Clerk Account Info:</h2>
            <div className="space-y-2">
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}</p>
              <p><strong>First Name:</strong> {user?.firstName || 'Not set'}</p>
              <p><strong>Last Name:</strong> {user?.lastName || 'Not set'}</p>
              <p><strong>Email Verified:</strong> 
                <span className={`ml-2 ${user?.emailAddresses?.[0]?.verification?.status === 'verified' ? 'text-green-600' : 'text-red-600'}`}>
                  {user?.emailAddresses?.[0]?.verification?.status || 'Unknown'}
                </span>
              </p>
              <p><strong>Created:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Database Account Info:</h2>
            {userData ? (
              <div className="space-y-2">
                <p><strong>Database ID:</strong> {userData.id}</p>
                <p><strong>Role:</strong> {userData.role}</p>
                <p><strong>Is Client:</strong> {userData.isClient ? 'Yes' : 'No'}</p>
                <p><strong>Is Freelancer:</strong> {userData.isFreelancer ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-yellow-600">No database record found. User may not have completed registration.</p>
            )}
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">⚠️ Account Deletion</h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              If you're getting "additional verification" errors when trying to delete your account:
            </p>
            <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-2 mb-4">
              <li>Make sure your email is verified</li>
              <li>Try deleting from Clerk Dashboard instead</li>
              <li>Contact support if the issue persists</li>
            </ul>
            
            <div className="space-x-4">
              <Button 
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                variant="destructive"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
              
              <Button 
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                variant="outline"
              >
                Sign Out
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">💡 Alternative Solutions</h2>
            <div className="space-y-2 text-blue-700 dark:text-blue-300">
              <p><strong>1. Clerk Dashboard:</strong> Go to <a href="https://dashboard.clerk.dev" target="_blank" rel="noopener noreferrer" className="underline">Clerk Dashboard</a> and delete the user from there.</p>
              <p><strong>2. Email Verification:</strong> Check your email and verify your account first.</p>
              <p><strong>3. Contact Support:</strong> If the issue persists, contact Clerk support.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 