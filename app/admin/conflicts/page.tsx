'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import ConflictWorkflow from '@/components/ConflictWorkflow';
import ConflictMessaging from '@/components/ConflictMessaging';

interface Person {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface Conflict {
  id: string;
  status: string;
  motive: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedAdminId?: string;
  contracts?: {
    id: string;
    contractTerms?: string | null;
    dailyRate?: number | string | null;
    startDate?: string;
    endDate?: string;
    users_contracts_freelancerIdTousers?: Person | null;
    users_contracts_adminIdTousers?: Person | null;
    missions?: {
      id: string;
      title?: string | null;
      description?: string | null;
      users_missions_clientIdTousers?: Person | null;
    } | null;
  } | null;
  assignedAdmin?: Person | null;
}

const CONFLICT_STATUSES = [
  { value: 'OPEN', label: 'Open', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-blue-100 text-blue-800' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
  { value: 'ESCALATED', label: 'Escalated', color: 'bg-red-100 text-red-800' }
];

export default function AdminConflictsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!userId) {
        router.push("/sign-in");
        return false;
      }

      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const userData = await response.json();
          if (!userData.isAdmin) {
            router.push("/");
            return false;
          }
          return true;
        } else {
          router.push("/sign-in");
          return false;
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/");
        return false;
      }
    };

    checkAdminAccess().then((hasAccess) => {
      if (hasAccess) {
        fetchConflicts();
      }
    });
  }, [userId, router, statusFilter]);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/conflicts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConflicts(data);
      }
    } catch (error) {
      console.error("Error fetching conflicts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (conflictId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          endDate: newStatus === 'RESOLVED' || newStatus === 'ARCHIVED' ? new Date().toISOString() : undefined
        }),
      });

      if (response.ok) {
        await fetchConflicts();
      } else {
        console.error('Failed to update conflict status');
      }
    } catch (error) {
      console.error('Error updating conflict status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = CONFLICT_STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'IN_REVIEW':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CLOSED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'ESCALATED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const personName = (person?: Person | null) => {
    const name = `${person?.firstName || ''} ${person?.lastName || ''}`.trim();
    return name || 'Unknown';
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading conflicts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Conflict Management</h1>
          <p className="text-gray-600">Manage and resolve disputes between users</p>
        </div>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {CONFLICT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {conflicts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No conflicts found</h3>
              <p className="text-gray-600">
                {statusFilter ? `No conflicts with status "${statusFilter}"` : 'No conflicts have been reported yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          conflicts.map((conflict) => {
            const contract = conflict.contracts;
            const mission = contract?.missions;
            const client = mission?.users_missions_clientIdTousers;
            const freelancer = contract?.users_contracts_freelancerIdTousers;
            const contractAdmin = contract?.users_contracts_adminIdTousers;

            return (
            <Card key={conflict.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(conflict.status)}
                    <div>
                      <CardTitle className="text-lg">
                        Conflict #{conflict.id.slice(-8)}
                      </CardTitle>
                      <CardDescription>
                        Mission: {mission?.title || 'N/A'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conflict.status)}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedConflict(conflict)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Conflict Details</AlertDialogTitle>
                          <AlertDialogDescription>
                            Review and manage this conflict
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="space-y-6">
                          {/* Conflict Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Conflict Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>ID:</strong> {conflict.id}</div>
                                <div><strong>Status:</strong> {getStatusBadge(conflict.status)}</div>
                                <div><strong>Created:</strong> {formatDate(conflict.createdAt)}</div>
                                <div><strong>Started:</strong> {formatDate(conflict.startDate)}</div>
                                {conflict.endDate && (
                                  <div><strong>Ended:</strong> {formatDate(conflict.endDate)}</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Contract Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Daily Rate:</strong> €{contract?.dailyRate ?? 0}</div>
                                <div><strong>Start Date:</strong> {formatDate(contract?.startDate)}</div>
                                <div><strong>End Date:</strong> {formatDate(contract?.endDate)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Parties Involved */}
                          <div>
                            <h4 className="font-semibold mb-2">Parties Involved</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <strong>Client:</strong><br />
                                {personName(client)}<br />
                                <span className="text-gray-600">{client?.email || ''}</span>
                              </div>
                              <div>
                                <strong>Builder:</strong><br />
                                {personName(freelancer)}<br />
                                <span className="text-gray-600">{freelancer?.email || ''}</span>
                              </div>
                              <div>
                                <strong>Reported By:</strong><br />
                                <span className="text-blue-600 font-medium">
                                  {conflict.motive.toLowerCase().includes('expectation') || 
                                   conflict.motive.toLowerCase().includes('quality') || 
                                   conflict.motive.toLowerCase().includes('satisfied') ||
                                   conflict.motive.toLowerCase().includes('disappointed')
                                    ? 'Client' 
                                    : conflict.motive.toLowerCase().includes('payment') || 
                                      conflict.motive.toLowerCase().includes('delivery') ||
                                      conflict.motive.toLowerCase().includes('scope') ||
                                      conflict.motive.toLowerCase().includes('requirements')
                                    ? 'Builder'
                                    : 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <strong>Contract Admin:</strong><br />
                                {personName(contractAdmin)}<br />
                                <span className="text-gray-600">{contractAdmin?.email || ''}</span>
                              </div>
                              <div>
                                <strong>Assigned Admin:</strong><br />
                                {conflict.assignedAdmin ? (
                                  <>
                                    {conflict.assignedAdmin.firstName} {conflict.assignedAdmin.lastName}<br />
                                    <span className="text-gray-600">{conflict.assignedAdmin.email}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-500 italic">Not assigned</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mission Details */}
                          <div>
                            <h4 className="font-semibold mb-2">Mission Details</h4>
                            <div className="text-sm">
                              <div><strong>Title:</strong> {mission?.title || 'N/A'}</div>
                              <div><strong>Description:</strong> {mission?.description || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Contract Terms */}
                          <div>
                            <h4 className="font-semibold mb-2">Contract Terms</h4>
                            <div className="bg-gray-50 p-3 rounded text-sm">
                              {contract?.contractTerms || 'N/A'}
                            </div>
                          </div>

                          {/* Conflict Motive */}
                          <div>
                            <h4 className="font-semibold mb-2">Conflict Description</h4>
                            <div className="bg-red-50 p-3 rounded text-sm">
                              {conflict.motive}
                            </div>
                          </div>

                          {/* Conflict Messaging */}
                          <div>
                            <h4 className="font-semibold mb-4">Communication Tools</h4>
                            <ConflictMessaging
                              conflictId={conflict.id}
                              contractId={contract?.id || ''}
                              clientId={client?.id || ''}
                              freelancerId={freelancer?.id || ''}
                              adminId={contractAdmin?.id || ''}
                              isAdmin={true}
                              conflictStatus={conflict.status}
                              currentUserId={userId ?? undefined}
                            />
                          </div>

                          {/* Conflict Workflow */}
                          <div>
                            <h4 className="font-semibold mb-4">Resolution Workflow</h4>
                            <ConflictWorkflow
                              conflictId={conflict.id}
                              currentStatus={conflict.status}
                              onStatusChange={(newStatus) => {
                                handleStatusUpdate(conflict.id, newStatus);
                              }}
                              isAdmin={true}
                            />
                          </div>

                          {/* Status Update */}
                          <div>
                            <h4 className="font-semibold mb-2">Conflict Status</h4>
                            <div className="space-y-3">
                              <Select 
                                value={conflict.status} 
                                onValueChange={(newStatus) => {
                                  if (newStatus !== conflict.status) {
                                    handleStatusUpdate(conflict.id, newStatus);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OPEN">Open</SelectItem>
                                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <AlertDialogFooter>
                          <Button
                            onClick={() => setSelectedConflict(null)}
                            variant="outline"
                            className="w-full"
                          >
                            Close
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <strong>Conflict Description:</strong>
                    <p className="text-gray-700 mt-1">{conflict.motive}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Client:</strong> {personName(client)}
                    </div>
                    <div>
                      <strong>Builder:</strong> {personName(freelancer)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Contract:</strong> €{contract?.dailyRate ?? 0}/day • {formatDate(contract?.startDate)} - {formatDate(contract?.endDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
