"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<"client" | "freelance" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  // Check if user already has a profile
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!userId || !isLoaded) return;

      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const userData = await response.json();
          if (userData.role) {
            // User already has a profile, redirect based on role
            if (userData.role === "freelance") {
              router.push("/services");
            } else {
              router.push("/missions");
            }
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkUserProfile();
  }, [userId, isLoaded, router]);

  const handleRoleSelection = (role: "client" | "freelance") => {
    setSelectedRole(role);
    setError(""); // Clear any previous errors
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (selectedRole === "freelance" && (!firstName || !lastName)) {
      setError("Please enter your first and last name");
      return;
    }

    if (selectedRole === "client" && !company) {
      setError("Please enter your company name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-user-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
          firstName: selectedRole === "freelance" ? firstName : "",
          lastName: selectedRole === "freelance" ? lastName : "",
          company: selectedRole === "client" ? company : "",
        }),
      });

      if (response.ok) {
        // Redirect based on role with replace to ensure clean navigation
        if (selectedRole === "freelance") {
          router.replace("/services");
        } else {
          router.replace("/missions");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create user profile. Please try again.");
      }
    } catch (err: any) {
      console.error("Error creating user profile:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking user profile
  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!userId) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Tell us about yourself to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Choose Your Role</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleRoleSelection("freelance")}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-colors ${
                  selectedRole === "freelance"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">👨‍💻</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Builder
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    I want to offer my services
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelection("client")}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-colors ${
                  selectedRole === "client"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🏢</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Project Owner
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    I want to hire builders
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Form Fields Based on Role */}
          {selectedRole === "freelance" && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Personal Information</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {selectedRole === "client" && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Company Information</Label>
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Enter your company name"
                  required
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !selectedRole}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? "Creating Profile..." : "Complete Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
} 