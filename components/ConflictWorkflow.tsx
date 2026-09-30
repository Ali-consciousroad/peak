'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, XCircle, MessageSquare, FileText, Users } from 'lucide-react';

interface ConflictWorkflowProps {
  conflictId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  isAdmin?: boolean;
}

const WORKFLOW_STEPS = [
  {
    id: 'OPEN',
    title: 'Conflict Reported',
    description: 'A conflict has been reported and is awaiting review',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'IN_REVIEW',
    title: 'Under Review',
    description: 'Admin is reviewing the conflict and gathering information',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'ESCALATED',
    title: 'Escalated',
    description: 'Conflict requires higher-level intervention or external mediation',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    id: 'RESOLVED',
    title: 'Resolved',
    description: 'Conflict has been successfully resolved',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'ARCHIVED',
    title: 'Archived',
    description: 'Conflict case has been archived',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
];

const RESOLUTION_ACTIONS = [
  {
    id: 'mediation',
    title: 'Mediation',
    description: 'Facilitate direct communication between parties',
    icon: MessageSquare,
    recommended: true
  },
  {
    id: 'contract_review',
    title: 'Contract Review',
    description: 'Review contract terms and obligations',
    icon: FileText,
    recommended: true
  },
  {
    id: 'evidence_collection',
    title: 'Evidence Collection',
    description: 'Gather supporting documentation and evidence',
    icon: FileText,
    recommended: false
  },
  {
    id: 'external_mediation',
    title: 'External Mediation',
    description: 'Engage third-party mediation services',
    icon: Users,
    recommended: false
  }
];

export default function ConflictWorkflow({ 
  conflictId, 
  currentStatus, 
  onStatusChange,
  isAdmin = false 
}: ConflictWorkflowProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const getCurrentStepIndex = () => {
    return WORKFLOW_STEPS.findIndex(step => step.id === currentStatus);
  };

  const getStepStatus = (stepIndex: number) => {
    const currentIndex = getCurrentStepIndex();
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const getRecommendedActions = () => {
    switch (currentStatus) {
      case 'OPEN':
        return ['mediation', 'contract_review'];
      case 'IN_REVIEW':
        return ['evidence_collection', 'mediation'];
      case 'ESCALATED':
        return ['external_mediation', 'evidence_collection'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Conflict Resolution Workflow
          </CardTitle>
          <CardDescription>
            Track the progress of conflict resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const IconComponent = step.icon;
              const isCompleted = status === 'completed';
              const isCurrent = status === 'current';
              const isPending = status === 'pending';

              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isCompleted 
                      ? 'bg-green-100 border-green-500 text-green-600' 
                      : isCurrent 
                        ? `${step.bgColor} ${step.borderColor} ${step.color}`
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <IconComponent className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium ${
                        isCurrent ? 'text-gray-900' : isCompleted ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h4>
                      {isCurrent && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Current
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm ${
                      isCurrent ? 'text-gray-700' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      {isAdmin && getRecommendedActions().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>
              Suggested next steps based on current conflict status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {RESOLUTION_ACTIONS.filter(action => 
                getRecommendedActions().includes(action.id)
              ).map((action) => {
                const IconComponent = action.icon;
                return (
                  <div 
                    key={action.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAction === action.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedAction(action.id)}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{action.title}</h4>
                          {action.recommended && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Management (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Status Management</CardTitle>
            <CardDescription>
              Update conflict status and resolution progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentStatus === 'OPEN' && (
                <Button 
                  onClick={() => handleStatusChange('IN_REVIEW')}
                  className="w-full justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Move to Review
                </Button>
              )}
              
              {currentStatus === 'IN_REVIEW' && (
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleStatusChange('RESOLVED')}
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                  <Button 
                    onClick={() => handleStatusChange('ESCALATED')}
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Escalate Conflict
                  </Button>
                </div>
              )}
              
              {currentStatus === 'ESCALATED' && (
                <Button 
                  onClick={() => handleStatusChange('RESOLVED')}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              )}
              
              {currentStatus === 'RESOLVED' && (
                <Button 
                  onClick={() => handleStatusChange('ARCHIVED')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Archive Conflict
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Guidelines</CardTitle>
          <CardDescription>
            Best practices for conflict resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Initial Assessment</h4>
              <p className="text-gray-600">
                Review the conflict description, contract terms, and gather initial information from both parties.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Communication</h4>
              <p className="text-gray-600">
                Facilitate open communication between parties to understand perspectives and find common ground.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">3. Evidence Review</h4>
              <p className="text-gray-600">
                Examine contract terms, deliverables, communications, and any supporting documentation.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">4. Resolution</h4>
              <p className="text-gray-600">
                Work with parties to reach a fair resolution that addresses the core issues and prevents future conflicts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
