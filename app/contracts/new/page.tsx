'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Mission {
  id: string;
  description: string;
  dailyRate: string;
  timeframe: number;
  client: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

export default function NewContractPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const missionId = searchParams.get('mission');

  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [contractTerms, setContractTerms] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch mission details
  useEffect(() => {
    if (missionId) {
      fetch(`/api/missions/${missionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setMission(data);
            
            // Auto-fill contract terms and dates
            const defaultTerms = `I agree to complete the project according to the specifications provided. Work will be delivered within the agreed timeframe of ${data.timeframe} days at a daily rate of €${data.dailyRate}.`;
            setContractTerms(defaultTerms);
            
            // Set default dates
            const start = new Date();
            const end = new Date();
            end.setDate(start.getDate() + data.timeframe);
            
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
          } else {
            setError('Mission not found');
          }
        })
        .catch(err => {
          setError('Error fetching mission details');
          console.error(err);
        })
        .finally(() => setLoading(false));
    } else {
      setError('No mission specified');
      setLoading(false);
    }
  }, [missionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          missionId: mission.id,
          contractTerms,
          startDate,
          endDate,
        }),
      });

      if (response.ok) {
        const contract = await response.json();
        router.push(`/contracts/${contract.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create contract');
      }
    } catch (err) {
      setError('Error creating contract');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getClientName = () => {
    if (!mission) return 'Unknown Client';
    const client = mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    // Fallback to email prefix if no name
    if (client.email) {
      return client.email.split('@')[0];
    }
    return 'Unknown Client';
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to create a contract.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading mission details...</p>
      </div>
    );
  }

  if (error && !mission) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create Contract</h1>

      {mission && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Mission Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mission Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-lg">{mission.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Client</p>
                <p>{getClientName()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Daily Rate</p>
                  <p className="text-lg font-semibold">€{mission.dailyRate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Timeframe</p>
                  <p className="text-lg font-semibold">{mission.timeframe} days</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-gray-700">{mission.description}</p>
              </div>
              
              {/* Skills section removed - not in current schema */}
            </div>
          </Card>

          {/* Contract Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Contract Terms</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="contractTerms">Contract Terms & Conditions</Label>
                <Textarea
                  id="contractTerms"
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                  rows={8}
                  placeholder="Enter the terms and conditions for this contract..."
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating Contract...' : 'Create Contract'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}