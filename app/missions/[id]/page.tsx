"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Mission as PrismaMission } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowLeft, CheckCircle, Euro, CreditCard, Star, RefreshCw, Wallet, ExternalLink } from "lucide-react";
import Link from "next/link";
import PaymentForm from '@/components/PaymentForm';
import ReviewForm from '@/components/ReviewForm';
import {
  getWeb3PayoutAddress,
  isEurPreferredPayoutMethod
} from '@/lib/payout-display';
import {
  calculateTimeframeDdMmYyyy,
  endDateDdMmYyyyFromStartAndTimeframe,
  formatMissionDateInputFromApi,
} from '@/lib/mission-dates';

interface Mission extends Omit<PrismaMission, 'dailyRate'> {
  dailyRate: number;
  title: string;
  isVerified: boolean;
  clientId?: string;
  skills?: Array<{id: string; name: string}>;
  client?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  verifier?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  contract?: {
    id: string;
    dailyRate: number | string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    freelancerId?: string;
    users_contracts_freelancerIdTousers?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      roleId?: string;
    };
  } | null;
  /** Admin-only: builder payout fields from profile (same source as notifications). */
  builderPayoutForAdmin?: {
    preferredPaymentMethod: string | null;
    bankAccount: string | null;
    cryptoWalletAddress: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface ReviewReceiver {
  id: string;
  name: string;
  roleLabel: string;
}

type MissionSkill = { id: string; name: string };

const normalizeSkillObjects = (skills: unknown): MissionSkill[] => {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      if (
        skill &&
        typeof skill === 'object' &&
        'id' in skill &&
        'name' in skill &&
        typeof (skill as { id?: unknown }).id === 'string' &&
        typeof (skill as { name?: unknown }).name === 'string'
      ) {
        return {
          id: (skill as { id: string }).id,
          name: (skill as { name: string }).name.trim(),
        };
      }
      return null;
    })
    .filter((skill): skill is MissionSkill => Boolean(skill && skill.name.length > 0));
};

