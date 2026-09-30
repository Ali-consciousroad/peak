"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  FileText, 
  Users, 
  TrendingUp, 
  Plus, 
  Eye, 
  CheckCircle,
  Clock,
  Coins,
  Calendar,
  User,
  Settings,
  Star,
  AlertTriangle,
  Euro,
  Wallet
} from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import ConflictNotification from "@/components/ConflictNotification";
import InAppNotifications from "@/components/InAppNotifications";
import MissionVerificationNotification from "@/components/MissionVerificationNotification";
import MissionVerificationBadge from "@/components/MissionVerificationBadge";
import PaymentVerificationNotification from "@/components/PaymentVerificationNotification";
import PaymentVerificationBadge from "@/components/PaymentVerificationBadge";
import OverdueMissionNotification from "@/components/OverdueMissionNotification";
import OverdueMissionBadge from "@/components/OverdueMissionBadge";
import { useUnverifiedMissions } from "@/lib/hooks/useUnverifiedMissions";
import { usePendingPayments } from "@/lib/hooks/usePendingPayments";
import { useReceivedOffers } from "@/lib/hooks/useReceivedOffers";

interface DashboardStats {
  totalMissions: number;
  activeContracts: number;
  pendingOffers: number;
  acceptedMissions: number; // Newly accepted missions (contracts created recently)
  completedMissions: number; // Completed missions count
  totalEarnings: number;
  totalCategories: number;
  totalUsers: number;
  recentActivity: any[];
  averageRating: number;
  totalReviews: number;
  totalSkills: number;
  paymentsInEscrow: number; // Payments in escrow for freelancer
  pendingPayments: number; // Pending payments for admin verification
}

interface Mission {
  id: string;
  title: string;
  status: string;
  dailyRate: number;
  createdAt: string;
}

interface Contract {
  id: string;
  dailyRate: number;
  isActive: boolean;
  createdAt: string;
  mission: {
    title: string;
    status?: string;
  };
}

interface Offer {
  id: string;
  status: string;
  mission: {
    title: string;
  };
  freelancer: {
    firstName?: string;
    lastName?: string;
  };
}

