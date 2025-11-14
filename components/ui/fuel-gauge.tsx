'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, Droplets, Gauge, Clock, NotebookPen, Fuel } from 'lucide-react';
import { formatForDisplay } from '@/lib/utils/date-formatter';
import { AddNoteModal } from '@/components/ui/add-note-modal';
import { useUser } from '@/contexts/UserContext';

interface FuelGaugeProps {
  location: string;
  fuelLevel: number;
  temperature: number;
  volume: number;
  remaining: string;
  status: string;
  lastUpdated: string;
  updated_at?: string;
  anomalyNote?: string;
  clientNote?: string;
  anomaly?: boolean;
  lastFuelFill?: {
    time: string;
    amount: number;
    previousLevel: number;
  };
  className?: string;
  colorCodes?: {
    high?: string;
    medium?: string;
    low?: string;
  };
  id?: string | number;
  vehicleData?: any; // Add vehicle data for API calls
  onNoteUpdate?: (vehicleId: string | number, note: string) => void;
}

export function FuelGauge({
  location,
  fuelLevel,
  temperature,
  volume,
  remaining,
  status,
  lastUpdated,
  updated_at,
  anomalyNote,
  clientNote,
  anomaly,
  lastFuelFill,
  className,
  colorCodes,
  id,
  vehicleData,
  onNoteUpdate
}: FuelGaugeProps) {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState(anomalyNote || '');
  const [currentClientNote, setCurrentClientNote] = useState(clientNote || '');
  const { user } = useUser();
  
  // Check if user email contains @soltrack.co.za
  const canViewNotes = user?.email?.includes('@soltrack.co.za') || false;
  
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (fuelLevel / 100) * circumference;

  const getStatusColor = (status: string) => {
    if (status.includes('PTO ON') || status.includes('ENGINE ON')) return 'bg-green-100 text-green-700 border-green-200';
    if (status.includes('PTO OFF') || status.includes('ENGINE OFF')) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status.includes('Possible Fuel Fill')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getFuelColor = (level: number) => {
    if (!colorCodes) {
      // Default fuel gauge colors
      if (level <= 40) return '#ef4444'; // red
      if (level <= 60) return '#eab308'; // yellow
      return '#22c55e'; // green
    }
    
    const colors = {
      low: colorCodes.low || '#FF0000',
      medium: colorCodes.medium || '#FFFF00',
      high: colorCodes.high || '#00FF00',
    };
    
    if (level <= 40) return colors.low;
    if (level <= 60) return colors.medium;
    return colors.high;
  };

  const handleNoteAdded = (note: string) => {
    setCurrentClientNote(note);
    if (onNoteUpdate && id) {
      onNoteUpdate(id, note);
    }
  };

  return (
    <div className={cn(
      "shadow-sm hover:shadow-md p-3 border rounded-lg transition-all duration-300 relative overflow-visible",
      status.includes('PTO ON') || status.includes('ENGINE ON') 
        ? "bg-green-200 border-green-400" 
        : "bg-white border-gray-300",
      className
    )}>
      {/* Header */}
      <div className="mb-1 text-center">
        <h3 className="mb-1 font-semibold text-gray-900 text-base">{location}</h3>
        {canViewNotes && currentNote && (
          <div className={cn(
            "mb-2 p-2 rounded-lg border",
            anomaly 
              ? "bg-red-50 border-red-200" 
              : "bg-blue-50 border-blue-200"
          )}>
            <div className={cn(
              "flex items-start gap-1",
              anomaly ? "text-red-800" : "text-blue-800"
            )}>
              <NotebookPen className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className={cn(
                "text-xs text-left break-words",
                anomaly ? "text-red-700" : "text-blue-700"
              )}>{currentNote}</span>
            </div>
          </div>
        )}
        {/* Client Notes - Always visible to everyone */}
        {currentClientNote && (
          <div className="mb-2 p-2 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-start gap-1 text-green-800">
              <NotebookPen className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-left break-words text-green-700">{currentClientNote}</span>
            </div>
          </div>
        )}
        {status && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("font-medium text-xs px-2 py-0.5 cursor-help", getStatusColor(status))}
                >
                  {status}
                </Badge>
              </TooltipTrigger>
              <TooltipContent 
                className="bg-white border border-gray-200 shadow-lg max-w-xs"
                side="bottom"
                align="center"
                sideOffset={5}
              >
                <div className="flex flex-col items-center py-1 px-2">
                  <p className="text-sm text-black font-medium">Last updated</p>
                  <p className="text-xs text-gray-700">{formatForDisplay(updated_at || lastUpdated)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Fuel Gauge */}
      <div className="flex justify-center mb-1">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="-rotate-90 transform"
          >
            {/* Background Circle */}
            <circle
              stroke="#f1f5f9"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress Circle */}
            <circle
              stroke={getFuelColor(fuelLevel)}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <Gauge className="mb-0.5 w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-500 text-sm">Fuel</span>
            <span className="font-bold text-gray-900 text-2xl">{fuelLevel}</span>
            <span className="text-gray-500 text-xs">%</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-1">
        <div className={cn(
          "flex justify-start items-center px-1 py-0.5 rounded-lg",
          status.includes('PTO ON') || status.includes('ENGINE ON') 
            ? "bg-green-300" 
            : "bg-gray-50"
        )}>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            <span className={cn(
              "font-medium text-sm",
              status.includes('PTO ON') || status.includes('ENGINE ON') 
                ? "text-green-900" 
                : "text-gray-700"
            )}>Temp: {temperature}°C</span>
          </div>
        </div>

        <div className={cn(
          "flex justify-start items-center px-1 py-0.5 rounded-lg",
          status.includes('PTO ON') || status.includes('ENGINE ON') 
            ? "bg-green-300" 
            : "bg-gray-50"
        )}>
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-orange-500" />
            <span className={cn(
              "font-medium text-xs truncate whitespace-nowrap",
              status.includes('PTO ON') || status.includes('ENGINE ON') 
                ? "text-green-900" 
                : "text-gray-700"
            )}>Rem: {volume}L/{(volume * (fuelLevel / 100)).toFixed(1)}L</span>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-1 py-0.5 rounded-lg",
          status.includes('PTO ON') || status.includes('ENGINE ON') 
            ? "bg-green-300" 
            : "bg-gray-50"
        )}>
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={cn(
            "text-xs",
            status.includes('PTO ON') || status.includes('ENGINE ON') 
              ? "text-green-800" 
              : "text-gray-600"
          )}>{lastUpdated}</span>
        </div>

        {/* Add Note Button */}
        <div className="mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-8 text-xs font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            onClick={() => setIsNoteModalOpen(true)}
          >
            <NotebookPen className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        </div>

        {/* Last Fuel Fill Information */}
        {lastFuelFill && (
          <div className="bg-green-50 p-2 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-green-900 text-sm">Last Fill</span>
              <span className="font-bold text-green-900 text-sm">{lastFuelFill.amount.toFixed(1)}L</span>
            </div>
            <div className="text-green-700 text-xs">
              {formatForDisplay(lastFuelFill.time)}
            </div>
            <div className="text-green-600 text-xs">
              From {lastFuelFill.previousLevel.toFixed(1)}% to {fuelLevel.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        vehicleId={id || 'unknown'}
        vehicleLocation={location}
        currentNote={currentClientNote}
        vehicleData={vehicleData}
        onNoteAdded={handleNoteAdded}
      />
    </div>
  );
}