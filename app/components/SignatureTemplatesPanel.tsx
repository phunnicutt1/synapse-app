'use client';
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/hooks/useAppStore';
import { useSignatureManagement } from '@/hooks/useEquipmentFiltering';
import { EquipmentSource, EquipmentSignature, SignatureAnalytics } from '@/interfaces/bacnet';

// Fetch functions
const fetchEquipmentByType = async (): Promise<Record<string, EquipmentSource[]>> => {
  const res = await fetch('/api/equipment?groupByType=true');
  if (!res.ok) throw new Error('Failed to fetch equipment');
  return res.json();
};

const fetchSignatures = async (): Promise<EquipmentSignature[]> => {
  const res = await fetch('/api/signatures');
  if (!res.ok) throw new Error('Failed to fetch signatures');
  return res.json();
};

const fetchSignatureAnalytics = async (): Promise<SignatureAnalytics[]> => {
  const res = await fetch('/api/signatures/analytics');
  if (!res.ok) throw new Error('Failed to fetch signature analytics');
  return res.json();
};

const updateSignature = async (id: string, updates: Partial<EquipmentSignature>) => {
  const res = await fetch('/api/signatures', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update signature');
  return res.json();
};

const createSignature = async (signatureData: Omit<EquipmentSignature, 'id'>) => {
  const res = await fetch('/api/signatures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signatureData),
  });
  if (!res.ok) throw new Error('Failed to create signature');
  return res.json();
};

// Filter and search component
interface SignatureFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  equipmentTypeFilter: string;
  onEquipmentTypeChange: (type: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  confidenceRange: [number, number];
  onConfidenceRangeChange: (range: [number, number]) => void;
  availableTypes: string[];
}

