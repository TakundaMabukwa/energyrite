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
    <Card className={`shadow-sm border border-gray-200 h-80 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-gray-900 text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-hidden">
        <div className="w-full h-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
