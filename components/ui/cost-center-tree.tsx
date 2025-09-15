'use client';

import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';

interface CostCenterTreeProps {
  costCenters: HierarchicalCostCenter[];
  onCostCenterSelect?: (costCenter: HierarchicalCostCenter) => void;
  selectedCostCenter?: HierarchicalCostCenter | null;
  className?: string;
}

interface FlowchartNodeProps {
  node: HierarchicalCostCenter;
  level: number;
  onCostCenterSelect?: (costCenter: HierarchicalCostCenter) => void;
  selectedCostCenter?: HierarchicalCostCenter | null;
  isExpanded?: boolean;
  onToggle?: (nodeId: string) => void;
  expandedNodes?: Set<string>;
}

function FlowchartNode({ 
  node, 
  level, 
  onCostCenterSelect, 
  selectedCostCenter, 
  isExpanded = true, 
  onToggle,
  expandedNodes = new Set()
}: FlowchartNodeProps) {
  const isSelected = selectedCostCenter?.id === node.id;

  const handleSelect = () => {
    if (onCostCenterSelect) {
      onCostCenterSelect(node);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(node.id);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Box */}
      <div
        className={cn(
          "relative bg-blue-50 px-4 py-3 border-2 border-blue-200 rounded-lg min-w-[200px] max-w-[250px] transition-all duration-200 cursor-pointer",
          "hover:bg-blue-100 hover:border-blue-300",
          isSelected && "bg-blue-200 border-blue-400 shadow-md",
          level === 0 && "bg-blue-100 border-blue-300 font-semibold"
        )}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        {node.hasChildren && (
          <button
            onClick={handleToggle}
            className="-top-2 -right-2 absolute flex justify-center items-center bg-white hover:bg-gray-50 shadow-sm border border-gray-300 rounded-full w-6 h-6"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-600" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-600" />
            )}
          </button>
        )}

        {/* Node Content */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Building2 className={cn(
              "w-4 h-4",
              level === 0 ? "text-blue-600" : "text-gray-600",
              isSelected && "text-blue-600"
            )} />
            <span className={cn(
              "font-medium text-sm",
              level === 0 ? "text-blue-800" : "text-gray-800",
              isSelected && "text-blue-800"
            )}>
              {node.name}
            </span>
          </div>
          {node.costCode && (
            <div className="font-mono text-gray-600 text-xs">
              {node.costCode}
            </div>
          )}
        </div>
      </div>

      {/* Children Container */}
      {node.hasChildren && isExpanded && node.children && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {node.children.map((child, index) => (
            <div key={child.id} className="flex flex-col items-center">
              {/* Connection Line */}
              <div className="bg-gray-300 mb-2 w-px h-4"></div>
              
              {/* Child Node */}
              <FlowchartNode
                node={child}
                level={level + 1}
                onCostCenterSelect={onCostCenterSelect}
                selectedCostCenter={selectedCostCenter}
                isExpanded={expandedNodes.has(child.id)}
                onToggle={onToggle}
                expandedNodes={expandedNodes}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CostCenterTree({ 
  costCenters, 
  onCostCenterSelect, 
  selectedCostCenter,
  className = '' 
}: CostCenterTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Auto-expand ALL nodes to show full hierarchy
  React.useEffect(() => {
    const allNodeIds = costCenters.map(cc => cc.id);
    setExpandedNodes(new Set(allNodeIds));
  }, [costCenters]);

  const handleToggle = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Group cost centers by level for better display
  const rootNodes = costCenters.filter(cc => cc.level === 1);

  // Debug logging
  React.useEffect(() => {
    console.log('🌳 CostCenterTree - All cost centers:', costCenters);
    console.log('🌳 CostCenterTree - Root nodes (level 1):', rootNodes);
    rootNodes.forEach(root => {
      console.log(`🌳 Root: ${root.name} (${root.costCode}) - Children:`, root.children);
    });
  }, [costCenters, rootNodes]);

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <div className="flex flex-wrap justify-center gap-8 p-8">
        {rootNodes.map((rootNode) => (
          <FlowchartNode
            key={rootNode.id}
            node={rootNode}
            level={0}
            onCostCenterSelect={onCostCenterSelect}
            selectedCostCenter={selectedCostCenter}
            isExpanded={expandedNodes.has(rootNode.id)}
            onToggle={() => handleToggle(rootNode.id)}
            expandedNodes={expandedNodes}
          />
        ))}
      </div>
    </div>
  );
}
