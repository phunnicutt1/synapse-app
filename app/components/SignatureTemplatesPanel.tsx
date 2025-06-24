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

const deleteSignature = async (id: string) => {
  const res = await fetch('/api/signatures', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete signature');
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
    <div className="space-y-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 backdrop-blur-sm">
      {/* Search */}
      <div>
        <label className="form-label">
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search Signatures
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, equipment type, or points..."
          className="form-input"
        />
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Equipment Type Filter */}
        <div>
          <label className="form-label">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h4m6 0h2m-4 4h2m-6 0h4" />
            </svg>
            Equipment Type
          </label>
          <select
            value={equipmentTypeFilter}
            onChange={(e) => onEquipmentTypeChange(e.target.value)}
            className="form-select"
          >
            <option value="">All Types</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="form-label">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Source
          </label>
          <select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            className="form-select"
          >
            <option value="">All Sources</option>
            <option value="auto-generated">Auto-Generated</option>
            <option value="user-validated">User-Validated</option>
          </select>
        </div>

        {/* Confidence Range */}
        <div>
          <label className="form-label">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Min Confidence: {confidenceRange[0]}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={confidenceRange[0]}
            onChange={(e) => onConfidenceRangeChange([parseInt(e.target.value), confidenceRange[1]])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidenceRange[0]}%, #e5e7eb ${confidenceRange[0]}%, #e5e7eb 100%)`
            }}
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
      'auto-generated': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200',
      'user-validated': 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200',
      'user-created': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200',
    };
    return badges[source as keyof typeof badges] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200';
    if (confidence >= 70) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200';
  };

  return (
    <div
      className={`item-card group ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="item-card-title flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {signature.name}
          </h4>
          <div className="flex items-center space-x-3 mb-3">
            <span className={`status-indicator border ${getSourceBadge(signature.source)}`}>
              {signature.source === 'auto-generated' ? (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : signature.source === 'user-validated' ? (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {signature.source === 'auto-generated' ? 'Auto' : signature.source === 'user-validated' ? 'Validated' : 'User-Created'}
            </span>
            <span className={`status-indicator border ${getConfidenceBadge(signature.confidence)}`}>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {signature.confidence}%
            </span>
            <span className="status-indicator bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h4m6 0h2m-4 4h2m-6 0h4" />
              </svg>
              {signature.equipmentType}
            </span>
          </div>
        </div>
      </div>

      {/* Point Signature Preview */}
      <div className="mapping-details">
        <div className="flex items-center mb-2">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span className="mapping-details-label">
            Point Signature ({signature.pointSignature.length} points)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {signature.pointSignature.slice(0, 5).map((point, idx) => (
            <span key={idx} className="px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 text-xs rounded-lg border border-blue-200 font-medium">
              {point.dis}
            </span>
          ))}
          {signature.pointSignature.length > 5 && (
            <span className="px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs rounded-lg border border-gray-200 font-medium">
              +{signature.pointSignature.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="mapping-details mt-3">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="mapping-details-label">Analytics</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="mapping-details-row">
              <span className="mapping-details-label">Matches:</span>
              <span className="mapping-details-value">{analytics.totalMatches}</span>
            </div>
            <div className="mapping-details-row">
              <span className="mapping-details-label">Accuracy:</span>
              <span className="mapping-details-confidence">{Math.round(analytics.accuracy)}%</span>
            </div>
            <div className="mapping-details-row">
              <span className="mapping-details-label">Usage:</span>
              <span className="mapping-details-value">{analytics.usageFrequency}</span>
            </div>
            <div className="mapping-details-row">
              <span className="mapping-details-label">Feedback:</span>
              <div className="flex space-x-2">
                <span className="text-green-600 font-semibold">+{analytics.userFeedback.positive}</span>
                <span className="text-red-600 font-semibold">-{analytics.userFeedback.negative}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-500">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {signature.matchingEquipmentIds.length} equipment matches
        </div>
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onVerify(); }}
            className="action-button review"
            title="Verify signature"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="action-button px-3 py-1.5 text-xs bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all duration-200"
            title="Edit signature"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="action-button unmap"
            title="Delete signature"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl backdrop-blur-sm animate-slide-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-blue-900">
              {selectedSignatures.size} signature{selectedSignatures.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
            >
              Select All ({totalSignatures})
            </button>
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBatchVerify}
            className="action-button map"
          >
            <svg className="action-button-icon w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verify Selected
          </button>
          <button
            onClick={onBatchExport}
            className="action-button review"
          >
            <svg className="action-button-icon w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Selected
          </button>
          <button
            onClick={onBatchDelete}
            className="action-button unmap"
          >
            <svg className="action-button-icon w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
    openSignatureEditModal,
  } = useAppStore();

  // Local state for signature management
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [showEquipmentView, setShowEquipmentView] = useState(true); // Default to equipment view

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

  const deleteSignatureMutation = useMutation({
    mutationFn: deleteSignature,
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
    openSignatureEditModal(signatureId);
  }, [openSignatureEditModal]);

  const handleSignatureDelete = useCallback(async (signatureId: string) => {
    const signature = signatures?.find(s => s.id === signatureId);
    const signatureName = signature?.name || 'signature';
    
    if (confirm(`Are you sure you want to delete "${signatureName}"? This action cannot be undone.`)) {
      deleteSignatureMutation.mutate(signatureId);
    }
  }, [signatures, deleteSignatureMutation]);

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
      if (confirm(`Delete ${signatureManagement.selectedSignatures.size} selected signatures? This action cannot be undone.`)) {
        Array.from(signatureManagement.selectedSignatures).forEach(id => {
          deleteSignatureMutation.mutate(id);
        });
        clearSignatureSelection();
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
        <div className="panel-title">{showEquipmentView ? 'Equipment Mngt' : 'Signature Management'}</div>
        <div className="flex items-center justify-center py-8">
        {showEquipmentView ? ' ' : '<div className="text-gray-500">Loading signatures...</div>'}
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
        <h3 className="panel-title mb-0">{showEquipmentView ? 'Equip Management' : 'Signature Management'}</h3>
        <div className="flex items-center space-x-2">
          {!showEquipmentView && (
            <span className="text-sm text-gray-500">
              {filteredSignatures.length} of {signatures?.length || 0} signatures
            </span>
          )}
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