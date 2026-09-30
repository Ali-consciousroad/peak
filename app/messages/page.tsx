"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Send, 
  MessageCircle, 
  Search, 
  MoreVertical, 
  Paperclip,
  Smile,
  ArrowLeft,
  User,
  Clock,
  Bot
} from "lucide-react";

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  allParticipants?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  }[];
  isGroup?: boolean;
  groupName?: string;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
  } | null;
  unreadCount: number;
  updatedAt: string;
  conflictId?: string;
  conflict?: {
    id: string;
    status: string;
  };
}

interface Message {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function MessagesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.replace("/sign-in?redirect=/messages");
      return;
    }

    fetchConversations();
  }, [userId, router]);

  // Handle conversation parameter from URL
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    console.log("URL conversation ID:", conversationId);
    console.log("Available conversations:", conversations);
    
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      console.log("Found conversation:", conversation);
      // Only update if it's different from current selection to prevent loops
      if (conversation && selectedConversation?.id !== conversation.id) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations, selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) {
      setMessagesLoading(true);
      fetchMessages(selectedConversation.id)
        .then(() => {
          setShouldScrollToBottom(true);
          // Refresh conversations to update unread counts after messages are marked as read
          // Use a delay to avoid layout shifts and only update unread count for this conversation
          setTimeout(() => {
            setConversations(prev => 
              prev.map(conv => 
                conv.id === selectedConversation.id 
                  ? { ...conv, unreadCount: 0 }
                  : conv
              )
            );
          }, 200);
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
          setMessages([]);
        })
        .finally(() => {
          setMessagesLoading(false);
        });
    } else {
      setMessages([]);
      setMessagesLoading(false);
    }
  }, [selectedConversation?.id]); // Only depend on the ID, not the whole object

  useEffect(() => {
    // Only scroll to bottom when messages are first loaded or new message is added
    if (shouldScrollToBottom && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom();
        setShouldScrollToBottom(false);
      });
    }
  }, [messages, shouldScrollToBottom]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched conversations:", data);
        setConversations(data);
      } else {
        console.error("Failed to fetch conversations:", response.status);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        return data; // Return data so we can chain .then()
      } else {
        // Handle non-OK responses
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch messages: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error; // Re-throw so .catch() can handle it
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage("");
        setShouldScrollToBottom(true);
        
        // Update conversation list with new last message (without full refresh to avoid layout shift)
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, lastMessage: message, unreadCount: 0 }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    // Use scrollTop instead of scrollIntoView to avoid jumping
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!userId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 flex-1 overflow-x-hidden">
      <div className="container mx-auto max-w-full min-w-0 px-3 pb-4 pt-20 sm:px-4 sm:pb-6">
        <div className="flex h-[min(calc(100dvh-6.5rem),800px)] min-h-[320px] max-h-[800px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900 md:h-[calc(100dvh-6.5rem)] md:max-h-[800px] md:flex-row">
          {/* Conversations List — full width on mobile; hidden when a thread is open until md */}
          <div
            className={`flex min-h-0 min-w-0 flex-col border-gray-200 dark:border-gray-700 md:w-1/3 md:max-w-none md:border-r ${
              selectedConversation ? "hidden h-full w-full md:flex" : "flex h-full w-full"
            }`}
          >
                            <div className="shrink-0 border-b border-gray-200 p-3 dark:border-gray-700 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Messages
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Open chatbot by triggering the floating button
                        const chatbotButton = document.querySelector('[data-chatbot-trigger]') as HTMLButtonElement;
                        if (chatbotButton) {
                          chatbotButton.click();
                        }
                      }}
                      className="flex shrink-0 items-center gap-1"
                    >
                      <Bot className="h-4 w-4" />
                      <span>AI Help</span>
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
            
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      router.push(`/messages?conversation=${conversation.id}`);
                    }}
                    className={`cursor-pointer border-b border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 sm:p-4 ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium leading-snug text-gray-900 dark:text-white">
                            {conversation.isGroup ? (
                              conversation.groupName || 'Group Chat'
                            ) : (
                              conversation.otherUser.firstName && conversation.otherUser.lastName
                                ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
                                : conversation.otherUser.email
                            )}
                          </p>
                          {conversation.conflictId && (
                            <span className="mt-1 inline-block max-w-full break-words rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                              Conflict Discussion
                            </span>
                          )}
                          {conversation.lastMessage && (
                            <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessage && formatTime(conversation.lastMessage.createdAt)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="min-w-[20px] rounded-full bg-blue-500 px-2 py-1 text-center text-xs text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area — full screen on mobile when a thread is open */}
          <div
            className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
              selectedConversation ? "flex h-full w-full" : "hidden min-h-[50vh] md:flex"
            }`}
          >
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 p-3 dark:border-gray-700 sm:p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedConversation(null);
                        router.push("/messages");
                      }}
                      className="mt-0.5 shrink-0 md:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium leading-snug text-gray-900 dark:text-white">
                        {selectedConversation.isGroup ? (
                          selectedConversation.groupName || 'Group Chat'
                        ) : (
                          selectedConversation.otherUser.firstName && selectedConversation.otherUser.lastName
                            ? `${selectedConversation.otherUser.firstName} ${selectedConversation.otherUser.lastName}`
                            : selectedConversation.otherUser.email
                        )}
                      </p>
                      {selectedConversation.conflictId && (
                        <span className="mt-1 inline-block max-w-full break-words rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                          Conflict Discussion
                        </span>
                      )}
                      <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                        {selectedConversation.isGroup ? (
                          selectedConversation.allParticipants?.length 
                            ? `${selectedConversation.allParticipants.length + 1} participants`
                            : 'Group conversation'
                        ) : (
                          selectedConversation.otherUser.email
                        )}
                        {selectedConversation.conflictId && selectedConversation.conflict && (
                          <span className="mt-1 block text-xs text-orange-600 sm:mt-0 sm:ml-2 sm:inline">
                            • Conflict #{selectedConversation.conflict.id.slice(-8)} ({selectedConversation.conflict.status})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 sm:p-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => {
                        // Handle both old format (sender) and new format (users)
                        const sender = (message as any).users || (message as any).sender || { id: '', firstName: '', lastName: '' };
                        const replyTo = (message as any).messages || (message as any).replyTo;
                        const isCurrentUser = sender.id === userId;
                        
                        return (
                          <div
                            key={message.id}
                            className={`mb-2 flex min-w-0 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`flex max-w-[min(20rem,calc(100%-0.5rem))] flex-col sm:max-w-xs lg:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}
                            >
                              {/* Sender name */}
                              <div className={`mb-1 text-xs ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                <span className={`inline-block max-w-full break-words rounded-full px-2 py-1 text-xs ${
                                  isCurrentUser 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {sender.firstName && sender.lastName
                                    ? `${sender.firstName} ${sender.lastName}`
                                    : sender.email || 'Unknown'}
                                </span>
                              </div>
                              
                              {/* Message bubble */}
                              <div
                                className={`break-words rounded-lg px-3 py-2 sm:px-4 ${
                                  isCurrentUser
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                }`}
                              >
                                {replyTo && (
                                  <div className={`mb-1 break-words text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                    Replying to: {replyTo.content?.substring(0, 50) || '...'}...
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                                <div className={`mt-1 text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {formatTime(message.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="shrink-0 border-t border-gray-200 p-3 dark:border-gray-700 sm:p-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" className="shrink-0" type="button">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="min-w-0 flex-1 basis-[200px]"
                    />
                    <Button variant="ghost" size="sm" className="shrink-0" type="button">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      size="sm"
                      className="shrink-0"
                      type="button"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
