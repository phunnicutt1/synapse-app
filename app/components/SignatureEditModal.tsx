'use client'
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { EquipmentSignature, BacnetPoint } from '@/interfaces/bacnet';

type PointSignature = Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>;

const updateSignature = async (id: string, updates: Partial<EquipmentSignature>) => {
  const res = await fetch('/api/signatures', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update signature');
  return res.json();
};

const deleteSignature = async (id: string) => {
  const res = await fetch('/api/signatures', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete signature');
  return res.json();
};

const fetchSignatures = async (): Promise<EquipmentSignature[]> => {
  const res = await fetch('/api/signatures');
  if (!res.ok) throw new Error('Failed to fetch signatures');
  return res.json();
};

interface SignatureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureId: string | null;
}

export function SignatureEditModal({ isOpen, onClose, signatureId }: SignatureEditModalProps) {
  const queryClient = useQueryClient();
  const [signatureName, setSignatureName] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [pointSignature, setPointSignature] = useState<PointSignature[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [source, setSource] = useState<'auto-generated' | 'user-validated' | 'user-created'>('user-validated');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch the signature data
  const { data: signatures } = useQuery({
    queryKey: ['signatures'],
    queryFn: fetchSignatures,
    enabled: isOpen,
  });

  const signature = signatures?.find(s => s.id === signatureId);

  // Load signature data when modal opens
  useEffect(() => {
    if (signature && isOpen) {
      setSignatureName(signature.name);
      setEquipmentType(signature.equipmentType);
      setPointSignature([...signature.pointSignature]);
      setConfidence(signature.confidence);
      setSource(signature.source);
    }
  }, [signature, isOpen]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EquipmentSignature> }) => 
      updateSignature(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      queryClient.invalidateQueries({ queryKey: ['signature-analytics'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      queryClient.invalidateQueries({ queryKey: ['signature-analytics'] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!signatureId || !signatureName.trim() || pointSignature.length === 0) return;
    
    const updates = {
      name: signatureName.trim(),
      equipmentType,
      pointSignature,
      confidence,
      source,
    };

    updateMutation.mutate({ id: signatureId, updates });
  };

  const handleDelete = () => {
    if (!signatureId) return;
    
    if (confirm(`Are you sure you want to delete the signature "${signatureName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(signatureId);
    }
  };

  const handlePointToggle = (point: PointSignature) => {
    const pointKey = `${point.dis}|${point.kind}|${point.unit || ''}`;
    const isIncluded = pointSignature.some(p => `${p.dis}|${p.kind}|${p.unit || ''}` === pointKey);

    if (isIncluded) {
      setPointSignature(current => 
        current.filter(p => `${p.dis}|${p.kind}|${p.unit || ''}` !== pointKey)
      );
    } else {
      setPointSignature(current => [...current, point]);
    }
  };

  const handleAddPoint = () => {
    const newPoint: PointSignature = {
      dis: 'New Point',
      kind: 'Number',
      unit: undefined
    };
    setPointSignature(current => [...current, newPoint]);
  };

  const handlePointEdit = (index: number, field: keyof PointSignature, value: string) => {
    setPointSignature(current => 
      current.map((point, i) => 
        i === index ? { ...point, [field]: value || undefined } : point
      )
    );
  };

  const handlePointRemove = (index: number) => {
    setPointSignature(current => current.filter((_, i) => i !== index));
  };

  // Filter points based on search term
  const filteredPoints = pointSignature.filter(point => {
    if (searchTerm.length < 2) return true;
    const searchLower = searchTerm.toLowerCase();
    return point.dis.toLowerCase().includes(searchLower) ||
           point.kind.toLowerCase().includes(searchLower) ||
           (point.unit && point.unit.toLowerCase().includes(searchLower));
  });

  if (!isOpen || !signature) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Edit Signature: {signature.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature Name *
              </label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment Type
              </label>
              <input
                type="text"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto-generated">Auto-Generated</option>
                <option value="user-validated">User-Validated</option>
                <option value="user-created">User-Created</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence: {confidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Matching Equipment Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded border">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Matching Equipment ({signature.matchingEquipmentIds.length})
            </div>
            <div className="text-xs text-gray-600">
              {signature.matchingEquipmentIds.length > 0 
                ? signature.matchingEquipmentIds.join(', ')
                : 'No equipment currently matches this signature'
              }
            </div>
          </div>

          {/* Point Signature Management */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Point Signature ({pointSignature.length} points)
                {searchTerm.length >= 2 && ` (${filteredPoints.length} shown)`}
              </h3>
              <button
                onClick={handleAddPoint}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Add Point
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search points..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-3 min-h-0">
              <div className="space-y-3">
                {filteredPoints.map((point, index) => {
                  const originalIndex = pointSignature.findIndex(p => 
                    p.dis === point.dis && p.kind === point.kind && (p.unit || '') === (point.unit || '')
                  );
                  
                  return (
                    <div key={originalIndex} className="bg-white rounded border p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Point Name</label>
                          <input
                            type="text"
                            value={point.dis}
                            onChange={(e) => handlePointEdit(originalIndex, 'dis', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <select
                            value={point.kind}
                            onChange={(e) => handlePointEdit(originalIndex, 'kind', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Number">Number</option>
                            <option value="Bool">Boolean</option>
                            <option value="String">String</option>
                            <option value="DateTime">DateTime</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Unit</label>
                          <input
                            type="text"
                            value={point.unit || ''}
                            onChange={(e) => handlePointEdit(originalIndex, 'unit', e.target.value)}
                            placeholder="Optional"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handlePointRemove(originalIndex)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            title="Remove point"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {pointSignature.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-lg mb-2">📝</div>
                    <div>No points in signature</div>
                    <button
                      onClick={handleAddPoint}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Add your first point
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 transition-colors"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Signature'}
          </button>
          
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={updateMutation.isPending || !signatureName.trim() || pointSignature.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 