'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { CxAlloyEquipment } from '@/interfaces/bacnet';

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

export function CxAlloyMappingPanel() {
  const queryClient = useQueryClient();
  const { selectedEquipmentId } = useAppStore();
  
  // Local state to track mapped equipment for demonstration
  const [mappedEquipment, setMappedEquipment] = useState<Record<string, string>>({});

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

  return (
    <div className="panel">
      <h3 className="panel-title">CxAlloy Equipment</h3>
      <div className="panel-content">
        {!selectedEquipmentId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm">
            Select equipment from Panel 2 to enable mapping
          </div>
        )}
        
        {isLoading && <p>Loading CxAlloy equipment...</p>}
        {error && <p>Error loading CxAlloy equipment.</p>}
        {cxAlloyEquips?.map((cx) => {
          const isMapped = mappedEquipment[cx.id];
          
          return (
            <div 
              key={cx.id} 
              className={`item-card flex flex-col space-y-2 ${
                isMapped 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="item-card-title">{cx.name}</div>
                  {isMapped && (
                    <div className="text-xs text-green-700 mt-1">
                      ✓ Mapped to: <span className="font-medium">{isMapped}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!isMapped ? (
                    <button
                      onClick={() => handleMap(cx.id)}
                      disabled={!selectedEquipmentId || mappingMutation.isPending}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded-md disabled:bg-gray-300 hover:bg-green-600 transition"
                    >
                      {mappingMutation.isPending ? 'Mapping...' : 'Map'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnmap(cx.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition"
                    >
                      Unmap
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}