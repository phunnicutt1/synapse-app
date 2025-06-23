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
        const descMatch = originalPoint?.bacnetDesc?.toLowerCase().includes(searchLower) || false;
        
        return nameMatch || descMatch;
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

                        {searchTerm.length >= 2 && filteredPoints.length === 0 && (
                            <div className="text-sm text-gray-500 italic mb-3">
                                No points found matching "{searchTerm}"
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-3 min-h-0">
                            <div className="space-y-2">
                                {filteredPoints.sort((a,b) => a.dis.localeCompare(b.dis)).map(point => {
                                    const pointKey = `${point.dis}|${point.kind}|${point.unit || ''}`;
                                    const isIncluded = points.some(p => `${p.dis}|${p.kind}|${p.unit || ''}` === pointKey);
                                    
                                    // Find the original point to get all data including bacnetDesc and writable
                                    const originalPoint = equipment?.points.find(p => 
                                        p.dis === point.dis && 
                                        p.kind === point.kind && 
                                        (p.unit || '') === (point.unit || '')
                                    );
                                    
                                    return (
                                        <div key={pointKey} className="bg-white rounded border p-3 hover:bg-gray-50">
                                            <div className="flex items-center">
                                                {/* Left side: Green dot and point info */}
                                                <div className="flex items-start min-w-0">
                                                    {/* Hidden checkbox for functionality */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isIncluded}
                                                        onChange={() => handlePointToggle(point)}
                                                        className="hidden"
                                                    />
                                                    
                                                    {/* Green dot indicator */}
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                    
                                                    {/* Point info */}
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">{point.dis}</div>
                                                        {originalPoint?.bacnetDesc && originalPoint.bacnetDesc !== point.dis && (
                                                            <div className="text-sm text-gray-500 truncate">"{originalPoint.bacnetDesc}"</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Point metadata tags with left padding */}
                                                <div className="flex flex-wrap items-center gap-1 flex-1" style={{paddingLeft: '35px'}}>
                                                    {/* BACnet Point Type */}
                                                    {originalPoint?.bacnetCur && (() => {
                                                        const bacnetType = getBacnetPointType(originalPoint.bacnetCur);
                                                        return bacnetType ? (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBacnetTypeColor(bacnetType)}`}>
                                                                {bacnetType}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                    
                                                    {/* Kind */}
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        {point.kind}
                                                    </span>
                                                    
                                                    {/* Unit */}
                                                    {point.unit && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            {point.unit}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Writable status */}
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        originalPoint?.writable ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {originalPoint?.writable ? 'R/W' : 'R'}
                                                    </span>
                                                    
                                                    {/* Trio Tags */}
                                                    {getTrioTags(originalPoint).map(tag => (
                                                        <span key={tag} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrioTagColor(tag)}`}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Right side: Track/Disable buttons */}
                                                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                                    <button
                                                        onClick={() => !isIncluded && handlePointToggle(point)}
                                                        disabled={isIncluded}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                            isIncluded 
                                                                ? 'bg-green-500 text-white cursor-default' 
                                                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        }`}
                                                        title={isIncluded ? "Currently tracked" : "Click to track"}
                                                    >
                                                        Track Point
                                                    </button>
                                                    <button
                                                        onClick={() => isIncluded && handlePointToggle(point)}
                                                        disabled={!isIncluded}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                            !isIncluded 
                                                                ? 'bg-red-500 text-white cursor-default' 
                                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                        }`}
                                                        title={!isIncluded ? "Currently disabled" : "Click to disable"}
                                                    >
                                                        ✕
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

// Function to extract BACnet point type from bacnetCur
function getBacnetPointType(bacnetCur: string): string {
    if (!bacnetCur) return '';
    
    // Extract the prefix (letters before numbers)
    const match = bacnetCur.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}

// Function to get color for BACnet point type
function getBacnetTypeColor(type: string): string {
    switch (type) {
        case 'AI': return 'bg-green-100 text-green-800';
        case 'AO': return 'bg-blue-100 text-blue-800';
        case 'AV': return 'bg-purple-100 text-purple-800';
        case 'BI': return 'bg-yellow-100 text-yellow-800';
        case 'BO': return 'bg-orange-100 text-orange-800';
        case 'BV': return 'bg-red-100 text-red-800';
        case 'MSV': return 'bg-indigo-100 text-indigo-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Function to extract trio tags from point data
function getTrioTags(originalPoint: any): string[] {
    const tags: string[] = [];
    
    // Check for CMD tag (command points)
    if (originalPoint?.writable && originalPoint?.bacnetWrite) {
        tags.push('CMD');
    }
    
    // Check for other common patterns in point names/descriptions
    if (originalPoint?.dis || originalPoint?.bacnetDesc) {
        const text = `${originalPoint.dis || ''} ${originalPoint.bacnetDesc || ''}`.toLowerCase();
        
        // Check for alarm-related points
        if (text.includes('alarm') || text.includes('fault') || text.includes('alert')) {
            tags.push('ALARM');
        }
        
        // Check for sensor points (typically read-only with specific units)
        if (!originalPoint?.writable && (originalPoint?.unit || originalPoint?.kind === 'Number')) {
            if (text.includes('temp') || text.includes('pressure') || text.includes('flow') || 
                text.includes('level') || text.includes('humidity') || text.includes('sensor')) {
                tags.push('SENSOR');
            }
        }
        
        // Check for setpoint/control points
        if (text.includes('setpoint') || text.includes('setp') || text.includes('sp ') || 
            text.includes('control') || text.includes('ctrl')) {
            tags.push('SP');
        }
        
        // Check for status points
        if (text.includes('status') || text.includes('state') || text.includes('mode') ||
            originalPoint?.kind === 'Bool' || originalPoint?.kind === 'Str') {
            tags.push('STATUS');
        }
    }
    
    return tags;
}

// Function to get color for trio tags
function getTrioTagColor(tag: string): string {
    switch (tag) {
        case 'CMD': return 'bg-cyan-100 text-cyan-800';
        case 'ALARM': return 'bg-red-100 text-red-800';
        case 'SENSOR': return 'bg-green-100 text-green-800';
        case 'SP': return 'bg-orange-100 text-orange-800';
        case 'STATUS': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}
