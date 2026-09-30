"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Coins, User, MessageCircle, Calendar, MapPin, Globe, Edit3, Save, X } from "lucide-react";
import PaymentPreferences from "@/components/PaymentPreferences";
import SkillSelector from "@/components/SkillSelector";

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
  address?: string;
  phoneNumber?: string;
  description?: string;
  preferredPaymentMethod?: string;
  cryptoWalletAddress?: string;
  /** Only present when viewing your own profile (not exposed to clients). */
  bankAccount?: string | null;
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
    projects: Array<{
      id: string;
      name: string;
      description?: string;
      url?: string;
      picture: string[];
      createdAt: string;
    }>;
  }>;
  receivedReviews: Array<{
    id: string;
    rating: number;
    content?: string;
    createdAt: string;
    reviewer: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
    };
  }>;
  createdAt: string;
}

export default function FreelancerProfilePage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const freelancerId = params.id as string;

  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [showPaymentPreferences, setShowPaymentPreferences] = useState(false);
  const [contactData, setContactData] = useState({
    phoneNumber: '',
    address: '',
    dailyRate: 0
  });
  const [savingContact, setSavingContact] = useState(false);
  const paymentPreferencesRef = useRef<HTMLDivElement>(null);
  const hasCheckedQueryParam = useRef(false);

  // Scroll to payment preferences when opened from dashboard
  useEffect(() => {
    if (showPaymentPreferences && paymentPreferencesRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        paymentPreferencesRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [showPaymentPreferences]);

  useEffect(() => {
    const fetchData = async () => {
      if (!freelancerId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch current user data
        const userResponse = await fetch('/api/me');
        let currentUserData = null;
        if (userResponse.ok) {
          currentUserData = await userResponse.json();
          setCurrentUser(currentUserData);
        }

        console.log('🔍 Fetching freelancer with ID:', freelancerId);
        
        const response = await fetch(`/api/freelancers/${freelancerId}`);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch freelancer');
        }

        const data = await response.json();
        console.log('✅ Freelancer data received:', data);
        console.log('📊 Skills count:', data.skills?.length || 0);
        console.log('⭐ Reviews count:', data.receivedReviews?.length || 0);
        console.log('🎯 Average rating:', data.averageRating);
        
        setFreelancer(data);
        setDescriptionText(data.description || '');
        setContactData({
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          dailyRate: data.dailyRate || 0
        });
        
      } catch (err) {
        console.error('❌ Error fetching freelancer:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch freelancer');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [freelancerId]);
  
  // Separate effect to handle query parameter after data is loaded (only run once)
  useEffect(() => {
    if (!freelancer || !currentUser || loading || hasCheckedQueryParam.current) return;
    
    try {
      const openPaymentPrefs = searchParams?.get('paymentPreferences') === 'true';
      if (openPaymentPrefs && currentUser.id === freelancer.id) {
        hasCheckedQueryParam.current = true;
        setShowPaymentPreferences(true);
        // Remove query parameter from URL without reload
        setTimeout(() => {
          router.replace(`/builders/${freelancerId}`, { scroll: false });
        }, 100);
      }
    } catch (error) {
      // searchParams might not be available, ignore
      console.log('Could not read searchParams:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freelancer?.id, currentUser?.id, loading]);

  const refreshFreelancerData = async () => {
    if (!freelancerId) return;
    try {
      console.log('🔄 Refreshing freelancer data...');
      const response = await fetch(`/api/freelancers/${freelancerId}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Refreshed freelancer data:', data);
        console.log('📊 Skills count:', data.skills?.length || 0);
        setFreelancer(data);
      } else {
        console.error('❌ Failed to refresh:', response.status);
      }
    } catch (error) {
      console.error('❌ Error refreshing freelancer data:', error);
    }
  };

  const getFreelancerName = (freelancer: Freelancer) => {
    if (freelancer.firstName && freelancer.lastName) {
      return `${freelancer.firstName} ${freelancer.lastName}`;
    }
    return freelancer.email;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleSaveDescription = async () => {
    if (!currentUser || currentUser.id !== freelancerId) return;

    const trimmedText = descriptionText.trim();
    
    if (trimmedText.length < 150) {
      alert('Description must be at least 150 characters long.');
      return;
    }

    if (trimmedText.length > 1500) {
      alert('Description must be no more than 1500 characters long.');
      return;
    }

    try {
      setSavingDescription(true);
      
      const response = await fetch('/api/me/description', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: trimmedText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update description');
      }

      // Update the local state
      setFreelancer(prev => prev ? { ...prev, description: trimmedText } : null);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error saving description:', error);
      alert(error instanceof Error ? error.message : 'Failed to save description. Please try again.');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleCancelEdit = () => {
    setDescriptionText(freelancer?.description || '');
    setIsEditingDescription(false);
  };

  const handleSaveContact = async () => {
    if (!currentUser || currentUser.id !== freelancerId) return;

    try {
      setSavingContact(true);
      
      const response = await fetch('/api/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: contactData.phoneNumber,
          address: contactData.address,
          dailyRate: contactData.dailyRate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contact information');
      }

      // Update the local state
      setFreelancer(prev => prev ? { 
        ...prev, 
        phoneNumber: contactData.phoneNumber,
        address: contactData.address,
        dailyRate: contactData.dailyRate
      } : null);
      setIsEditingContact(false);
    } catch (error) {
      console.error('Error saving contact information:', error);
      alert(error instanceof Error ? error.message : 'Failed to save contact information. Please try again.');
    } finally {
      setSavingContact(false);
    }
  };

  const handleCancelContactEdit = () => {
    setContactData({
      phoneNumber: freelancer?.phoneNumber || '',
      address: freelancer?.address || '',
      dailyRate: freelancer?.dailyRate || 0
    });
    setIsEditingContact(false);
  };

  const isOwnProfile = currentUser && freelancer && currentUser.id === freelancer.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading freelancer profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Freelancer not found</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builders
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {getFreelancerName(freelancer)}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {freelancer.email}
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <Badge variant={freelancer.active ? "default" : "secondary"}>
                {freelancer.active ? "Available" : "Unavailable"}
              </Badge>
              
              {freelancer.averageRating && freelancer.averageRating > 0 ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    {renderStars(freelancer.averageRating)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({freelancer.reviewCount} review{freelancer.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No rating ({freelancer.reviewCount} reviews)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* About Section - Moved to top */}
        {(freelancer.description || isOwnProfile) && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>About {getFreelancerName(freelancer)}</CardTitle>
                  <CardDescription>
                    {isOwnProfile ? 'Tell clients about your background and expertise' : 'Learn more about this freelancer\'s background and expertise'}
                  </CardDescription>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingDescription(!isEditingDescription)}
                  >
                    {isEditingDescription ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingDescription ? (
                <div className="space-y-4">
                  <div>
                    <Textarea
                      value={descriptionText}
                      onChange={(e) => setDescriptionText(e.target.value)}
                      placeholder="Tell clients about your background, experience, and what makes you unique..."
                      className="min-h-[120px]"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">
                        Minimum 150 characters, maximum 1500 characters
                      </p>
                      <p className={`text-xs ${
                        descriptionText.length < 150 || descriptionText.length > 1500 
                          ? 'text-red-500' 
                          : 'text-green-600'
                      }`}>
                        {descriptionText.length}/1500
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveDescription}
                      disabled={savingDescription || descriptionText.trim().length < 150 || descriptionText.length > 1500}
                      size="sm"
                    >
                      {savingDescription ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={savingDescription}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {freelancer.description || (isOwnProfile ? 'Click "Edit" to add your description and tell clients about yourself.' : 'No description available.')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Skills */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Skills & Expertise</CardTitle>
                    <CardDescription>
                      {freelancer.skills?.length || 0} skill{(freelancer.skills?.length || 0) !== 1 ? 's' : ''} listed
                    </CardDescription>
                  </div>
                  {currentUser?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/skills')}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Manage Skills
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {freelancer.skills && freelancer.skills.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {freelancer.skills.map((skill) => (
                        <Badge key={skill.id} variant="secondary" className="text-sm">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSkillSelectorOpen(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Browse & Add Skills
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/skills/new')}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Create Custom Skill
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No skills listed yet.
                    </p>
                    {isOwnProfile && (
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setSkillSelectorOpen(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Browse & Add Skills
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push('/skills/new')}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Create Custom Skill
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio */}
            {freelancer.portfolios && freelancer.portfolios.length > 0 && freelancer.portfolios[0].projects && freelancer.portfolios[0].projects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio</CardTitle>
                  <CardDescription>
                    {freelancer.portfolios[0].name || 'Projects'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {freelancer.portfolios[0].projects.map((project) => (
                      <div key={project.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Project Images */}
                        {project.picture && project.picture.length > 0 && (
                          <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img
                              src={project.picture[0].startsWith('/') ? project.picture[0] : project.picture[0]}
                              alt={project.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                            {project.picture.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                +{project.picture.length - 1} more
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          {project.url && (
                            <a
                              href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              View Project
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Client Reviews</CardTitle>
                <CardDescription>
                  Feedback from previous clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {freelancer.receivedReviews && freelancer.receivedReviews.length > 0 ? (
                  <div className="space-y-4">
                    {freelancer.receivedReviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {review.reviewer.firstName} {review.reviewer.lastName}
                              {review.reviewer.companyName && (
                                <span className="text-gray-500"> from {review.reviewer.companyName}</span>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        {review.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {review.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No reviews yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contact Information</CardTitle>
                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingContact(!isEditingContact)}
                    >
                      {isEditingContact ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{freelancer.email}</span>
                </div>
                
                {isEditingContact ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <Input
                        value={contactData.phoneNumber}
                        onChange={(e) => setContactData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="Enter phone number"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                      </label>
                      <Input
                        value={contactData.address}
                        onChange={(e) => setContactData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter address"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Daily Rate (€)
                      </label>
                      <Input
                        type="number"
                        value={contactData.dailyRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          const parsedValue = value === '' ? 0 : parseFloat(value);
                          setContactData(prev => ({ ...prev, dailyRate: isNaN(parsedValue) ? 0 : parsedValue }));
                        }}
                        placeholder="Enter daily rate"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveContact}
                        disabled={savingContact}
                        size="sm"
                        className="flex-1"
                      >
                        {savingContact ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelContactEdit}
                        disabled={savingContact}
                        size="sm"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {freelancer.phoneNumber && (
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{freelancer.phoneNumber}</span>
                      </div>
                    )}
                    
                    {freelancer.address && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{freelancer.address}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Coins className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {freelancer.dailyRate ? `€${freelancer.dailyRate}/day` : 'Rate not set'}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Member since {formatDate(freelancer.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Preferences - Only show for own profile */}
            {isOwnProfile && (
              <div ref={paymentPreferencesRef}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Payment Preferences</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPaymentPreferences(!showPaymentPreferences)}
                    >
                      {showPaymentPreferences ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Configure
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {showPaymentPreferences && (
                  <CardContent>
                    <PaymentPreferences
                      userId={freelancer.id}
                      currentPreferences={{
                        preferredPaymentMethod: freelancer.preferredPaymentMethod || 'EUR',
                        cryptoWalletAddress: freelancer.cryptoWalletAddress || '',
                        bankAccount: freelancer.bankAccount ?? ''
                      }}
                      onUpdate={async (preferences) => {
                        if (freelancer) {
                          setFreelancer({
                            ...freelancer,
                            preferredPaymentMethod: preferences.preferredPaymentMethod,
                            cryptoWalletAddress: preferences.cryptoWalletAddress,
                            bankAccount: preferences.bankAccount ?? null
                          });
                        }
                        setShowPaymentPreferences(false);
                        await refreshFreelancerData();
                      }}
                    />
                  </CardContent>
                )}
                {!showPaymentPreferences && (
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method</span>
                        <span className="font-medium">
                          {freelancer.preferredPaymentMethod || 'EUR'}
                        </span>
                      </div>
                      {freelancer.bankAccount?.trim() && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Bank (IBAN)</span>
                          <span className="font-mono font-medium text-xs text-right break-all">
                            {(() => {
                              const c = (freelancer.bankAccount ?? '').replace(/\s/g, '');
                              return c.length > 6
                                ? `${c.slice(0, 4)}••••••••`
                                : '••••';
                            })()}
                          </span>
                        </div>
                      )}
                      {freelancer.cryptoWalletAddress && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Crypto Wallet</span>
                          <span className="font-medium text-xs">
                            {freelancer.cryptoWalletAddress.slice(0, 10)}...{freelancer.cryptoWalletAddress.slice(-6)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
              </div>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Skills</span>
                  <span className="font-medium">{freelancer.skills?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Portfolio Projects</span>
                  <span className="font-medium">
                    {freelancer.portfolios && freelancer.portfolios.length > 0 
                      ? freelancer.portfolios[0].projects?.length || 0 
                      : 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Reviews</span>
                  <span className="font-medium">{freelancer.reviewCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rating</span>
                  <span className="font-medium">
                    {freelancer.averageRating && freelancer.averageRating > 0 
                      ? `${freelancer.averageRating.toFixed(1)}/5` 
                      : 'No rating'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Daily Rate */}
            {freelancer.dailyRate && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{freelancer.dailyRate}/day
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Button - Only show if not viewing own profile */}
            {!isOwnProfile && (
              <Button 
                className="w-full" 
                onClick={() => router.push(`/builders/${freelancerId}/contact`)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact {getFreelancerName(freelancer)}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Skill Selector Modal */}
      {isOwnProfile && (
        <SkillSelector
          open={skillSelectorOpen}
          onOpenChange={setSkillSelectorOpen}
          onSkillAdded={refreshFreelancerData}
          currentSkills={freelancer?.skills || []}
        />
      )}
    </div>
  );
}