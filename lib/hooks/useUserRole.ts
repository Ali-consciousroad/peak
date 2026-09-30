import { useState, useEffect } from 'react';

interface UserRole {
  id: string;
  roles: string[];
  role: string; // Primary role for backward compatibility
  isClient: boolean;
  isFreelance: boolean;
  isAdmin: boolean;
  isSupport: boolean;
}

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data);
        } else if (response.status === 404) {
          setError('User profile not found - please complete setup');
        } else {
          setError('Failed to fetch user role');
        }
      } catch (err) {
        setError('Failed to fetch user role');
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  return { userRole, loading, error };
} 