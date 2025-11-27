'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock, FileText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatForDisplay } from '@/lib/utils/date-formatter';

interface NoteLog {
  id: string;
  vehicle_id: string;
  user_id: string;
  user_email: string;
  old_note: string | null;
  new_note: string | null;
  action: string;
  created_at: string;
}

interface VehicleNotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | number;
  vehicleLocation: string;
}

export function VehicleNotesHistoryModal({ 
  isOpen, 
  onClose, 
  vehicleId, 
  vehicleLocation 
}: VehicleNotesHistoryModalProps) {
  const [noteLogs, setNoteLogs] = useState<NoteLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVehicleNotesHistory = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('note_logs')
        .select('*')
        .eq('vehicle_id', vehicleId.toString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNoteLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch vehicle notes history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicleNotesHistory();
    }
  }, [isOpen, vehicleId]);

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
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Notes History - {vehicleLocation}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 text-sm">Loading history...</span>
            </div>
          ) : noteLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No notes history for this vehicle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {noteLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="font-medium text-gray-900 text-sm">{log.user_email}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          getNoteType(log.user_email) === 'Internal' 
                            ? 'bg-purple-100 text-purple-800 border-purple-200' 
                            : 'bg-green-100 text-green-800 border-green-200'
                        }`}
                      >
                        {getNoteType(log.user_email)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatForDisplay(log.created_at)}
                      <Badge className={`ml-1 text-xs ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {log.old_note && (
                      <div>
                        <span className="text-xs font-medium text-red-600 uppercase">Previous:</span>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                          {log.old_note}
                        </div>
                      </div>
                    )}
                    
                    {log.new_note && (
                      <div>
                        <span className="text-xs font-medium text-green-600 uppercase">New:</span>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800">
                          {log.new_note}
                        </div>
                      </div>
                    )}
                    
                    {log.action === 'delete' && !log.new_note && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600 italic">
                        Note was deleted
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-3 h-3 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}