export default function MissionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useUser();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewReceiver, setReviewReceiver] = useState<ReviewReceiver | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'missing' | 'exists' | 'unavailable'>('idle');
  const [reviewCheckLoading, setReviewCheckLoading] = useState(false);
  const [reviewCheckError, setReviewCheckError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dailyRate: 0,
    timeframe: 0,
    status: 'OPEN',
    skills: [] as MissionSkill[],
    startDate: '',
    endDate: '',
  });
  const [categoriesWithSkills, setCategoriesWithSkills] = useState<any[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<MissionSkill[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const pickPrimaryMissionPayment = (payments: any[]) => {
    if (!Array.isArray(payments) || payments.length === 0) return null;
    const active = payments.find((p: any) =>
      ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    );
    if (active) return active;
    return payments.find((p: any) =>
      ['COMPLETED', 'CANCELLED'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    ) || null;
  };

  const getMilestoneProgressPercent = (status?: string) => {
    switch (status) {
      case 'RELEASED_1':
        return 25;
      case 'RELEASED_2':
        return 75;
      case 'COMPLETED':
        return 100;
      case 'MADE':
      case 'PENDING':
      default:
        return 0;
    }
  };

  useEffect(() => {
    const fetchMission = async () => {
      try {
        const response = await fetch(`/api/missions/${params.id}`, {
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch mission');
        }
        const data = await response.json();
        setMission(data);
        setFormData({
          title: data.title,
          description: data.description,
          dailyRate: data.dailyRate,
          timeframe: data.timeframe,
          status: data.status,
          skills: normalizeSkillObjects(data.skills),
          startDate: formatMissionDateInputFromApi(data.startDate),
          endDate: formatMissionDateInputFromApi(data.endDate),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch mission');
      } finally {
        setLoading(false);
      }
    };

    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setAdminStatus(userData.role === 'admin');
          setUserRole(userData.role);
          setCurrentUserId(userData.id || null);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminStatus(false);
      }
    };

    fetchMission();
    checkAdminStatus();
  }, [params.id]);

  useEffect(() => {
    const fetchCategoriesAndSkills = async () => {
      try {
        const response = await fetch('/api/categories-skills');
        if (!response.ok) return;
        const data = await response.json();
        setCategoriesWithSkills(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching categories and skills:', error);
      }
    };
    fetchCategoriesAndSkills();
  }, []);

  useEffect(() => {
    const fetchPayment = async () => {
      if (!mission) return;
      
      try {
        const response = await fetch(`/api/payments?missionId=${mission.id}`);
        if (response.ok) {
          const data = await response.json();
          setPayment(pickPrimaryMissionPayment(data));
        }
      } catch (err) {
        console.error('Error fetching payment:', err);
      }
    };

    fetchPayment();
  }, [mission]);

  const getDisplayName = (profile?: { firstName?: string; lastName?: string; email?: string }) => {
    if (!profile) return 'Unknown';
    const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    if (name) return name;
    if (profile.email) return profile.email.split('@')[0];
    return 'Unknown';
  };

  useEffect(() => {
    if (!mission || mission.status !== 'COMPLETED') {
      setReviewReceiver(null);
      setReviewStatus('idle');
      setReviewCheckError(null);
      return;
    }
    if (!currentUserId) return;

    const resolveReceiver = (): ReviewReceiver | null => {
      if (userRole === 'client') {
        const freelancer = mission.contract?.users_contracts_freelancerIdTousers;
        const freelancerId = freelancer?.id || mission.contract?.freelancerId;
        if (!freelancerId) return null;
        return {
          id: freelancerId,
          name: getDisplayName(freelancer),
          roleLabel: 'Builder',
        };
      }
      if (userRole === 'freelance') {
        if (!mission.client?.id) return null;
        return {
          id: mission.client.id,
          name: getDisplayName(mission.client),
          roleLabel: 'Client',
        };
      }
      return null;
    };

    const receiver = resolveReceiver();
    setReviewReceiver(receiver);

    if (!receiver) {
      setReviewStatus('unavailable');
      return;
    }

    setReviewCheckLoading(true);
    setReviewCheckError(null);

    fetch(`/api/reviews?missionId=${mission.id}&reviewerId=${currentUserId}&receiverId=${receiver.id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to check review status');
        }
        return response.json();
      })
      .then((data) => {
        setReviewStatus(Array.isArray(data) && data.length > 0 ? 'exists' : 'missing');
      })
      .catch((error) => {
        console.error('Error checking review status:', error);
        setReviewStatus('missing');
        setReviewCheckError('Unable to verify review status. You can still leave a review.');
      })
      .finally(() => {
        setReviewCheckLoading(false);
      });
  }, [mission, currentUserId, userRole]);

  // Check freelancer access after mission is loaded
  useEffect(() => {
    if (userRole === 'freelance' && !loading && !mission && !error) {
      console.log('Freelancer trying to access mission without permission - redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [userRole, loading, mission, error, router]);

  const handleReopen = async () => {
    if (!confirm('Reopen this mission so it appears for new offers? Any builder will be able to receive offers for it.')) return;
    setReopening(true);
    try {
      const response = await fetch(`/api/admin/missions/${params.id}/reopen`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reopen mission');
      }
      const data = await response.json();
      setMission(prev => prev ? { ...prev, status: 'OPEN' } : null);
      setFormData(prev => ({ ...prev, status: 'OPEN' }));
      showToast(data.message || 'Mission reopened. It is now available for new offers.');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reopen mission');
    } finally {
      setReopening(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this mission?')) return;

    try {
      const response = await fetch(`/api/missions/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete mission');
      }

      // Redirect based on user role after deletion
      if (userRole === 'freelance') {
        router.push('/dashboard');
      } else {
        router.push('/missions');
      }
    } catch (error) {
      console.error('Error deleting mission:', error);
      alert('Failed to delete mission');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission) return;
    const canEditMissionDates =
      mission.status === 'OPEN' && !mission.contract?.isActive;
    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        dailyRate: formData.dailyRate,
        timeframe: formData.timeframe,
        status: formData.status,
        skillIds: formData.skills.map((skill) => skill.id),
      };
      if (canEditMissionDates) {
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      }

      const response = await fetch(`/api/missions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === 'string' ? errBody.error : 'Failed to update mission',
        );
      }

      const updatedMission = await response.json();
      setMission(updatedMission);
      setFormData((prev) => ({
        ...prev,
        title: updatedMission.title,
        description: updatedMission.description,
        dailyRate: updatedMission.dailyRate,
        timeframe: updatedMission.timeframe,
        status: updatedMission.status,
        skills: normalizeSkillObjects(updatedMission.skills) || prev.skills,
        startDate: formatMissionDateInputFromApi(updatedMission.startDate),
        endDate: formatMissionDateInputFromApi(updatedMission.endDate),
      }));
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mission');
    }
  };

  const filterSkillSuggestions = (input: string): MissionSkill[] => {
    if (input.trim().length < 2) return [];
    const allSkills = categoriesWithSkills.flatMap((category) => category.skills || []);
    const uniqueSkillsMap = new Map<string, MissionSkill>();
    allSkills.forEach((skill: any) => {
      if (skill?.id && skill?.name && !uniqueSkillsMap.has(skill.id)) {
        uniqueSkillsMap.set(skill.id, { id: skill.id, name: skill.name });
      }
    });

    const selectedIds = new Set(formData.skills.map((skill) => skill.id));
    return Array.from(uniqueSkillsMap.values())
      .filter(
        (skill) =>
          skill.name.toLowerCase().includes(input.toLowerCase()) &&
          !selectedIds.has(skill.id),
      )
      .slice(0, 8);
  };

  const releaseMilestone = async (milestone: number) => {
    if (!payment) return;
    
    try {
      const response = await fetch(`/api/payments/${payment.id}/release-milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        
        // If this is the final milestone, update mission status
        if (data.isFinalMilestone) {
          setMission(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        }
        
        // Refresh payment data
        if (mission) {
          const paymentResponse = await fetch(`/api/payments?missionId=${mission.id}`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            setPayment(pickPrimaryMissionPayment(paymentData));
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to release milestone');
      }
    } catch (error) {
      console.error('Error releasing milestone:', error);
      alert('Error releasing milestone');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSubmitReview = async (reviewData: { content: string; rating: number }) => {
    if (!reviewReceiver || !mission) return;
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: reviewReceiver.id,
          missionId: mission.id,
          content: reviewData.content,
          rating: reviewData.rating,
        }),
      });

      if (response.ok) {
        setReviewStatus('exists');
        setShowReviewModal(false);
        showToast('Review submitted. Thanks for your feedback.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-8">
          <div className="text-red-500">{error}</div>
          <Button
            onClick={() => {
              // Redirect based on user role
              if (userRole === 'freelance') {
                router.push('/dashboard');
              } else {
                router.push('/missions');
              }
            }}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {userRole === 'freelance' ? 'Back to Dashboard' : 'Back to Missions'}
          </Button>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="w-full">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="glass-card p-8">
            <div className="text-gray-500 dark:text-gray-400">Mission not found</div>
            <Button
              onClick={() => {
                // Redirect based on user role
                if (userRole === 'freelance') {
                  router.push('/dashboard');
                } else {
                  router.push('/missions');
                }
              }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Missions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = currentUserId === mission.clientId || currentUserId === mission.client?.id;
  const canEditMission = isOwner || adminStatus === true;
  const canReopen = mission.status === 'REFUNDED' && canEditMission;
  const canEditMissionDates =
    mission.status === 'OPEN' && !mission.contract?.isActive;

  const formatMissionDisplayDate = (iso: string | Date | null | undefined) => {
    if (iso == null || iso === '') return '—';
    const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[60] rounded-md bg-gray-900 text-white px-4 py-3 shadow-lg">
          <p className="text-sm">{toastMessage}</p>
        </div>
      )}
      <div className="container mx-auto max-w-full min-w-0 px-4 py-8 pt-24">
        <div className="glass-card max-w-full min-w-0 overflow-hidden p-4 sm:p-8">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Daily Rate (€)
                </label>
                <input
                  type="number"
                  id="dailyRate"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Timeframe (days)
                </label>
                <input
                  type="number"
                  id="timeframe"
                  value={formData.timeframe}
                  onChange={(e) => {
                    const timeframe = parseInt(e.target.value, 10) || 0;
                    if (!canEditMissionDates) {
                      setFormData({ ...formData, timeframe });
                      return;
                    }
                    setFormData((prev) => {
                      if (!prev.startDate) return { ...prev, timeframe };
                      try {
                        const newEnd = endDateDdMmYyyyFromStartAndTimeframe(
                          prev.startDate,
                          timeframe,
                        );
                        return { ...prev, timeframe, endDate: newEnd };
                      } catch {
                        return { ...prev, timeframe };
                      }
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                  min="1"
                />
              </div>

              <>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start date (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      setFormData((prev) => {
                        let endDate = prev.endDate;
                        if (startDate && prev.timeframe) {
                          try {
                            endDate = endDateDdMmYyyyFromStartAndTimeframe(
                              startDate,
                              prev.timeframe,
                            );
                          } catch {
                            /* keep previous end */
                          }
                        }
                        return { ...prev, startDate, endDate };
                      });
                    }}
                    placeholder="dd/mm/yyyy"
                    disabled={!canEditMissionDates}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End date (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => {
                      const endDate = e.target.value;
                      setFormData((prev) => {
                        const tf = calculateTimeframeDdMmYyyy(
                          prev.startDate,
                          endDate,
                        );
                        return {
                          ...prev,
                          endDate,
                          ...(tf
                            ? { timeframe: parseInt(tf, 10) || prev.timeframe }
                            : {}),
                        };
                      });
                    }}
                    placeholder="dd/mm/yyyy"
                    disabled={!canEditMissionDates}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {canEditMissionDates
                      ? 'You can change dates while the mission is open and not yet assigned.'
                      : 'Dates are locked once the mission is assigned or no longer open.'}
                  </p>
                </div>
              </>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
                <div className="mt-1 space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      id="skills"
                      value={skillInput}
                      placeholder="Type a skill (e.g., React, Python, UI/UX Design...)"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (
                            selectedSuggestionIndex >= 0 &&
                            selectedSuggestionIndex < skillSuggestions.length
                          ) {
                            const skillToAdd = skillSuggestions[selectedSuggestionIndex];
                            setFormData((prev) => ({
                              ...prev,
                              skills: [...prev.skills, skillToAdd],
                            }));
                            setSkillInput('');
                            setShowSkillSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          } else if (skillSuggestions.length > 0) {
                            const skillToAdd = skillSuggestions[0];
                            setFormData((prev) => ({
                              ...prev,
                              skills: [...prev.skills, skillToAdd],
                            }));
                            setSkillInput('');
                            setShowSkillSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (showSkillSuggestions && skillSuggestions.length > 0) {
                            setSelectedSuggestionIndex((prev) =>
                              prev < skillSuggestions.length - 1 ? prev + 1 : 0,
                            );
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (showSkillSuggestions && skillSuggestions.length > 0) {
                            setSelectedSuggestionIndex((prev) =>
                              prev > 0 ? prev - 1 : skillSuggestions.length - 1,
                            );
                          }
                        } else if (e.key === 'Escape') {
                          setShowSkillSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSkillInput(value);
                        const suggestions = filterSkillSuggestions(value);
                        setSkillSuggestions(suggestions);
                        setShowSkillSuggestions(suggestions.length > 0);
                        setSelectedSuggestionIndex(-1);
                      }}
                      onFocus={() => {
                        if (skillSuggestions.length > 0) setShowSkillSuggestions(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowSkillSuggestions(false), 200);
                      }}
                    />
                    {showSkillSuggestions && skillSuggestions.length > 0 && (
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
                              setFormData((prev) => ({
                                ...prev,
                                skills: [...prev.skills, skill],
                              }));
                              setSkillInput('');
                              setShowSkillSuggestions(false);
                              setSelectedSuggestionIndex(-1);
                            }}
                          >
                            {skill.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {skill.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                skills: prev.skills.filter((s) => s.id !== skill.id),
                              }))
                            }
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Type to search and add skills.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.skills.length} skill{formData.skills.length === 1 ? '' : 's'} selected
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{mission.title}</h1>
                  <p className="mt-2 break-words text-gray-500 dark:text-gray-400">
                    Posted by {mission.client?.firstName && mission.client?.lastName 
                      ? `${mission.client.firstName} ${mission.client.lastName}` 
                      : mission.client?.firstName 
                      ? mission.client.firstName 
                      : mission.client?.email?.split('@')[0] || 'Unknown Client'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {/* Save/Unsave Button */}
                  
                  {/* Reopen button for refunded missions */}
                  {canReopen && (
                    <Button
                      onClick={handleReopen}
                      disabled={reopening}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${reopening ? 'animate-spin' : ''}`} />
                      {reopening ? 'Reopening...' : 'Reopen for New Offers'}
                    </Button>
                  )}
                  {/* Edit/Delete buttons for mission owners */}
                  {canEditMission && mission.status !== 'REFUNDED' && (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              <div className="prose max-w-none min-w-0 dark:prose-invert">
                <p className="break-words text-gray-700 dark:text-gray-300">{mission.description}</p>
              </div>

              {/* Verification Status */}
              <div className="mt-4 flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  mission.isVerified 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {mission.isVerified ? '✓ Verified' : '⏳ Pending Verification'}
                </span>
                {mission.isVerified && mission.verifier && (
                  <span className="text-sm text-gray-500">
                    by {mission.verifier.firstName && mission.verifier.lastName
                      ? `${mission.verifier.firstName} ${mission.verifier.lastName}`
                      : mission.verifier.firstName
                      ? mission.verifier.firstName
                      : mission.verifier.email?.split('@')[0] || 'Admin'}
                  </span>
                )}
              </div>

              <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
                <div className="glass-card max-w-full min-w-0 overflow-hidden p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Rate</dt>
                      <dd className="mt-1 text-lg text-gray-900 dark:text-white">
                        {mission.contract ? (
                          <div>
                            <div>€{Number(mission.contract.dailyRate)} <span className="text-sm text-gray-500">(Agreed Rate)</span></div>
                            {Number(mission.contract.dailyRate) !== Number(mission.dailyRate) && (
                              <div className="text-sm text-gray-500 line-through mt-1">€{Number(mission.dailyRate)} <span className="text-xs">(Original)</span></div>
                            )}
                          </div>
                        ) : (
                          <>€{Number(mission.dailyRate)}</>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeframe</dt>
                      <dd className="mt-1 text-lg text-gray-900 dark:text-white">{mission.timeframe} days</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Start date</dt>
                      <dd className="mt-1 text-lg text-gray-900 dark:text-white">
                        {formatMissionDisplayDate(mission.startDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">End date</dt>
                      <dd className="mt-1 text-lg text-gray-900 dark:text-white">
                        {formatMissionDisplayDate(mission.endDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Budget</dt>
                      <dd className="mt-1 text-lg text-gray-900 dark:text-white">
                        {mission.contract ? (
                          <>€{Number(mission.contract.dailyRate) * mission.timeframe}</>
                        ) : (
                          <>€{Number(mission.dailyRate) * mission.timeframe}</>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mission.status === 'OPEN' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : mission.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : mission.status === 'OVERDUE'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : mission.status === 'REFUNDED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : mission.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {mission.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="glass-card max-w-full min-w-0 overflow-hidden p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {mission.skills && mission.skills.length > 0 ? (
                      mission.skills.map((skill: any, index: number) => (
                        <span
                          key={typeof skill === 'object' ? skill.id : index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {typeof skill === 'string' ? skill : skill.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No skills specified</p>
                    )}
                  </div>
                </div>
              </div>

              {adminStatus === true &&
                mission.contract?.users_contracts_freelancerIdTousers?.id &&
                mission.builderPayoutForAdmin && (
                  <div className="glass-card mt-8 max-w-full min-w-0 overflow-hidden border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-800 dark:bg-amber-950/20 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                      Send payout to builder
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Details from the builder’s profile (payment preferences). Use this when completing manual transfers after a client releases a milestone.
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-1 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Builder</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {getDisplayName(mission.builderPayoutForAdmin)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                        <dd className="font-mono text-gray-900 dark:text-white break-all">
                          {mission.builderPayoutForAdmin.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Preferred method</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {mission.builderPayoutForAdmin.preferredPaymentMethod ?? 'EUR'}
                        </dd>
                      </div>
                      {isEurPreferredPayoutMethod(
                        mission.builderPayoutForAdmin.preferredPaymentMethod
                      ) ? (
                        <>
                          {(mission.builderPayoutForAdmin.bankAccount?.trim() ?? '') !== '' ? (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">
                                Pay out here (preferred EUR)
                              </dt>
                              <dd className="font-mono text-xs sm:text-sm text-gray-900 dark:text-white break-all whitespace-pre-wrap">
                                {mission.builderPayoutForAdmin.bankAccount?.trim()}
                              </dd>
                            </div>
                          ) : (
                            <div className="rounded-md bg-amber-100/80 dark:bg-amber-900/30 px-3 py-2 text-amber-900 dark:text-amber-100">
                              No IBAN on file. Builder prefers EUR—ask them to add a bank account
                              in payment preferences.
                            </div>
                          )}
                          {getWeb3PayoutAddress(mission.builderPayoutForAdmin) !== '' && (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">
                                Wallet on file (not preferred — use IBAN above)
                              </dt>
                              <dd className="font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all">
                                {getWeb3PayoutAddress(mission.builderPayoutForAdmin)}
                              </dd>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {getWeb3PayoutAddress(mission.builderPayoutForAdmin) !== '' ? (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">
                                Pay out here (preferred{' '}
                                {mission.builderPayoutForAdmin.preferredPaymentMethod})
                              </dt>
                              <dd className="font-mono text-xs sm:text-sm text-gray-900 dark:text-white break-all">
                                {getWeb3PayoutAddress(mission.builderPayoutForAdmin)}
                              </dd>
                            </div>
                          ) : (
                            <div className="rounded-md bg-amber-100/80 dark:bg-amber-900/30 px-3 py-2 text-amber-900 dark:text-amber-100">
                              No crypto wallet on file. Builder prefers{' '}
                              {mission.builderPayoutForAdmin.preferredPaymentMethod || 'crypto'}—ask
                              them to add a wallet in payment preferences.
                            </div>
                          )}
                          {(mission.builderPayoutForAdmin.bankAccount?.trim() ?? '') !== '' && (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400">
                                IBAN on file (EUR backup only)
                              </dt>
                              <dd className="font-mono text-xs sm:text-sm text-gray-900 dark:text-white break-all whitespace-pre-wrap">
                                {mission.builderPayoutForAdmin.bankAccount?.trim()}
                              </dd>
                            </div>
                          )}
                        </>
                      )}
                    </dl>
                    <div className="mt-4">
                      <Link
                        href={`/builders/${mission.contract.users_contracts_freelancerIdTousers.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open builder profile
                      </Link>
                    </div>
                  </div>
                )}

              {/* Payment Section - Only show for active contracts (hide for refunded/reopened) */}
              {mission.status === 'IN_PROGRESS' && mission.contract?.isActive && (
                <div className="glass-card mt-8 max-w-full min-w-0 overflow-hidden p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Payment Status
                  </h3>
                  
                  {payment ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                          <p className="break-words font-medium">
                            {payment.status === 'PENDING' && 'Pending Admin Verification'}
                            {payment.status === 'MADE' && 'Held in Escrow (Admin Verified)'}
        {payment.status === 'RELEASED_1' && 'Milestone 1 Released (25%)'}
        {payment.status === 'RELEASED_2' && 'Milestone 2 Released (50%)'}
        {payment.status === 'COMPLETED' && 'All Milestones Released (100%) - Mission Complete'}
                            {payment.status === 'CANCELLED' && 'Cancelled'}
                          </p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                          <p className="font-bold text-lg">
                            <Euro className="h-4 w-4 inline mr-1" />
                            {Number(payment.amount).toFixed(2)} {payment.currencies?.code || 'EUR'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Milestone Progress</span>
                          <span>{getMilestoneProgressPercent(payment.status)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${getMilestoneProgressPercent(payment.status)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          M1 25% • M2 50% • Final 25%
                        </p>
                      </div>
                      
                      {payment.status === 'PENDING' && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-orange-800 text-sm">
                            <strong>Payment Pending:</strong> Waiting for admin to verify the payment before you can release milestones.
                          </p>
                        </div>
                      )}
                      
                      {/* Show milestone release buttons based on current status */}
                      {['MADE', 'RELEASED_1', 'RELEASED_2'].includes(payment.status) && mission.client?.id === user?.id && (
                        <div className="space-y-4">
                          <div className="max-w-full overflow-hidden rounded-lg bg-blue-50 p-3 sm:p-4">
                            <h4 className="mb-3 font-medium text-blue-900">Release Milestone Payments</h4>
                            <p className="mb-4 break-words text-sm text-blue-800">
                              Release payments in 3 milestones: 25% kickoff • 50% mid-project • 25% completion
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
                              <Button
                                onClick={() => {
                                  if (confirm('Release Milestone 1 (25%) - Project kickoff and initial deliverables?')) {
                                    releaseMilestone(1);
                                  }
                                }}
                                className={`${payment.status === 'MADE' ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                                size="sm"
                                disabled={payment.status !== 'MADE'}
                              >
                                Release Milestone 1<br />
                                <span className="text-xs">€{(Number(payment.amount) * 0.25).toFixed(2)} (25%)</span>
                                {payment.status === 'RELEASED_1' && <span className="text-xs block text-green-600">✓ Released</span>}
                                {payment.status === 'RELEASED_2' && <span className="text-xs block text-green-600">✓ Released</span>}
                              </Button>
                              <Button
                                onClick={() => {
                                  if (confirm('Release Milestone 2 (50%) - Mid-project progress and core functionality?')) {
                                    releaseMilestone(2);
                                  }
                                }}
                                className={`${['MADE', 'RELEASED_1'].includes(payment.status) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                                size="sm"
                                disabled={!['MADE', 'RELEASED_1'].includes(payment.status)}
                              >
                                Release Milestone 2<br />
                                <span className="text-xs">€{(Number(payment.amount) * 0.50).toFixed(2)} (50%)</span>
                                {payment.status === 'RELEASED_2' && <span className="text-xs block text-green-600">✓ Released</span>}
                              </Button>
                              <Button
                                onClick={() => {
                                  if (confirm('Release Final Milestone (25%) and Complete Mission? This will mark the project as finished.')) {
                                    releaseMilestone(3);
                                  }
                                }}
                                className={`${['MADE', 'RELEASED_1', 'RELEASED_2'].includes(payment.status) ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                                size="sm"
                                disabled={!['MADE', 'RELEASED_1', 'RELEASED_2'].includes(payment.status)}
                              >
                                Release Final Milestone<br />
                                <span className="text-xs">€{(Number(payment.amount) * 0.25).toFixed(2)} (25%)</span>
                                {payment.status === 'COMPLETED' && <span className="text-xs block text-green-600">✓ Released</span>}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                          <p className="break-words font-medium">No Payment Made (PENDING)</p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                          <p className="font-bold text-lg">
                            <Euro className="h-4 w-4 inline mr-1" />
                            {(mission.dailyRate * mission.timeframe).toFixed(2)} EUR
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {mission.client?.id === user?.id 
                          ? "Make a secure payment to start the mission."
                          : "Waiting for client to make payment to start the mission."
                        }
                      </p>
                      {mission.client?.id === user?.id && (
                        <div className="flex min-w-0 flex-wrap gap-2">
                          <Button
                            onClick={() => setShowPaymentForm(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Make Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showPaymentForm && (
                <div className="mt-8">
                  <PaymentForm
                    missionId={mission.id}
                    missionTitle={mission.title}
                    totalAmount={
                      (mission.contract?.dailyRate 
                        ? Number(mission.contract.dailyRate) 
                        : mission.dailyRate
                      ) * mission.timeframe
                    }
                    onPaymentSuccess={(paymentData) => {
                      setPayment(paymentData);
                      setShowPaymentForm(false);
                      setMission({ ...mission, status: 'IN_PROGRESS' });
                    }}
                    onPaymentError={(error) => {
                      console.error('Payment error:', error);
                    }}
                  />
                </div>
              )}

              {/* Review Section for completed missions */}
              {mission.status === 'COMPLETED' && (
                <div className="glass-card mt-8 max-w-full min-w-0 overflow-hidden p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Leave a Review
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share your experience to help build trust in the marketplace.
                  </p>

                  {reviewCheckError && (
                    <p className="text-sm text-amber-600 mt-2">{reviewCheckError}</p>
                  )}

                  <div className="mt-4">
                    {reviewCheckLoading && (
                      <p className="text-sm text-gray-500">Checking review status...</p>
                    )}

                    {!reviewCheckLoading && reviewStatus === 'exists' && (
                      <p className="text-sm text-green-700">
                        Thanks! You’ve already reviewed {reviewReceiver?.name || 'this user'}.
                      </p>
                    )}

                    {!reviewCheckLoading && reviewStatus === 'unavailable' && (
                      <p className="text-sm text-gray-500">
                        Reviews are available once both parties are assigned to this mission.
                      </p>
                    )}

                    {!reviewCheckLoading && reviewStatus === 'missing' && reviewReceiver && (
                      <Button
                        onClick={() => setShowReviewModal(true)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Leave a Review for {reviewReceiver.name}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {showReviewModal && reviewReceiver && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Write a Review</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReviewModal(false)}
                      >
                        ×
                      </Button>
                    </div>
                    <ReviewForm
                      receiverId={reviewReceiver.id}
                      receiverName={reviewReceiver.name}
                      receiverRole={reviewReceiver.roleLabel}
                      missionId={mission.id}
                      missionTitle={mission.title}
                      onSubmit={handleSubmitReview}
                      onCancel={() => setShowReviewModal(false)}
                    />
                  </div>
                </div>
              )}


              <div className="mt-8 flex space-x-4">
                {canEditMission && mission.status === 'OPEN' && (
                  <Button
                    onClick={() => router.push(`/missions/${mission.id}/applications`)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    View Applications
                  </Button>
                )}
                <Button
                  onClick={() => {
                    // Redirect based on user role
                    if (userRole === 'freelance') {
                      router.push('/dashboard');
                    } else {
                      router.push('/missions');
                    }
                  }}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {userRole === 'freelance' ? 'Back to Dashboard' : 'Back to Missions'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 