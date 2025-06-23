'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { EquipmentSource, EquipmentSignature } from '@/interfaces/bacnet';
import { useState, useEffect } from 'react';

const fetchEquipmentById = async (equipmentId: string): Promise<EquipmentSource> => {
  const res = await fetch(`/api/equipment/${equipmentId}`);
  if (!res.ok) throw new Error('Failed to fetch equipment');
  return res.json();
};

const fetchSignatures = async (): Promise<EquipmentSignature[]> => {
  const res = await fetch('/api/signatures');
  if (!res.ok) throw new Error('Failed to fetch signatures');
  return res.json();
};

export function EquipmentReviewPanel() {
  const { 
    selectedEquipmentId, 
    expandedEquipmentId, 
    setExpandedEquipmentId,
    openEditModal 
  } = useAppStore();
  
  const [selectedSignatureId, setSelectedSignatureId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ['equipment-detail', selectedEquipmentId],
    queryFn: () => fetchEquipmentById(selectedEquipmentId!),
    enabled: !!selectedEquipmentId,
  });

  const { data: signatures } = useQuery({
    queryKey: ['signatures'],
    queryFn: fetchSignatures,
  });

  // Find the currently applied signature for this equipment
  const appliedSignature = signatures?.find(sig => 
    sig.matchingEquipmentIds.includes(equipment?.id || '')
  );

  // Update selectedSignatureId when equipment changes or signatures load
  useEffect(() => {
    if (appliedSignature) {
      setSelectedSignatureId(appliedSignature.id);
    } else {
      setSelectedSignatureId('');
    }
  }, [appliedSignature, equipment?.id]);

  const handleApplySignature = async () => {
    if (!equipment) return;
    
    try {
      if (selectedSignatureId === '') {
        // Remove signature from equipment
        if (appliedSignature) {
          const updatedMatchingIds = appliedSignature.matchingEquipmentIds.filter(id => id !== equipment.id);
          
          const res = await fetch('/api/signatures', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: appliedSignature.id,
              matchingEquipmentIds: updatedMatchingIds
            })
          });
          
          if (res.ok) {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            console.log('Signature removed successfully');
          }
        }
      } else {
        // Apply new signature
        const signature = signatures?.find(s => s.id === selectedSignatureId);
        if (signature) {
          // First, remove equipment from any existing signatures
          if (appliedSignature && appliedSignature.id !== selectedSignatureId) {
            const removeRes = await fetch('/api/signatures', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: appliedSignature.id,
                matchingEquipmentIds: appliedSignature.matchingEquipmentIds.filter(id => id !== equipment.id)
              })
            });
          }
          
          // Then add to new signature
          const updatedMatchingIds = [...signature.matchingEquipmentIds];
          if (!updatedMatchingIds.includes(equipment.id)) {
            updatedMatchingIds.push(equipment.id);
          }
          
          const res = await fetch('/api/signatures', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: selectedSignatureId,
              matchingEquipmentIds: updatedMatchingIds
            })
          });
          
          if (res.ok) {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            console.log('Signature applied successfully');
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply/remove signature:', error);
    }
  };

  // Filter signatures compatible with this equipment type
  const compatibleSignatures = signatures?.filter(sig => 
    sig.equipmentType === equipment?.equipmentType
  ) || [];

  // Filter points to show only those in the applied signature
  const signatureFilteredPoints = equipment?.points.filter(point => {
    if (!appliedSignature) return true; // Show all points if no signature applied
    
    // Check if this point matches any point in the signature
    return appliedSignature.pointSignature.some(sigPoint => 
      sigPoint.dis === point.dis && 
      sigPoint.kind === point.kind && 
      (sigPoint.unit || '') === (point.unit || '')
    );
  }) || [];

  // Further filter by search term (only if 2+ characters)
  const displayPoints = signatureFilteredPoints.filter(point => {
    if (searchTerm.length < 2) return true; // Show all if search term too short
    
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = point.dis.toLowerCase().includes(searchLower);
    const descMatch = point.bacnetDesc.toLowerCase().includes(searchLower);
    
    return nameMatch || descMatch;
  });

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Equipment Review</span>
      </div>
      
      <div className="panel-content">
        {!selectedEquipmentId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select an equipment unit from the left panel to review its details.</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <p>Loading equipment details...</p>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">Error loading equipment details.</p>
          </div>
        )}
        
        {equipment && (
          <div className="h-full flex flex-col">
            <div className="space-y-4 flex-shrink-0">
              {/* Equipment Header */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-blue-800">{equipment.id}</h4>
                    <div className="text-sm text-blue-600 mt-1 space-y-1">
                      <div>Type: {equipment.equipmentType}</div>
                      <div>Vendor: {equipment.vendorName || 'Unknown'}</div>
                      <div>Model: {equipment.modelName || 'Unknown'}</div>
                      {equipment.bacnetDeviceName && (
                        <div>BACnet Device: {equipment.bacnetDeviceName}</div>
                      )}
                      {equipment.bacnetDeviceStatus && (
                        <div>Device Status: {equipment.bacnetDeviceStatus}</div>
                      )}
                      {equipment.bacnetVersion && (
                        <div>BACnet Version: {equipment.bacnetVersion}</div>
                      )}
                      {equipment.connState && (
                        <div>Connection: {equipment.connState}</div>
                      )}
                      <div>Total Points: {equipment.points.length}</div>
                      {equipment.fullDescription && (
                        <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
                          <div className="text-xs font-medium text-blue-700 mb-1">Full Description:</div>
                          <div className="text-xs text-blue-600">{equipment.fullDescription}</div>
                        </div>
                      )}
                      {equipment.additionalDescriptiveFields && Object.keys(equipment.additionalDescriptiveFields).length > 0 && (
                        <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
                          <div className="text-xs font-medium text-blue-700 mb-1">Additional Information:</div>
                          <div className="text-xs text-blue-600 space-y-1">
                            {Object.entries(equipment.additionalDescriptiveFields).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                                </span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={openEditModal}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm flex-shrink-0"
                  >
                    Manage Tracked Points
                  </button>
                </div>
              </div>

              {/* Template Status Indicator */}
              {appliedSignature && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span className="font-medium text-green-800">Template Applied: </span>
                    <span className="text-green-700 ml-1">{appliedSignature.name}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Showing {displayPoints.length} tracked points of {equipment.points.length} available points
                  </div>
                </div>
              )}

              {/* Apply Existing Signature Section */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h5 className="font-medium text-gray-700 mb-3">
                  {appliedSignature ? 'Change Template' : 'Apply Template'}
                </h5>
                <div className="flex gap-2">
                  <select
                    value={selectedSignatureId}
                    onChange={(e) => setSelectedSignatureId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No template</option>
                    {compatibleSignatures.map((signature) => (
                      <option key={signature.id} value={signature.id}>
                        {signature.name} ({signature.pointSignature.length} points, {signature.matchingEquipmentIds.length} equipment)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleApplySignature}
                    disabled={appliedSignature?.id === selectedSignatureId}
                    className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-300 hover:bg-green-600 transition text-sm"
                  >
                    {selectedSignatureId === '' ? 'Remove' : 'Apply'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {appliedSignature 
                    ? 'Select a different template or choose "No template" to remove the current one.'
                    : 'Select and apply a signature template that matches this equipment type.'
                  }
                </p>
              </div>
            </div>
          
            {/* Equipment Points - Scrollable within remaining space */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200">
              <div className="p-4 bg-gray-50 border-b flex-shrink-0 space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-gray-700">
                    {appliedSignature 
                      ? `Tracked Points (${displayPoints.length}${searchTerm.length >= 2 ? ` of ${signatureFilteredPoints.length}` : ''})` 
                      : `Equipment Points (${displayPoints.length}${searchTerm.length >= 2 ? ` of ${equipment.points.length}` : ''})`
                    }
                  </h5>
                  <button
                    onClick={() => setExpandedEquipmentId(
                      expandedEquipmentId === equipment.id ? null : equipment.id
                    )}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    {expandedEquipmentId === equipment.id ? 'Collapse' : 'Expand All'}
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search points by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {searchTerm.length >= 2 && displayPoints.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    No points found matching "{searchTerm}"
                  </div>
                )}
              </div>
            
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {displayPoints.map((point, index) => (
                    <div key={index} className={`bg-white rounded border transition-all ${
                      expandedEquipmentId === equipment.id ? 'p-3' : 'p-2'
                    }`}>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-3 flex-shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">{point.dis}</span>
                            <span className="text-xs text-gray-500 truncate">- {point.bacnetDesc}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">{point.kind}</span>
                          {point.unit && <span className="text-xs text-gray-500">{point.unit}</span>}
                          <span className={`text-xs px-1 rounded ${
                            point.writable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {point.writable ? 'W' : 'R'}
                          </span>
                        </div>
                      </div>
                      
                      {expandedEquipmentId === equipment.id && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">BACnet Current:</span> {point.bacnetCur}
                            </div>
                            <div>
                              <span className="font-medium">Kind:</span> {point.kind}
                            </div>
                            {point.unit && (
                              <div>
                                <span className="font-medium">Unit:</span> {point.unit}
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="font-medium">Description:</span> {point.bacnetDesc}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}