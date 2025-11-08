'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NotebookPen, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | number;
  vehicleLocation: string;
  currentNote?: string;
  onNoteAdded: (note: string) => void;
}

export function AddNoteModal({ 
  isOpen, 
  onClose, 
  vehicleId, 
  vehicleLocation, 
  currentNote = '', 
  onNoteAdded 
}: AddNoteModalProps) {
  const [note, setNote] = useState(currentNote);
  const [isSaving, setIsSaving] = useState(false);
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
      
      // Update the vehicle note via API
      const response = await fetch(`http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: note.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save note: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Note saved successfully:', responseData);

      // Call the callback to update parent component
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

  const handleClose = () => {
    if (!isSaving) {
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
            <Label htmlFor="note" className="font-medium text-sm">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note about this fuel gauge..."
              rows={4}
              className="min-h-[100px] resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500">
              Add maintenance notes, observations, or any relevant information about this fuel gauge.
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !note.trim()}
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