'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <Card className={`shadow-sm border border-gray-200 h-[22rem] sm:h-96 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="font-semibold text-gray-900 text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
