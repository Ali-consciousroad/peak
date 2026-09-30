"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Trash2, ArrowLeft, ExternalLink } from "lucide-react";

interface Portfolio {
  id: string;
  projectUrl: string | null;
  name: string;
  description: string | null;
  freelanceId: string;
  createdAt: string;
  freelance?: {
    user?: {
      id: string;
      clerkId: string;
    };
  };
}

export default function PortfolioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useUser();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    projectUrl: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/portfolios/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio');
        }
        const data = await response.json();
        setPortfolio(data);
        setFormData({
          projectUrl: data.projectUrl || '',
          name: data.name,
          description: data.description || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
      } finally {
        setLoading(false);
      }
    };

    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setAdminStatus(userData.role === 'ADMIN');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminStatus(false);
      }
    };

    fetchPortfolio();
    checkAdminStatus();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/portfolios/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectUrl: formData.projectUrl,
          name: formData.name,
          description: formData.description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update portfolio');
      }

      const updatedPortfolio = await response.json();
      setPortfolio(updatedPortfolio);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update portfolio');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this portfolio?')) {
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete portfolio');
      }

      router.push('/portfolios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Portfolio not found</div>
      </div>
    );
  }

  const canEdit = adminStatus === true || (user && portfolio.freelance?.user?.clerkId === user.id);

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
            Back to Portfolios
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {isEditing ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <CardHeader>
                <CardTitle>Edit Portfolio</CardTitle>
                <CardDescription>Update your portfolio information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="projectUrl">Project URL</Label>
                    <Input
                      id="projectUrl"
                      name="projectUrl"
                      type="url"
                      value={formData.projectUrl}
                      onChange={handleChange}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Project Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Project description..."
                      rows={4}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                      {portfolio.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Created on {new Date(portfolio.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gray-600 text-white hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={handleDelete}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {portfolio.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Description
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {portfolio.description}
                    </p>
                  </div>
                )}
                
                {portfolio.projectUrl && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Project Link
                    </h3>
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-5 w-5 text-gray-500" />
                      <a
                        href={portfolio.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        {portfolio.projectUrl}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 