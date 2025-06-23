'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { CxAlloyEquipment, EquipmentFilter } from '@/interfaces/bacnet';

const fetchUnmappedCxAlloy = async (): Promise<CxAlloyEquipment[]> => {
  const res = await fetch('/api/cxalloy/unmapped');
  if (!res.ok) throw new Error('Failed to fetch CxAlloy data');
  return res.json();
};

const createMapping = async (variables: { skySparkEquipmentId: string, cxAlloyEquipmentId: string }) => {
  const res = await fetch('/api/mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variables),
  });
  if (!res.ok) throw new Error('Failed to create mapping');
  return res.json();
};

// Filter pill component
interface FilterPillProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  variant: 'all' | 'mapped' | 'unmapped';
}

const FilterPill: React.FC<FilterPillProps> = ({ label, count, isActive, onClick, variant }) => {
  const baseClasses = "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer";
  
  const variantClasses = {
    all: isActive 
      ? "bg-blue-100 text-blue-800 border-2 border-blue-300" 
      : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200",
    mapped: isActive 
      ? "bg-green-100 text-green-800 border-2 border-green-300" 
      : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-green-50",
    unmapped: isActive 
      ? "bg-red-100 text-red-800 border-2 border-red-300" 
      : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-red-50"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <span>{label}</span>
      <span className="ml-2 px-1.5 py-0.5 bg-white bg-opacity-70 rounded-full text-xs font-semibold">
        {count}
      </span>
    </button>
  );
};

