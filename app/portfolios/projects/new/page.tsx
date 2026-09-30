"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";

export default function NewProjectPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pictures, setPictures] = useState<string[]>([]);
  const [pictureInput, setPictureInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      projectUrl: "",
      name: "",
      description: "",
    }
  });

  const addPicture = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (pictureInput.trim()) {
      setPictures([...pictures, pictureInput.trim()]);
      setPictureInput("");
    }
  };

  const removePicture = (index: number) => {
    setPictures(pictures.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      setPictures([...pictures, data.url]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    // Check user role
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Redirect if user is not a freelancer
          if (userData.role !== 'freelance') {
            router.push("/portfolios");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        router.push("/portfolios");
      }
    };

    checkUserRole();
  }, [userId, router]);

  const onSubmit = async (data: { projectUrl: string; name: string; description: string }) => {
    setLoading(true);

    // Format the project URL using the utility function
    const formattedUrl = formatUrl(data.projectUrl);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl || null,
          name: data.name,
          description: data.description || null,
          picture: pictures, // Array of picture URLs
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create project");
      }

      router.push("/portfolios");
    } catch (error) {
      console.error("Error creating project:", error);
      alert(error instanceof Error ? error.message : "Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  if (userRole && userRole !== 'freelance') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Access denied</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <Button
            onClick={() => router.push('/portfolios')}
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
                Add New Project
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Add a new project to your portfolio to showcase your work
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
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
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

                <div>
                  <Label htmlFor="pictures" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Pictures
                  </Label>
                  
                  {/* File Upload */}
                  <div className="mt-1 mb-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload from Computer
                        </>
                      )}
                    </label>
                    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      (Max 5MB, JPEG, PNG, GIF, WebP)
                    </span>
                  </div>

                  {/* URL Input */}
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="pictures"
                      type="url"
                      value={pictureInput}
                      onChange={(e) => setPictureInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPicture();
                        }
                      }}
                      className="flex-1"
                      placeholder="Or enter image URL (e.g., https://example.com/image.jpg)"
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      onClick={addPicture}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                      disabled={uploading || !pictureInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Pictures List */}
                  {pictures.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Added Pictures ({pictures.length}):
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {pictures.map((pic, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={pic.startsWith('/') ? pic : pic}
                              alt={`Project image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => removePicture(index)}
                              size="sm"
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Optional: Upload images from your computer or add image URLs to showcase your project.
                  </p>
                </div>

                <CardFooter className="flex justify-end space-x-2 px-0">
                  <Button
                    type="button"
                    onClick={() => router.push('/portfolios')}
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
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Project
                      </div>
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

