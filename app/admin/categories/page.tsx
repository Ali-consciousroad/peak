"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Check } from "lucide-react";

interface Category {
  categoryId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    missions: number;
  };
}

export default function AdminCategoriesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string; skillCount: number; skills: Array<{ id: string; name: string }> } | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: ""
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
        fetchCategories();
      }
    });
  }, [userId, router]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategories();
        setIsCreating(false);
        setFormData({ name: "", description: "" });
      } else {
        const error = await response.json();
        alert(`Error creating category: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Error creating category");
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategories();
        setEditingCategory(null);
        setFormData({ name: "", description: "" });
      } else {
        const error = await response.json();
        alert(`Error updating category: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Error updating category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.categoryId === categoryId);
    if (!category) return;

    // First, try to delete to see if there are skills
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        await fetchCategories();
        return;
      }

      const error = await response.json();
      
      // If category has skills, show reassignment dialog
      if (error.skillCount > 0) {
        setDeletingCategory({
          id: categoryId,
          name: category.name,
          skillCount: error.skillCount,
          skills: error.skills || []
        });
        setReassignCategoryId("");
        return;
      }

      // Other errors
      alert(`Error deleting category: ${error.error}`);
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Error deleting category");
    }
  };

  const handleConfirmDeleteWithReassign = async () => {
    if (!deletingCategory) return;

    if (!reassignCategoryId) {
      alert("Please select a category to reassign skills to");
      return;
    }

    try {
      const response = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reassignToCategoryId: reassignCategoryId
        })
      });

      if (response.ok) {
        await fetchCategories();
        setDeletingCategory(null);
        setReassignCategoryId("");
        alert(`Category deleted successfully. ${deletingCategory.skillCount} skill(s) reassigned.`);
      } else {
        const error = await response.json();
        alert(`Error deleting category: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Error deleting category");
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category.categoryId);
    setFormData({
      name: category.name,
      description: category.description || ""
    });
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setIsCreating(false);
    setFormData({ name: "", description: "" });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-32">
        <div className="flex items-center justify-center h-64">
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Category Management</h1>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Create Category Form */}
      {isCreating && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCategory}>Create Category</Button>
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.categoryId}>
            <CardContent className="p-6">
              {editingCategory === category.categoryId ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter category description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateCategory(category.categoryId)}>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <Badge variant="secondary">
                        {category._count.missions} missions
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {category.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Created: {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(category)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.categoryId)}
                      disabled={category._count.missions > 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && !isCreating && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No categories found. Create your first category!</p>
          </CardContent>
        </Card>
      )}

      {/* Reassignment Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Category Has Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                The category <strong>"{deletingCategory.name}"</strong> has {deletingCategory.skillCount} skill(s) assigned to it.
                Please select another category to reassign these skills to before deleting.
              </p>
              
              {/* Show list of skills that will be reassigned */}
              {deletingCategory.skills.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skills that will be reassigned ({deletingCategory.skills.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {deletingCategory.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reassign skills to:
                </label>
                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category...</option>
                  {categories
                    .filter(c => c.categoryId !== deletingCategory.id)
                    .map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletingCategory(null);
                    setReassignCategoryId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteWithReassign}
                  disabled={!reassignCategoryId}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete & Reassign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