export default function DashboardPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { unverifiedCount } = useUnverifiedMissions();
  const { pendingCount } = usePendingPayments();
  const { count: receivedOffersCount } = useReceivedOffers();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [acceptedContractsCount, setAcceptedContractsCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempDailyRate, setTempDailyRate] = useState<number>(0);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    activeContracts: 0,
    pendingOffers: 0,
    acceptedMissions: 0,
    completedMissions: 0,
    totalEarnings: 0,
    totalCategories: 0,
    totalUsers: 0,
    recentActivity: [],
    averageRating: 0,
    totalReviews: 0,
    totalSkills: 0,
    paymentsInEscrow: 0,
    pendingPayments: 0
  });
  const [hasConflicts, setHasConflicts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCheckingDeadlines, setIsCheckingDeadlines] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userId) return;

      try {
        // Get user data
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const user = await userResponse.json();
          console.log('[Dashboard] User data received:', { id: user.id, role: user.role });
          setUserData(user);
          setUserRole(user.role);
        }

        // Get role-specific data
        if (userRole) {
          await fetchRoleSpecificData(userRole);
        }

        // Check for conflicts
        await checkForConflicts();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]); // Removed userRole dependency to prevent infinite loop

  // Separate useEffect for role-specific data
  useEffect(() => {
    if (userRole) {
      fetchRoleSpecificData(userRole);
      
      // Refresh data every 30 seconds (same as builder notifications)
      const interval = setInterval(() => {
        fetchRoleSpecificData(userRole);
      }, 30000);
      
      // Listen for contracts being marked as seen (from /my-missions page)
      const handleContractsMarkedAsSeen = () => {
        console.log('[Dashboard] Contracts marked as seen event received, refreshing data...');
        // Small delay to ensure database is updated
        setTimeout(() => {
          fetchRoleSpecificData(userRole);
        }, 200);
      };
      window.addEventListener('contractsMarkedAsSeen', handleContractsMarkedAsSeen);
      
      // Listen for payments being marked as seen (from /payments-in-escrow page)
      const handlePaymentsMarkedAsSeen = () => {
        console.log('[Dashboard] Payments marked as seen event received, refreshing data...');
        // Small delay to ensure database is updated
        setTimeout(() => {
          fetchRoleSpecificData(userRole);
        }, 200);
      };
      window.addEventListener('paymentsMarkedAsSeen', handlePaymentsMarkedAsSeen);

      // Listen for offers being marked as seen (from /offers page)
      const handleOffersMarkedAsSeen = () => {
        console.log('[Dashboard] Offers marked as seen event received, refreshing data...');
        setTimeout(() => {
          fetchRoleSpecificData(userRole);
        }, 200);
      };
      window.addEventListener('offersMarkedAsSeen', handleOffersMarkedAsSeen);

      // Listen for offers being accepted/rejected (from client-applications or mission applications page)
      const handleOffersUpdated = () => {
        console.log('[Dashboard] Offers updated event received, refreshing data...');
        setTimeout(() => {
          fetchRoleSpecificData(userRole);
        }, 200);
      };
      window.addEventListener('offersUpdated', handleOffersUpdated);
      
      // Also refresh when page becomes visible (user returns from /my-missions or /payments-in-escrow)
      const handleVisibilityChange = () => {
        if (!document.hidden && userRole) {
          console.log('[Dashboard] Page visible, refreshing data...');
          setTimeout(() => {
            fetchRoleSpecificData(userRole);
          }, 200);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('contractsMarkedAsSeen', handleContractsMarkedAsSeen);
        window.removeEventListener('paymentsMarkedAsSeen', handlePaymentsMarkedAsSeen);
        window.removeEventListener('offersMarkedAsSeen', handleOffersMarkedAsSeen);
        window.removeEventListener('offersUpdated', handleOffersUpdated);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [userRole]);

  const fetchUserRating = async () => {
    try {
      const response = await fetch('/api/reviews?receiverId=' + userData?.id);
      if (response.ok) {
        const reviews = await response.json();
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
          ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews 
          : 0;
        
        setStats(prev => ({
          ...prev,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews
        }));
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const checkForConflicts = async () => {
    try {
      const response = await fetch('/api/conflicts');
      if (response.ok) {
        const conflicts = await response.json();
        // Check if there are any recent conflicts (last 7 days) with relevant statuses
        const recentConflicts = conflicts.filter((conflict: any) => {
          const updatedAt = new Date(conflict.updatedAt);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          return updatedAt > sevenDaysAgo && 
                 ['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(conflict.status);
        });
        
        setHasConflicts(recentConflicts.length > 0);
      }
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      setHasConflicts(false);
    }
  };

  const fetchRoleSpecificData = async (role: string) => {
    console.log('[Dashboard] fetchRoleSpecificData called with role:', role);
    try {
      // Fetch user rating for all roles
      await fetchUserRating();

      if (role === 'admin') {
        // Fetch admin-specific data
        const [categoriesRes, missionsRes, contractsRes, usersRes, paymentsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/missions'),
          fetch('/api/contracts'),
          fetch('/api/users'),
          fetch('/api/payments', { cache: 'no-store' })
        ]);

        const categories = categoriesRes.ok ? await categoriesRes.json() : [];
        const missions = missionsRes.ok ? await missionsRes.json() : [];
        const contracts = contractsRes.ok ? await contractsRes.json() : [];
        const users = usersRes.ok ? await usersRes.json() : [];
        const payments = paymentsRes.ok ? await paymentsRes.json() : [];

        // Count pending payments (status: 'PENDING')
        const pendingPaymentsCount = Array.isArray(payments) 
          ? payments.filter((p: any) => p.status === 'PENDING').length 
          : 0;

        setStats(prev => ({
          ...prev,
          totalMissions: Array.isArray(missions) ? missions.length : 0,
          activeContracts: Array.isArray(contracts) ? contracts.filter((c: Contract) => 
            c.isActive && c.mission?.status !== 'COMPLETED' && c.mission?.status !== 'REFUNDED'
          ).length : 0,
          completedMissions: 0,
          totalCategories: Array.isArray(categories) ? categories.length : 0,
          totalUsers: Array.isArray(users) ? users.length : 0,
          pendingOffers: 0,
          totalEarnings: 0,
          pendingPayments: pendingPaymentsCount,
          recentActivity: [
            ...(Array.isArray(categories) ? categories : []),
            ...(Array.isArray(missions) ? missions : []),
            ...(Array.isArray(contracts) ? contracts : [])
          ].slice(0, 5)
        }));
      } else if (role === 'client') {
        console.log('[Dashboard] CLIENT ROLE - Fetching data...');
        // Fetch client-specific data
        const [missionsRes, contractsRes, offersRes] = await Promise.all([
          fetch('/api/missions/my-missions'), // Use the new endpoint that shows all client missions
          fetch('/api/contracts', { cache: 'no-store' }), // Ensure fresh data
          fetch('/api/offers')
        ]);

        const missions = missionsRes.ok ? await missionsRes.json() : [];
        const contracts = contractsRes.ok ? await contractsRes.json() : [];
        const offers = offersRes.ok ? await offersRes.json() : [];
        
        console.log('[Dashboard] CLIENT - Contracts received:', contracts.length);

        // Count newly accepted missions (contracts created in the last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const acceptedMissions = Array.isArray(contracts) 
          ? contracts.filter((c: any) => {
              const contractDate = new Date(c.createdAt);
              return c.isActive && contractDate >= sevenDaysAgo;
            }).length 
          : 0;

        // Count unseen accepted contracts (same pattern as builder pendingOffers)
        const unseenAcceptedContracts = Array.isArray(contracts)
          ? contracts.filter((c: any) => {
              const contractDate = new Date(c.createdAt);
              const isRecent = contractDate >= sevenDaysAgo;
              const isUnseen = !c.seenByClientAt;
              const matches = c.isActive && isRecent && isUnseen;
              
              if (matches) {
                console.log('[Dashboard] Found unseen contract:', {
                  id: c.id,
                  missionTitle: c.mission?.title,
                  createdAt: c.createdAt,
                  seenByClientAt: c.seenByClientAt,
                  isActive: c.isActive
                });
              }
              
              return matches;
            }).length
          : 0;
        
        console.log('[Dashboard] Unseen accepted contracts count:', unseenAcceptedContracts, 'out of', contracts.length, 'total contracts');
        setAcceptedContractsCount(unseenAcceptedContracts);
        
        // Debug: Log the state after setting
        console.log('[Dashboard] Set acceptedContractsCount to:', unseenAcceptedContracts);

        // Debug: Log contract details
        if (Array.isArray(contracts)) {
          const activeCount = contracts.filter((c: any) => c.isActive).length;
          const filteredCount = contracts.filter((c: any) => 
            c.isActive && c.mission?.status !== 'COMPLETED' && c.mission?.status !== 'REFUNDED'
          ).length;
          console.log('[Dashboard] Contracts debug:', {
            total: contracts.length,
            active: activeCount,
            activeAfterFilter: filteredCount,
            contracts: contracts.map((c: any) => ({
              id: c.id,
              isActive: c.isActive,
              missionStatus: c.mission?.status,
              missionTitle: c.mission?.title
            }))
          });
        }

        setStats(prev => ({
          ...prev,
          totalMissions: Array.isArray(missions) ? missions.length : 0,
          activeContracts: Array.isArray(contracts) ? contracts.filter((c: Contract) => 
            c.isActive && c.mission?.status !== 'COMPLETED' && c.mission?.status !== 'REFUNDED'
          ).length : 0,
          pendingOffers: Array.isArray(offers) ? offers.filter((a: Offer) => a.status === 'PENDING').length : 0,
          acceptedMissions: acceptedMissions,
          completedMissions: 0,
          totalEarnings: 0, // Calculate based on completed contracts
          recentActivity: [
            ...(Array.isArray(missions) ? missions : []),
            ...(Array.isArray(contracts) ? contracts : []),
            ...(Array.isArray(offers) ? offers : [])
          ].slice(0, 5)
        }));
      } else if (role === 'freelance') {
        // Fetch freelance-specific data
        const [
          skillsRes,
          portfoliosRes,
          offersRes,
          reviewsRes,
          contractsRes,
          paymentsInEscrowRes,
          missionsRes
        ] = await Promise.all([
          fetch('/api/skills'),
          fetch('/api/portfolios'),
          fetch('/api/offers'),
          fetch('/api/reviews'),
          fetch('/api/contracts'),
          fetch('/api/freelancer/payments-in-escrow', { cache: 'no-store' }),
          fetch('/api/missions')
        ]);

        const skills = skillsRes.ok ? await skillsRes.json() : [];
        const portfolios = portfoliosRes.ok ? await portfoliosRes.json() : [];
        const offers = offersRes.ok ? await offersRes.json() : [];
        const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
        const contracts = contractsRes.ok ? await contractsRes.json() : [];
        const paymentsInEscrow = paymentsInEscrowRes.ok ? await paymentsInEscrowRes.json() : [];
        const missions = missionsRes.ok ? await missionsRes.json() : [];

        // Calculate average rating from received reviews
        const receivedReviews = Array.isArray(reviews)
          ? reviews.filter((r: any) => r.receiverId === userData?.id || r.receiver?.id === userData?.id)
          : [];
        const averageRating = receivedReviews.length > 0 
          ? receivedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / receivedReviews.length 
          : 0;

        // Calculate active contracts and total earnings
        const activeContracts = Array.isArray(contracts) ? contracts.filter((c: any) => 
          c.isActive && c.mission?.status !== 'COMPLETED' && c.mission?.status !== 'REFUNDED'
        ).length : 0;
        const completedMissions = Array.isArray(contracts)
          ? contracts.filter((c: any) => c.mission?.status === 'COMPLETED').length
          : 0;
        // Debug: Log contract details for freelance
        if (Array.isArray(contracts)) {
          const activeCount = contracts.filter((c: any) => c.isActive).length;
          const filteredCount = contracts.filter((c: any) => 
            c.isActive && c.mission?.status !== 'COMPLETED' && c.mission?.status !== 'REFUNDED'
          ).length;
          console.log('[Dashboard] FREELANCE Contracts debug:', {
            total: contracts.length,
            active: activeCount,
            activeAfterFilter: filteredCount,
            contracts: contracts.map((c: any) => ({
              id: c.id,
              isActive: c.isActive,
              missionStatus: c.mission?.status,
              missionTitle: c.mission?.title
            }))
          });
        }
        const totalEarnings = Array.isArray(contracts) ? contracts.reduce((sum: number, c: any) => {
          if (c.mission?.status === 'COMPLETED') {
            const startDate = new Date(c.startDate);
            const endDate = new Date(c.endDate);
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return sum + (c.dailyRate * days);
          }
          return sum;
        }, 0) : 0;

        // Badge: unseen escrow only. The /payments-in-escrow page lists all MADE payments.
        const paymentsInEscrowCount = Array.isArray(paymentsInEscrow)
          ? paymentsInEscrow.filter((p: { payment?: { seenByFreelancerAt?: string | null } }) =>
              p.payment && !p.payment.seenByFreelancerAt
            ).length
          : 0;

        setStats(prev => ({
          ...prev,
          totalMissions: Array.isArray(missions) ? missions.length : 0,
          activeContracts: activeContracts,
          pendingOffers: 0, // Use useReceivedOffers hook for freelancer (unseen received offers)
          totalEarnings: totalEarnings,
          completedMissions: completedMissions,
          averageRating: averageRating,
          totalReviews: receivedReviews.length,
          totalSkills: Array.isArray(skills) ? skills.length : 0,
          paymentsInEscrow: paymentsInEscrowCount,
          recentActivity: [
            ...(Array.isArray(missions) ? missions : []),
            ...(Array.isArray(offers) ? offers : []),
            ...(Array.isArray(contracts) ? contracts : [])
          ].slice(0, 5)
        }));
      }
    } catch (error) {
      console.error('Error fetching role-specific data:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    if (userData?.profile?.firstName && userData?.profile?.lastName) {
      return `${userData.profile.firstName} ${userData.profile.lastName}`;
    }
    if (userData?.profile?.firstName) {
      return userData.profile.firstName;
    }
    return userData?.email?.split('@')[0] || 'User';
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-32">
        <p>Please sign in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-32">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Daily rate update functions
  const handleUpdateDailyRate = async () => {
    if (isUpdatingRate || !userData) return;
    
    setIsUpdatingRate(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dailyRate: tempDailyRate
        }),
      });

      if (response.ok) {
        // Update the UI immediately without page refresh
        setUserData((prev: any) => ({ ...prev, dailyRate: tempDailyRate }));
        setIsEditingRate(false);
      } else {
        console.error('Failed to update daily rate');
      }
    } catch (error) {
      console.error('Error updating daily rate:', error);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const startEditingRate = () => {
    setTempDailyRate(userData?.dailyRate || 0);
    setIsEditingRate(true);
  };

  const handleCheckDeadlines = async () => {
    if (isCheckingDeadlines) return;
    
    setIsCheckingDeadlines(true);
    try {
      const response = await fetch('/api/admin/check-deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Deadline check completed:', result);
        
        // Show success message
        const summary = result.results.summary;
        alert(`Deadline check completed!\n\nOverdue missions marked: ${summary.totalOverdue}\nMissions needing review: ${summary.totalNeedingReview || 0}\nPotential refund amount: €${summary.totalPotentialRefund || 0}\n\n⚠️ Note: Refunds require admin review. No automatic refunds were processed.`);
        
        // Refresh dashboard data
        window.location.reload();
      } else {
        console.error('Failed to check deadlines');
        alert('Failed to check deadlines. Please try again.');
      }
    } catch (error) {
      console.error('Error checking deadlines:', error);
      alert('Error checking deadlines. Please try again.');
    } finally {
      setIsCheckingDeadlines(false);
    }
  };

  const cancelEditingRate = () => {
    setIsEditingRate(false);
    setTempDailyRate(0);
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-32">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
                <h1 className="mb-0 break-words text-2xl font-bold sm:text-3xl">
                  Welcome to your dashboard {getUserName()}!
                </h1>
            </div>
            
            {/* Dashboard Actions */}
            <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">
              {/* Availability Toggle for Builders */}
              {userRole === 'freelance' && (
                <button
                  onClick={async () => {
                    if (isToggling) return; // Prevent multiple clicks
                    
                    setIsToggling(true);
                    try {
                      const response = await fetch("/api/users/profile", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ active: !userData?.active })
                      });
                      if (response.ok) {
                        // Update state instead of refreshing page
                        setUserData((prev: any) => ({ ...prev, active: !prev.active }));
                      }
                    } catch (error) {
                      console.error('Error updating status:', error);
                    } finally {
                      setIsToggling(false);
                    }
                  }}
                  disabled={isToggling}
                  className="relative flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer overflow-hidden group disabled:opacity-50"
                >
                  {/* Animated light effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  
                  {/* Toggle switch container */}
                  <div className="relative w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full p-0.5 transition-colors">
                    {/* Sliding dot */}
                    <div 
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform duration-300 ease-in-out ${
                        userData?.active 
                          ? 'bg-green-500 translate-x-4' 
                          : 'bg-red-500 translate-x-0'
                      }`}
                    ></div>
                  </div>
                  
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 relative z-10">
                    {userData?.active ? 'Available' : 'Busy'}
                  </span>
                </button>
              )}
              
              {/* Payment Preferences Button for Builders */}
              {userRole === 'freelance' && userData?.id && (
                <button
                  onClick={() => router.push(`/builders/${userData.id}?paymentPreferences=true`)}
                  className="px-3 py-2 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2 font-medium"
                  title="Configure how you want to receive payments (EUR, BTC, ETH, AVAX, SOL)"
                >
                  <Wallet className="h-4 w-4" />
                  Payment Preferences
                </button>
              )}
              
              {/* Edit Profile Button for All Users */}
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

                {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userRole === 'admin' && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Missions</p>
                      <p className="text-2xl font-bold">{stats.totalMissions}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Contracts</p>
                      <p className="text-2xl font-bold">{stats.activeContracts}</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Categories</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.totalCategories}</p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === 'client' && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Missions</p>
                      <p className="text-2xl font-bold">{stats.totalMissions}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Contracts</p>
                      <p className="text-2xl font-bold">{stats.activeContracts}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Offers</p>
                      <p className="text-2xl font-bold">{stats.pendingOffers}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Client Rating</p>
                      <div className="flex items-center gap-2">
                        <StarRating 
                          rating={stats.averageRating} 
                          showNumber={true} 
                          size="sm" 
                        />
                        <span className="text-xs text-gray-500">({stats.totalReviews} reviews)</span>
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === 'freelance' && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">My Skills</p>
                      <p className="text-2xl font-bold">{stats.totalSkills}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Daily Rate</p>
                      {isEditingRate ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">€</span>
                            <input
                              type="number"
                              value={tempDailyRate || ''}
                              onChange={(e) => setTempDailyRate(parseFloat(e.target.value) || 0)}
                              className="text-2xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none w-24"
                              placeholder="0"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="text-xs bg-green-600 hover:bg-green-700"
                              onClick={handleUpdateDailyRate}
                              disabled={isUpdatingRate}
                            >
                              {isUpdatingRate ? 'Saving...' : 'Save'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={cancelEditingRate}
                              disabled={isUpdatingRate}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold">€{userData?.dailyRate || 0}</p>
                          <p className="text-xs text-gray-500">per day</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs"
                            onClick={startEditingRate}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Edit Rate
                          </Button>
                        </div>
                      )}
                    </div>
                    <Coins className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Offers</p>
                      <p className="text-2xl font-bold">{receivedOffersCount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Builder Rating</p>
                      <div className="flex items-center gap-2">
                        <StarRating 
                          rating={stats.averageRating} 
                          showNumber={true} 
                          size="sm" 
                        />
                        <span className="text-xs text-gray-500">({stats.totalReviews} reviews)</span>
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
                         <CardContent className="space-y-4">
               {userRole === 'admin' && (
                 <>
                   <Button 
                     onClick={() => router.push('/admin/payments')}
                     variant="outline"
                     className={`w-full ${stats.pendingPayments > 0 ? 'justify-between' : 'justify-start'} ${
                       stats.pendingPayments > 0 
                         ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                         : ''
                     }`}
                   >
                     {stats.pendingPayments > 0 ? (
                       <>
                         <div className="flex items-center">
                           <Coins className="h-4 w-4 mr-2" />
                           Pending Payments
                         </div>
                         <Badge className="ml-auto bg-white text-blue-600 font-semibold">
                           {stats.pendingPayments}
                         </Badge>
                       </>
                     ) : (
                       <>
                         <Coins className="h-4 w-4 mr-2" />
                         Pending Payments
                       </>
                     )}
                   </Button>
                   <Button 
                     onClick={() => router.push('/admin/users')}
                     variant="outline"
                     className="w-full justify-start"
                   >
                     <Users className="h-4 w-4 mr-2" />
                     Manage Users
                   </Button>
                   <Button 
                     onClick={() => router.push('/missions')}
                     variant="outline"
                     className="w-full justify-start"
                   >
                     <Briefcase className="h-4 w-4 mr-2" />
                     View All Missions
                   </Button>
                 </>
               )}

               {userRole === 'client' && (
                <>
                  <Button 
                    onClick={() => router.push('/builders')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Browse Builders
                  </Button>
                  <Button 
                    onClick={() => router.push('/missions/new')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Mission
                  </Button>
                  <Button 
                    onClick={() => router.push('/missions?status=IN_PROGRESS')}
                    variant="outline"
                    className={`w-full ${acceptedContractsCount > 0 ? 'justify-between' : 'justify-start'} ${
                      acceptedContractsCount > 0 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                        : ''
                    }`}
                  >
                    {acceptedContractsCount > 0 ? (
                      <>
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Mission Progress
                        </div>
                        <Badge className="ml-auto bg-white text-blue-600 font-semibold">
                          {acceptedContractsCount}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Mission Progress
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push('/client-applications')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Offers
                  </Button>
                  <Button 
                    onClick={() => router.push('/contracts')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Contracts
                  </Button>
                </>
              )}

              {userRole === 'freelance' && (
                <>
                  <Button 
                    onClick={() => router.push('/missions?status=IN_PROGRESS')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Mission Progress
                  </Button>
                  <Button 
                    onClick={() => router.push('/offers')}
                    variant="outline"
                    className={`w-full ${receivedOffersCount > 0 ? 'justify-between' : 'justify-start'} ${
                      receivedOffersCount > 0 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                        : ''
                    }`}
                  >
                    {receivedOffersCount > 0 ? (
                      <>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Received Offers
                        </div>
                        <Badge className="ml-auto bg-white text-blue-600 font-semibold">
                          {receivedOffersCount}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Received Offers
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push('/payments-in-escrow')}
                    variant="outline"
                    className={`w-full ${stats.paymentsInEscrow > 0 ? 'justify-between' : 'justify-start'} ${
                      stats.paymentsInEscrow > 0 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                        : ''
                    }`}
                  >
                    {stats.paymentsInEscrow > 0 ? (
                      <>
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 mr-2" />
                          Payments in Escrow
                        </div>
                        <Badge className="ml-auto bg-white text-blue-600 font-semibold">
                          {stats.paymentsInEscrow}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Euro className="h-4 w-4 mr-2" />
                        Payments in Escrow
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push('/portfolios')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    My Portfolio
                  </Button>
                  <Button 
                    onClick={() => router.push('/skills/new')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Skill
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin Management Section */}
          {userRole === 'admin' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Management</CardTitle>
                  <CardDescription>Manage the freelance marketplace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <Button 
                        onClick={() => router.push('/admin/users')}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/verify-missions')}
                        variant="outline"
                        className="w-full justify-between"
                        size="sm"
                      >
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Missions
                        </div>
                        {userRole === 'admin' && unverifiedCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {unverifiedCount > 99 ? '99+' : unverifiedCount}
                          </span>
                        )}
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/payments')}
                        variant="outline"
                        className="w-full justify-between"
                        size="sm"
                      >
                        <div className="flex items-center">
                          <Coins className="h-4 w-4 mr-2" />
                          Verify Payments
                        </div>
                        {userRole === 'admin' && pendingCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/conflicts')}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Manage Conflicts
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Button 
                        onClick={handleCheckDeadlines}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        disabled={isCheckingDeadlines}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {isCheckingDeadlines ? 'Checking...' : 'Check Deadlines'}
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/categories')}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Categories
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/categories')}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Category
                      </Button>
                      <Button 
                        onClick={() => router.push('/admin/skills')}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Manage Skills
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>System overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                      <p className="text-sm text-gray-600">Total Users</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.totalMissions}</p>
                      <p className="text-sm text-gray-600">Active Missions</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{stats.activeContracts}</p>
                      <p className="text-sm text-gray-600">Active Contracts</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{stats.totalCategories}</p>
                      <p className="text-sm text-gray-600">Categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Missions Card - Clients and builders */}
          {(userRole === 'client' || userRole === 'freelance') && (
            <Card>
              <CardHeader>
                <CardTitle>Missions</CardTitle>
                <CardDescription>Your recent missions and projects</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentActivity.filter(activity => activity.title).length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No missions yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {userRole === 'client'
                        ? 'Create your first mission to get started'
                        : 'When a client sends you an offer, it will appear here'}
                    </p>
                    {userRole === 'client' ? (
                      <Button 
                        onClick={() => router.push('/missions/new')}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Mission
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => router.push('/offers')}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Offers
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const missions = stats.recentActivity.filter(activity => activity.title);
                      // Sort missions: IN_PROGRESS first, then by creation date
                      const sortedMissions = missions.sort((a, b) => {
                        if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
                        if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      });
                      
                      return sortedMissions.slice(0, 3).map((mission, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {mission.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {mission.status === 'IN_PROGRESS' ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">In Progress</span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400">Open</span>
                              )} • {new Date(mission.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/missions/${mission.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      ));
                    })()}
                    {stats.totalMissions > 3 && (
                      <div className="pt-2 space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => router.push('/missions')}
                        >
                          View All {stats.totalMissions} Missions
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => router.push('/missions?status=COMPLETED')}
                        >
                          View Completed Missions
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and activities</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start items-start h-auto p-3 overflow-hidden"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium break-words whitespace-normal">
                          {activity.title || activity.name || 'Activity'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* In-app Notifications - from notifications table (conflict_created, etc.) */}
          <InAppNotifications />

          {/* Conflict Notifications Card - Only show if there are conflicts */}
          {hasConflicts && (
            <Card>
              <CardHeader>
                <CardTitle>Conflict Updates</CardTitle>
                <CardDescription>Recent conflict status changes</CardDescription>
              </CardHeader>
              <CardContent>
                <ConflictNotification />
              </CardContent>
            </Card>
          )}
          {userRole === 'admin' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Missions Pending Verification</span>
                    <MissionVerificationBadge />
                  </CardTitle>
                  <CardDescription>New missions that need admin verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <MissionVerificationNotification />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Payments Pending Verification</span>
                    <PaymentVerificationBadge />
                  </CardTitle>
                  <CardDescription>Payments validated by clients that need admin verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentVerificationNotification />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Overdue Missions Needing Review</span>
                    <OverdueMissionBadge />
                  </CardTitle>
                  <CardDescription>Missions past grace period that require admin review for potential refunds</CardDescription>
                </CardHeader>
                <CardContent>
                  <OverdueMissionNotification />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
