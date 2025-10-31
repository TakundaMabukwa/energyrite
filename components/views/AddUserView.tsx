'use client';

import React from 'react';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { UserPlus } from 'lucide-react';

export function AddUserView() {
  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />
      
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <UserPlus className="mx-auto mb-4 w-16 h-16 text-gray-400" />
            <p className="text-gray-500 text-lg">Add User Feature</p>
            <p className="text-gray-400 text-sm">User management functionality coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}