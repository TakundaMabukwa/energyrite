'use client';

import React, { useState, useEffect } from 'react';
import { ActivityReportView } from './ActivityReportView';

interface DailyReportViewProps {
  onBack?: () => void;
}

export function DailyReportView({ onBack }: DailyReportViewProps) {
  const reportDate = (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  })();

  return (
    <div className="h-full">
      <ActivityReportView onBack={onBack} initialDate={reportDate} />
    </div>
  );
}