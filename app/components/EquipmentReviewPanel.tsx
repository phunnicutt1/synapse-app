'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { EquipmentSource, EquipmentSignature, BacnetPoint } from '@/interfaces/bacnet';
import { useState, useEffect, useMemo } from 'react';

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

// Point categorization based on semantic classification
const categorizePoint = (point: BacnetPoint): string => {
  if (point.semanticMetadata?.equipmentSpecific) {
    const classification = point.semanticMetadata.reasoning.find(r => 
      r.includes('Temperature') || r.includes('Pressure') || r.includes('Flow') || 
      r.includes('Status') || r.includes('Speed') || r.includes('Occupancy')
    );
    if (classification) {
      if (classification.includes('Temperature')) return 'Temperature';
      if (classification.includes('Pressure')) return 'Pressure';
      if (classification.includes('Flow') || classification.includes('Airflow')) return 'Airflow';
      if (classification.includes('Status') || classification.includes('Occupancy')) return 'Status';
      if (classification.includes('Speed') || classification.includes('Fan')) return 'Control';
    }
  }
  
  // Fallback to basic categorization based on point properties
  if (point.writable) return 'Setpoint';
  if (point.kind === 'Bool') return 'Status';
  if (point.unit) return 'Sensor';
  return 'Other';
};

// Get confidence badge styling
const getConfidenceBadge = (confidence?: number) => {
  if (!confidence) return { color: 'bg-gray-100 text-gray-600', text: 'No Data' };
  if (confidence >= 90) return { color: 'bg-green-100 text-green-800', text: `${confidence}%` };
  if (confidence >= 70) return { color: 'bg-yellow-100 text-yellow-800', text: `${confidence}%` };
  return { color: 'bg-red-100 text-red-800', text: `${confidence}%` };
};

// Enhanced point card component
interface PointCardProps {
  point: BacnetPoint;
  index: number;
  isExpanded: boolean;
  searchTerm: string;
  onConfidenceAdjust: (pointId: string, newConfidence: number) => void;
}

interface PointTableRowProps {
  point: BacnetPoint;
  index: number;
  isExpanded: boolean;
  searchTerm: string;
  onConfidenceAdjust: (pointId: string, newConfidence: number) => void;
  onToggleExpand: (pointId: string) => void;
  equipmentSource?: EquipmentSource;
  dataSource?: string;
}

