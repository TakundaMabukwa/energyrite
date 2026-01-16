'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, User, Clock, FileText, X, Trash2 } from 'lucide-react';
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
  note_type?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const fetchVehicleNotesHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase().trim() || '';
      const internal = email.includes('@soltrack.co.za');
      setUserEmail(email);
      setIsInternal(internal);
      
      let query = supabase
        .from('note_logs')
        .select('id,vehicle_id,user_email,new_note,created_at,note_type')
        .eq('vehicle_id', vehicleId.toString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!internal) {
        query = query.eq('note_type', 'external');
      }
      
      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Query error:', queryError);
        setError(queryError.message);
        setNoteLogs([]);
      } else {
        setNoteLogs(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch vehicle notes history:', err);
      setError('Failed to load notes');
      setNoteLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string, noteLog: NoteLog) => {
    if (!confirm('Are you sure you want to delete this note? This will remove it from history and clear the current note if this is the latest one.')) return;
    
    try {
      const supabase = createClient();
      
      // Delete the note log entry
      const { error: deleteError } = await supabase
        .from('note_logs')
        .delete()
        .eq('id', noteId);
      
      if (deleteError) throw deleteError;
      
      // If this was the latest note, add a deletion log entry
      const isLatestNote = noteLogs[0]?.id === noteId;
      if (isLatestNote && noteLog.new_note) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('note_logs').insert({
            vehicle_id: vehicleId.toString(),
            user_id: user.id,
            user_email: user.email,
            old_note: noteLog.new_note,
            new_note: null,
            action: 'delete',
            note_type: noteLog.note_type || 'external'
          });
        }
      }
      
      // Refresh the notes list
      await fetchVehicleNotesHistory();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicleNotesHistory();
    }
  }, [isOpen, vehicleId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
        <DialogHeader className="pb-3 border-b border-gray-200">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-base">Notes History - {vehicleLocation}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[550px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-gray-600 text-sm">Loading history...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <X className="mx-auto mb-4 w-12 h-12 text-red-400" />
                <p className="text-red-500 text-lg">Error loading notes</p>
                <p className="text-gray-400 text-sm mt-2">{error}</p>
              </div>
            </div>
          ) : noteLogs.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <p className="text-gray-500 text-lg">No notes history</p>
                <p className="text-gray-400 text-sm mt-2">This vehicle has no recorded notes</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-4 py-2.5 font-medium text-xs text-left uppercase tracking-wide">User</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-left uppercase tracking-wide">Note</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-left uppercase tracking-wide">Date</th>
                    {isInternal && <th className="px-4 py-2.5 font-medium text-xs text-center uppercase tracking-wide">Action</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {noteLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs align-top">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900 font-medium">{log.user_email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs align-top">
                        {log.new_note ? (
                          <p className="text-gray-800 leading-relaxed break-words">{log.new_note}</p>
                        ) : (
                          <span className="text-red-600 italic flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Note deleted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>{formatForDisplay(log.created_at)}</span>
                        </div>
                      </td>
                      {isInternal && (
                        <td className="px-4 py-3 text-xs align-top text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteNote(log.id, log)}
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-3 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
