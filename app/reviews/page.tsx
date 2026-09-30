"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Star, Plus, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';

interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  mission?: {
    id: string;
    title: string;
    status: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function ReviewsPage() {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userMissions, setUserMissions] = useState<any[]>([]);

  // Fetch reviews and users
  useEffect(() => {
    fetchReviews();
    fetchUsers();
    fetchCurrentUser();
    fetchUserMissions();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users that the current user has worked with on missions
      const response = await fetch('/api/users/worked-with');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        // Fallback to all users if the endpoint doesn't exist yet
        const fallbackResponse = await fetch('/api/users');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setUsers(fallbackData);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserMissions = async () => {
    try {
      const response = await fetch('/api/missions/my-missions');
      if (response.ok) {
        const data = await response.json();
        setUserMissions(data);
      }
    } catch (error) {
      console.error('Error fetching user missions:', error);
    }
  };

  const handleSubmitReview = async (reviewData: { content: string; rating: number }) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUser,
          missionId: selectedMission,
          content: reviewData.content,
          rating: reviewData.rating,
        }),
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews([newReview, ...reviews]);
        setShowReviewForm(false);
        setSelectedUser('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReviews(reviews.filter(review => review.id !== reviewId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  // Filter reviews to show only reviews where current user is reviewer OR receiver
  const filteredReviews = reviews.filter(review => {
    // Only show reviews where current user is involved (as reviewer or receiver)
    const isInvolved = currentUser && (
      review.reviewer.id === currentUser.id || 
      review.receiver.id === currentUser.id
    );

    if (!isInvolved) return false;

    const matchesSearch = 
      review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${review.reviewer.firstName} ${review.reviewer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${review.receiver.firstName} ${review.receiver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.mission?.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || !filterRole || review.receiver.role === filterRole;

    return matchesSearch && matchesRole;
  });

  // Calculate average rating from reviews where current user is the receiver
  const receivedReviews = currentUser 
    ? reviews.filter(review => review.receiver.id === currentUser.id)
    : [];
  const averageRating = receivedReviews.length > 0 
    ? receivedReviews.reduce((sum, review) => sum + review.rating, 0) / receivedReviews.length 
    : 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= rating;
      
      return (
        <Star
          key={index}
          className={`h-4 w-4 ${
            isFilled
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      );
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-gray-600 mt-2">
            See what others are saying about their experiences
          </p>
        </div>
        <Button onClick={() => setShowReviewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Write Review
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Reviews</p>
                <p className="text-2xl font-bold">{filteredReviews.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser && reviews.filter(r => r.reviewer.id === currentUser.id).length} written, {receivedReviews.length} received
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">{renderStars(Math.round(averageRating))}</div>
                  <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Users You've Worked With</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">U</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="freelance">Builder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Write a Review</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReviewForm(false)}
              >
                ×
              </Button>
            </div>
            
                         <div className="space-y-4">
               <div>
                 <label className="text-sm font-medium">Select Mission</label>
                 <Select value={selectedMission} onValueChange={setSelectedMission}>
                   <SelectTrigger>
                     <SelectValue placeholder="Choose a mission..." />
                   </SelectTrigger>
                   <SelectContent>
                     {userMissions.map(mission => (
                       <SelectItem key={mission.id} value={mission.id}>
                         {mission.title || 'Untitled Mission'} ({mission.status || 'Unknown'})
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <label className="text-sm font-medium">Select User to Review</label>
                 <Select value={selectedUser} onValueChange={setSelectedUser}>
                   <SelectTrigger>
                     <SelectValue placeholder="Choose a user..." />
                   </SelectTrigger>
                   <SelectContent>
                     {users
                       .filter(user => user.id !== currentUser?.id)
                       .map(user => {
                         const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
                         return (
                           <SelectItem key={user.id} value={user.id}>
                             {displayName} ({user.role || 'Unknown'})
                           </SelectItem>
                         );
                       })}
                   </SelectContent>
                 </Select>
               </div>

               {selectedUser && selectedMission && (
                 <ReviewForm
                   receiverId={selectedUser}
                   receiverName={(() => {
                     const user = users.find(u => u.id === selectedUser);
                     if (!user) return 'Unknown User';
                     const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                     return displayName || user.email || 'Unknown User';
                   })()}
                   receiverRole={users.find(u => u.id === selectedUser)?.role || 'Unknown'}
                   missionId={selectedMission}
                   missionTitle={userMissions.find(m => m.id === selectedMission)?.title || 'Untitled Mission'}
                   onSubmit={handleSubmitReview}
                   onCancel={() => setShowReviewForm(false)}
                 />
               )}
             </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No reviews found
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterRole 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to write a review!'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Reviews Received Section */}
            {currentUser && filteredReviews.filter(r => r.receiver.id === currentUser.id).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>Reviews About You</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {filteredReviews.filter(r => r.receiver.id === currentUser.id).length}
                  </Badge>
                </h2>
                <div className="space-y-4 mb-6">
                  {filteredReviews
                    .filter(review => review.receiver.id === currentUser.id)
                    .map(review => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        currentUserId={currentUser.id}
                        onDelete={handleDeleteReview}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Reviews Written Section */}
            {currentUser && filteredReviews.filter(r => r.reviewer.id === currentUser.id).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>Reviews You Wrote</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {filteredReviews.filter(r => r.reviewer.id === currentUser.id).length}
                  </Badge>
                </h2>
                <div className="space-y-4">
                  {filteredReviews
                    .filter(review => review.reviewer.id === currentUser.id)
                    .map(review => (
            <ReviewCard
              key={review.id}
              review={review}
                        currentUserId={currentUser.id}
              onDelete={handleDeleteReview}
            />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
