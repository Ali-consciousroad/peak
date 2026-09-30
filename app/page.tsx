"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Code2, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && userId) {
      router.push('/dashboard');
    }
  }, [isLoaded, userId, router]);

  const handleFindProjects = async () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    try {
      if (userId) {
        // Check user role and redirect accordingly
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'freelance') {
            router.push('/offers');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/sign-in?redirect=/offers');
      }
    } finally {
      // Reset after a short delay to prevent rapid clicking
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  const handlePostProject = async () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    try {
      if (userId) {
        router.push('/missions/new');
      } else {
        router.push('/sign-in?redirect=/missions/new');
      }
    } finally {
      // Reset after a short delay to prevent rapid clicking
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-[#181c2f] dark:to-[#232946] transition-colors">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Peak
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Connect with top talent to build the project of your dream 
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Builder Section */}
          <div className="glass-card p-8 flex flex-col justify-between shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-blue-300 dark:focus-within:ring-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Code2 className="h-6 w-6 text-blue-400 dark:text-blue-300" />
                I&apos;m a Builder
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-300">
                Discover quality missions that match your expertise and elevate your career
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                <li>• Access premium mission opportunities</li>
                <li>• Showcase your expertise</li>
                <li>• Build a standout portfolio</li>
                <li>• Earn competitive rates</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-200 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-200 dark:border-blue-800 transition-colors duration-200"
                onClick={handleFindProjects}
                disabled={isNavigating}
              >
                {isNavigating ? 'Loading...' : 'Find Quality Missions'}
              </Button>
            </CardFooter>
          </div>

          {/* Project Owner Section */}
          <div className="glass-card p-8 flex flex-col justify-between shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-purple-300 dark:focus-within:ring-purple-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Briefcase className="h-6 w-6 text-purple-400 dark:text-purple-300" />
                I&apos;m a Project Owner
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-300">
                Connect with trusted builders who deliver exceptional results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                <li>• Connect with verified professionals</li>
                <li>• Review detailed portfolios</li>
                <li>• Manage projects seamlessly</li>
                <li>• Track real-time progress</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-700 text-purple-800 dark:text-purple-200 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 dark:focus-visible:ring-purple-600 border border-purple-200 dark:border-purple-800 transition-colors duration-200"
                onClick={handlePostProject}
                disabled={isNavigating}
              >
                {isNavigating ? 'Loading...' : 'Find Trusted Builders'}
              </Button>
            </CardFooter>
          </div>
        </div>
      </div>
    </div>
  );
}
