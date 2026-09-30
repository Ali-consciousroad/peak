"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Coins, User, Send } from "lucide-react";

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
    description?: string;
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

export default function ContactBuilderPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const freelancerId = params.id as string;

  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [clientMissions, setClientMissions] = useState<any[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    proposalText: "",
    dailyRate: "",
    startDate: "",
    endDate: "",
    timeframe: ""
  });

  // Check user role and fetch builder data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check user role
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role);
          
          // Only clients can contact builders
          if (userData.role !== 'client' && userData.role !== 'admin') {
            setError('Access denied. Only clients can contact builders.');
            setLoading(false);
            return;
          }
        }

        // Fetch builder data
        const freelancerResponse = await fetch(`/api/freelancers/${freelancerId}`);
        if (freelancerResponse.ok) {
          const freelancerData = await freelancerResponse.json();
          setFreelancer(freelancerData);
        } else {
          setError('Builder not found');
        }

        // Fetch client's missions (including unverified ones for contact flow)
        const missionsResponse = await fetch('/api/missions/my-missions');
        if (missionsResponse.ok) {
          const missionsData = await missionsResponse.json();
          console.log('All client missions:', missionsData);
          // Only show missions that are eligible for receiving offers:
          // - verified
          // - no active contract
          // - not completed/refunded
          // Note: some missions may still be IN_PROGRESS while their contract is inactive;
          // the backend allows offers in that case, so we mirror the same condition here.
          const availableMissions = missionsData.filter((mission: any) => 
            mission.isVerified &&
            !['COMPLETED', 'REFUNDED'].includes(mission.status) &&
            (!mission.contract || !mission.contract.isActive)
          );
          console.log('Available missions (verified + OPEN):', availableMissions);
          setClientMissions(availableMissions);
        } else {
          console.error('Failed to fetch missions:', missionsResponse.status);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading builder data');
      } finally {
        setLoading(false);
      }
    };

    if (userId && freelancerId) {
      fetchData();
    }
  }, [userId, freelancerId]);

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
    if (!startDate || !timeframe) return "";
    
    try {
      // Parse start date (dd/mm/yyyy format)
      const [day, month, year] = startDate.split('/');
      const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Add timeframe days
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(timeframe));
      
      // Format as dd/mm/yyyy
      const endDay = end.getDate().toString().padStart(2, '0');
      const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
      const endYear = end.getFullYear();
      
      return `${endDay}/${endMonth}/${endYear}`;
    } catch (error) {
      return "";
    }
  };

  // Convert a Date (or ISO string) into the dd/mm/yyyy format used by the form inputs
  const formatDateToInput = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return "";
    try {
      const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  // Parse dd/mm/yyyy into a Date at local midnight
  const parseInputDate = (dateInput: string): Date | null => {
    if (!dateInput || !dateInput.includes('/')) return null;
    const [day, month, year] = dateInput.split('/');
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  // Compare against today at local midnight to avoid time-of-day drift
  const getTodayDate = (): Date => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  // Function to calculate timeframe based on start date and end date
  const calculateTimeframe = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return "";
    
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
      
      return daysDiff > 0 ? daysDiff.toString() : "";
    } catch (error) {
      return "";
    }
  };

  // Handle form data changes with auto-fill logic
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => {
      let newData = { ...prev };
      
      // Format date inputs
      if (field === 'startDate' || field === 'endDate') {
        newData[field] = formatDateInput(value);
      } else {
        newData[field] = value;
      }
      
      // Auto-fill end date when start date or timeframe changes
      if (field === 'startDate' || field === 'timeframe') {
        newData.endDate = calculateEndDate(newData.startDate, newData.timeframe);
      }
      
      // Auto-calculate timeframe when end date changes
      if (field === 'endDate') {
        newData.timeframe = calculateTimeframe(newData.startDate, newData.endDate);
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freelancer || submitting || !selectedMissionId) return;

    setSubmitting(true);
    try {
      // Convert dd/mm/yyyy format to Date objects
      const parseDate = (dateString: string): Date => {
        const [day, month, year] = dateString.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };

      // Create an offer to the builder for the selected mission
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          missionId: selectedMissionId,
          proposalText: formData.proposalText,
          dailyRate: parseFloat(formData.dailyRate),
          startDate: parseDate(formData.startDate),
          endDate: parseDate(formData.endDate),
          freelancerId: freelancer.id
        }),
      });

      if (response.ok) {
        // Success - redirect to offers page
        router.push('/client-applications');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send offer. Please try again.');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      setError('Error sending offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to contact builders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading builder...</p>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Builder not found'}</p>
          <Button 
            onClick={() => router.push('/builders')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => router.push('/builders')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builders
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Contact {getFreelancerName(freelancer)}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Send a message to discuss your project
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Freelancer Info */}
          <div className="lg:col-span-1">
            <Card>
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
              <CardContent className="space-y-4">
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
                    {freelancer.skills.slice(0, 5).map((skill) => (
                      <Badge key={skill.id} variant="outline" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                    {freelancer.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{freelancer.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                {freelancer.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      About
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 whitespace-pre-wrap">
                      {freelancer.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Make Offer</CardTitle>
                <CardDescription>
                  Send an offer to this builder for one of your missions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientMissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You need to create a verified and open mission first before making an offer.
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Debug: Found {clientMissions.length} available missions (verified + OPEN)
                    </p>
                    <Button onClick={() => router.push('/missions/new')}>
                      Create New Mission
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="mission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Select Mission *
                      </label>
                      <select
                        id="mission"
                        value={selectedMissionId}
                        onChange={(e) => {
                          const missionId = e.target.value;
                          setSelectedMissionId(missionId);
                          
                          // Auto-fill timeframe from selected mission
                          if (missionId) {
                            const selectedMission = clientMissions.find(mission => mission.id === missionId);
                            if (selectedMission) {
                              const missionTimeframe = selectedMission.timeframe?.toString?.() ?? "";
                              const missionDailyRate = selectedMission.dailyRate?.toString?.() ?? "";
                              const missionStartDateInput = formatDateToInput(selectedMission.startDate);
                              const todayInput = formatDateToInput(getTodayDate());
                              const missionStartDate = parseInputDate(missionStartDateInput);
                              const isMissionStartInPast =
                                missionStartDate !== null && missionStartDate < getTodayDate();
                              const suggestedStartDate = isMissionStartInPast
                                ? todayInput
                                : missionStartDateInput;
                              // Use mission end date only when mission start is still valid (not in the past).
                              // If mission start is in the past, recalculate end from today + mission timeframe.
                              const missionEndDateInput = !isMissionStartInPast
                                ? (formatDateToInput(selectedMission.endDate) ||
                                  (suggestedStartDate && missionTimeframe
                                    ? calculateEndDate(suggestedStartDate, missionTimeframe)
                                    : ""))
                                : (suggestedStartDate && missionTimeframe
                                  ? calculateEndDate(suggestedStartDate, missionTimeframe)
                                  : "");

                              setFormData(prev => ({
                                ...prev,
                                dailyRate: missionDailyRate,
                                startDate: suggestedStartDate,
                                timeframe: selectedMission.timeframe.toString(),
                                // Auto-fill end date from mission or from adjusted start date.
                                endDate: missionEndDateInput || prev.endDate
                              }));
                            }
                          } else {
                            // Clear timeframe when no mission is selected
                            setFormData(prev => ({
                              ...prev,
                              dailyRate: "",
                              startDate: "",
                              timeframe: "",
                              endDate: ""
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      >
                        <option value="">Choose a mission...</option>
                        {clientMissions.map((mission) => (
                          <option key={mission.id} value={mission.id}>
                            {mission.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="proposalText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Proposal *
                      </label>
                      <Textarea
                        id="proposalText"
                        value={formData.proposalText}
                        onChange={(e) => setFormData(prev => ({ ...prev, proposalText: e.target.value }))}
                        placeholder="Describe why you want to work with this builder and any specific requirements..."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Daily Rate (€) *
                        </label>
                        <Input
                          id="dailyRate"
                          type="number"
                          value={formData.dailyRate}
                          onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
                          placeholder="e.g., 500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Timeframe (days) *
                          {selectedMissionId && (
                            <span className="text-xs text-green-600 ml-2">(Auto-filled from mission, editable)</span>
                          )}
                        </label>
                        <Input
                          id="timeframe"
                          type="number"
                          value={formData.timeframe}
                          onChange={(e) => handleFormChange('timeframe', e.target.value)}
                          placeholder="e.g., 10"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Date (dd/mm/yyyy) *
                        </label>
                        <Input
                          id="startDate"
                          type="text"
                          value={formData.startDate}
                          onChange={(e) => handleFormChange('startDate', e.target.value)}
                          placeholder="dd/mm/yyyy"
                          pattern="\d{2}/\d{2}/\d{4}"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          End Date (dd/mm/yyyy) *
                          {formData.startDate && formData.timeframe && (
                            <span className="text-xs text-green-600 ml-2">(Auto-calculated)</span>
                          )}
                        </label>
                        <Input
                          id="endDate"
                          type="text"
                          value={formData.endDate}
                          onChange={(e) => handleFormChange('endDate', e.target.value)}
                          placeholder="dd/mm/yyyy"
                          pattern="\d{2}/\d{2}/\d{4}"
                          required
                        />
                      </div>
                    </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={submitting || !freelancer.active || !selectedMissionId}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? 'Sending Offer...' : 'Send Offer'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/builders')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
