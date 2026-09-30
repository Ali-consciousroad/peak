'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConflictReportDialogProps {
  contractId: string;
  contractTitle: string;
  children: React.ReactNode;
}

export default function ConflictReportDialog({ 
  contractId, 
  contractTitle, 
  children 
}: ConflictReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!motive.trim()) {
      setError('Please provide a description of the conflict');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          motive: motive.trim(),
          status: 'OPEN'
        }),
      });

      if (response.ok) {
        const conflict = await response.json();
        setOpen(false);
        setMotive('');
        // Redirect to conflicts page to show the new conflict
        router.push('/conflicts');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to report conflict');
      }
    } catch (err) {
      setError('An error occurred while reporting the conflict');
      console.error('Error reporting conflict:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMotive('');
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report a Conflict
          </AlertDialogTitle>
          <AlertDialogDescription>
            Report a dispute or conflict related to the contract for "{contractTitle}".
            Please provide a detailed description of the issue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Before reporting a conflict:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Try to resolve the issue through direct communication</li>
                  <li>Review the contract terms to ensure the issue is valid</li>
                  <li>Provide specific details about what went wrong</li>
                  <li>Include any relevant evidence or documentation</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="motive" className="block text-sm font-medium text-gray-700 mb-2">
              Conflict Description *
            </label>
            <Textarea
              id="motive"
              placeholder="Please describe the conflict in detail. Include what happened, when it occurred, and how it affects the contract..."
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              rows={6}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Be as specific as possible. This information will be reviewed by our admin team.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !motive.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Reporting...' : 'Report Conflict'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