const SignatureFilters: React.FC<SignatureFiltersProps> = ({
  searchTerm,
  onSearchChange,
  equipmentTypeFilter,
  onEquipmentTypeChange,
  sourceFilter,
  onSourceFilterChange,
  confidenceRange,
  onConfidenceRangeChange,
  availableTypes,
}) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Signatures
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, equipment type, or points..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Equipment Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipment Type
          </label>
          <select
            value={equipmentTypeFilter}
            onChange={(e) => onEquipmentTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            <option value="auto-generated">Auto-Generated</option>
            <option value="user-validated">User-Validated</option>
          </select>
        </div>

        {/* Confidence Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Confidence: {confidenceRange[0]}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={confidenceRange[0]}
            onChange={(e) => onConfidenceRangeChange([parseInt(e.target.value), confidenceRange[1]])}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

// Signature card component
interface SignatureCardProps {
  signature: EquipmentSignature;
  analytics?: SignatureAnalytics;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: () => void;
}

const SignatureCard: React.FC<SignatureCardProps> = ({
  signature,
  analytics,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onVerify,
}) => {
  const getSourceBadge = (source: string) => {
    const badges = {
      'auto-generated': 'bg-blue-100 text-blue-800',
      'user-validated': 'bg-green-100 text-green-800',
    };
    return badges[source as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{signature.name}</h4>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceBadge(signature.source)}`}>
              {signature.source === 'auto-generated' ? 'Auto' : 'Validated'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(signature.confidence)}`}>
              {signature.confidence}%
            </span>
            <span className="text-xs text-gray-500">
              {signature.equipmentType}
            </span>
          </div>
        </div>
      </div>

      {/* Point Signature Preview */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">
          Point Signature ({signature.pointSignature.length} points):
        </div>
        <div className="flex flex-wrap gap-1">
          {signature.pointSignature.slice(0, 5).map((point, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded">
              {point.dis}
            </span>
          ))}
          {signature.pointSignature.length > 5 && (
            <span className="px-2 py-1 bg-gray-100 text-xs rounded">
              +{signature.pointSignature.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="mb-3 p-2 bg-white rounded border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Matches:</span>
              <span className="ml-1 font-medium">{analytics.totalMatches}</span>
            </div>
            <div>
              <span className="text-gray-600">Accuracy:</span>
              <span className="ml-1 font-medium">{Math.round(analytics.accuracy)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Usage:</span>
              <span className="ml-1 font-medium">{analytics.usageFrequency}</span>
            </div>
            <div>
              <span className="text-gray-600">Feedback:</span>
              <span className="ml-1 text-green-600">+{analytics.userFeedback.positive}</span>
              <span className="ml-1 text-red-600">-{analytics.userFeedback.negative}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {signature.matchingEquipmentIds.length} equipment matches
        </div>
        <div className="flex space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); onVerify(); }}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Verify signature"
          >
            ✓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Edit signature"
          >
            ✏
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            title="Delete signature"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// Batch operations component
interface BatchOperationsProps {
  selectedSignatures: Set<string>;
  onBatchVerify: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  totalSignatures: number;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedSignatures,
  onBatchVerify,
  onBatchDelete,
  onBatchExport,
  onSelectAll,
  onClearSelection,
  totalSignatures,
}) => {
  if (selectedSignatures.size === 0) return null;

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedSignatures.size} signature{selectedSignatures.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Select All ({totalSignatures})
            </button>
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear Selection
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onBatchVerify}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Verify Selected
          </button>
          <button
            onClick={onBatchExport}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Export Selected
          </button>
          <button
            onClick={onBatchDelete}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export function SignatureTemplatesPanel() {
  const queryClient = useQueryClient();
  const { 
    selectedEquipmentId, 
    setSelectedEquipmentId, 
    expandedEquipmentTypes, 
    toggleExpandedEquipmentType,
    signatureManagement,
    toggleSignatureSelection,
    clearSignatureSelection,
    updateSignatureAnalytics,
  } = useAppStore();

  // Local state for signature management
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [showEquipmentView, setShowEquipmentView] = useState(false);

  // Data fetching
  const { data: initData } = useQuery({
    queryKey: ['init'],
    queryFn: () => fetch('/api/init').then(res => res.json()),
  });

  const { data: equipmentByType, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment-by-type'],
    queryFn: fetchEquipmentByType,
    enabled: !!initData,
  });

  const { data: signatures, isLoading: signaturesLoading, error: signaturesError } = useQuery({
    queryKey: ['signatures'],
    queryFn: fetchSignatures,
    enabled: !!initData,
  });

  const { data: analytics } = useQuery({
    queryKey: ['signature-analytics'],
    queryFn: fetchSignatureAnalytics,
    enabled: !!initData,
  });

  // Mutations
  const updateSignatureMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EquipmentSignature> }) => 
      updateSignature(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      queryClient.invalidateQueries({ queryKey: ['signature-analytics'] });
    },
  });

  const createSignatureMutation = useMutation({
    mutationFn: createSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  // Filtered and searched signatures
  const filteredSignatures = useMemo(() => {
    if (!signatures) return [];

    return signatures.filter(signature => {
      // Search filter
      const searchMatch = !searchTerm || 
        signature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signature.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signature.pointSignature.some(p => p.dis.toLowerCase().includes(searchTerm.toLowerCase()));

      // Equipment type filter
      const typeMatch = !equipmentTypeFilter || signature.equipmentType === equipmentTypeFilter;

      // Source filter
      const sourceMatch = !sourceFilter || signature.source === sourceFilter;

      // Confidence filter
      const confidenceMatch = signature.confidence >= confidenceRange[0] && 
                             signature.confidence <= confidenceRange[1];

      return searchMatch && typeMatch && sourceMatch && confidenceMatch;
    });
  }, [signatures, searchTerm, equipmentTypeFilter, sourceFilter, confidenceRange]);

  // Available equipment types for filter
  const availableTypes = useMemo(() => {
    if (!signatures) return [];
    return [...new Set(signatures.map(s => s.equipmentType))].sort();
  }, [signatures]);

  // Analytics lookup
  const analyticsLookup = useMemo(() => {
    if (!analytics) return {};
    return analytics.reduce((acc, a) => ({ ...acc, [a.signatureId]: a }), {} as Record<string, SignatureAnalytics>);
  }, [analytics]);

  // Event handlers
  const handleSignatureSelect = useCallback((signatureId: string) => {
    setSelectedSignatureId(prev => prev === signatureId ? null : signatureId);
  }, []);

  const handleSignatureEdit = useCallback((signatureId: string) => {
    // TODO: Implement signature editing modal
    console.log('Edit signature:', signatureId);
  }, []);

  const handleSignatureDelete = useCallback(async (signatureId: string) => {
    if (confirm('Are you sure you want to delete this signature?')) {
      // TODO: Implement signature deletion
      console.log('Delete signature:', signatureId);
    }
  }, []);

  const handleSignatureVerify = useCallback(async (signatureId: string) => {
    const updates = { 
      source: 'user-validated' as const,
      confidence: Math.min(100, (signatures?.find(s => s.id === signatureId)?.confidence || 0) + 10)
    };
    updateSignatureMutation.mutate({ id: signatureId, updates });
  }, [signatures, updateSignatureMutation]);

  const handleBatchOperations = {
    verify: () => {
      Array.from(signatureManagement.selectedSignatures).forEach(id => {
        handleSignatureVerify(id);
      });
    },
    delete: () => {
      if (confirm(`Delete ${signatureManagement.selectedSignatures.size} selected signatures?`)) {
        // TODO: Implement batch delete
        console.log('Batch delete:', Array.from(signatureManagement.selectedSignatures));
      }
    },
    export: () => {
      const selectedSigs = signatures?.filter(s => signatureManagement.selectedSignatures.has(s.id));
      if (selectedSigs) {
        const dataStr = JSON.stringify(selectedSigs, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'signatures.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    },
    selectAll: () => {
      filteredSignatures.forEach(signature => {
        if (!signatureManagement.selectedSignatures.has(signature.id)) {
          toggleSignatureSelection(signature.id);
        }
      });
    },
    clearSelection: () => {
      clearSignatureSelection();
    }
  };

  // Loading states
  if (equipmentLoading || signaturesLoading) {
    return (
      <div className="panel">
        <div className="panel-title">{showEquipmentView ? 'Equipment Management' : 'Signature Management'}</div>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading signatures...</div>
        </div>
      </div>
    );
  }

  if (signaturesError) {
    return (
      <div className="panel">
        <div className="panel-title">{showEquipmentView ? 'Equipment Management' : 'Signature Management'}</div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          Error loading signatures. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="panel-title mb-0">{showEquipmentView ? 'Equipment Management' : 'Signature Management'}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredSignatures.length} of {signatures?.length || 0} signatures
          </span>
          <button
            onClick={() => setShowEquipmentView(!showEquipmentView)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              showEquipmentView 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showEquipmentView ? 'Signature View' : 'Equipment View'}
          </button>
        </div>
      </div>

      <div className="panel-content">
        {showEquipmentView ? (
          // Equipment View (Original functionality)
          <div>
            {Object.keys(equipmentByType || {}).sort().map((equipmentType) => {
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
                      <button className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors">
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
        ) : (
          // Signature Management View
          <div className="space-y-4">
            {/* Filters */}
            <SignatureFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              equipmentTypeFilter={equipmentTypeFilter}
              onEquipmentTypeChange={setEquipmentTypeFilter}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              confidenceRange={confidenceRange}
              onConfidenceRangeChange={setConfidenceRange}
              availableTypes={availableTypes}
            />

            {/* Batch Operations */}
            <BatchOperations
              selectedSignatures={signatureManagement.selectedSignatures}
              onBatchVerify={handleBatchOperations.verify}
              onBatchDelete={handleBatchOperations.delete}
              onBatchExport={handleBatchOperations.export}
              onSelectAll={handleBatchOperations.selectAll}
              onClearSelection={handleBatchOperations.clearSelection}
              totalSignatures={filteredSignatures.length}
            />

            {/* Signature List */}
            <div className="space-y-3">
              {filteredSignatures.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg mb-2">🔍</div>
                  <div>No signatures found matching current filters</div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setEquipmentTypeFilter('');
                      setSourceFilter('');
                      setConfidenceRange([0, 100]);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filteredSignatures.map((signature) => (
                  <SignatureCard
                    key={signature.id}
                    signature={signature}
                    analytics={analyticsLookup[signature.id]}
                    isSelected={signatureManagement.selectedSignatures.has(signature.id)}
                    onSelect={() => {
                      toggleSignatureSelection(signature.id);
                    }}
                    onEdit={() => handleSignatureEdit(signature.id)}
                    onDelete={() => handleSignatureDelete(signature.id)}
                    onVerify={() => handleSignatureVerify(signature.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}