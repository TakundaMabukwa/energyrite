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
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface ColorPickerProps {
  onColorChange?: (colorCodes: { high: string; medium: string; low: string }) => void;
}



export function ColorPicker({ onColorChange }: ColorPickerProps) {
  const { toast } = useToast();
  const { user } = useUser();
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
    setLoading(true);
    
    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      console.log('Auth user:', authUser?.id, 'Error:', authError);
      
      if (!authUser) {
        toast({
          title: 'Error',
          description: 'You must be logged in to save color settings.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('Saving colors:', colorCodes);
      
      const { data, error } = await supabase
        .from('fuel_gauge_settings')
        .upsert({
          user_id: authUser.id,
          color_high: colorCodes.high,
          color_medium: colorCodes.medium,
          color_low: colorCodes.low,
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('Upsert result:', { data, error });

      if (error) throw error;

      onColorChange?.(colorCodes);

      toast({
        title: 'Colors Saved',
        description: 'Your fuel gauge color preferences have been saved.',
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to save color settings:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save color settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Low (0-40%)';
      case 'medium': return 'Medium (41-60%)';
      case 'high': return 'High (61-100%)';
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