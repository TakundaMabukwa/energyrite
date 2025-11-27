'use client';

import React, { useState } from 'react';
import { Bell, Menu, LogOut, History } from 'lucide-react';
import { NotesHistoryModal } from '@/components/ui/notes-history-modal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoutButton } from '@/components/logout-button';
import { useUser } from '@/contexts/UserContext';
import { useApp } from '@/contexts/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Header() {
  const { user, signOut } = useUser();
  const { costCenters, selectedRoute, setSelectedRoute } = useApp();
  const { isAdmin, userCostCode } = useUser();
  const [isMounted, setIsMounted] = React.useState(false);
  const [showNotesHistory, setShowNotesHistory] = useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Memoize cost centers to prevent re-computation on every render
  const energyriteCostCenters = React.useMemo(() => {
    if (isAdmin) {
      // Admin sees all cost centers
      return costCenters.flatMap(cc => cc.children ? cc.children : [cc]);
    } else if (userCostCode) {
      // Non-admin users only see their cost center
      return costCenters.flatMap(cc => cc.children ? cc.children : [cc])
        .filter(cc => cc.costCode === userCostCode);
    }
    return [];
  }, [costCenters, isAdmin, userCostCode]);

  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.email?.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

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
        <div className="w-48">
          {!isMounted ? (
            <div className="w-48 bg-white/10 border-white/20 text-white border rounded-md px-3 py-2 text-sm">
              Loading...
            </div>
          ) : (
            <Select
              value={selectedRoute?.costCode || 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedRoute(null);
                } else {
                  const costCenter = energyriteCostCenters.find(cc => cc.costCode === value);
                  if (costCenter) {
                    setSelectedRoute({
                      id: costCenter.id,
                      route: costCenter.name || 'Unknown',
                      locationCode: costCenter.costCode || 'N/A',
                      costCode: costCenter.costCode || undefined
                    });
                  }
                }
              }}
            >
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder={energyriteCostCenters.length === 0 ? "Loading..." : "Select Cost Center"} />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">All Energyrite Centers</SelectItem>}
              {energyriteCostCenters.length === 0 ? (
                <SelectItem value="loading" disabled>Loading cost centers...</SelectItem>
              ) : (
                energyriteCostCenters.map((costCenter) => (
                  <SelectItem key={costCenter.id} value={costCenter.costCode || costCenter.id}>
                    {costCenter.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
            </Select>
          )}
        </div>
        <span className="hidden md:block text-white/80 text-sm">
          Good evening, {getUserDisplayName()}
        </span>
        
        {/* <Button 
          variant="ghost" 
          size="sm" 
          className="hover:bg-white/10 text-white"
          onClick={() => setShowNotesHistory(true)}
          title="Notes History"
        >
          <History className="w-5 h-5" />
        </Button> */}

        <Button variant="ghost" size="sm" className="relative hover:bg-white/10 text-white">
          <Bell className="w-5 h-5" />
          <span className="-top-1 -right-1 absolute bg-orange-500 rounded-full w-3 h-3"></span>
        </Button>

        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-white/20 font-medium text-white text-sm">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>

        <LogoutButton variant="ghost" size="sm" className="hover:bg-white/10 text-white">
          <LogOut className="mr-2 w-4 h-4" />
          Logout
        </LogoutButton>
      </div>
      
      <NotesHistoryModal 
        isOpen={showNotesHistory} 
        onClose={() => setShowNotesHistory(false)} 
      />
    </header>
  );
}