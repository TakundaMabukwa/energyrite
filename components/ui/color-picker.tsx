'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Palette, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorPickerProps {
  onColorChange?: (colorCodes: { high: string; medium: string; low: string }) => void;
}



export function ColorPicker({ onColorChange }: ColorPickerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [colorCodes, setColorCodes] = useState({
    high: '#00FF00', // green
    medium: '#FFFF00', // yellow
    low: '#FF0000', // red
  });

  const handleColorSelect = (level: 'high' | 'medium' | 'low', color: string) => {
    setColorCodes(prev => ({
      ...prev,
      [level]: color
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Call the API to update all vehicles' color codes
      const response = await fetch('http://localhost:9000/api/energy-rite-vehicles/color-codes-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          color_codes: {
            fuel: colorCodes
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update colors: ${response.status}`);
      }

      // Notify parent component of color change
      onColorChange?.(colorCodes);

      toast({
        title: 'Colors Updated',
        description: 'Fuel gauge colors have been updated for all vehicles.',
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error updating colors:', error);
      toast({
        title: 'Error',
        description: `Failed to update colors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Low (0-33%)';
      case 'medium': return 'Medium (33-66%)';
      case 'high': return 'High (66-100%)';
      default: return '';
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Palette className="w-4 h-4" />
        Colors
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Fuel Gauge Colors</DialogTitle>
            <DialogDescription className="text-sm">
              Customize colors for fuel level ranges.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            {Object.entries(colorCodes).map(([level, currentColor]) => (
              <div key={level} className="flex items-center justify-between">
                <label className="text-sm font-medium min-w-[100px]">
                  {getLevelLabel(level)}
                </label>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => handleColorSelect(level as 'high' | 'medium' | 'low', e.target.value)}
                  className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsOpen(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} size="sm">
              <Save className="w-4 h-4 mr-1" />
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}