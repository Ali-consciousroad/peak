"use client";

import { Star, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  mission?: {
    id: string;
    title: string;
    status: string;
  };
}

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}

export default function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= rating;
      
      return (
        <Star
          key={index}
          className={`h-4 w-4 ${
            isFilled
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      );
    });
  };

  const getRatingText = (rating: number) => {
    const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return texts[rating];
  };

  const isOwner = currentUserId === review.reviewer.id;
  const isReceived = currentUserId === review.receiver.id;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {review.reviewer.firstName} {review.reviewer.lastName}
              </span>
              <Badge variant="outline" className="text-xs">
                {review.reviewer.role === 'freelance' 
                  ? 'Builder' 
                  : review.reviewer.role === 'client' 
                    ? 'Client' 
                    : review.reviewer.role || 'Unknown'}
              </Badge>
              {isOwner && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  You wrote this
                </Badge>
              )}
              {isReceived && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  About you
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-3 w-3" />
            {formatDate(review.createdAt)}
          </div>
        </div>
        
        {/* Show who the review is about if current user wrote it */}
        {isOwner && (
          <div className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Review about:</span> {review.receiver.firstName} {review.receiver.lastName}
            <Badge variant="outline" className="ml-2 text-xs">
              {review.receiver.role === 'freelance' 
                ? 'Builder' 
                : review.receiver.role === 'client' 
                  ? 'Client' 
                  : review.receiver.role || 'Unknown'}
            </Badge>
          </div>
        )}
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">{renderStars(review.rating)}</div>
          <span className="text-sm font-medium text-gray-700">
            {getRatingText(review.rating)}
          </span>
          <span className="text-sm text-gray-500">
            ({review.rating}/5)
          </span>
        </div>

        {/* Mission context */}
        {review.mission && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Mission:</span> {review.mission.title || 'Untitled'}
            <Badge variant="secondary" className="ml-2 text-xs">
              {review.mission.status || 'Unknown'}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-gray-700 leading-relaxed">{review.content}</p>
        
        {/* Action buttons for review owner */}
        {isOwner && (onEdit || onDelete) && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(review)}
              >
                Edit Review
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(review.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Review
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
