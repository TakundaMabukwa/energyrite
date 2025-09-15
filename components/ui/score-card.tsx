'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ScoreCardProps {
  value: string | number;
  label: string;
  barColor: string;
  backgroundColor?: string;
}

export function ScoreCard({ 
  value, 
  label, 
  barColor, 
  backgroundColor = 'bg-[#1e3a5f]' 
}: ScoreCardProps) {
  return (
    <Card className={`${backgroundColor} text-white border-0 shadow-sm`}>
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-2 font-bold text-3xl">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="mb-4 text-white/90 text-sm">
            {label}
          </div>
          <div 
            className={`h-1 w-full rounded-full ${barColor}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
