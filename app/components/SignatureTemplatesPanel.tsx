'use client';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { EquipmentSource } from '@/interfaces/bacnet';

const fetchEquipmentByType = async (): Promise<Record<string, EquipmentSource[]>> => {
  const res = await fetch('/api/equipment?groupByType=true');
  if (!res.ok) throw new Error('Failed to fetch equipment');
  return res.json();
};

export function SignatureTemplatesPanel() {
  // Check if initialization is complete first
  const { data: initData } = useQuery({
    queryKey: ['init'],
    queryFn: () => fetch('/api/init').then(res => res.json()),
  });

  const { data: equipmentByType, isLoading, error } = useQuery({
    queryKey: ['equipment-by-type'],
    queryFn: fetchEquipmentByType,
    enabled: !!initData, // Only fetch equipment after initialization is complete
  });
  
  const { 
    selectedEquipmentId, 
    setSelectedEquipmentId, 
    expandedEquipmentTypes, 
    toggleExpandedEquipmentType 
  } = useAppStore();

  if (isLoading) return <div className="panel"><div className="panel-title">Equipment Types</div><div>Loading...</div></div>;
  if (error) return <div className="panel"><div className="panel-title">Equipment Types</div><div>Error loading equipment.</div></div>;

  const sortedTypes = Object.keys(equipmentByType || {}).sort();

  return (
    <div className="panel">
      <h3 className="panel-title">Equipment Types</h3>
      <div className="panel-content">
        {sortedTypes.map((equipmentType) => {
          const equipment = equipmentByType![equipmentType];
          const isExpanded = expandedEquipmentTypes.has(equipmentType);
          
          return (
            <div key={equipmentType} className="mb-2">
              <div
                onClick={() => toggleExpandedEquipmentType(equipmentType)}
                className="item-card cursor-pointer hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="item-card-title">{equipmentType}</div>
                    <div className="item-card-subtitle">
                      {equipment.length} equipment unit{equipment.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="ml-4 mt-2 space-y-1">
                  {equipment.map((equip) => (
                    <div
                      key={equip.id}
                      onClick={() => setSelectedEquipmentId(equip.id)}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedEquipmentId === equip.id 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{equip.id}</div>
                          <div className="text-xs text-gray-600">
                            {equip.vendorName || 'Unknown Vendor'} • {equip.points.length} points
                          </div>
                        </div>
                        {selectedEquipmentId === equip.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}