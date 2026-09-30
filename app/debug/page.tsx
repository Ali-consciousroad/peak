"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function DebugPage() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Debug User Data</h1>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Clerk User Info:</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify({
                userId,
                email: user?.emailAddresses?.[0]?.emailAddress,
                firstName: user?.firstName,
                lastName: user?.lastName
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Database User Info:</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Role Analysis:</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-white">
                  <span className="font-semibold">Is Admin:</span> 
                  <span className={`ml-2 ${userData?.role === 'ADMIN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {userData?.role === 'ADMIN' ? '✅ YES' : '❌ NO'}
                  </span>
                </p>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-semibold">Role:</span> 
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{userData?.role || 'Unknown'}</span>
                </p>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-semibold">User ID Match:</span> 
                  <span className={`ml-2 ${userId === userData?.id ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {userId === userData?.id ? '✅ YES' : '❌ NO'}
                  </span>
                </p>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-semibold">Clerk User ID:</span> 
                  <span className="ml-2 text-gray-600 dark:text-gray-300 font-mono text-sm">{userId}</span>
                </p>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-semibold">Database User ID:</span> 
                  <span className="ml-2 text-gray-600 dark:text-gray-300 font-mono text-sm">{userData?.id}</span>
                </p>
              </div>
            </div>
          </div>

          {userData?.role === 'ADMIN' && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">🎉 Admin Access Confirmed!</h3>
              <p className="text-green-700 dark:text-green-300">
                You should now be able to edit and delete all missions. Go to the missions page to test it!
              </p>
            </div>
          )}

          {userData?.role !== 'ADMIN' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Not Admin</h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                Your current role is &ldquo;{userData?.role}&rdquo;. You need ADMIN role to edit/delete all missions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 