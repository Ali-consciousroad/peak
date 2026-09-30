"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, User, Calendar, Euro, XCircle, MessageCircle, Bell } from "lucide-react";

interface Offer {
  id: string;
  status: string;
  dailyRate: number;
  proposalText: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  mission: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  freelancer: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function ClientApplicationsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Offer[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch offers, conversations, and current user data in parallel
        const [offersResponse, conversationsResponse, userResponse] = await Promise.all([
          fetch('/api/offers'),
          fetch('/api/conversations'),
          fetch('/api/me')
        ]);

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          setApplications(offersData);
        } else {
          const errorText = await offersResponse.text();
          console.error('API Error:', errorText);
          setError(`Failed to fetch applications: ${offersResponse.status} ${errorText}`);
        }

        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          console.log('🔍 Client: Fetched conversations:', conversationsData.length, 'conversations');
          setConversations(conversationsData);
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('🔍 Client: Current user data:', userData);
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);



  const refreshAndNotify = async () => {
    const applicationsResponse = await fetch('/api/offers', { cache: 'no-store' });
    const applicationsData = await applicationsResponse.json();
    setApplications(applicationsData);
    window.dispatchEvent(new CustomEvent('offersUpdated'));
  };

  const handleCancelOffer = async (offerId: string) => {
    setProcessing(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (response.ok) {
        await refreshAndNotify();
        alert('Offer cancelled successfully.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to cancel offer');
      }
    } catch (err) {
      alert('Error cancelling offer');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleStartDiscussion = async (freelancerId: string, missionId: string) => {
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          otherUserId: freelancerId,
          missionId: missionId 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to messages page with the conversation
        router.push(`/messages?conversation=${data.conversationId}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to start conversation');
      }
    } catch (err) {
      alert('Error starting conversation');
      console.error(err);
    }
  };

  const hasUnreadMessages = (application: any) => {
    if (!currentUser) return false;
    
    // Find conversation related to this offer
    const conversation = conversations.find(conv => 
      conv.missionId === application.mission.id && 
      conv.participants.some((p: any) => p.userId === currentUser.id)
    );
    
    if (!conversation) return false;
    
    // Check if there are unread messages from the other party
    const hasUnread = conversation.messages?.some((msg: any) => 
      msg.senderId !== currentUser.id && !msg.isRead
    ) || false;
    
    console.log('🔍 Client hasUnreadMessages check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      conversationId: conversation.id,
      currentUserId: currentUser.id,
      hasUnread,
      messages: conversation.messages?.length || 0
    });
    
    return hasUnread;
  };

  const hasExistingConversation = (application: any) => {
    if (!currentUser) return false;
    
    // Check if there's a conversation related to this offer
    const hasConversation = conversations.some(conv => 
      conv.missionId === application.mission.id && 
      conv.participants.some((p: any) => p.userId === currentUser.id)
    );
    
    console.log('🔍 Client hasExistingConversation check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      currentUserId: currentUser.id,
      hasConversation,
      totalConversations: conversations.length
    });
    
    return hasConversation;
  };

  const hasSentMessages = (application: any) => {
    if (!currentUser) return false;
    
    // Find conversation related to this offer
    const conversation = conversations.find(conv => 
      conv.missionId === application.mission.id && 
      conv.participants.some((p: any) => p.userId === currentUser.id)
    );
    
    if (!conversation) return false;
    
    // Check if current user has sent any messages
    const hasSent = conversation.messages?.some((msg: any) => msg.senderId === currentUser.id) || false;
    
    console.log('🔍 Client hasSentMessages check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      conversationId: conversation.id,
      currentUserId: currentUser.id,
      hasSent,
      messages: conversation.messages?.length || 0
    });
    
    return hasSent;
  };

  const isLastMessageFromOther = (application: any) => {
    if (!currentUser) return false;
    
    // Find conversation related to this offer
    const conversation = conversations.find(conv => 
      conv.missionId === application.mission.id && 
      conv.participants.some((p: any) => p.userId === currentUser.id)
    );
    
    if (!conversation || !conversation.messages || conversation.messages.length === 0) return false;
    
    // Get the last message (first in the array since they're ordered by createdAt desc)
    const lastMessage = conversation.messages[0];
    const isFromOther = lastMessage.senderId !== currentUser.id;
    
    console.log('🔍 Client isLastMessageFromOther check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      lastMessageSender: lastMessage.senderId,
      currentUserId: currentUser.id,
      isFromOther
    });
    
    return isFromOther;
  };

  const getStatusBadge = (status: string, application?: any) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'ACCEPTED':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'REJECTED':
        const hasMessage = application && hasUnreadMessages(application);
        return (
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Rejected</Badge>
            {hasMessage && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Bell className="h-3 w-3" />
                <span className="text-xs">New message</span>
              </div>
            )}
          </div>
        );
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFreelancerName = (freelancer: any) => {
    if (freelancer.firstName && freelancer.lastName) {
      return `${freelancer.firstName} ${freelancer.lastName}`;
    }
    if (freelancer.firstName) {
      return freelancer.firstName;
    }
    return freelancer.email.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view applications.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading applications...</p>
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Offers for My Missions</h1>
          <p className="text-gray-600 mt-2">
            Review and manage offers from builders
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="mb-4">
                <User className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No offers yet
              </h3>
              <p className="text-gray-500 mb-4">
                When you send offers to builders, they will appear here.
              </p>
              <Button
                onClick={() => router.push('/missions')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View My Missions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {application.mission.title}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      Builder: {getFreelancerName(application.freelancer)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Offered on {formatDate(application.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(application.status, application)}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Offer Details</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm">
                    {application.proposalText.length > 300 
                      ? `${application.proposalText.substring(0, 300)}...`
                      : application.proposalText
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">Rate:</span>
                    <span className="ml-1">€{application.dailyRate}/day</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">Start:</span>
                    <span className="ml-1">{formatDate(application.startDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">End:</span>
                    <span className="ml-1">{formatDate(application.endDate)}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => router.push(`/missions/${application.mission.id}`)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Mission
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // Debug log for button click
                      const hasUnread = hasUnreadMessages(application);
                      const hasExisting = hasExistingConversation(application);
                      const hasSent = hasSentMessages(application);
                      const isLastFromOther = isLastMessageFromOther(application);
                      console.log('🔍 Client Button Debug for', application.mission.title, ':', {
                        hasUnread,
                        hasExisting,
                        hasSent,
                        isLastFromOther,
                        missionId: application.mission.id,
                        currentUserId: currentUser?.id
                      });
                      handleStartDiscussion(application.freelancer.id, application.mission.id);
                    }}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${
                      hasUnreadMessages(application) 
                        ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' 
                        : hasExistingConversation(application)
                        ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {hasUnreadMessages(application) 
                      ? 'Read Message(s)' 
                      : hasExistingConversation(application) && isLastMessageFromOther(application)
                      ? 'Reply'
                      : hasExistingConversation(application)
                      ? 'Send a Message'
                      : 'Start Discussion'
                    }
                  </Button>
                  
                  {application.status === 'PENDING' && (
                    <Button
                      onClick={() => handleCancelOffer(application.id)}
                      disabled={processing === application.id}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processing === application.id ? 'Processing...' : 'Cancel'}
                    </Button>
                  )}
                  
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