// Status indicator component
interface StatusIndicatorProps {
  status: 'mapped' | 'unmapped' | 'auto-assigned';
  confidence?: number;
  mappedTo?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, confidence, mappedTo }) => {
  const indicators = {
    mapped: {
      icon: "✓",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200"
    },
    unmapped: {
      icon: "○",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      borderColor: "border-red-200"
    },
    'auto-assigned': {
      icon: "⚡",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      borderColor: "border-blue-200"
    }
  };

  const indicator = indicators[status];

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-md border ${indicator.bgColor} ${indicator.textColor} ${indicator.borderColor}`}>
      <span className="mr-1 text-xs">{indicator.icon}</span>
      <span className="text-xs font-medium">
        {status === 'mapped' && 'Mapped'}
        {status === 'unmapped' && 'Unmapped'}
        {status === 'auto-assigned' && `Auto (${confidence}%)`}
      </span>
      {mappedTo && (
        <span className="ml-1 text-xs opacity-75">→ {mappedTo}</span>
      )}
    </div>
  );
};

export function CxAlloyMappingPanel() {
  const queryClient = useQueryClient();
  const { selectedEquipmentId, equipmentFilter, setEquipmentFilter } = useAppStore();
  
  // Local state to track mapped equipment for demonstration
  const [mappedEquipment, setMappedEquipment] = useState<Record<string, string>>({});
  
  // Simulate some auto-assigned equipment with confidence scores
  const [autoAssignedEquipment] = useState<Record<string, number>>({
    'cx-ahu-1': 95,
    'cx-vav-2': 87,
  });

  const { data: cxAlloyEquips, isLoading, error } = useQuery({
    queryKey: ['unmappedCxAlloy'],
    queryFn: fetchUnmappedCxAlloy,
  });

  const mappingMutation = useMutation({
    mutationFn: createMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmappedCxAlloy'] });
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  // Process equipment data with status information
  const processedEquipment = useMemo(() => {
    if (!cxAlloyEquips) return [];
    
    return cxAlloyEquips.map(equipment => ({
      ...equipment,
      isMapped: !!mappedEquipment[equipment.id],
      isAutoAssigned: !!autoAssignedEquipment[equipment.id],
      confidence: autoAssignedEquipment[equipment.id],
      mappedTo: mappedEquipment[equipment.id],
      status: mappedEquipment[equipment.id] 
        ? (autoAssignedEquipment[equipment.id] ? 'auto-assigned' : 'mapped')
        : 'unmapped'
    }));
  }, [cxAlloyEquips, mappedEquipment, autoAssignedEquipment]);

  // Filter equipment based on current filter state
  const filteredEquipment = useMemo(() => {
    if (!processedEquipment) return [];
    
    switch (equipmentFilter.status) {
      case 'mapped':
        return processedEquipment.filter(eq => eq.isMapped);
      case 'unmapped':
        return processedEquipment.filter(eq => !eq.isMapped);
      default:
        return processedEquipment;
    }
  }, [processedEquipment, equipmentFilter.status]);

  // Calculate counts for filter pills
  const counts = useMemo(() => {
    if (!processedEquipment) return { all: 0, mapped: 0, unmapped: 0 };
    
    return {
      all: processedEquipment.length,
      mapped: processedEquipment.filter(eq => eq.isMapped).length,
      unmapped: processedEquipment.filter(eq => !eq.isMapped).length,
    };
  }, [processedEquipment]);

  const handleMap = (cxAlloyId: string) => {
    if (!selectedEquipmentId) {
      alert('Please select equipment from Panel 2 first.');
      return;
    }
    
    // For demonstration: update local state to show mapping
    setMappedEquipment(prev => ({
      ...prev,
      [cxAlloyId]: selectedEquipmentId
    }));
    
    // Optional: Also call the actual API for real functionality
    // mappingMutation.mutate({
    //   skySparkEquipmentId: selectedEquipmentId,
    //   cxAlloyEquipmentId: cxAlloyId,
    // });
  };

  const handleUnmap = (cxAlloyId: string) => {
    setMappedEquipment(prev => {
      const updated = { ...prev };
      delete updated[cxAlloyId];
      return updated;
    });
  };

  const handleFilterChange = (status: EquipmentFilter['status']) => {
    setEquipmentFilter({ status });
  };

  return (
    <div className="panel">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="panel-title mb-0">CxAlloy Equipment</h3>
          <div className="text-sm text-gray-500">
            {filteredEquipment.length} of {counts.all} items
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
          <FilterPill
            label="All"
            count={counts.all}
            isActive={equipmentFilter.status === 'all'}
            onClick={() => handleFilterChange('all')}
            variant="all"
          />
          <FilterPill
            label="Mapped"
            count={counts.mapped}
            isActive={equipmentFilter.status === 'mapped'}
            onClick={() => handleFilterChange('mapped')}
            variant="mapped"
          />
          <FilterPill
            label="Unmapped"
            count={counts.unmapped}
            isActive={equipmentFilter.status === 'unmapped'}
            onClick={() => handleFilterChange('unmapped')}
            variant="unmapped"
          />
        </div>

        {/* Equipment Selection Helper */}
        {!selectedEquipmentId && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
            <div className="flex items-center">
              <span className="mr-2">💡</span>
              <span>Select equipment from Panel 2 to enable mapping</span>
            </div>
          </div>
        )}
      </div>

      {/* Equipment List */}
      <div className="panel-content mt-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading CxAlloy equipment...</div>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            Error loading CxAlloy equipment.
          </div>
        )}
        
        {filteredEquipment.length === 0 && !isLoading && !error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">🔍</div>
              <div>No equipment found for current filter</div>
              <button
                onClick={() => handleFilterChange('all')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Show all equipment
              </button>
            </div>
          </div>
        )}

        {filteredEquipment.map((cx) => {
          const cardClasses = [
            'item-card flex flex-col space-y-3',
            cx.isMapped 
              ? (cx.isAutoAssigned ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300')
              : 'bg-white border-gray-200'
          ].join(' ');

          return (
            <div key={cx.id} className={cardClasses}>
              {/* Equipment Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="item-card-title truncate">{cx.name}</div>
                  <div className="text-xs text-gray-500 mt-1">ID: {cx.id}</div>
                </div>
                
                <div className="flex items-center space-x-2 ml-3">
                  <StatusIndicator
                    status={cx.status as any}
                    confidence={cx.confidence}
                    mappedTo={cx.mappedTo}
                  />
                </div>
              </div>

              {/* Mapping Details */}
              {cx.isMapped && (
                <div className="text-xs bg-white bg-opacity-50 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Mapped to:</span>
                    <span className="font-medium text-gray-800">{cx.mappedTo}</span>
                  </div>
                  {cx.isAutoAssigned && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-medium text-blue-700">{cx.confidence}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                {!cx.isMapped ? (
                  <button
                    onClick={() => handleMap(cx.id)}
                    disabled={!selectedEquipmentId || mappingMutation.isPending}
                    className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md disabled:bg-gray-300 hover:bg-green-600 transition-colors flex items-center"
                  >
                    {mappingMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-1">⟳</span>
                        Mapping...
                      </>
                    ) : (
                      <>
                        <span className="mr-1">+</span>
                        Map
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    {cx.isAutoAssigned && (
                      <button
                        onClick={() => {/* TODO: Implement confidence review */}}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                        title="Review auto-assignment"
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => handleUnmap(cx.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors flex items-center"
                    >
                      <span className="mr-1">×</span>
                      Unmap
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}