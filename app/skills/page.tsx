"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Filter, SortAsc, SortDesc } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  createdAt: string;
  categories: Array<{
    name: string;
  }>;
}

export default function SkillsPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: ''
  });

  const isOwner = (skill: Skill) => {
    // Since skills are now global, all users can edit their own skills
    return true;
  };

  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{categoryId: string; name: string}>>([]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const handleCreateNew = () => {
    router.push('/skills/new');
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch(`/api/skills?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch skills");
      }
      const data = await response.json();
      console.log('Fetched skills:', data.length);
      setSkills(data);
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories-skills');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
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

    fetchSkills();
    fetchCategories();
    checkUserStatus();
  }, [userId]);

  const canEditSkill = (skill: Skill) => {
    return isOwner(skill) || adminStatus === true;
  };

  const canCreateSkill = () => {
    if (userRole === null) {
      return false;
    }
    return userRole === 'freelance';
  };

  // Filter and sort skills
  const filteredAndSortedSkills = skills
    .filter((skill) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = skill.name.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      // Category filter
      if (categoryFilter && !skill.categories.some(cat => cat.name === categoryFilter)) return false;

      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.categories[0]?.name || '';
          bValue = b.categories[0]?.name || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });



  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    try {
      const response = await fetch(`/api/skills/${editingSkill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update skill");
      }

      const updatedSkill = await response.json();
      setSkills(skills.map(s => s.id === editingSkill.id ? updatedSkill : s));
      setEditingSkill(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating skill:", error);
    }
  };

  const handleDelete = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete skill");
      }

      // Remove the skill from the local state
      setSkills(skills.filter(s => s.id !== skillId));
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert(error instanceof Error ? error.message : "Failed to delete skill");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Skills</h1>
          {(() => {
            const canCreate = canCreateSkill();
            
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
                  onClick={() => router.push('/skills/new')}
                  className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Skill
                </Button>
              );
            } else {
              return null;
            }
          })()}
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {(searchQuery || categoryFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Expandable Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Writing">Writing</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Web3">Web3</option>
                    <option value="AI">AI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedSkills.length} of {skills.length} skills
          </div>
        </div>

        {editingSkill ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleUpdate} className="glass-card p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Skill name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                    Save
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setEditingSkill(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pb-8">
            {filteredAndSortedSkills.length === 0 ? (
              <div className="w-full text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {skills.length === 0 ? (
                    <>
                      <p className="text-lg">No skills found</p>
                      <p className="text-sm">Add your first skill to get started</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">No skills match your search</p>
                      <p className="text-sm">Try a different search term or clear filters</p>
                    </>
                  )}
                </div>
                {skills.length === 0 && (
                  <Button
                    onClick={() => router.push('/skills/new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Skill
                  </Button>
                )}
                {skills.length > 0 && (
                  <Button
                    onClick={clearFilters}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredAndSortedSkills.map((skill) => (
                <div key={skill.id} className="relative group">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                    {skill.name}
                  </div>
                  {canEditSkill(skill) && (
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                            onClick={() => {
                              setEditingSkill(skill);
                              // Find the categoryId for the skill's first category
                              const categoryId = skill.categories[0] ? 
                                categories.find(cat => cat.name === skill.categories[0].name)?.categoryId || '' : '';
                              setFormData({
                                name: skill.name,
                                categoryId: categoryId
                              });
                            }}
                          className="h-6 w-6 p-0 bg-gray-600 text-white hover:bg-gray-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(skill.id)}
                          className="h-6 w-6 p-0 bg-red-600 text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
} 