const PointTableRow: React.FC<PointTableRowProps> = ({ 
  point, 
  index, 
  isExpanded, 
  searchTerm,
  onConfidenceAdjust,
  onToggleExpand,
  equipmentSource,
  dataSource
}) => {
  const [isAdjustingConfidence, setIsAdjustingConfidence] = useState(false);
  const [tempConfidence, setTempConfidence] = useState(point.normalizationConfidence || 0);
  
  const category = categorizePoint(point);
  const confidenceBadge = getConfidenceBadge(point.normalizationConfidence);
  
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const handleConfidenceSubmit = () => {
    onConfidenceAdjust(point.id, tempConfidence);
    setIsAdjustingConfidence(false);
  };

  const getPropertyType = (point: BacnetPoint): string => {
    // Determine if it's a Sensor, Set Point, or CMD based on point characteristics
    if (point.writable) {
      // Check if it's a setpoint based on name patterns
      const namePattern = (point.normalizedName || point.dis).toLowerCase();
      if (namePattern.includes('setpoint') || namePattern.includes('set point') || 
          namePattern.includes('sp') || namePattern.includes('stpt')) {
        return 'Set Point';
      }
      return 'CMD';
    }
    return 'Sensor';
  };

  return (
    <>
      {/* Main compact row */}
      <tr className="hover:bg-gray-50 border-b border-gray-100">
        {/* Expand/Collapse button */}
        <td className="px-3 py-2 w-8">
          <button
            onClick={() => onToggleExpand(point.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>

        {/* Original/Normalized Name */}
        <td className="px-3 py-2 min-w-0">
          <div className="flex flex-col">
            <div className="font-medium text-gray-800 text-sm truncate">
              {highlightText(point.dis, searchTerm)}
            </div>
            {point.normalizedName ? (
              <div className="text-xs text-blue-600 truncate">
                {highlightText(point.normalizedName, searchTerm)}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">Not normalized</div>
            )}
          </div>
        </td>

        {/* Kind (Data Type) */}
        <td className="px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">{point.kind}</span>
        </td>

        {/* BACnet ID */}
        <td className="px-3 py-2 text-xs text-gray-600">
          <span className="font-mono">{point.bacnetCur}</span>
        </td>

        {/* Description */}
        <td className="px-3 py-2 text-xs text-gray-600 max-w-xs">
          <div className="truncate" title={point.bacnetDesc}>
            {highlightText(point.bacnetDesc, searchTerm)}
          </div>
        </td>

        {/* Unit */}
        <td className="px-3 py-2 text-xs text-gray-600">
          <span>{point.unit || '-'}</span>
        </td>

        {/* Source */}
        <td className="px-3 py-2 text-xs text-gray-600">
          <div className="flex flex-col">
            <span className="text-xs font-medium truncate">{dataSource || 'ConnectorData.csv'}</span>
            {equipmentSource?.vendorName && (
              <span className="text-xs text-gray-500 truncate">
                {equipmentSource.vendorName}
                {equipmentSource.modelName && ` • ${equipmentSource.modelName}`}
              </span>
            )}
          </div>
        </td>

        {/* Property Type, W/R Status, and Confidence */}
        <td className="px-3 py-2 text-right">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-medium text-gray-700">
                {getPropertyType(point)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                point.writable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {point.writable ? 'W' : 'R'}
              </span>
              {point.normalizationConfidence && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge.color}`}>
                  {point.normalizationConfidence}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {point.normalizationConfidence && (
                <button
                  onClick={() => setIsAdjustingConfidence(!isAdjustingConfidence)}
                  className="text-xs text-gray-500 hover:text-gray-700 p-0.5"
                  title="Adjust confidence"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded details row */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-3 py-4">
            <div className="space-y-3">
              {/* Confidence Adjustment */}
              {isAdjustingConfidence && (
                <div className="p-3 bg-white rounded border">
                  <div className="text-xs font-medium text-gray-700 mb-2">Adjust Normalization Confidence:</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tempConfidence}
                      onChange={(e) => setTempConfidence(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12">{tempConfidence}%</span>
                    <button
                      onClick={handleConfidenceSubmit}
                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setIsAdjustingConfidence(false)}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* All Haystack Tags */}
              {point.haystackTags && point.haystackTags.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">All Haystack Tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {point.haystackTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Basic Properties */}
                <div className="space-y-2">
                  <h6 className="font-medium text-gray-700">Properties</h6>
                  <div className="space-y-1 text-gray-600">
                    <div><span className="font-medium">BACnet Current:</span> {point.bacnetCur}</div>
                    <div><span className="font-medium">Point ID:</span> {point.id}</div>
                    <div><span className="font-medium">Writable:</span> {point.writable ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {/* Semantic Metadata */}
                {point.semanticMetadata && (
                  <div className="space-y-2">
                    <h6 className="font-medium text-gray-700">Semantic Analysis</h6>
                    <div className="space-y-1 text-gray-600">
                      <div>
                        <span className="font-medium">Vendor Specific:</span> 
                        {point.semanticMetadata.vendorSpecific ? ' Yes' : ' No'}
                      </div>
                      <div>
                        <span className="font-medium">Equipment Specific:</span> 
                        {point.semanticMetadata.equipmentSpecific ? ' Yes' : ' No'}
                      </div>
                      {point.semanticMetadata.reasoning && point.semanticMetadata.reasoning.length > 0 && (
                        <div>
                          <span className="font-medium">Reasoning:</span>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {point.semanticMetadata.reasoning.map((reason, idx) => (
                              <li key={idx} className="text-xs">{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const PointCard: React.FC<PointCardProps> = ({ 
  point, 
  index, 
  isExpanded, 
  searchTerm,
  onConfidenceAdjust 
}) => {
  const [isAdjustingConfidence, setIsAdjustingConfidence] = useState(false);
  const [tempConfidence, setTempConfidence] = useState(point.normalizationConfidence || 0);
  
  const category = categorizePoint(point);
  const confidenceBadge = getConfidenceBadge(point.normalizationConfidence);
  
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const handleConfidenceSubmit = () => {
    onConfidenceAdjust(point.id, tempConfidence);
    setIsAdjustingConfidence(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
      <div className="p-4">
        {/* Point Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {/* Original Name */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 font-medium">ORIGINAL:</span>
              <span className="font-medium text-gray-800 truncate">
                {highlightText(point.dis, searchTerm)}
              </span>
            </div>
            
            {/* Normalized Name */}
            {point.normalizedName ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-blue-600 font-medium">NORMALIZED:</span>
                <span className="font-semibold text-blue-800 truncate">
                  {highlightText(point.normalizedName, searchTerm)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-medium">NORMALIZED:</span>
                <span className="text-gray-400 italic text-sm">Not normalized</span>
              </div>
            )}
            
            {/* Description */}
            <div className="text-sm text-gray-600 truncate">
              {highlightText(point.bacnetDesc, searchTerm)}
            </div>
          </div>
          
          {/* Point Metadata Badges */}
          <div className="flex flex-col items-end gap-1 ml-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              category === 'Temperature' ? 'bg-red-100 text-red-700' :
              category === 'Pressure' ? 'bg-purple-100 text-purple-700' :
              category === 'Airflow' ? 'bg-blue-100 text-blue-700' :
              category === 'Status' ? 'bg-green-100 text-green-700' :
              category === 'Control' ? 'bg-orange-100 text-orange-700' :
              category === 'Setpoint' ? 'bg-indigo-100 text-indigo-700' :
              category === 'Sensor' ? 'bg-teal-100 text-teal-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {category}
            </span>
            
            {/* Confidence Badge */}
            <div className="flex items-center gap-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceBadge.color}`}>
                {confidenceBadge.text}
              </span>
              {point.normalizationConfidence && (
                <button
                  onClick={() => setIsAdjustingConfidence(!isAdjustingConfidence)}
                  className="text-xs text-gray-500 hover:text-gray-700 p-1"
                  title="Adjust confidence"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Point Properties */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <span className="font-medium">Type:</span> {point.kind}
          </span>
          {point.unit && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Unit:</span> {point.unit}
            </span>
          )}
          <span className={`px-2 py-1 rounded ${
            point.writable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {point.writable ? 'Writable' : 'Read-Only'}
          </span>
        </div>

        {/* Haystack Tags */}
        {point.haystackTags && point.haystackTags.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Haystack Tags:</div>
            <div className="flex flex-wrap gap-1">
              {point.haystackTags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Adjustment */}
        {isAdjustingConfidence && (
          <div className="mb-3 p-3 bg-gray-50 rounded border">
            <div className="text-xs font-medium text-gray-700 mb-2">Adjust Normalization Confidence:</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={tempConfidence}
                onChange={(e) => setTempConfidence(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12">{tempConfidence}%</span>
              <button
                onClick={handleConfidenceSubmit}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Apply
              </button>
              <button
                onClick={() => setIsAdjustingConfidence(false)}
                className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Basic Properties */}
              <div className="space-y-2">
                <h6 className="font-medium text-gray-700">Properties</h6>
                <div className="space-y-1 text-gray-600">
                  <div><span className="font-medium">BACnet Current:</span> {point.bacnetCur}</div>
                  <div><span className="font-medium">Point ID:</span> {point.id}</div>
                  <div><span className="font-medium">Writable:</span> {point.writable ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Semantic Metadata */}
              {point.semanticMetadata && (
                <div className="space-y-2">
                  <h6 className="font-medium text-gray-700">Semantic Analysis</h6>
                  <div className="space-y-1 text-gray-600">
                    <div>
                      <span className="font-medium">Vendor Specific:</span> 
                      {point.semanticMetadata.vendorSpecific ? ' Yes' : ' No'}
                    </div>
                    <div>
                      <span className="font-medium">Equipment Specific:</span> 
                      {point.semanticMetadata.equipmentSpecific ? ' Yes' : ' No'}
                    </div>
                    {point.semanticMetadata.reasoning && point.semanticMetadata.reasoning.length > 0 && (
                      <div>
                        <span className="font-medium">Reasoning:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {point.semanticMetadata.reasoning.map((reason, idx) => (
                            <li key={idx} className="text-xs">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
  const [normalizationFilter, setNormalizationFilter] = useState<'all' | 'normalized' | 'not-normalized'>('all');
  const [expandedPointIds, setExpandedPointIds] = useState<Set<string>>(new Set());
  const [expandAllPoints, setExpandAllPoints] = useState(false);
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

  // Point categorization and filtering
  const categorizedPoints = useMemo(() => {
    if (!equipment) return {};
    
    const categories: Record<string, BacnetPoint[]> = {};
    equipment.points.forEach(point => {
      const category = categorizePoint(point);
      if (!categories[category]) categories[category] = [];
      categories[category].push(point);
    });
    
    return categories;
  }, [equipment]);

  const availableCategories = useMemo(() => {
    return Object.keys(categorizedPoints).sort();
  }, [categorizedPoints]);

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

  // Apply all filters
  const displayPoints = useMemo(() => {
    let filtered = signatureFilteredPoints;

    // Search filter
    if (searchTerm.length >= 2) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(point => {
        const nameMatch = point.dis.toLowerCase().includes(searchLower);
        const normalizedMatch = point.normalizedName?.toLowerCase().includes(searchLower);
        const descMatch = point.bacnetDesc.toLowerCase().includes(searchLower);
        const tagMatch = point.haystackTags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        return nameMatch || normalizedMatch || descMatch || tagMatch;
      });
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(point => categorizePoint(point) === categoryFilter);
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(point => {
        const confidence = point.normalizationConfidence;
        switch (confidenceFilter) {
          case 'high': return confidence && confidence >= 80;
          case 'medium': return confidence && confidence >= 50 && confidence < 80;
          case 'low': return confidence && confidence < 50;
          case 'none': return !confidence;
          default: return true;
        }
      });
    }

    // Normalization filter
    if (normalizationFilter !== 'all') {
      filtered = filtered.filter(point => {
        const hasNormalization = !!point.normalizedName;
        return normalizationFilter === 'normalized' ? hasNormalization : !hasNormalization;
      });
    }

    return filtered;
  }, [signatureFilteredPoints, searchTerm, categoryFilter, confidenceFilter, normalizationFilter]);

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
            await fetch('/api/signatures', {
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

  const handleConfidenceAdjust = async (pointId: string, newConfidence: number) => {
    // TODO: Implement confidence adjustment API call
    console.log(`Adjusting confidence for point ${pointId} to ${newConfidence}%`);
    // This would typically update the point's normalizationConfidence in the backend
  };

  const handleToggleExpandPoint = (pointId: string) => {
    setExpandedPointIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  };

  const handleExpandAllPoints = () => {
    if (expandAllPoints) {
      // Collapse all points
      setExpandedPointIds(new Set());
      setExpandAllPoints(false);
    } else {
      // Expand all points
      const allPointIds = new Set(displayPoints.map(point => point.id));
      setExpandedPointIds(allPointIds);
      setExpandAllPoints(true);
    }
  };

  // Reset expand all state when filters change
  useEffect(() => {
    setExpandAllPoints(false);
    setExpandedPointIds(new Set());
  }, [selectedEquipmentId, searchTerm, categoryFilter, confidenceFilter, normalizationFilter]);

  // Statistics for normalization summary
  const normalizationStats = useMemo(() => {
    if (!equipment) return null;
    
    const totalPoints = equipment.points.length;
    const normalizedPoints = equipment.points.filter(p => p.normalizedName).length;
    const averageConfidence = equipment.points
      .filter(p => p.normalizationConfidence)
      .reduce((sum, p) => sum + (p.normalizationConfidence || 0), 0) / 
      Math.max(1, equipment.points.filter(p => p.normalizationConfidence).length);
    
    return {
      totalPoints,
      normalizedPoints,
      normalizationRate: Math.round((normalizedPoints / totalPoints) * 100),
      averageConfidence: Math.round(averageConfidence)
    };
  }, [equipment]);

  return (
    <div className="panel">
      <div className="panel-title flex justify-between items-center">
        <span>Equipment Review</span>
        {equipment && (
          <div className="flex-shrink-0">
            <button 
              onClick={openEditModal}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors duration-200"
              style={{ minWidth: '160px' }}
            >
              Manage Tracked Points
            </button>
          </div>
        )}
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
            {/* Condensed Top Section - Equipment Header and Template Controls */}
            <div className="flex-shrink-0 border-b border-gray-200">
                            {/* Equipment Header - Compact Layout */}
              <div className="bg-blue-50 p-3 border border-blue-200">
                <h4 className="text-lg font-bold text-blue-800 mb-3">{equipment.id}</h4>
                
                {/* Main Content Area - Device Info Left, Data Metrics Right */}
                <div className="flex gap-6 mb-3">
                  {/* Device Information Grid - Left Side */}
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-gray-800 mb-2">Device Information</h5>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Type:</span>
                        <span className="font-medium text-gray-800">{equipment.equipmentType}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Vendor:</span>
                        <span className="font-medium text-gray-800">{equipment.vendorName || 'Unknown'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Model:</span>
                        <span className="font-medium text-gray-800">{equipment.modelName || 'Unknown'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Device:</span>
                        <span className="font-medium text-gray-800">{equipment.bacnetDeviceName || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Status:</span>
                        <span className="font-medium text-gray-800">{equipment.bacnetDeviceStatus || 'Unknown'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Version:</span>
                        <span className="font-medium text-gray-800">{equipment.bacnetVersion || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Connection:</span>
                        <span className="font-medium text-gray-800">{equipment.connState || 'Unknown'}</span>
                      </div>
                      <div className="flex">
                        <span className="text-gray-600 mr-2">Points:</span>
                        <span className="font-medium text-gray-800">{equipment.points.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data Metrics - Right Side */}
                  {normalizationStats && (
                    <div className="w-80">
                      <h5 className="text-sm font-semibold text-gray-800 mb-2">Data Metrics</h5>
                      <div className="space-y-2">
                        {/* Normalization Progress */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-700">Normalization</span>
                            <span className="text-xs font-semibold text-gray-800">
                              {normalizationStats.normalizedPoints}/{normalizationStats.totalPoints} ({normalizationStats.normalizationRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${normalizationStats.normalizationRate}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Average Confidence Progress */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-700">Avg Confidence</span>
                            <span className="text-xs font-semibold text-blue-600">{normalizationStats.averageConfidence}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                normalizationStats.averageConfidence >= 80 ? 'bg-green-500' :
                                normalizationStats.averageConfidence >= 60 ? 'bg-yellow-500' :
                                normalizationStats.averageConfidence >= 40 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${normalizationStats.averageConfidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Description - Full Width Below */}
                {equipment.fullDescription && (
                  <div className="p-2 bg-blue-100 border border-blue-200 rounded">
                    <div className="text-xs">
                      <span className="font-semibold text-blue-800">Description: </span>
                      <span className="text-blue-700">{equipment.fullDescription}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Template Status and Controls */}
              <div className="p-2 space-y-1.5">
                {/* Template Status Indicator */}
                {appliedSignature && (
                  <div className="bg-green-50 px-2 py-1.5 rounded border border-green-200">
                    <div className="flex items-center text-xs">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      <span className="font-medium text-green-800">Template: </span>
                      <span className="text-green-700 ml-1">{appliedSignature.name}</span>
                      <span className="text-green-600 ml-2 text-xs">
                        ({displayPoints.length}/{equipment.points.length} points)
                      </span>
                    </div>
                  </div>
                )}

                {/* Compact Apply Template Section */}
                <div className="bg-gray-50 px-2 py-1.5 rounded border">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700 flex-shrink-0">
                      {appliedSignature ? 'Change:' : 'Apply:'}
                    </label>
                    <select
                      value={selectedSignatureId}
                      onChange={(e) => setSelectedSignatureId(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">No template</option>
                      {compatibleSignatures.map((signature) => (
                        <option key={signature.id} value={signature.id}>
                          {signature.name} ({signature.pointSignature.length} pts)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleApplySignature}
                      disabled={appliedSignature?.id === selectedSignatureId}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs disabled:bg-gray-300 hover:bg-green-600 transition flex-shrink-0"
                    >
                      {selectedSignatureId === '' ? 'Remove' : 'Apply'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select and apply a signature template that matches this equipment type.
                  </p>
                </div>
              </div>
            </div>
          
            {/* Equipment Points - Now takes up 2/3 of the available space */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2 bg-gray-50 border-b flex-shrink-0 space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium text-gray-700">
                    {appliedSignature 
                      ? `Tracked Points (${displayPoints.length}${searchTerm.length >= 2 || categoryFilter || confidenceFilter !== 'all' || normalizationFilter !== 'all' ? ` filtered` : ''})` 
                      : `Equipment Points (${displayPoints.length}${searchTerm.length >= 2 || categoryFilter || confidenceFilter !== 'all' || normalizationFilter !== 'all' ? ` filtered` : ''})`
                    }
                  </h5>
                  <button
                    onClick={handleExpandAllPoints}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    {expandAllPoints ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
                
                {/* Compact Search and Filters */}
                <div className="space-y-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search points by name, normalized name, description, or tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Compact Filter Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>
                          {category} ({categorizedPoints[category]?.length || 0})
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={confidenceFilter}
                      onChange={(e) => setConfidenceFilter(e.target.value as any)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All Confidence</option>
                      <option value="high">High (80%+)</option>
                      <option value="medium">Medium (50-79%)</option>
                      <option value="low">Low (&lt;50%)</option>
                      <option value="none">No Data</option>
                    </select>
                    
                    <select
                      value={normalizationFilter}
                      onChange={(e) => setNormalizationFilter(e.target.value as any)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All Points</option>
                      <option value="normalized">Normalized Only</option>
                      <option value="not-normalized">Not Normalized</option>
                    </select>
                  </div>
                  
                  {/* Clear Filters */}
                  {(searchTerm || categoryFilter || confidenceFilter !== 'all' || normalizationFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCategoryFilter('');
                        setConfidenceFilter('all');
                        setNormalizationFilter('all');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
                
                {(searchTerm.length >= 2 || categoryFilter || confidenceFilter !== 'all' || normalizationFilter !== 'all') && displayPoints.length === 0 && (
                  <div className="text-xs text-gray-500 italic">
                    No points found matching current filters
                  </div>
                )}
              </div>
            
              <div className="flex-1 overflow-y-auto">
                <div className="bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kind</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BACnet ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPoints.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                            <div className="text-lg mb-2">📭</div>
                            <div>No points found matching current filters</div>
                          </td>
                        </tr>
                      ) : (
                                                 displayPoints.map((point, index) => (
                          <PointTableRow
                            key={point.id}
                            point={point}
                            index={index}
                            isExpanded={expandedPointIds.has(point.id)}
                            searchTerm={searchTerm}
                            onConfidenceAdjust={handleConfidenceAdjust}
                            onToggleExpand={handleToggleExpandPoint}
                            equipmentSource={equipment}
                            dataSource={`${equipment.id}.trio`}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}