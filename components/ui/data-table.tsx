'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Download, 
  RefreshCw,
  Eye,
  Settings,
  Building2
} from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onActionClick?: (row: Record<string, unknown>, actionType?: string) => void;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  customActions?: React.ReactNode;
  customRowActions?: (row: Record<string, unknown>) => React.ReactNode;
}

export function DataTable({ 
  columns, 
  data, 
  onActionClick, 
  title = "Data Table",
  subtitle,
  showSearch = true,
  showFilters = true,
  customActions,
  customRowActions
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredData = data.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-gray-200 border-b">
        <div className="flex md:flex-row flex-col justify-between md:items-center gap-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-xl">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-gray-600 text-sm">{subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                <span className="bg-green-500 mr-2 rounded-full w-2 h-2"></span>
                {data.length} cost centers loaded from database
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {customActions}
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 w-4 h-4" />
              Today
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="flex md:flex-row flex-col gap-4 mt-4">
            {showSearch && (
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
            )}
            

          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1e3a5f] text-white">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={cn(
                    "px-6 py-4 font-medium text-sm text-left",
                    column.sortable && "cursor-pointer hover:bg-[#2a4a6b] transition-colors"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={cn(
                            "-mb-1 w-3 h-3",
                            sortColumn === column.key && sortDirection === 'asc' 
                              ? "text-white" 
                              : "text-white/50"
                          )} 
                        />
                        <ChevronDown 
                          className={cn(
                            "w-3 h-3",
                            sortColumn === column.key && sortDirection === 'desc' 
                              ? "text-white" 
                              : "text-white/50"
                          )} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 font-medium text-sm text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-gray-900 text-sm">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                <td className="px-6 py-4">
                  {customRowActions ? (
                    customRowActions(row)
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onActionClick?.(row, 'view')}
                      className="hover:bg-green-50 text-green-600 hover:text-green-800"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-gray-200 border-t text-gray-600 text-sm">
        <div className="flex justify-between items-center">
          <span>Showing {sortedData.length} of {data.length} cost centers</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}