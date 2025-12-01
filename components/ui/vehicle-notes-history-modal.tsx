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
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email?.toLowerCase().trim() || '';
      const isInternal = userEmail.includes('@soltrack.co.za');
      
      console.log('🔍 Vehicle notes history user check:', { userEmail, isInternal });
      
      let query = supabase
        .from('note_logs')
        .select('*')
        .eq('vehicle_id', vehicleId.toString())
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Filter out internal notes for non-Soltrack users
      if (!isInternal) {
        query = query.eq('note_type', 'external');
      }
      
      const { data, error } = await query;

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
    const email = userEmail?.toLowerCase().trim() || '';
    return email.includes('@soltrack.co.za') ? 'Internal' : 'Client';
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
      <DialogContent className="max-w-lg max-h-[60vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Notes History - {vehicleLocation}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[300px] overflow-y-auto pr-2">
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
            <div className="space-y-2">
              {noteLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex-shrink-0 ${
                          getNoteType(log.user_email) === 'Internal' 
                            ? 'bg-purple-100 text-purple-700 border-purple-300' 
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        {getNoteType(log.user_email)}
                      </Badge>
                      <span className="text-xs text-gray-600">{log.user_email}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{formatForDisplay(log.created_at)}</span>
                    </div>
                  </div>
                  
                  <div>
                    {log.new_note ? (
                      <p className="text-sm text-gray-900 leading-relaxed break-words">{log.new_note}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Note deleted</p>
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