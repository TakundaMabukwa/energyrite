'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NotebookPen, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | number;
  vehicleLocation: string;
  currentNote?: string;
  vehicleData?: any; // Add vehicle data to include required fields
  onNoteAdded: (note: string) => void;
}

export function AddNoteModal({ 
  isOpen, 
  onClose, 
  vehicleId, 
  vehicleLocation, 
  currentNote = '', 
  vehicleData,
  onNoteAdded 
}: AddNoteModalProps) {
  const [note, setNote] = useState(currentNote);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setNote(currentNote || '');
  }, [currentNote, isOpen]);

  const handleSave = async () => {
    if (!note.trim()) {
      toast({
        title: "Note required",
        description: "Please enter a note before saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Save client note directly to Supabase note_logs (not to external API)
      await saveClientNote(vehicleId.toString(), currentNote, note.trim(), 'update');
      
      // Update UI
      onNoteAdded(note.trim());

      toast({
        title: "Note saved",
        description: `Note added for ${vehicleLocation}`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast({
        title: "Error saving note",
        description: error?.message || 'Failed to save note. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      
      // Remove client note from Supabase note_logs
      await saveClientNote(vehicleId.toString(), currentNote, '', 'delete');
      
      // Update UI
      onNoteAdded('');

      toast({
        title: "Note removed",
        description: `Note removed from ${vehicleLocation}`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error removing note:', error);
      toast({
        title: "Error removing note",
        description: error?.message || 'Failed to remove note. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const saveClientNote = async (vehicleId: string, oldNote: string, newNote: string, action: string) => {
    try {
      console.log('🔍 Logging note change:', { vehicleId, oldNote, newNote, action });
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔍 User for logging:', user);
      
      if (user) {
        const isInternal = user.email?.includes('@soltrack.co.za');
        
        const logEntry = {
          vehicle_id: vehicleId,
          user_id: user.id,
          user_email: user.email,
          old_note: oldNote || null,
          new_note: newNote || null,
          action: action,
          note_type: isInternal ? 'internal' : 'external'
        };
        
        console.log('🔍 Inserting log entry:', logEntry);
        
        const { data, error } = await supabase.from('note_logs').insert(logEntry);
        
        if (error) {
          console.error('❌ Supabase insert error:', error);
        } else {
          console.log('✅ Note logged successfully:', data);
        }
      } else {
        console.warn('⚠️ No user found for logging');
      }
    } catch (error) {
      console.error('❌ Failed to log note change:', error);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isRemoving) {
      setNote(currentNote || '');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-[200px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <NotebookPen className="w-5 h-5 text-blue-600" />
            Add Note - {vehicleLocation}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-3">
            <Label htmlFor="note" className="font-medium text-sm">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your client note about this fuel gauge..."
              rows={3}
              className="min-h-[80px] resize-none"
              disabled={isSaving || isRemoving}
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSaving || isRemoving}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          {currentNote && (
            <Button 
              variant="destructive"
              onClick={handleRemove}
              disabled={isSaving || isRemoving}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isRemoving ? 'Removing...' : 'Remove Note'}
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={isSaving || isRemoving || !note.trim()}
            className="flex items-center gap-2"
          >
            <NotebookPen className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}