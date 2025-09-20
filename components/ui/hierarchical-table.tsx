'use client';

import React, { useState } from 'react';
import { Building2, MapPin } from 'lucide-react';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';

interface HierarchicalTableProps {
  data: HierarchicalCostCenter[];
  onRowClick: (costCenter: HierarchicalCostCenter) => void;
  title: string;
  subtitle: string;
  showSearch?: boolean;
  showFilters?: boolean;
}

export function HierarchicalTable({ 
  data, 
  onRowClick, 
  title, 
  subtitle, 
  showSearch = true, 
  showFilters = true 
}: HierarchicalTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Flatten all cost centers into a single list
  const flattenCostCenters = (items: HierarchicalCostCenter[]): HierarchicalCostCenter[] => {
    const flattened: HierarchicalCostCenter[] = [];
    
    const flatten = (item: HierarchicalCostCenter) => {
      flattened.push(item);
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => flatten(child));
      }
    };
    
    items.forEach(item => flatten(item));
    return flattened;
  };

  const allCostCenters = flattenCostCenters(data);

  const filteredData = allCostCenters.filter(item => {
    // Filter out items with null or undefined properties
    const hasNull = (item.path && item.path.toLowerCase().includes('null')) || 
                   (item.name && item.name.toLowerCase().includes('null')) ||
                   (item.branch && item.branch.toLowerCase().includes('null'));
    
    if (hasNull) return false;
    
    // Check if required properties exist before calling toLowerCase
    const matchesSearch = (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.costCode && item.costCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.company && item.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.branch && item.branch.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLevel = filterLevel === 'all' || item.level.toString() === filterLevel;
    
    return matchesSearch && matchesLevel;
  });

  const renderRow = (item: HierarchicalCostCenter) => {
    return (
      <tr 
        key={item.id}
        className="hover:bg-gray-50 border-gray-200 border-b cursor-pointer"
        onClick={() => onRowClick(item)}
      >
        <td className="px-6 py-4 text-gray-600">{item.costCode || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-600">{item.company || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-600">{item.branch || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-600">{item.subBranch || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-600">{item.newAccountNumber || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-600">{item.parentId || 'N/A'}</td>
        <td className="px-6 py-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(item);
            }}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm"
          >
            View Details
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-gray-200 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold text-gray-900 text-xl">{title}</h2>
            <p className="mt-1 text-gray-600 text-sm">{subtitle}</p>
          </div>
        </div>
        
        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="flex gap-4 mt-4">
            {showSearch && (
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search cost centers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
            )}
            {showFilters && (
              <div>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="1">Level 1</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
           <thead className="bg-gray-50">
             <tr>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 cost_code
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 company
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 branch
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 sub_branch
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 new_account_number
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 parent_cost_code
               </th>
               <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                 Actions
               </th>
             </tr>
           </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map(item => renderRow(item))
            ) : (
               <tr>
                 <td colSpan={7} className="px-6 py-12 text-center">
                   <div className="text-gray-500">
                     <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                     <p className="text-lg">No cost centers found</p>
                     <p className="text-sm">Try adjusting your search or filters</p>
                   </div>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
