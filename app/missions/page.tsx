"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle, Eye, Search, Filter, SortAsc, SortDesc, MessageCircle, Star, Briefcase, FileText, Clock, AlertTriangle, Scale } from "lucide-react";
import StarRating from "@/components/ui/star-rating";

interface Mission {
  id: string;
  title: string;
  description: string;
  dailyRate: number;
  timeframe: number;
  status: string;
  isVerified: boolean;
  createdAt?: string;
  skills: Array<{id: string; name: string}>;
  client: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    averageRating?: number;
    totalReviews?: number;
  };
  verifier?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  contract?: {
    id: string;
    dailyRate: number | string;
    isActive: boolean;
  } | null;
  payments?: Array<{
    status: string;
    paymentMethod?: string | null;
  }>;
}

export default function MissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = (mission: Mission) => {
    return currentUserId === mission.client.id;
  };

  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [timeframeRange, setTimeframeRange] = useState({ min: '', max: '' });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const currentStatus = searchParams.get('status');

  const getClientName = (mission: Mission) => {
    const client = mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    // Fallback to email prefix if no name
    if (client.email) {
      return client.email.split('@')[0];
    }
    return 'Unknown Client';
  };

  // Reopened missions have inactive contracts — treat as OPEN, not IN_PROGRESS
  const effectiveStatus = (m: Mission) => {
    if (m.status === 'IN_PROGRESS' || m.status === 'OVERDUE') {
      return m.contract?.isActive ? m.status : 'OPEN';
    }
    return m.status;
  };

  const statusCounts = missions.reduce(
    (acc, mission) => {
      const status = effectiveStatus(mission);
      if (status === 'OPEN') acc.open += 1;
      if (status === 'COMPLETED') acc.completed += 1;
      if (status === 'REFUNDED') acc.refunded += 1;
      if (status === 'IN_PROGRESS' || status === 'OVERDUE') acc.inProgress += 1;
      return acc;
    },
    { open: 0, inProgress: 0, completed: 0, refunded: 0 }
  );

  const pickPrimaryMissionPayment = (mission: Mission) => {
    const payments = Array.isArray(mission.payments) ? mission.payments : [];
    if (payments.length === 0) return null;
    const active = payments.find((p) =>
      ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    );
    if (active) return active;
    return payments.find((p) =>
      ['COMPLETED', 'CANCELLED'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    ) || null;
  };

  const getMissionProgressPercent = (mission: Mission) => {
    const primaryPayment = pickPrimaryMissionPayment(mission);
    if (!primaryPayment) return 0;
    switch (primaryPayment.status) {
      case 'RELEASED_1':
        return 25;
      case 'RELEASED_2':
        return 75;
      case 'COMPLETED':
        return 100;
      default:
        return 0;
    }
  };

  // Filter and sort missions
  const filteredAndSortedMissions = missions
    .filter((mission) => {
      // Status filter from query parameter
      const statusFilter = currentStatus;
      if (statusFilter) {
        const status = effectiveStatus(mission);
        if (statusFilter === 'IN_PROGRESS') {
          const isInProgressStatus = status === 'IN_PROGRESS' || status === 'OVERDUE';
          const hasActiveContract = Boolean(mission.contract?.isActive);
          if (!isInProgressStatus || !hasActiveContract) return false;
        } else {
          if (status !== statusFilter) return false;
        }
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = mission.title.toLowerCase().includes(query);
        const matchesDescription = mission.description.toLowerCase().includes(query);
        const matchesSkills = mission.skills && Array.isArray(mission.skills) && mission.skills.some(skill => 
          skill.name.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDescription && !matchesSkills) return false;
      }

      // Price range filter
      if (priceRange.min && mission.dailyRate < parseInt(priceRange.min)) return false;
      if (priceRange.max && mission.dailyRate > parseInt(priceRange.max)) return false;

      // Timeframe filter
      if (timeframeRange.min && mission.timeframe < parseInt(timeframeRange.min)) return false;
      if (timeframeRange.max && mission.timeframe > parseInt(timeframeRange.max)) return false;

      // Skills filter
      if (selectedSkills.length > 0) {
        const hasRequiredSkills = selectedSkills.every(requiredSkill =>
          mission.skills.some(missionSkill => 
            missionSkill.name.toLowerCase() === requiredSkill.toLowerCase()
          )
        );
        if (!hasRequiredSkills) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'dailyRate':
          aValue = a.dailyRate;
          bValue = b.dailyRate;
          break;
        case 'timeframe':
          aValue = a.timeframe;
          bValue = b.timeframe;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
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
    setPriceRange({ min: '', max: '' });
    setTimeframeRange({ min: '', max: '' });
    setSelectedSkills([]);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Get all unique skills from missions
  const getAllSkills = () => {
    const allSkills = new Set<string>();
    missions.forEach(mission => {
      if (mission.skills && Array.isArray(mission.skills)) {
        mission.skills.forEach(skill => {
          allSkills.add(skill.name);
        });
      }
    });
    return Array.from(allSkills).sort();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };


  useEffect(() => {
    if (!userId) {
      router.replace("/sign-in?redirect=/missions");
      return;
    }

    const checkUserStatus = async () => {
      if (userId) {
        try {
          const response = await fetch('/api/me');
          
          if (response.ok) {
            const userData = await response.json();
            setAdminStatus(userData.role === 'admin');
            setUserRole(userData.role);
            setCurrentUserId(userData.id);
            
          } else {
            console.error('Failed to fetch user data:', response.status);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
      }
    };

    checkUserStatus();
  }, [userId, router]);

  // Fetch missions after user role is determined
  useEffect(() => {
    if (!userId || !userRole) return;

    const fetchMissions = async () => {
      try {
        console.log("Fetching missions for role:", userRole);
        
        // The API endpoint already handles role-based filtering
        // - Admins see all missions
        // - Clients see only their own missions  
        // - Builders see only missions they're involved in (offers/contracts)
        const response = await fetch("/api/missions");
        console.log("Missions response status:", response.status);
        if (!response.ok) {
          throw new Error("Failed to fetch missions");
        }
        const data = await response.json();
        console.log("Missions data:", data);
        setMissions(data);

        if (userRole === 'client' && currentStatus === 'IN_PROGRESS') {
          const inProgressContractIds = Array.isArray(data)
            ? data
                .filter((mission: Mission) =>
                  (mission.status === 'IN_PROGRESS' || mission.status === 'OVERDUE') && mission.contract?.id
                )
                .map((mission: Mission) => mission.contract?.id)
                .filter((id: string | undefined): id is string => Boolean(id))
            : [];

          if (inProgressContractIds.length > 0) {
            const markResponse = await fetch('/api/client/mark-contracts-seen', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contractIds: inProgressContractIds })
            });
            if (markResponse.ok) {
              window.dispatchEvent(new CustomEvent('contractsMarkedAsSeen'));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching missions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, [userId, userRole, currentStatus]);


  const handleDelete = async (missionId: string) => {
    if (!confirm('Are you sure you want to delete this mission? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/missions/${missionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete mission");
      }

      // Remove the mission from the local state
      setMissions(missions.filter(m => m.id !== missionId));
    } catch (error) {
      console.error("Error deleting mission:", error);
      alert(error instanceof Error ? error.message : "Failed to delete mission");
    }
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading missions...</div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full max-w-full flex-1 overflow-x-hidden">
      <div className="container mx-auto max-w-full px-4 py-8 pt-24">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="min-w-0 break-words text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {currentStatus === 'COMPLETED' 
              ? 'Completed Missions' 
              : currentStatus === 'IN_PROGRESS'
              ? 'Missions In Progress'
              : 'My Missions'}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/conflicts")}
              className="text-gray-700 dark:text-gray-200"
            >
              <Scale className="h-4 w-4 mr-2" />
              My Conflicts
            </Button>
            {userRole === 'client' && (
              <Button
                onClick={() => router.push("/missions/new")}
                className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Mission
              </Button>
            )}
          </div>
        </div>

        <div
          className={`mb-6 grid min-w-0 grid-cols-1 gap-4 ${userRole === 'freelance' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
        >
          {userRole !== 'freelance' && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Open</p>
                    <p className="text-2xl font-bold">{statusCounts.open}</p>
                  </div>
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => router.push('/missions?status=OPEN')}
                >
                  View Open
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">{statusCounts.inProgress}</p>
                </div>
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => router.push('/missions?status=IN_PROGRESS')}
              >
                View In Progress
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{statusCounts.completed}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => router.push('/missions?status=COMPLETED')}
              >
                View Completed
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Refunded</p>
                  <p className="text-2xl font-bold">{statusCounts.refunded}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => router.push('/missions?status=REFUNDED')}
              >
                View Refunded
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search missions by title, description, or skills..."
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
                <option value="dailyRate">Price</option>
                <option value="timeframe">Timeframe</option>
                <option value="title">Title</option>
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

            {(searchQuery || priceRange.min || priceRange.max || timeframeRange.min || timeframeRange.max || selectedSkills.length > 0) && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Price (€/day)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Price (€/day)
                  </label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Timeframe (days)
                  </label>
                  <input
                    type="number"
                    placeholder="1"
                    value={timeframeRange.min}
                    onChange={(e) => setTimeframeRange({ ...timeframeRange, min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Timeframe (days)
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    value={timeframeRange.max}
                    onChange={(e) => setTimeframeRange({ ...timeframeRange, max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              {/* Skills Filter */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Required Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAllSkills().map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                  {getAllSkills().length === 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No skills available
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedMissions.length} of {missions.length} missions
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 pb-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedMissions.map((mission) => (
            <div
              key={mission.id}
              className="glass-card flex h-full min-w-0 max-w-full flex-col overflow-hidden border border-gray-200 p-4 shadow-md dark:border-gray-700 sm:p-6"
            >
              <>
                  <div className="flex-1 flex flex-col">
                    <h3 className="mb-2 break-words text-lg font-semibold text-gray-900 dark:text-white">
                      {mission.title}
                    </h3>
                    <p className="mb-4 break-words text-gray-600 dark:text-gray-400">
                      {mission.description}
                    </p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <p><strong>Daily Rate:</strong> 
                        {mission.contract ? (
                          <span>
                            <span className="text-gray-900 dark:text-white">€{Number(mission.contract.dailyRate)}</span>
                            {Number(mission.contract.dailyRate) !== Number(mission.dailyRate) && (
                              <span className="text-gray-400 line-through ml-2">€{mission.dailyRate}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-900 dark:text-white">€{mission.dailyRate}</span>
                        )}
                      </p>
                      <p><strong>Timeframe:</strong> {mission.timeframe} days</p>
                      <p><strong>Status:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          effectiveStatus(mission) === 'OPEN' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : effectiveStatus(mission) === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : effectiveStatus(mission) === 'OVERDUE'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : effectiveStatus(mission) === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : effectiveStatus(mission) === 'REFUNDED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {effectiveStatus(mission) === 'OVERDUE' ? 'Overdue' : 
                           effectiveStatus(mission) === 'REFUNDED' ? 'Refunded' :
                           effectiveStatus(mission)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <p><strong>Client:</strong> {getClientName(mission)}</p>
                        {mission.client.averageRating && mission.client.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <StarRating 
                              rating={mission.client.averageRating} 
                              showNumber={true} 
                              size="sm" 
                            />
                            <span className="text-xs text-gray-500">({mission.client.totalReviews || 0})</span>
                          </div>
                        )}
                      </div>
                      <p>
                        <strong>Verification:</strong> 
                        <span className={`ml-1 ${mission.isVerified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {mission.isVerified ? '✓ Verified' : '⏳ Pending Verification'}
                        </span>
                      </p>
                      {mission.isVerified && mission.verifier && (
                        <p><strong>Verified by:</strong> {mission.verifier.firstName} {mission.verifier.lastName}</p>
                      )}
                    </div>
                    
                    {/* Skills Display */}
                    {mission.skills && mission.skills.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {mission.skills.map((skill: any, index: number) => (
                            <span
                              key={typeof skill === 'object' ? skill.id : index}
                              className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200"
                            >
                              {typeof skill === 'string' ? skill : skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(effectiveStatus(mission) === 'IN_PROGRESS' || effectiveStatus(mission) === 'OVERDUE') && (
                      <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400"><strong>Progress:</strong></p>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{getMissionProgressPercent(mission)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${getMissionProgressPercent(mission)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">

                    {/* Main action buttons - always on one line */}
                    <div className="flex gap-2 flex-wrap">
                      {/* View Details button for all missions */}
                      <a href={`/missions/${mission.id}`}>
                        <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </a>
                      
                      {/* View Contract button for missions with active contracts */}
                      {mission.contract?.isActive && (
                        <a href={`/contracts`}>
                          <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                            <FileText className="h-4 w-4 mr-1" />
                            View Contract
                          </Button>
                        </a>
                      )}
                    </div>
                    
                    {/* Show message for unverified missions */}
                    {userRole === 'freelance' && effectiveStatus(mission) === 'OPEN' && !mission.isVerified && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-md">
                        ⏳ This mission is pending admin verification.
                      </div>
                    )}

                    {/* Message Client button */}
                    {userRole === 'freelance' && mission.client.id !== currentUserId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/conversations/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ otherUserId: mission.client.id })
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              router.push(`/messages?conversation=${data.conversationId}`);
                            } else {
                              alert('Failed to start conversation');
                            }
                          } catch (error) {
                            console.error('Error starting conversation:', error);
                            alert('Error starting conversation');
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message Client
                      </Button>
                    )}

                    {/* Verify Mission button for admins */}
                    {userRole === 'admin' && !mission.isVerified && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/missions/${mission.id}/verify`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isVerified: true })
                            });
                            if (response.ok) {
                              // Refresh the page to show updated verification status
                              window.location.reload();
                            } else {
                              alert('Failed to verify mission');
                            }
                          } catch (error) {
                            console.error('Error verifying mission:', error);
                            alert('Error verifying mission');
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify Mission
                      </Button>
                    )}
                    
                  </div>
                </>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 