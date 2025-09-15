'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Search, Building2, RefreshCw, Eye, Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';
import { CostCenterTree } from '@/components/ui/cost-center-tree';

interface CostCentersViewProps {
  onBack?: () => void;
}

export function CostCentersView({ onBack }: CostCentersViewProps) {
  const { costCenters, selectedRoute, setSelectedRoute, setActiveTab } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState<HierarchicalCostCenter | null>(null);

  // Filter cost centers based on search term and level
  const filteredCostCenters = useMemo(() => {
    let filtered = costCenters;

    // Filter out null/invalid cost centers
    filtered = filtered.filter(center => {
      // Remove cost centers with null in name, branch, or subBranch
      const hasNull = center.name?.includes('null') || 
                     center.branch?.includes('null') || 
                     center.subBranch?.includes('null');
      
      // Remove specific unwanted cost center
      const isUnwanted = center.name === 'MBSA SUPER RENT - SG MOBILITY - null' ||
                        center.name?.includes('MBSA SUPER RENT - SG MOBILITY - null');
      
      return !hasNull && !isUnwanted;
    });

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(center =>
        center.name?.toLowerCase().includes(term) ||
        center.costCode?.toLowerCase().includes(term) ||
        center.company?.toLowerCase().includes(term) ||
        center.branch?.toLowerCase().includes(term) ||
        center.subBranch?.toLowerCase().includes(term)
      );
    }

    // Filter by level
    if (levelFilter !== 'all') {
      const level = parseInt(levelFilter);
      filtered = filtered.filter(center => center.level === level);
    }

    return filtered;
  }, [costCenters, searchTerm, levelFilter]);

  // Get available levels for filter
  const getLevelOptions = () => {
    const levels = [...new Set(costCenters.map(center => center.level))].sort();
    return levels.map(level => ({
      value: level.toString(),
      label: level === 0 ? 'Energy Rite' : `Level ${level}`
    }));
  };

  // Get total count
  const getTotalCount = () => costCenters.length;

  // Get filtered count
  const getFilteredCount = () => filteredCostCenters.length;

  // Handle cost center selection
  const handleCostCenterSelect = (costCenter: HierarchicalCostCenter) => {
    setSelectedCostCenter(costCenter);
    setSelectedRoute({
      id: costCenter.id,
      route: costCenter.name || 'Unknown',
      locationCode: costCenter.costCode || 'N/A',
      costCode: costCenter.costCode || undefined
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white p-6 border-gray-200 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="font-semibold text-gray-900 text-2xl">Cost Centers</h1>
              <p className="mt-1 text-gray-600 text-sm">
                Hierarchical view of cost centers and their associated codes
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="font-semibold text-gray-900 text-lg">
                Cost Center Structure
              </CardTitle>
              <Badge variant="outline" className="text-gray-600">
                Full Hierarchy View
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search cost centers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {getLevelOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(searchTerm || levelFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm('');
                    setLevelFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg h-[700px] overflow-auto">
              <CostCenterTree
                costCenters={filteredCostCenters}
                onCostCenterSelect={handleCostCenterSelect}
                selectedCostCenter={selectedCostCenter}
                className="h-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}