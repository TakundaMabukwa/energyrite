'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface VehicleData {
  plate: string;
  unitIpAddress: string;
  tankSize: string;
  costCentre: string;
}

interface VehicleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: VehicleData) => void;
  vehicleData: VehicleData | null;
}

export function VehicleEditModal({ isOpen, onClose, onUpdate, vehicleData }: VehicleEditModalProps) {
  const [formData, setFormData] = useState<VehicleData>({
    plate: '',
    unitIpAddress: '',
    tankSize: '',
    costCentre: ''
  });

  useEffect(() => {
    if (vehicleData) {
      setFormData(vehicleData);
    }
  }, [vehicleData]);

  const handleInputChange = (field: keyof VehicleData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdate = () => {
    onUpdate(formData);
    onClose();
  };

  const costCentres = [
    'KFC => Gunret => Gunret Pretoria Region 1 - (COST CENTRE)',
    'KFC => Gunret => Gunret Rustenburg West - (COST CENTRE)',
    'KFC => Gunret => Gunret Johannesburg North - (COST CENTRE)',
    'KFC => Gunret => Gunret Cape Town Central - (COST CENTRE)',
    'KFC => Gunret => Gunret Durban South - (COST CENTRE)'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Badge variant="secondary" className="flex justify-center items-center rounded-full w-8 h-8 text-sm">
              1
            </Badge>
            Vehicle Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="gap-6 grid grid-cols-2 py-6">
          <div className="space-y-3">
            <Label htmlFor="plate" className="font-medium text-sm">Plate *</Label>
            <Input
              id="plate"
              value={formData.plate}
              onChange={(e) => handleInputChange('plate', e.target.value)}
              placeholder="Enter plate number"
              className="h-10"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="unitIpAddress" className="font-medium text-sm">Unit Ip Address *</Label>
            <Input
              id="unitIpAddress"
              value={formData.unitIpAddress}
              onChange={(e) => handleInputChange('unitIpAddress', e.target.value)}
              placeholder="Enter IP address"
              className="h-10"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="tankSize" className="font-medium text-sm">Tank Size</Label>
            <Input
              id="tankSize"
              value={formData.tankSize}
              onChange={(e) => handleInputChange('tankSize', e.target.value)}
              placeholder="Enter tank size"
              className="h-10"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="costCentre" className="font-medium text-sm">Cost Centre</Label>
            <Select value={formData.costCentre} onValueChange={(value) => handleInputChange('costCentre', value)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select cost centre" />
              </SelectTrigger>
              <SelectContent>
                {costCentres.map((centre, index) => (
                  <SelectItem key={index} value={centre}>
                    {centre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose} className="px-6 py-2">
            Close
          </Button>
          <Button onClick={handleUpdate} className="px-6 py-2">
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
