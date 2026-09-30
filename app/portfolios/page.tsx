"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Eye, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeUrl, formatUrl } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  picture: string[];
  createdAt: string;
  updatedAt: string;
}

interface Portfolio {
  id: string;
  name: string | null;
  description: string | null;
  userId: string;
  createdAt: string;
  projects: Project[];
  user?: {
    id: string;
    clerkId?: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function PortfoliosPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const [myPortfolio, setMyPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    description: '',
    picture: [] as string[]
  });
  const [pictureInput, setPictureInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = (portfolio: Portfolio) => {
    return userId === portfolio.user?.clerkId;
  };

  const isAdmin = async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const userData = await response.json();
        console.log('User data from /api/me:', userData);
        return userData.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  const [userRole, setUserRole] = useState<string | null>(null);

  const canCreatePortfolio = () => {
    if (userRole === null) {
      return false;
    }
    return userRole === 'freelance';
  };

  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchMyPortfolio = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        // Get current user's portfolio with projects
        const response = await fetch("/api/portfolios/me");
        if (!response.ok) {
          if (response.status === 404) {
            // No portfolio yet - that's okay for non-freelancers
            setMyPortfolio(null);
          } else {
            throw new Error("Failed to fetch portfolio");
        }
        } else {
        const data = await response.json();
          setMyPortfolio(data);
        }
      } catch (error) {
        console.error("Error fetching portfolio:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkUserStatus = async () => {
      if (userId) {
        try {
          const response = await fetch('/api/me');
          
          if (response.ok) {
            const userData = await response.json();
            setAdminStatus(userData.role === 'admin');
            setUserRole(userData.role);
          } else {
            console.error('Failed to fetch user data:', response.status);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
      }
    };

    fetchMyPortfolio();
    checkUserStatus();
  }, [userId]);

  const addPicture = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (pictureInput.trim()) {
      setFormData({ ...formData, picture: [...formData.picture, pictureInput.trim()] });
      setPictureInput("");
    }
  };

  const removePicture = (index: number) => {
    setFormData({ ...formData, picture: formData.picture.filter((_, i) => i !== index) });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      setFormData({ ...formData, picture: [...formData.picture, data.url] });
      
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

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      // Format URL if provided (allow empty string or null)
      const formattedUrl = formData.url && formData.url.trim() 
        ? formatUrl(formData.url.trim()) 
        : null;

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formattedUrl,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          picture: formData.picture
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      const updatedProject = await response.json();
      if (myPortfolio) {
        setMyPortfolio({
          ...myPortfolio,
          projects: myPortfolio.projects.map(p => p.id === editingProject.id ? updatedProject : p)
        });
      }
      setEditingProject(null);
      setFormData({ url: '', name: '', description: '', picture: [] });
      setPictureInput("");
      router.refresh();
    } catch (error) {
      console.error("Error updating project:", error);
      alert(error instanceof Error ? error.message : "Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete project");
      }

      // Remove the project from the local state
      if (myPortfolio) {
        setMyPortfolio({
          ...myPortfolio,
          projects: myPortfolio.projects.filter(p => p.id !== projectId)
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(error instanceof Error ? error.message : "Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading portfolios...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portfolios</h1>
          {(() => {
            const canCreate = canCreatePortfolio();
            
            if (userId && userRole === null) {
              return (
                <div className="text-gray-500 dark:text-gray-400">
                  Checking permissions...
                </div>
              );
            }
            
            if (canCreate) {
              return (
                <Button
                  onClick={() => router.push('/portfolios/projects/new')}
                  className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              );
            } else {
              return null;
            }
          })()}
        </div>

        {!myPortfolio && userRole === 'freelance' ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have a portfolio yet. Use the "Add Project" button above to get started!
            </p>
          </div>
        ) : myPortfolio ? (
          <div className="space-y-6">
            {/* Portfolio Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {myPortfolio.name || 'My Portfolio'}
              </h2>
              {myPortfolio.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {myPortfolio.description}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {myPortfolio.projects.length} {myPortfolio.projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>

            {/* Projects List */}
            {editingProject ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <CardHeader>
                  <CardTitle>Edit Project</CardTitle>
                  <CardDescription>Update your project information</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project URL
                    </label>
                    <input
                        type="text"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                        placeholder="example.com or https://example.com"
                    />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Optional: Enter URL as you want it displayed
                      </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                      placeholder="Project Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                      placeholder="Project description..."
                      rows={3}
                    />
                  </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          id="edit-file-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="edit-file-upload"
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
                      {formData.picture.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Current Pictures ({formData.picture.length}):
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {formData.picture.map((pic, index) => (
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
                    </div>

                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                        onClick={() => {
                          setEditingProject(null);
                          setFormData({ url: '', name: '', description: '', picture: [] });
                          setPictureInput("");
                        }}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
            ) : myPortfolio.projects.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your portfolio is empty. Use the "Add Project" button above to add your first project!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myPortfolio.projects.map((project) => (
                  <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                        {project.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                      {project.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {project.description}
                    </p>
                  )}
                      {project.url && (
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4 text-gray-500" />
                      <a
                            href={normalizeUrl(project.url) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        View Project
                      </a>
                    </div>
                  )}
                      {project.picture && project.picture.length > 0 && (
                        <div className="mt-4">
                          <div className="grid grid-cols-2 gap-2">
                            {project.picture.slice(0, 4).map((pic, picIndex) => (
                              <div key={picIndex} className="relative aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <img
                                  src={pic.startsWith('/') ? pic : pic}
                                  alt={`${project.name} - Image ${picIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          {project.picture.length > 4 && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              +{project.picture.length - 4} more image(s)
                            </p>
                          )}
                        </div>
                      )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingProject(project);
                            setFormData({
                              url: project.url || '',
                              name: project.name,
                              description: project.description || '',
                              picture: project.picture || []
                            });
                            setPictureInput("");
                          }}
                          className="bg-gray-600 text-white hover:bg-gray-700"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </div>
                ))}
              </div>
          )}
        </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {userRole === 'freelance' 
                ? 'You need to be a freelancer to have a portfolio.'
                : 'No portfolio found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 