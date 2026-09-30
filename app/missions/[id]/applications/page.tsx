"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, XCircle, User } from "lucide-react";

interface Offer {
  id: string;
  status: string;
  dailyRate: number;
  proposalText: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  freelancer: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  mission: {
    id: string;
    title: string;
    client: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  client: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function MissionApplicationsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [applications, setApplications] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch mission and applications
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch mission details
        const missionResponse = await fetch(`/api/missions/${missionId}`);
        const missionData = await missionResponse.json();
        
        if (missionData.id) {
          setMission(missionData);
        } else {
          setError('Mission not found');
          return;
        }

        // Fetch applications for this mission
        const applicationsResponse = await fetch(`/api/offers?missionId=${missionId}`);
        const applicationsData = await applicationsResponse.json();
        setApplications(applicationsData);
      } catch (err) {
        setError('Error fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (missionId) {
      fetchData();
    }
  }, [missionId]);

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
        const applicationsResponse = await fetch(`/api/offers?missionId=${missionId}`, { cache: 'no-store' });
        const applicationsData = await applicationsResponse.json();
        setApplications(applicationsData);
        window.dispatchEvent(new CustomEvent('offersUpdated'));
        alert('Offer cancelled.');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
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

  if (!mission) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Mission not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Applications for Mission</h1>
        </div>

        {/* Mission Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{mission.title}</CardTitle>
            <CardDescription>Status: {mission.status}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{mission.description}</p>
          </CardContent>
        </Card>

        {/* Applications List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Applications ({applications.length})
            </h2>
          </div>

          {applications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No offers sent yet for this mission.</p>
              </CardContent>
            </Card>
          ) : (
            applications.map((application) => (
              <Card key={application.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {getFreelancerName(application.freelancer)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {application.freelancer.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(application.status)}
                    <p className="text-sm text-gray-500 mt-1">
                      Offered {formatDate(application.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Proposal</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {application.proposalText}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <span className="font-medium">Proposed Rate:</span>
                    <p>€{application.dailyRate}/day</p>
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span>
                    <p>{formatDate(application.startDate)}</p>
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>
                    <p>{formatDate(application.endDate)}</p>
                  </div>
                </div>

                {application.status === 'PENDING' && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleCancelOffer(application.id)}
                      disabled={processing === application.id}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processing === application.id ? 'Processing...' : 'Cancel'}
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
