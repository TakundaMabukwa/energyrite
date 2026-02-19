'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NotebookPen, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | number;
  vehicleLocation: string;
  currentNote?: string;
  vehicleData?: any;
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
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    setNote(currentNote || '');
  }, [currentNote, isOpen]);

  const handleSave = async () => {
    if (!note.trim()) {
      toast({
        title: 'Note required',
        description: 'Please enter a note before saving.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const nextNote = note.trim();

      // Optimistic UI update: apply immediately.
      onNoteAdded(nextNote);

      toast({
        title: 'Note saved',
        description: `Note added for ${vehicleLocation}`,
      });

      onClose();

      // Persist in background so modal does not block on network latency.
      void saveClientNote(vehicleId.toString(), currentNote, nextNote, 'update').catch((error: any) => {
        console.error('Error saving note:', error);
        toast({
          title: 'Background save failed',
          description: 'The note was updated on screen but failed to persist. Please retry.',
          variant: 'destructive'
        });
      });
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error saving note',
        description: error?.message || 'Failed to save note. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);

      // Optimistic UI update: clear immediately.
      onNoteAdded('');

      toast({
        title: 'Note removed',
        description: `Note removed from ${vehicleLocation}`,
      });

      onClose();

      // Persist in background so modal does not block on network latency.
      void saveClientNote(vehicleId.toString(), currentNote, '', 'delete').catch((error: any) => {
        console.error('Error removing note:', error);
        toast({
          title: 'Background remove failed',
          description: 'The note was cleared on screen but failed to persist. Please retry.',
          variant: 'destructive'
        });
      });
    } catch (error: any) {
      console.error('Error removing note:', error);
      toast({
        title: 'Error removing note',
        description: error?.message || 'Failed to remove note. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const saveClientNote = async (vehicleId: string, oldNote: string, newNote: string, action: string) => {
    if (!user || !user.email) {
      throw new Error('No authenticated user for note logging');
    }

    const logEntry = {
      vehicle_id: vehicleId,
      user_id: user.id,
      user_email: user.email,
      old_note: oldNote || null,
      new_note: newNote || null,
      action,
      note_type: 'external'
    };

    const { error } = await supabase.from('note_logs').insert(logEntry);
    if (error) throw error;
  };

  const handleClose = () => {
    if (!isSaving && !isRemoving) {
      setNote(currentNote || '');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <NotebookPen className="w-5 h-5 text-blue-600" />
            Add Note - {vehicleLocation}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <Label htmlFor="note" className="text-sm font-medium">Note</Label>
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
