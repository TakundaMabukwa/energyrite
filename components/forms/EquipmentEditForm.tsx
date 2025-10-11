'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';

interface Equipment {
  id?: string | number;
  branch?: string;
  company?: string;
  cost_code?: string;
  ip_address?: string;
  fuel_probe_1_level_percentage?: string | number;
  fuel_probe_1_volume_in_tank?: string | number;
  fuel_probe_1_temperature?: string | number;
  status?: string;
  notes?: string;
  [key: string]: any;
}

interface EquipmentEditFormProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEquipment: Equipment) => Promise<void>;
}

export function EquipmentEditForm({
  equipment,
  isOpen,
  onClose,
  onSave
}: EquipmentEditFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = React.useState<Equipment>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset form data when equipment changes or dialog opens
  React.useEffect(() => {
    if (equipment) {
      setFormData({...equipment});
    }
  }, [equipment, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    try {
      setIsSaving(true);
      await onSave(formData);
      toast({
        title: "Equipment updated",
        description: `Equipment ${formData.branch || formData.id} has been updated successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast({
        title: "Failed to update equipment",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // If no equipment is provided, don't render the form
  if (!equipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Edit Equipment
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Read-only fields */}
            <div className="space-y-2">
              <Label htmlFor="id">ID</Label>
              <Input
                id="id"
                name="id"
                value={formData.id || ''}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                name="branch"
                value={formData.branch || ''}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ''}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost_code">Cost Code</Label>
              <Input
                id="cost_code"
                name="cost_code"
                value={formData.cost_code || ''}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ip_address">IP Address</Label>
              <Input
                id="ip_address"
                name="ip_address"
                value={formData.ip_address || ''}
                readOnly
                disabled
                className="bg-gray-100"
              />
            </div>
            
            {/* Editable fields */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fuel_probe_1_level_percentage">Fuel Level (%)</Label>
              <Input
                id="fuel_probe_1_level_percentage"
                name="fuel_probe_1_level_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.fuel_probe_1_level_percentage || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fuel_probe_1_volume_in_tank">Fuel Volume (L)</Label>
              <Input
                id="fuel_probe_1_volume_in_tank"
                name="fuel_probe_1_volume_in_tank"
                type="number"
                min="0"
                value={formData.fuel_probe_1_volume_in_tank || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fuel_probe_1_temperature">Temperature (°C)</Label>
              <Input
                id="fuel_probe_1_temperature"
                name="fuel_probe_1_temperature"
                type="number"
                value={formData.fuel_probe_1_temperature || ''}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Notes field - full width */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={4}
              placeholder="Add notes about this equipment..."
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}