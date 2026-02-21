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

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
    const flattenAll = (centers: any[]): any[] => {
      return centers.flatMap((center) => [
        center,
        ...(center.children ? flattenAll(center.children) : [])
      ]);
    };

    const flattened = flattenAll(costCenters)
      .filter((cc) => cc?.costCode)
      .filter((cc, index, arr) => index === arr.findIndex((item) => item.costCode === cc.costCode));

    if (isAdmin) {
      // Admin sees all cost centers
      return flattened;
    } else if (userCostCode) {
      // Non-admin users can switch among all scoped descendants.
      return flattened;
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

  const formatCostCenterLabel = (name?: string) => {
    if (!name) return '';
    return name.split('-')[0].trim();
  };

  return (
    <header className="flex justify-between items-center gap-2 bg-[#1e3a5f] px-2 sm:px-6 border-gray-700 border-b min-h-14 sm:min-h-16">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden hover:bg-white/10 text-white"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-4">
        <div className="w-32 sm:w-48">
          {!isMounted ? (
            <div className="bg-white/10 border-white/20 text-white border rounded-md px-3 py-2 text-sm">
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
            <SelectTrigger className="w-32 sm:w-48 bg-white/10 border-white/20 text-white h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder={energyriteCostCenters.length === 0 ? "Loading..." : "Select Cost Center"} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="end"
              className="max-w-[calc(100vw-1rem)] sm:max-w-[28rem]"
            >
              {isAdmin && (
                <SelectItem value="all" className="max-w-[calc(100vw-2rem)] sm:max-w-[26rem]">
                  <span className="block truncate" title="All Energyrite Centers">All Energyrite Centers</span>
                </SelectItem>
              )}
              {energyriteCostCenters.length === 0 ? (
                <SelectItem value="loading" disabled>Loading cost centers...</SelectItem>
              ) : (
                energyriteCostCenters.map((costCenter) => (
                  <SelectItem
                    key={costCenter.id}
                    value={costCenter.costCode || costCenter.id}
                    className="max-w-[calc(100vw-2rem)] sm:max-w-[26rem]"
                  >
                    <span className="block truncate" title={costCenter.name}>
                      {formatCostCenterLabel(costCenter.name)}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
            </Select>
          )}
        </div>
        <span className="hidden lg:block text-white/80 text-sm">
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

        <Button variant="ghost" size="sm" className="hidden min-[390px]:inline-flex relative hover:bg-white/10 text-white px-2">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="-top-1 -right-1 absolute bg-orange-500 rounded-full w-3 h-3"></span>
        </Button>

        <Avatar className="hidden min-[430px]:flex w-8 h-8">
          <AvatarFallback className="bg-white/20 font-medium text-white text-sm">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>

        <LogoutButton variant="ghost" size="sm" className="hover:bg-white/10 text-white px-2">
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </LogoutButton>
      </div>
      
      <NotesHistoryModal 
        isOpen={showNotesHistory} 
        onClose={() => setShowNotesHistory(false)} 
      />
    </header>
  );
}
