"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { formatUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";

export default function EditPortfolioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm({
    defaultValues: {
      projectUrl: "",
      name: "",
      description: "",
    }
  });

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/portfolios/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch portfolio");
        }
        const data = await response.json();
        
        // Format the URL for display (remove protocol and show user-friendly format)
        let displayUrl = data.projectUrl || "";
        if (displayUrl) {
          // Remove https:// or http://
          displayUrl = displayUrl.replace(/^https?:\/\//, '');
          // Keep www. if it exists, otherwise leave as is
        }
        
        reset({
          projectUrl: displayUrl,
          name: data.name,
          description: data.description || "",
        });
      } catch (error) {
        console.error("Error fetching portfolio:", error);
      }
    };

    fetchPortfolio();
  }, [userId, router, params.id, reset]);

  const onSubmit = async (data: { projectUrl: string; name: string; description: string }) => {
    setLoading(true);

    // Format the project URL using the utility function
    const formattedUrl = formatUrl(data.projectUrl);

    try {
      const response = await fetch(`/api/portfolios/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectUrl: formattedUrl || null,
          name: data.name,
          description: data.description || null,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update portfolio");
      }

      router.push(`/portfolios/${params.id}`);
    } catch (error) {
      console.error("Error updating portfolio:", error);
      alert(error instanceof Error ? error.message : "Failed to update portfolio. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/portfolios/${params.id}`)}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolio
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Portfolio
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Update your portfolio information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Name *
                  </Label>
                  <Input
                    {...register("name", { required: "Project name is required" })}
                    id="name"
                    type="text"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="projectUrl" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project URL
                  </Label>
                  <input
                    {...register("projectUrl", { 
                      pattern: {
                        value: /.*/, // Accept any pattern
                        message: ""
                      }
                    })}
                    id="projectUrl"
                    type="text"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="example.com or www.example.com"
                    autoComplete="off"
                    spellCheck="false"
                    pattern=".*"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Optional: Enter URL as you want it displayed (e.g., example.com, www.example.com, or https://example.com)
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    {...register("description")}
                    id="description"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder="Describe your project, technologies used, and your role..."
                    rows={4}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Optional: Provide details about the project, technologies used, and your contributions
                  </p>
                </div>

                <CardFooter className="flex justify-end space-x-2 px-0">
                  <Button
                    type="button"
                    onClick={() => router.push(`/portfolios/${params.id}`)}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500 px-4 py-2"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      "Update Portfolio"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
} 