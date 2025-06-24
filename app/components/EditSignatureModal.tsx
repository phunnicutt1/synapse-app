'use client'
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { EquipmentSource, BacnetPoint } from '@/interfaces/bacnet';

type PointSignature = Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>;

const fetchEquipmentById = async (equipmentId: string): Promise<EquipmentSource> => {
    const res = await fetch(`/api/equipment/${equipmentId}`);
    if (!res.ok) throw new Error('Failed to fetch equipment');
    return res.json();
};

const createSignature = async (signatureData: any) => {
    const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData),
    });
    if (!res.ok) throw new Error('Failed to create signature');
    return res.json();
};

// Point categorization based on semantic classification (same as main app)
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

// Get confidence badge styling (same as main app)
const getConfidenceBadge = (confidence?: number) => {
  if (!confidence) return { color: 'bg-gray-100 text-gray-600', text: 'No Data' };
  if (confidence >= 90) return { color: 'bg-green-100 text-green-800', text: `${confidence}%` };
  if (confidence >= 70) return { color: 'bg-yellow-100 text-yellow-800', text: `${confidence}%` };
  return { color: 'bg-red-100 text-red-800', text: `${confidence}%` };
};

export function EditSignatureModal() {
    const { isEditModalOpen, closeEditModal, selectedEquipmentId } = useAppStore();
    const queryClient = useQueryClient();

    const { data: equipment } = useQuery({
        queryKey: ['equipment-detail', selectedEquipmentId],
        queryFn: () => fetchEquipmentById(selectedEquipmentId!),
        enabled: !!selectedEquipmentId && isEditModalOpen,
    });

    const [signatureName, setSignatureName] = useState('');
    const [points, setPoints] = useState<PointSignature[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (equipment) {
            setSignatureName('');
            // Initialize with all points selected
            setPoints(equipment.points.map(({ dis, kind, unit, bacnetDesc }) => ({ 
                dis: bacnetDesc || dis, // Prefer functional description
                kind, 
                unit 
            })));
        }
    }, [equipment]);

    const mutation = useMutation({
        mutationFn: createSignature,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            queryClient.invalidateQueries({ queryKey: ['equipment-by-type'] });
            closeEditModal();
            // Reset form
            setSignatureName('');
            setPoints([]);
        }
    });

    const handlePointToggle = (point: PointSignature) => {
        const pointKey = `${point.dis}|${point.kind}|${point.unit || ''}`;
        const isIncluded = points.some(p => `${p.dis}|${p.kind}|${p.unit || ''}` === pointKey);

        if (isIncluded) {
            setPoints(currentPoints => currentPoints.filter(p => `${p.dis}|${p.kind}|${p.unit || ''}` !== pointKey));
        } else {
            setPoints(currentPoints => [...currentPoints, point]);
        }
    };
    
    const handleSubmit = () => {
        if (!equipment || !signatureName.trim() || points.length === 0) return;
        
        const signatureData = {
            name: signatureName.trim(),
            equipmentType: equipment.equipmentType,
            pointSignature: points,
            source: 'user-created' as const,
            confidence: 1.0,
            matchingEquipmentIds: [equipment.id],
        };

        mutation.mutate(signatureData);
    };

    // Highlight text function (same as main app)
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

    if (!isEditModalOpen || !equipment) return null;

    const allPossiblePoints = equipment.points.map(({ dis, kind, unit, bacnetDesc }) => ({ 
        dis, // Keep the original point name
        kind, 
        unit 
    }));
    const uniquePoints = Array.from(new Map(allPossiblePoints.map(p => [`${p.dis}|${p.kind}|${p.unit || ''}`, p])).values());

    // Filter points based on search term (only if 2+ characters)
    const filteredPoints = uniquePoints.filter(point => {
        if (searchTerm.length < 2) return true; // Show all if search term too short
        
        const searchLower = searchTerm.toLowerCase();
        
        // Find the original point to get bacnetDesc
        const originalPoint = equipment?.points.find(p => 
            p.dis === point.dis && 
            p.kind === point.kind && 
            (p.unit || '') === (point.unit || '')
        );
        
        const nameMatch = point.dis.toLowerCase().includes(searchLower);
        const normalizedMatch = originalPoint?.normalizedName?.toLowerCase().includes(searchLower);
        const descMatch = originalPoint?.bacnetDesc?.toLowerCase().includes(searchLower) || false;
        const tagMatch = originalPoint?.haystackTags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        return nameMatch || normalizedMatch || descMatch || tagMatch;
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        Create Signature from {equipment.id}
                    </h2>
                    <button 
                        onClick={closeEditModal}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            <strong>Equipment:</strong> {equipment.id} ({equipment.equipmentType})
                        </p>
                        <p className="text-sm text-gray-600">
                            {equipment.vendorName} - {equipment.points.length} total points
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Signature Name *
                        </label>
                        <input
                            type="text"
                            value={signatureName}
                            onChange={(e) => setSignatureName(e.target.value)}
                            placeholder="e.g., Standard VAV Signature"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Select Points ({points.length} / {uniquePoints.length} selected)
                                {searchTerm.length >= 2 && ` (${filteredPoints.length} shown)`}
                            </h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setPoints([...uniquePoints])}
                                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                >
                                    Select All Points
                                </button>
                                <button
                                    onClick={() => setPoints([])}
                                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                                >
                                    Deselect All Points
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                            Choose which points should be part of this signature template.
                        </p>

                        {/* Search Bar */}
                        <div className="relative mb-3">
                            <input
                                type="text"
                                placeholder="Search points by name, normalized name, description, or tags..."
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

                        {searchTerm.length >= 2 && filteredPoints.length === 0 && (
                            <div className="text-sm text-gray-500 italic mb-3">
                                No points found matching "{searchTerm}"
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-3 min-h-0">
                            <div className="space-y-3">
                                {filteredPoints.sort((a,b) => a.dis.localeCompare(b.dis)).map(point => {
                                    const pointKey = `${point.dis}|${point.kind}|${point.unit || ''}`;
                                    const isTracked = points.some(p => `${p.dis}|${p.kind}|${p.unit || ''}` === pointKey);
                                    
                                    // Find the original point to get all data
                                    const originalPoint = equipment?.points.find(p => 
                                        p.dis === point.dis && 
                                        p.kind === point.kind && 
                                        (p.unit || '') === (point.unit || '')
                                    );
                                    
                                    if (!originalPoint) return null;
                                    
                                    const category = categorizePoint(originalPoint);
                                    const confidenceBadge = getConfidenceBadge(originalPoint.normalizationConfidence);
                                    
                                    return (
                                        <div key={pointKey} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                                            <div className="p-4">
                                                {/* Point Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Original Name */}
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs text-gray-500 font-medium">ORIGINAL:</span>
                                                            <span className="font-medium text-gray-800 truncate">
                                                                {highlightText(originalPoint.dis, searchTerm)}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Normalized Name */}
                                                        {originalPoint.normalizedName ? (
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs text-blue-600 font-medium">NORMALIZED:</span>
                                                                <span className="font-semibold text-blue-800 truncate">
                                                                    {highlightText(originalPoint.normalizedName, searchTerm)}
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
                                                            {highlightText(originalPoint.bacnetDesc, searchTerm)}
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
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Point Properties */}
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-medium">Type:</span> {originalPoint.kind}
                                                    </span>
                                                    {originalPoint.unit && (
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">Unit:</span> {originalPoint.unit}
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-1 rounded ${
                                                        originalPoint.writable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {originalPoint.writable ? 'Writable' : 'Read-Only'}
                                                    </span>
                                                </div>

                                                {/* Haystack Tags */}
                                                {originalPoint.haystackTags && originalPoint.haystackTags.length > 0 && (
                                                    <div className="mb-3">
                                                        <div className="text-xs font-medium text-gray-700 mb-1">Haystack Tags:</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {originalPoint.haystackTags.map((tag, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Track Point Button */}
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handlePointToggle(point)}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                            isTracked 
                                                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                        title={isTracked ? "Click to untrack this point" : "Click to track this point"}
                                                    >
                                                        Track Point
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                    <button 
                        onClick={closeEditModal}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={mutation.isPending || !signatureName.trim() || points.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        {mutation.isPending ? 'Creating...' : 'Create Signature'}
                    </button>
                </div>
            </div>
        </div>
    );
}
