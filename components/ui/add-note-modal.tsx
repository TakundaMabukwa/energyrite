'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NotebookPen, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      
      // Update the vehicle note via API using the same pattern as equipment updates
      const updatePayload = {
        branch: vehicleData?.branch || vehicleLocation,
        company: vehicleData?.company || '',
        cost_code: vehicleData?.cost_code || null,
        ip_address: vehicleData?.ip_address || null,
        volume: vehicleData?.volume ? parseFloat(vehicleData.volume) : null,
        notes: note.trim() // Use 'notes' like the working equipment pattern
      };

      console.log('🔍 Sending payload:', updatePayload);
      console.log('🔍 Vehicle ID:', vehicleId);
      console.log('🔍 API URL:', `http://${process.env.NEXT_PUBLIC_EQUIPMENT_API_HOST}:${process.env.NEXT_PUBLIC_EQUIPMENT_API_PORT}/api/energy-rite/vehicles/${vehicleId}`);

      const response = await fetch(`http://${process.env.NEXT_PUBLIC_EQUIPMENT_API_HOST}:${process.env.NEXT_PUBLIC_EQUIPMENT_API_PORT}/api/energy-rite/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Error response data:', errorData);
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

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      
      // Remove the note by setting it to empty/null
      const updatePayload = {
        branch: vehicleData?.branch || vehicleLocation,
        company: vehicleData?.company || '',
        cost_code: vehicleData?.cost_code || null,
        ip_address: vehicleData?.ip_address || null,
        volume: vehicleData?.volume ? parseFloat(vehicleData.volume) : null,
        notes: null // Clear the note
      };

      console.log('🗑️ Removing note for vehicle:', vehicleId);

      const response = await fetch(`http://${process.env.NEXT_PUBLIC_EQUIPMENT_API_HOST}:${process.env.NEXT_PUBLIC_EQUIPMENT_API_PORT}/api/energy-rite/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to remove note: ${response.status}`);
      }

      // Call the callback to update parent component
      onNoteAdded(''); // Empty string to clear the note

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