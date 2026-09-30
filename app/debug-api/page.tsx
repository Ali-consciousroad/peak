"use client";

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function DebugAPI() {
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isLoaded } = useAuth();

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      console.log('Testing API with userId:', userId);
      
      const response = await fetch('/api/me');
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        setApiResult(data);
      } else {
        const errorData = await response.text();
        console.log('API Error response:', errorData);
        setError(`HTTP ${response.status}: ${errorData}`);
      }
    } catch (err) {
      console.error('API Test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 pt-32">
      <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <p><strong>Clerk Loaded:</strong> {isLoaded ? 'Yes' : 'No'}</p>
        <p><strong>User ID:</strong> {userId || 'Not signed in'}</p>
      </div>

      <button
        onClick={testAPI}
        disabled={loading || !isLoaded}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test /api/me'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {apiResult && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>Success!</strong>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

