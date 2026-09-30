"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Plus } from "lucide-react";
// Remove the import since we'll fetch from API

export default function NewMissionPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // Filter skills based on input - show all skills from all categories
  const filterSkills = (input: string) => {
    if (input.length < 2) return [];
    
    // Always show all skills from all categories, regardless of selected category
    // Deduplicate skills by ID (in case a skill appears in multiple categories)
    const allSkills = categories.flatMap(cat => cat.skills || []);
    const uniqueSkillsMap = new Map<string, any>();
    
    // Use Map to deduplicate by skill ID
    allSkills.forEach(skill => {
      if (skill && skill.id && !uniqueSkillsMap.has(skill.id)) {
        uniqueSkillsMap.set(skill.id, skill);
      }
    });
    
    const availableSkills = Array.from(uniqueSkillsMap.values());
    
    return availableSkills
      .filter(skill => 
        skill.name.toLowerCase().includes(input.toLowerCase()) &&
        !formData.skills.some(selectedSkill => selectedSkill.id === skill.id)
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dailyRate: "",
    timeframe: "",
    startDate: "",
    endDate: "",
    skills: [] as any[], // Array of skill objects with id and name
    categoryIds: [] as string[],
  });
  const [startDateError, setStartDateError] = useState("");
  const [endDateError, setEndDateError] = useState("");

  const parseInputDate = (dateInput: string): Date | null => {
    const parts = dateInput.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    const parsedDay = parseInt(day, 10);
    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    if (Number.isNaN(parsedDay) || Number.isNaN(parsedMonth) || Number.isNaN(parsedYear)) return null;
    const parsed = new Date(parsedYear, parsedMonth - 1, parsedDay);
    const isValid =
      parsed.getFullYear() === parsedYear &&
      parsed.getMonth() === parsedMonth - 1 &&
      parsed.getDate() === parsedDay;
    return isValid ? parsed : null;
  };

  const computeDateErrors = useCallback(
    (
      startStr: string,
      endStr: string,
      options?: { requireComplete?: boolean }
    ): { start: string; end: string } => {
      const requireComplete = options?.requireComplete ?? false;
      let startErr = "";
      let endErr = "";

      if (requireComplete && startStr.length !== 10) {
        startErr = "Enter start date as dd/mm/yyyy.";
      }
      if (requireComplete && endStr.length !== 10) {
        endErr = "Enter end date as dd/mm/yyyy.";
      }

      const startComplete = startStr.length === 10;
      const endComplete = endStr.length === 10;

      if (startComplete) {
        const start = parseInputDate(startStr);
        if (!start) {
          startErr = "Invalid date.";
        } else {
          const today = new Date();
          const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const startAtMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          if (startAtMidnight < todayAtMidnight) {
            startErr = "Start date cannot be in the past.";
          }
        }
      }

      if (endComplete) {
        const end = parseInputDate(endStr);
        if (!end) {
          endErr = "Invalid date.";
        }
      }

      if (startComplete && endComplete && !startErr && !endErr) {
        const start = parseInputDate(startStr)!;
        const end = parseInputDate(endStr)!;
        const startAtMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endAtMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (endAtMidnight <= startAtMidnight) {
          endErr =
            "The project must end at least one day after the start date.";
        }
      }

      return { start: startErr, end: endErr };
    },
    []
  );

  useEffect(() => {
    const { start, end } = computeDateErrors(formData.startDate, formData.endDate);
    setStartDateError(start);
    setEndDateError(end);
  }, [formData.startDate, formData.endDate, computeDateErrors]);

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    // Check user role and redirect freelancers
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'freelance') {
            console.log('Freelancer trying to access mission creation - redirecting to dashboard');
            router.replace('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, [userId, router]);

  // Fetch categories and skills
  useEffect(() => {
    const fetchCategoriesAndSkills = async () => {
      try {
        const response = await fetch('/api/categories-skills');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories and skills:', error);
      }
    };

    fetchCategoriesAndSkills();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setLoading(true);

    try {
      // Validate that at least one skill is selected
      if (formData.skills.length === 0) {
        setLoading(false);
        return;
      }

      const { start: startErrMsg, end: endErrMsg } = computeDateErrors(
        formData.startDate,
        formData.endDate,
        { requireComplete: true }
      );
      setStartDateError(startErrMsg);
      setEndDateError(endErrMsg);
      if (startErrMsg || endErrMsg) {
        setLoading(false);
        return;
      }

      // Remove leading zeros and convert to numbers
      const dailyRate = parseInt(formData.dailyRate.replace(/^0+/, ''), 10);
      const timeframe = parseInt(formData.timeframe.replace(/^0+/, ''), 10);

      const response = await fetch("/api/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dailyRate,
          timeframe,
          startDate: formData.startDate,
          endDate: formData.endDate,
          skillIds: formData.skills.map(skill => skill.id),
          categoryIds: formData.categoryIds,
          status: "OPEN",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create mission");
      }

      router.push("/missions");
    } catch (error) {
      console.error("Error creating mission:", error);
      const msg = error instanceof Error ? error.message : "Failed to create mission. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    console.log('handleChange called:', { name, value });
    
    // For number inputs, remove leading zeros
    if (name === 'dailyRate' || name === 'timeframe') {
      const numValue = value.replace(/^0+/, '') || '0';
      setFormData(prev => {
        const newData = { ...prev, [name]: numValue };
        
        // Auto-fill end date when timeframe changes
        if (name === 'timeframe') {
          const calculatedEndDate = calculateEndDate(newData.startDate, newData.timeframe);
          console.log('Auto-calculating end date:', { startDate: newData.startDate, timeframe: newData.timeframe, calculatedEndDate });
          newData.endDate = calculatedEndDate;
        }
        
        return newData;
      });
    } else {
      setFormData(prev => {
        let newData = { ...prev };
        
        // Format date inputs
        if (name === 'startDate' || name === 'endDate') {
          (newData as any)[name] = formatDateInput(value);
        } else if (name === 'title' || name === 'description') {
          (newData as any)[name] = value;
        }
        
        // Auto-fill end date when start date changes
        if (name === 'startDate') {
          const calculatedEndDate = calculateEndDate(newData.startDate, newData.timeframe);
          console.log('Auto-calculating end date from start date:', { startDate: newData.startDate, timeframe: newData.timeframe, calculatedEndDate });
          newData.endDate = calculatedEndDate;
        }
        
        // Auto-calculate timeframe when end date changes
        if (name === 'endDate') {
          const calculatedTimeframe = calculateTimeframe(newData.startDate, newData.endDate);
          console.log('Auto-calculating timeframe from end date:', { startDate: newData.startDate, endDate: newData.endDate, calculatedTimeframe });
          newData.timeframe = calculatedTimeframe;
        }
        
        return newData;
      });
    }
  };

  // Function to format date input as user types (dd/mm/yyyy)
  const formatDateInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as dd/mm/yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  // Function to calculate end date based on start date and timeframe
  const calculateEndDate = (startDate: string, timeframe: string): string => {
    console.log('calculateEndDate called with:', { startDate, timeframe });
    
    if (!startDate || !timeframe) {
      console.log('Missing startDate or timeframe, returning empty string');
      return "";
    }
    
    try {
      // Parse start date (dd/mm/yyyy format)
      const [day, month, year] = startDate.split('/');
      console.log('Parsed date parts:', { day, month, year });
      
      const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      console.log('Start date object:', start);
      
      // Add timeframe days
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(timeframe));
      console.log('End date object:', end);
      
      // Format as dd/mm/yyyy
      const endDay = end.getDate().toString().padStart(2, '0');
      const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
      const endYear = end.getFullYear();
      
      const result = `${endDay}/${endMonth}/${endYear}`;
      console.log('Calculated end date result:', result);
      
      return result;
    } catch (error) {
      console.error('Error calculating end date:', error);
      return "";
    }
  };

  // Function to calculate timeframe based on start date and end date
  const calculateTimeframe = (startDate: string, endDate: string): string => {
    console.log('calculateTimeframe called with:', { startDate, endDate });
    
    if (!startDate || !endDate) {
      console.log('Missing startDate or endDate, returning empty string');
      return "";
    }
    
    try {
      // Parse start date (dd/mm/yyyy format)
      const [startDay, startMonth, startYear] = startDate.split('/');
      const start = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay));
      
      // Parse end date (dd/mm/yyyy format)
      const [endDay, endMonth, endYear] = endDate.split('/');
      const end = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
      
      // Calculate difference in days
      const timeDiff = end.getTime() - start.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      console.log('Calculated timeframe:', daysDiff);
      
      return daysDiff > 0 ? daysDiff.toString() : "";
    } catch (error) {
      console.error('Error calculating timeframe:', error);
      return "";
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="glass-card max-w-2xl mx-auto p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Create New Mission</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-300">
            Fill in the details below to post your mission
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-800 dark:text-gray-200">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter mission title"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-800 dark:text-gray-200">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your mission in detail"
                required
                rows={5}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {formData.description.length}/200 characters
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Category (Optional)</Label>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select a category for organization purposes. You can still choose skills from any category.
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Required Skills *</Label>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Type to search and add skills required for this mission. You can choose skills from any category.
              </div>
              
              {/* Skills Input with Autocomplete */}
              <div className="relative">
                <input
                  type="text"
                  value={skillInput}
                  placeholder="Type a skill (e.g., React, Python, UI/UX Design...)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < skillSuggestions.length) {
                        // Add the selected suggestion
                        const skillToAdd = skillSuggestions[selectedSuggestionIndex];
                        setFormData(prev => ({
                          ...prev,
                          skills: [...prev.skills, skillToAdd]
                        }));
                        setSkillInput('');
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      } else if (skillInput.trim() && skillSuggestions.length > 0) {
                        // Add the first suggestion if no specific one is selected
                        const skillToAdd = skillSuggestions[0];
                        setFormData(prev => ({
                          ...prev,
                          skills: [...prev.skills, skillToAdd]
                        }));
                        setSkillInput('');
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (showSuggestions && skillSuggestions.length > 0) {
                        setSelectedSuggestionIndex(prev => 
                          prev < skillSuggestions.length - 1 ? prev + 1 : 0
                        );
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (showSuggestions && skillSuggestions.length > 0) {
                        setSelectedSuggestionIndex(prev => 
                          prev > 0 ? prev - 1 : skillSuggestions.length - 1
                        );
                      }
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSkillInput(value);
                    const suggestions = filterSkills(value);
                    setSkillSuggestions(suggestions);
                    setShowSuggestions(suggestions.length > 0);
                    setSelectedSuggestionIndex(-1); // Reset selection when typing
                  }}
                  onFocus={() => {
                    if (skillSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                />
                
                {/* Autocomplete suggestions */}
                {showSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {skillSuggestions.map((skill, index) => (
                      <button
                        key={skill.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-gray-900 dark:text-gray-100 ${
                          index === selectedSuggestionIndex 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            skills: [...prev.skills, skill]
                          }));
                          setSkillInput('');
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                        }}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Skills Display */}
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            skills: prev.skills.filter(s => s.id !== skill.id)
                          }));
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Validation Messages */}
              {submitAttempted && formData.skills.length === 0 && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  Please add at least one skill
                </div>
              )}
              {formData.skills.length > 0 && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  {formData.skills.length} skill{formData.skills.length > 1 ? 's' : ''} added
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyRate" className="text-gray-800 dark:text-gray-200">Daily Rate (€)</Label>
                <Input
                  id="dailyRate"
                  name="dailyRate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={handleChange}
                  placeholder="Enter daily rate"
                  required
                  min="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe" className="text-gray-800 dark:text-gray-200">Timeframe (days)</Label>
                <Input
                  id="timeframe"
                  name="timeframe"
                  type="number"
                  value={formData.timeframe}
                  onChange={handleChange}
                  placeholder="Enter timeframe"
                  required
                  min="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-calculated when end date changes (editable)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-gray-800 dark:text-gray-200">Start Date (dd/mm/yyyy)</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="text"
                  value={formData.startDate}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  required
                  pattern="\d{2}/\d{2}/\d{4}"
                  aria-invalid={Boolean(startDateError)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm ${
                    startDateError
                      ? "border-red-500 focus:ring-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  }`}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-calculated from start date + timeframe (editable)
                </div>
                {startDateError && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {startDateError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-gray-800 dark:text-gray-200">End Date (dd/mm/yyyy)</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="text"
                  value={formData.endDate}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  required
                  pattern="\d{2}/\d{2}/\d{4}"
                  aria-invalid={Boolean(endDateError)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm ${
                    endDateError
                      ? "border-red-500 focus:ring-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  }`}
                />
                {endDateError && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {endDateError}
                  </p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? "Creating..." : "Create Mission"}
            </Button>
          </CardFooter>
        </form>
      </div>
    </div>
  );
} 