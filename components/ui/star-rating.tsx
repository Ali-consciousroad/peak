"use client";

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  showText?: boolean;
  showNumber?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StarRating({ 
  rating, 
  showText = false, 
  showNumber = false, 
  size = 'md',
  className 
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getRatingText = (rating: number): string => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 4.0) return "Very Good";
    if (rating >= 3.5) return "Good";
    if (rating >= 3.0) return "Average";
    if (rating >= 2.0) return "Below Average";
    return "Poor";
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4.0) return "text-blue-600";
    if (rating >= 3.5) return "text-yellow-600";
    if (rating >= 3.0) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(
              sizeClasses[size],
              "fill-yellow-400 text-yellow-400"
            )}
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star
              className={cn(
                sizeClasses[size],
                "text-gray-300"
              )}
            />
            <Star
              className={cn(
                sizeClasses[size],
                "fill-yellow-400 text-yellow-400 absolute inset-0 clip-path-half"
              )}
              style={{
                clipPath: 'inset(0 50% 0 0)'
              }}
            />
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(
              sizeClasses[size],
              "text-gray-300"
            )}
          />
        ))}
      </div>
      
      {showNumber && (
        <span className={cn(
          "font-medium text-sm",
          getRatingColor(rating)
        )}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          getRatingColor(rating)
        )}>
          {getRatingText(rating)}
        </span>
      )}
    </div>
  );
}
