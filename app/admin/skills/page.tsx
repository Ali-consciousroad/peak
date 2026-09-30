"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Check, Search } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  categories: Array<{
    categoryId: string;
    name: string;
  }>;
  userCount: number;
}

interface Category {
  categoryId: string;
  name: string;
}

export default function AdminSkillsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    categoryId: ""
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!userId) {
        router.push("/sign-in");
        return false;
      }

      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const userData = await response.json();
          if (!userData.isAdmin) {
            router.push("/");
            return false;
          }
          return true;
        } else {
          router.push("/sign-in");
          return false;
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/");
        return false;
      }
    };

    checkAdminAccess().then((hasAccess) => {
      if (hasAccess) {
        fetchSkills();
        fetchCategories();
      }
    });
  }, [userId, router]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/skills");
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCreateSkill = async () => {
    if (!formData.name || !formData.categoryId) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSkills();
        setIsCreating(false);
        setFormData({ name: "", categoryId: "" });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create skill");
      }
    } catch (error) {
      console.error("Error creating skill:", error);
      alert("Error creating skill");
    }
  };

  const handleUpdateSkill = async (skillId: string) => {
    if (!formData.name || !formData.categoryId) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId
        }),
      });

      if (response.ok) {
        await fetchSkills();
        setEditingSkill(null);
        setFormData({ name: "", categoryId: "" });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update skill");
      }
    } catch (error) {
      console.error("Error updating skill:", error);
      alert("Error updating skill");
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm("Are you sure you want to delete this skill? This will remove it from all users who have it.")) {
      return;
    }

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSkills();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete skill");
      }
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert("Error deleting skill");
    }
  };

  const startEditing = (skill: Skill) => {
    setEditingSkill(skill.id);
    setFormData({
      name: skill.name,
      categoryId: skill.categories[0]?.categoryId || ""
    });
  };

  const cancelEditing = () => {
    setEditingSkill(null);
    setIsCreating(false);
    setFormData({ name: "", categoryId: "" });
  };

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manage Skills</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View, create, edit, and delete skills. Skills are used by builders to showcase their expertise.
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Skill
        </Button>
      </div>

      {isCreating && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Create New Skill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Skill Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., React, Node.js, Python"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
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
                <Button onClick={handleCreateSkill}>
                  <Check className="h-4 w-4 mr-2" />
                  Create
                </Button>
                <Button variant="outline" onClick={cancelEditing}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Skills ({filteredSkills.length})</CardTitle>
          <CardDescription>
            Total skills in the system. Click edit to modify or delete to remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? "No skills found matching your search." : "No skills found."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {editingSkill === skill.id ? (
                    <div className="flex-1 space-y-3">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Skill name"
                      />
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.categoryId} value={category.categoryId}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateSkill(skill.id)}>
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-lg">{skill.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {skill.categories.map((category) => (
                            <Badge key={category.categoryId} variant="secondary">
                              {category.name}
                            </Badge>
                          ))}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            • {skill.userCount} user{skill.userCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(skill)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSkill(skill.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

