'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, Plus } from 'lucide-react';
import Modal from '@/components/shared/modal';

interface Skill {
  id: string;
  name: string;
  categories: Array<{
    categoryId: string;
    name: string;
  }>;
}

interface Category {
  categoryId: string;
  name: string;
  skills: Skill[];
}

interface SkillSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkillAdded: () => void;
  currentSkills: Skill[];
}

export default function SkillSelector({ open, onOpenChange, onSkillAdded, currentSkills }: SkillSelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories-skills');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (skill: Skill) => {
    try {
      // Check if skill already exists - if so, just connect it to user
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: skill.name,
          categoryId: skill.categories[0]?.categoryId || categories.find(c => c.skills.some(s => s.id === skill.id))?.categoryId || ''
        }),
      });

      if (response.ok) {
        console.log('✅ Skill added successfully');
        onSkillAdded();
        // Don't close modal - allow adding multiple skills
      } else {
        const error = await response.json();
        console.error('❌ Failed to add skill:', error);
        alert(error.error || 'Failed to add skill');
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      alert('Error adding skill');
    }
  };

  // Get all available skills
  const allSkills = categories.flatMap(cat => cat.skills);

  // Filter skills
  const filteredSkills = allSkills.filter(skill => {
    // Check if already added
    if (currentSkills.some(s => s.id === skill.id)) {
      return false;
    }

    // Search filter
    if (searchQuery && !skill.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (selectedCategory) {
      const category = categories.find(c => c.categoryId === selectedCategory);
      if (!category || !category.skills.some(s => s.id === skill.id)) {
        return false;
      }
    }

    return true;
  });

  // Group filtered skills by category
  const skillsByCategory = categories.map(category => ({
    ...category,
    skills: category.skills.filter(skill => 
      filteredSkills.some(s => s.id === skill.id)
    )
  })).filter(cat => cat.skills.length > 0);

  return (
    <Modal showModal={open} setShowModal={onOpenChange}>
      <div className="max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Add Skills to Your Profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Browse and select skills from the available list. Skills you already have are hidden.
          </p>
        </div>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading skills...</div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || selectedCategory
                ? 'No skills found matching your search.'
                : 'No available skills to add.'}
            </div>
          ) : (
            <div className="space-y-6">
              {skillsByCategory.map((category) => (
                <div key={category.categoryId}>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <Button
                        key={skill.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSkill(skill)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        {skill.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Skills Info */}
          {currentSkills.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Your current skills ({currentSkills.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentSkills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

