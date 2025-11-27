'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock, FileText, X, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatForDisplay } from '@/lib/utils/date-formatter';
import { useApp } from '@/contexts/AppContext';

interface NoteLog {
  id: string;
  vehicle_id: string;
  user_id: string;
  user_email: string;
  old_note: string | null;
  new_note: string | null;
  action: string;
  created_at: string;
  vehicle_info?: {
    branch: string;
    company: string;
    plate: string;
  };
}

interface NotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotesHistoryModal({ isOpen, onClose }: NotesHistoryModalProps) {
  const [noteLogs, setNoteLogs] = useState<NoteLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { vehicles } = useApp();

  const fetchNotesHistory = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('note_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Match vehicle IDs to vehicle info
      const logsWithVehicleInfo = (data || []).map(log => {
        const vehicle = vehicles?.find(v => v.id.toString() === log.vehicle_id);
        return {
          ...log,
          vehicle_info: vehicle ? {
            branch: vehicle.branch || 'Unknown',
            company: vehicle.company || 'Unknown',
            plate: vehicle.plate || 'N/A'
          } : undefined
        };
      });
      
      setNoteLogs(logsWithVehicleInfo);
    } catch (error) {
      console.error('Failed to fetch notes history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotesHistory();
    }
  }, [isOpen]);

  const getNoteType = (userEmail: string) => {
    return userEmail?.includes('@soltrack.co.za') ? 'Internal' : 'Client';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Notes History
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading history...</span>
            </div>
          ) : noteLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No notes history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {noteLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="font-medium text-gray-900">{log.user_email}</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 text-xs ${
                            getNoteType(log.user_email) === 'Internal' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200' 
                              : 'bg-green-100 text-green-800 border-green-200'
                          }`}
                        >
                          {getNoteType(log.user_email)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {formatForDisplay(log.created_at)}
                      <Badge className={`ml-2 ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2 space-y-1">
                    <div>
                      Vehicle ID: <span className="font-mono bg-gray-100 px-1 rounded">{log.vehicle_id}</span>
                    </div>
                    {log.vehicle_info && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{log.vehicle_info.branch}</span>
                        {log.vehicle_info.plate && (
                          <span className="text-gray-500">({log.vehicle_info.plate})</span>
                        )}
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{log.vehicle_info.company}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {log.old_note && (
                      <div>
                        <span className="text-xs font-medium text-red-600 uppercase">Previous Note:</span>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                          {log.old_note}
                        </div>
                      </div>
                    )}
                    
                    {log.new_note && (
                      <div>
                        <span className="text-xs font-medium text-green-600 uppercase">New Note:</span>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                          {log.new_note}
                        </div>
                      </div>
                    )}
                    
                    {log.action === 'delete' && !log.new_note && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-600 italic">
                        Note was deleted
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}