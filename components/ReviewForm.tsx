"use client";

import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReviewFormProps {
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  missionId?: string;
  missionTitle?: string;
  onSubmit: (review: { content: string; rating: number }) => Promise<void>;
  onCancel?: () => void;
}

export default function ReviewForm({
  receiverId,
  receiverName,
  receiverRole,
  missionId,
  missionTitle,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!content.trim()) {
      alert('Please write a review');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), rating });
      setRating(0);
      setContent('');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className="transition-colors duration-200 focus:outline-none"
        >
          <Star
            className={`h-6 w-6 ${
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          />
        </button>
      );
    });
  };

  const getRatingText = () => {
    if (rating === 0) return 'Select a rating';
    const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return texts[rating];
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Review</span>
          <Badge variant="secondary">{receiverRole}</Badge>
        </CardTitle>
        <div className="text-sm text-gray-600">
          <p className="font-medium">{receiverName}</p>
          {missionTitle && (
            <p className="text-xs">Mission: {missionTitle}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">{renderStars()}</div>
              <span className="text-sm text-gray-600 ml-2">
                {getRatingText()}
              </span>
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Your Review
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience working with this person..."
              rows={4}
              maxLength={500}
              required
            />
            <div className="text-xs text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0 || !content.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
