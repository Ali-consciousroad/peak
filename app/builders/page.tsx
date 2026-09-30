"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Euro, Clock, User, Filter, X, Coins } from "lucide-react";
import { useRouter } from "next/navigation";

interface Freelancer {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  rating?: number;
  dailyRate?: number;
  active: boolean;
  averageRating?: number;
  reviewCount: number;
  description?: string;
  skills: Array<{
    id: string;
    name: string;
    categories: Array<{
      name: string;
    }>;
  }>;
  portfolios: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  createdAt: string;
}

export default function FreelancersPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxDailyRate, setMaxDailyRate] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Only clients and admins can browse builders
          if (userData.role !== 'client' && userData.role !== 'admin') {
            setError('Access denied. Only clients can browse builders.');
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setError('Error checking permissions');
        setLoading(false);
      }
    };

    if (userId) {
      checkUserRole();
    }
  }, [userId]);

  // Fetch freelancers
  useEffect(() => {
    const fetchFreelancers = async () => {
      if (!userId || !userRole) return;

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (skillsFilter) params.append('skills', skillsFilter);
        if (minRating) params.append('minRating', minRating);
        if (maxDailyRate) params.append('maxDailyRate', maxDailyRate);
        if (availableOnly) params.append('availableOnly', 'true');

        const response = await fetch(`/api/freelancers?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Freelancers data from API:', data);
          if (data.length > 0) {
            console.log('First freelancer:', data[0]);
            console.log('First freelancer skills:', data[0].skills);
            console.log('First freelancer rating:', data[0].rating);
            console.log('First freelancer averageRating:', data[0].averageRating);
          }
          setFreelancers(data);
          setError(null);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', response.status, errorData);
          setError(errorData.error || `Failed to fetch builders (${response.status})`);
        }
      } catch (err) {
        setError('Error fetching builders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (userRole === 'client' || userRole === 'admin') {
      fetchFreelancers();
    }
  }, [userId, userRole, searchQuery, skillsFilter, minRating, maxDailyRate, availableOnly]);

  const getFreelancerName = (freelancer: Freelancer) => {
    if (freelancer.firstName && freelancer.lastName) {
      return `${freelancer.firstName} ${freelancer.lastName}`;
    }
    if (freelancer.firstName) {
      return freelancer.firstName;
    }
    return freelancer.email.split('@')[0];
  };

  const formatRating = (rating?: number) => {
    if (!rating) return 'No rating';
    return rating.toFixed(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSkillsFilter('');
    setMinRating('');
    setMaxDailyRate('');
    setAvailableOnly(true);
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to browse builders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading builders...</p>
        <p className="text-sm text-gray-500">User role: {userRole}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Browse Builders
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find the perfect builder for your project
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Skills
                  </label>
                  <Input
                    type="text"
                    placeholder="React, Node.js, Design..."
                    value={skillsFilter}
                    onChange={(e) => setSkillsFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Rating
                  </label>
                  <Input
                    type="number"
                    placeholder="4.0"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Daily Rate (€)
                  </label>
                  <Input
                    type="number"
                    placeholder="500"
                    min="0"
                    value={maxDailyRate}
                    onChange={(e) => setMaxDailyRate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Available only
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-between">
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <div className="text-sm text-gray-500">
                  {freelancers.length} builder{freelancers.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Freelancers Grid */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Found {freelancers.length} builder{freelancers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {freelancers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No builders found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search criteria or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freelancers.map((freelancer) => (
              <Card key={freelancer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {getFreelancerName(freelancer)}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {freelancer.email}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={freelancer.active ? "default" : "secondary"}
                      className={freelancer.active ? "bg-green-600" : "bg-gray-500"}
                    >
                      {freelancer.active ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {formatRating(freelancer.averageRating || freelancer.rating)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({freelancer.reviewCount} review{freelancer.reviewCount !== 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Daily Rate */}
                    {freelancer.dailyRate && (
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">
                          €{freelancer.dailyRate}/day
                        </span>
                      </div>
                    )}

                    {/* Skills */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Skills
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {freelancer.skills && freelancer.skills.length > 0 ? (
                          <>
                            {freelancer.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill.id} variant="outline" className="text-xs">
                                {skill.name}
                              </Badge>
                            ))}
                            {freelancer.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{freelancer.skills.length - 3} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No skills listed</span>
                        )}
                      </div>
                    </div>

                    {/* Description Preview */}
                    {freelancer.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          About
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">
                          {freelancer.description}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Navigate to freelancer profile page
                          console.log('Freelancer ID:', freelancer.id);
                          console.log('Freelancer data:', freelancer);
                          router.push(`/builders/${freelancer.id}`);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                      <Button 
                        className="w-full"
                        disabled={!freelancer.active}
                        onClick={() => {
                          // Navigate to contact freelancer page
                          router.push(`/builders/${freelancer.id}/contact`);
                        }}
                      >
                        {freelancer.active ? 'Contact Builder' : 'Currently Busy'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
