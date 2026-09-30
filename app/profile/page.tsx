"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const { userId, isLoaded } = useAuth();

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !isLoaded) return;

      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Load user data directly (no separate profile table)
          // Note: firstName, lastName, and companyName are in the profile object
          setFirstName(userData.profile?.firstName || "");
          setLastName(userData.profile?.lastName || "");
          setCompanyName(userData.profile?.companyName || "");
          setDailyRate(userData.dailyRate || 0);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [userId, isLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          companyName: userRole === "client" ? companyName : undefined,
          dailyRate: userRole === "freelance" ? dailyRate : undefined,
        }),
      });

      if (response.ok) {
        setMessage("✅ Profile updated successfully! Changes will be reflected on your dashboard.");
        // Force page refresh to update navbar and dashboard
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorData = await response.json();
        setMessage(`❌ ${errorData.error || "Failed to update profile"}`);
      }
    } catch (error) {
      setMessage("❌ An error occurred while updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Update Profile
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information - Available for all roles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>

              {/* Role-specific fields */}
              {userRole === "client" && (
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    required
                  />
                </div>
              )}

              {userRole === "freelance" && (
                <div>
                  <Label htmlFor="dailyRate">Daily Rate (€)</Label>
                  <Input
                    id="dailyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={dailyRate || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setDailyRate(0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          setDailyRate(numValue);
                        }
                      }
                    }}
                    placeholder="Enter your daily rate in euros"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">This is your standard daily rate for all projects</p>
                </div>
              )}


              {message && (
                <div className="text-sm font-medium">
                  {message.startsWith("✅") ? (
                    <p className="text-green-600 dark:text-green-400">{message}</p>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">{message}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
} 