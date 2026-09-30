'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
// Alert components replaced with simple divs
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Contract {
  id: string;
  contractTerms: string;
  dailyRate: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  freelancer: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  admin: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  mission: {
    id: string;
    title: string;
    description: string;
    dailyRate: string;
    timeframe: number;
    status: string;
    client: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function EditContractPage() {
  const { userId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    contractTerms: '',
    startDate: '',
    endDate: '',
    isActive: true
  });

  // Fetch user data
  useEffect(() => {
    if (userId) {
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          setUserData(data);
        })
        .catch(err => console.error('Error fetching user data:', err));
    }
  }, [userId]);

  // Fetch contract details
  useEffect(() => {
    if (contractId) {
      fetch(`/api/contracts/${contractId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setContract(data);
            // Populate form with existing data
            setFormData({
              contractTerms: data.contractTerms || '',
              startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
              endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
              isActive: data.isActive
            });
          } else {
            setError('Contract not found');
          }
        })
        .catch(err => {
          setError('Error fetching contract details');
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [contractId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Contract updated successfully!');
        // Redirect back to contract details after a short delay
        setTimeout(() => {
          router.push(`/contracts/${contract.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update contract');
      }
    } catch (err) {
      setError('Error updating contract');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFreelancerName = () => {
    if (!contract) return 'Unknown';
    const freelancer = contract.freelancer;
    if (freelancer.firstName && freelancer.lastName) {
      return `${freelancer.firstName} ${freelancer.lastName}`;
    }
    if (freelancer.firstName) {
      return freelancer.firstName;
    }
    return freelancer.email?.split('@')[0] || 'Unknown';
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to edit contracts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading contract details...</p>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Contract not found.</p>
      </div>
    );
  }

  // Check if user has permission to edit this contract
  const canEdit = userData && (
    userData.id === contract.mission.client.id || 
    userData.role === 'admin'
  );

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">You don't have permission to edit this contract.</p>
        </div>
        <div className="mt-4">
          <Link href={`/contracts/${contract.id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contract
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/contracts/${contract.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Contract</h1>
          <p className="text-gray-600">{contract.mission.title}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-green-600 mr-2" />
            <p className="text-green-600">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Contract Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="dailyRate">Daily Rate (Read-only)</Label>
                <Input
                  id="dailyRate"
                  value={`€${contract.dailyRate}`}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500 mt-1">Daily rate cannot be changed after contract creation</p>
              </div>
              
              <div>
                <Label htmlFor="freelancer">Freelancer (Read-only)</Label>
                <Input
                  id="freelancer"
                  value={getFreelancerName()}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                disabled={true}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded opacity-50"
              />
              <Label htmlFor="isActive">Contract is Active</Label>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Contract status can only be changed through conflict resolution or completion
            </p>
          </div>
        </Card>

        {/* Payment Milestones */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Payment Milestones</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Standard Milestone Structure</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium">Milestone 1 (25%)</span>
                    <p className="text-sm text-gray-600">Project kickoff and initial deliverables</p>
                  </div>
                  <span className="font-bold text-green-600">
                    €{contract ? (parseFloat(contract.dailyRate) * Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 3600 * 24)) * 0.25).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium">Milestone 2 (50%)</span>
                    <p className="text-sm text-gray-600">Mid-project progress and core functionality</p>
                  </div>
                  <span className="font-bold text-green-600">
                    €{contract ? (parseFloat(contract.dailyRate) * Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 3600 * 24)) * 0.50).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium">Milestone 3 (25%)</span>
                    <p className="text-sm text-gray-600">Final delivery and project completion</p>
                  </div>
                  <span className="font-bold text-green-600">
                    €{contract ? (parseFloat(contract.dailyRate) * Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 3600 * 24)) * 0.25).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Payment Terms</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Payments released upon milestone completion and client approval</li>
                <li>• All payments held securely in escrow until milestone verification</li>
                <li>• Admin verification required before payment release</li>
                <li>• Automatic crypto conversion available for freelancers</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Contract Terms */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Additional Contract Terms</h2>
          
          <div>
            <Label htmlFor="contractTerms">Additional Terms and Conditions</Label>
            <Textarea
              id="contractTerms"
              value={formData.contractTerms}
              onChange={(e) => handleInputChange('contractTerms', e.target.value)}
              placeholder="Enter any additional contract terms and conditions..."
              rows={8}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Define any additional terms, conditions, and expectations for this contract
            </p>
          </div>
        </Card>

        {/* Mission Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Mission Summary</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Mission:</strong> {contract.mission.title}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Description:</strong> {contract.mission.description}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Original Timeframe:</strong> {contract.mission.timeframe} days
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/contracts/${contract.id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
