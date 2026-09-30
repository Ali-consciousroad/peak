'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConflictMessagingProps {
  conflictId: string;
  contractId: string;
  clientId: string;
  freelancerId: string;
  adminId: string;
  isAdmin?: boolean;
  conflictStatus?: string;
  currentUserId?: string;
}

export default function ConflictMessaging({
  conflictId,
  contractId,
  clientId,
  freelancerId,
  adminId,
  isAdmin = false,
  conflictStatus = 'OPEN',
  currentUserId
}: ConflictMessagingProps) {
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const router = useRouter();

  // Check if messaging is allowed (not resolved or archived)
  const isMessagingAllowed = conflictStatus !== 'RESOLVED' && conflictStatus !== 'ARCHIVED';


  const handleStartClientConversation = async () => {
    setIsCreatingConversation(true);
    try {
      console.log('Creating conversation with clientId:', clientId);
      console.log('ConflictMessaging props:', { conflictId, clientId, freelancerId, adminId });
      
      // Create a conversation between current user and client
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otherUserId: clientId,
          conflictId: conflictId
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        console.log('Conversation created:', conversation);
        router.push(`/messages?conversation=${conversation.id}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to create conversation:', errorData);
        alert(`Failed to create conversation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error creating conversation. Please try again.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleStartFreelancerConversation = async () => {
    setIsCreatingConversation(true);
    try {
      console.log('Creating conversation with freelancerId:', freelancerId);
      console.log('ConflictMessaging props:', { conflictId, clientId, freelancerId, adminId });
      
      // Create a conversation between current user and freelancer
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otherUserId: freelancerId,
          conflictId: conflictId
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        console.log('Conversation created:', conversation);
        router.push(`/messages?conversation=${conversation.id}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to create conversation:', errorData);
        alert(`Failed to create conversation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error creating conversation. Please try again.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleStartAdminConversation = async () => {
    setIsCreatingConversation(true);
    try {
      console.log('Creating conversation with adminId:', adminId);
      console.log('ConflictMessaging props:', { conflictId, clientId, freelancerId, adminId });
      
      // Create a conversation between current user and admin
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otherUserId: adminId,
          conflictId: conflictId,
          type: 'conflict_discussion'
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        console.log('Conversation created:', conversation);
        router.push(`/messages?conversation=${conversation.id}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to create conversation:', errorData);
        alert(`Failed to create conversation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error creating conversation. Please try again.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conflict Communication
        </CardTitle>
        <CardDescription>
          Start conversations to resolve the conflict through communication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isMessagingAllowed ? (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">
                Communication Closed
              </h4>
              <p className="text-sm text-gray-600">
                This conflict has been {conflictStatus.toLowerCase()}. Communication is no longer available.
              </p>
            </div>
          ) : isAdmin ? (
            <>
              {/* Admin: Can start individual conversations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Client Discussion</h5>
                  <p className="text-xs text-gray-600 mb-2">
                    Private conversation with the client
                  </p>
                  <Button
                    onClick={handleStartClientConversation}
                    disabled={isCreatingConversation}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Message Client
                  </Button>
                </div>

                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Builder Discussion</h5>
                  <p className="text-xs text-gray-600 mb-2">
                    Private conversation with the builder
                  </p>
                  <Button
                    onClick={handleStartFreelancerConversation}
                    disabled={isCreatingConversation}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Message Builder
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Regular users: Can start conversation with admin for conflict resolution */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contact Administrator
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Start a conversation with the assigned administrator to discuss this conflict and seek resolution.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleStartAdminConversation}
                    disabled={isCreatingConversation}
                    variant="outline"
                    size="sm"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Message Administrator
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Communication Guidelines */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-sm text-gray-900 mb-2">Admin Communication Guidelines</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Provide clear details about the conflict and your concerns</li>
              <li>• Include relevant contract terms, deadlines, and deliverables</li>
              <li>• Be open to compromise and alternative solutions</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
