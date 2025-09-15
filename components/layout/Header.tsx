'use client';

import React from 'react';
import { Bell, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoutButton } from '@/components/logout-button';

export function Header() {

  return (
    <header className="flex justify-between items-center bg-[#1e3a5f] px-6 border-gray-700 border-b h-16">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="hover:bg-white/10 text-white">
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <span className="hidden md:block text-white/80 text-sm">
          Good evening, mabukwa takunda
        </span>
        
        <Button variant="ghost" size="sm" className="relative hover:bg-white/10 text-white">
          <Bell className="w-5 h-5" />
          <span className="-top-1 -right-1 absolute bg-orange-500 rounded-full w-3 h-3"></span>
        </Button>

        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-white/20 font-medium text-white text-sm">
            M
          </AvatarFallback>
        </Avatar>

        <LogoutButton variant="ghost" size="sm" className="hover:bg-white/10 text-white">
          <LogOut className="mr-2 w-4 h-4" />
          Logout
        </LogoutButton>
      </div>
    </header>
  );
}