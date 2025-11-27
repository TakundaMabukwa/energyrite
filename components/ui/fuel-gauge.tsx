'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, Droplets, Gauge, Clock, NotebookPen, Fuel } from 'lucide-react';
import { formatForDisplay } from '@/lib/utils/date-formatter';
import { AddNoteModal } from '@/components/ui/add-note-modal';
import { VehicleNotesHistoryModal } from '@/components/ui/vehicle-notes-history-modal';
import { useUser } from '@/contexts/UserContext';
import { createClient } from '@/lib/supabase/client';

interface FuelGaugeProps {
  location: string;
  fuelLevel: number;
  temperature: number;
  volume: number;
  currentVolume: number;
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
  vehicleData?: any;
  onNoteUpdate?: (vehicleId: string | number, note: string) => void;
}

export function FuelGauge({
  location,
  fuelLevel,
  temperature,
  volume,
  currentVolume,
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState(anomalyNote || '');
  const [currentClientNote, setCurrentClientNote] = useState('');
  const { user } = useUser();
  
  const canViewNotes = user?.email?.includes('@soltrack.co.za') || false;
  
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (fuelLevel / 100) * circumference;

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status.includes('PTO ON') || status.includes('ENGINE ON')) return 'bg-green-100 text-green-700 border-green-200';
    if (status.includes('PTO OFF') || status.includes('ENGINE OFF')) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status.includes('Possible Fuel Fill')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getFuelColor = (level: number) => {
    if (!colorCodes) {
      if (level <= 40) return '#ef4444';
      if (level <= 60) return '#eab308';
      return '#22c55e';
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

  const fetchLatestClientNote = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('note_logs')
        .select('new_note')
        .eq('vehicle_id', id?.toString())
        .eq('note_type', 'external')
        .not('new_note', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setCurrentClientNote(data.new_note || '');
      }
    } catch (error) {
      console.error('Failed to fetch latest client note:', error);
    }
  };

  const handleNoteAdded = (note: string) => {
    setCurrentClientNote(note);
    if (onNoteUpdate && id) {
      onNoteUpdate(id, note);
    }
  };

  // Fetch latest client note on component mount
  useEffect(() => {
    if (id) {
      fetchLatestClientNote();
    }
  }, [id]);

  const isEngineOn = status && (status.includes('PTO ON') || status.includes('ENGINE ON'));

  return (
    <div className={cn(
      "shadow-sm hover:shadow-md p-3 border rounded-lg transition-all duration-300 relative overflow-visible flex flex-col",
      isEngineOn ? "bg-green-200 border-green-400" : "bg-white border-gray-300",
      className
    )} style={{ minHeight: '420px' }}>
      {/* History Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 w-6 h-6 p-0 hover:bg-gray-100"
        onClick={() => setIsHistoryModalOpen(true)}
        title="View Notes History"
      >
        <Clock className="w-3 h-3 text-gray-500" />
      </Button>
      <div className="mb-1 text-center">
        <h3 className="mb-1 font-semibold text-gray-900 text-base">{location}</h3>
        {canViewNotes && currentNote && (
          <div className={cn(
            "mb-1 p-1.5 rounded border",
            anomaly ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
          )}>
            <div className={cn(
              "flex items-start gap-1",
              anomaly ? "text-red-800" : "text-blue-800"
            )}>
              <NotebookPen className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
              <span className={cn(
                "text-xs text-left break-words line-clamp-1 leading-tight",
                anomaly ? "text-red-700" : "text-blue-700"
              )}>{currentNote}</span>
            </div>
          </div>
        )}
        <div className="mb-1 p-1.5 rounded border bg-green-50 border-green-200">
          <div className="flex items-start gap-1 text-green-800">
            <NotebookPen className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-left break-words text-green-700 line-clamp-1 leading-tight">
              {currentClientNote || '-'}
            </span>
          </div>
        </div>
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

      <div className="flex justify-center mb-1">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="-rotate-90 transform"
          >
            <circle
              stroke="#f1f5f9"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
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
          
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <Gauge className="mb-0.5 w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-500 text-sm">Fuel</span>
            <span className="font-bold text-gray-900 text-2xl">{fuelLevel}</span>
            <span className="text-gray-500 text-xs">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className={cn(
          "flex justify-start items-center px-1 py-0.5 rounded-lg",
          isEngineOn ? "bg-green-300" : "bg-gray-50"
        )}>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-xs text-gray-900">Temp: {temperature}°C</span>
          </div>
        </div>

        <div className={cn(
          "flex justify-start items-center px-1 py-0.5 rounded-lg",
          isEngineOn ? "bg-green-300" : "bg-gray-50"
        )}>
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-xs text-gray-900 truncate whitespace-nowrap">Rem: {currentVolume ? currentVolume.toFixed(1) : 'N/A'}L from {volume ? volume.toFixed(1) : 'N/A'}L</span>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-1 py-0.5 rounded-lg",
          isEngineOn ? "bg-green-300" : "bg-gray-50"
        )}>
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-900">Comm: {lastUpdated}</span>
        </div>

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

      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        vehicleId={id || 'unknown'}
        vehicleLocation={location}
        currentNote={currentClientNote}
        vehicleData={vehicleData}
        onNoteAdded={handleNoteAdded}
      />
      
      <VehicleNotesHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        vehicleId={id || 'unknown'}
        vehicleLocation={location}
      />
    </div>
  );
}