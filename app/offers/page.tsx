"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, User, Calendar, Euro, CheckCircle, XCircle, MessageCircle, Bell } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    client: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

export default function ApplicationsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Offer[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const normalizeReceivedOffers = (offersData: any[]) =>
    Array.isArray(offersData) ? offersData : [];

  const fetchOffersData = async () => {
    const response = await fetch('/api/offers', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }
    const offersData = await response.json();
    setApplications(normalizeReceivedOffers(offersData));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch offers, conversations, and current user data in parallel
        const [offersResponse, conversationsResponse, userResponse] = await Promise.all([
          fetch('/api/offers', { cache: 'no-store' }),
          fetch('/api/conversations'),
          fetch('/api/me')
        ]);

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          setApplications(normalizeReceivedOffers(offersData));

          // Mark unseen received offers as seen when the freelancer opens /offers.
          // This clears the dashboard badge via the `offersMarkedAsSeen` event.
          try {
            const markSeenResponse = await fetch('/api/freelancer/mark-offers-seen', {
              method: 'POST'
            });
            if (markSeenResponse.ok) {
              window.dispatchEvent(new CustomEvent('offersMarkedAsSeen'));
            }
          } catch (err) {
            console.error('[Offers] Failed to mark offers as seen:', err);
          }
        } else {
          setError('Failed to fetch applications');
        }

        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          console.log('🔍 Freelancer: Fetched conversations:', conversationsData.length, 'conversations');
          setConversations(conversationsData);
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('🔍 Freelancer: Current user data:', userData);
          setCurrentUser(userData);
        }
      } catch (err) {
        setError('Error fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }

    const interval = setInterval(() => {
      if (!userId) return;
      fetchOffersData().catch((err) => {
        console.error('[Offers] Poll refresh failed:', err);
      });
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        fetchOffersData().catch((err) => {
          console.error('[Offers] Visibility refresh failed:', err);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);



  const getClientName = (client: any) => {
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    return client.email.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleAcceptOffer = async (offerId: string) => {
    setProcessing(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });

      if (response.ok) {
        // Refresh applications list
        await fetchOffersData();
        
        alert('Offer accepted! Contract has been created.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to accept offer');
      }
    } catch (err) {
      alert('Error accepting offer');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setSelectedOfferId(offerId);
    setRejectionMessage("");
    setRejectModalOpen(true);
  };


  const handleConfirmReject = async () => {
    if (!selectedOfferId) return;
    
    setProcessing(selectedOfferId);
    try {
      const response = await fetch(`/api/offers/${selectedOfferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejectionMessage: rejectionMessage.trim() || undefined
        }),
      });

      if (response.ok) {
        // Refresh applications list
        await fetchOffersData();
        
        setRejectModalOpen(false);
        setSelectedOfferId(null);
        setRejectionMessage("");
        
        if (rejectionMessage.trim()) {
          alert('Offer rejected and message sent to client.');
        } else {
          alert('Offer rejected.');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to reject offer');
      }
    } catch (err) {
      alert('Error rejecting offer');
      console.error(err);
    } finally {
      setProcessing(null);
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
    
    // Debug: Uncomment to see message status checks
    console.log('🔍 Freelancer hasUnreadMessages check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      conversationId: conversation.id,
      currentUserId: currentUser.id,
      hasUnread,
      messages: conversation.messages?.length || 0,
      messageDetails: conversation.messages?.map(msg => ({
        senderId: msg.senderId,
        isRead: msg.isRead,
        content: msg.content.substring(0, 50) + '...'
      }))
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
    
    // Debug: Uncomment to see conversation checks
    console.log('🔍 Freelancer hasExistingConversation check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      currentUserId: currentUser.id,
      hasConversation,
      totalConversations: conversations.length,
      matchingConversations: conversations.filter(conv => conv.missionId === application.mission.id)
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
    
    // Debug: Uncomment to see sent message checks
    console.log('🔍 Freelancer hasSentMessages check:', {
      applicationId: application.id,
      missionId: application.mission.id,
      conversationId: conversation.id,
      currentUserId: currentUser.id,
      hasSent,
      messages: conversation.messages?.length || 0,
      sentMessages: conversation.messages?.filter(msg => msg.senderId === currentUser.id).length || 0
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
    
    console.log('🔍 Freelancer isLastMessageFromOther check:', {
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
        console.log('Freelancer status badge check:', {
          applicationId: application?.id,
          hasMessage: hasMessage,
          status: status
        });
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

  const handleStartDiscussion = async (clientId: string, missionId: string) => {
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          otherUserId: clientId,
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

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view your received offers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading your received offers...</p>
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
          <h1 className="text-2xl font-bold">Received Offers</h1>
          <p className="text-gray-600 mt-2">
            Track offers from clients for your services
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="mb-4">
                <User className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No offers received yet
              </h3>
              <p className="text-gray-500 mb-4">
                Clients will make offers to you for missions. Complete your profile to get more visibility.
              </p>
              <Button
                onClick={() => router.push('/builders/user-1')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Complete Profile
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
                      Client: {getClientName(application.mission.client)}
                    </p>
                    {application.mission.status !== 'OPEN' && application.status === 'ACCEPTED' && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Mission {application.mission.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Offered on {formatDate(application.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(application.status, application)}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Your Offer</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm">
                    {application.proposalText.length > 200 
                      ? `${application.proposalText.substring(0, 200)}...`
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
                      console.log('🔍 Freelancer Button Debug for', application.mission.title, ':', {
                        hasUnread,
                        hasExisting,
                        hasSent,
                        isLastFromOther,
                        missionId: application.mission.id,
                        currentUserId: currentUser?.id
                      });
                      handleStartDiscussion(application.mission.client.id, application.mission.id);
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
                  
                  {application.status === 'PENDING' && !['COMPLETED', 'REFUNDED'].includes(application.mission.status) && (
                    <>
                      <Button
                        onClick={() => handleAcceptOffer(application.id)}
                        disabled={processing === application.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === application.id ? 'Processing...' : 'Accept'}
                      </Button>
                      <Button
                        onClick={() => handleRejectOffer(application.id)}
                        disabled={processing === application.id}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {processing === application.id ? 'Processing...' : 'Reject'}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => {
            setRejectModalOpen(false);
            setSelectedOfferId(null);
            setRejectionMessage("");
          }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Reject Offer</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You can optionally send a message to the client explaining why you're rejecting this offer.
              </p>
              <Textarea
                placeholder="Optional: Explain why you're rejecting this offer..."
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setSelectedOfferId(null);
                    setRejectionMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmReject}
                  disabled={processing === selectedOfferId}
                >
                  {processing === selectedOfferId ? 'Processing...' : 'Reject Offer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
