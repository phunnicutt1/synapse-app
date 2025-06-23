import { useMemo } from 'react';
import { useAppStore } from './useAppStore';
import { EquipmentSource } from '../interfaces/bacnet';
import { EquipmentFilterUtils, StateUtils } from '../lib/stateUtils';

/**
 * Hook for equipment filtering and search functionality
 */
export const useEquipmentFiltering = (
  equipment: EquipmentSource[],
  mappedEquipmentIds?: Set<string>
) => {
  const {
    equipmentFilter,
    searchQuery,
    sortCriteria,
    setEquipmentFilter,
    resetEquipmentFilter,
    setSearchQuery,
    setSortCriteria,
  } = useAppStore();

  // Memoized filtered and sorted equipment
  const processedEquipment = useMemo(() => {
    let result = equipment;

    // Apply filters
    if (equipmentFilter) {
      result = EquipmentFilterUtils.filterEquipment(
        result, 
        equipmentFilter, 
        mappedEquipmentIds
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      result = EquipmentFilterUtils.searchEquipment(result, searchQuery);
    }

    // Apply sorting
    if (sortCriteria) {
      result = EquipmentFilterUtils.sortEquipment(
        result,
        sortCriteria.field,
        sortCriteria.direction
      );
    }

    return result;
  }, [equipment, equipmentFilter, searchQuery, sortCriteria, mappedEquipmentIds]);

  // Filter options for dropdowns
  const filterOptions = useMemo(() => {
    return EquipmentFilterUtils.getFilterOptions(equipment);
  }, [equipment]);

  // Statistics
  const statistics = useMemo(() => {
    const total = equipment.length;
    const filtered = processedEquipment.length;
    const mapped = mappedEquipmentIds 
      ? equipment.filter(e => mappedEquipmentIds.has(e.id)).length 
      : 0;
    const unmapped = total - mapped;

    const withNormalization = equipment.filter(
      e => (e.normalizationSummary?.normalizedPoints || 0) > 0
    ).length;

    const averageConfidence = equipment.length > 0
      ? equipment.reduce((sum, e) => sum + (e.normalizationSummary?.averageConfidence || 0), 0) 
        / equipment.length
      : 0;

    return {
      total,
      filtered,
      mapped,
      unmapped,
      withNormalization,
      averageConfidence,
      filteringActive: filtered < total,
    };
  }, [equipment, processedEquipment, mappedEquipmentIds]);

  // Debounced search function
  const debouncedSetSearchQuery = useMemo(
    () => StateUtils.debounce(setSearchQuery, 300),
    [setSearchQuery]
  );

  return {
    // Processed data
    equipment: processedEquipment,
    filterOptions,
    statistics,

    // Current state
    equipmentFilter,
    searchQuery,
    sortCriteria,

    // Actions
    setEquipmentFilter,
    resetEquipmentFilter,
    setSearchQuery: debouncedSetSearchQuery,
    setSortCriteria,

    // Utility functions
    formatConfidence: StateUtils.formatConfidence,
  };
};

/**
 * Hook for signature management functionality
 */
export const useSignatureManagement = () => {
  const {
    signatureManagement,
    toggleSignatureSelection,
    selectAllSignatures,
    clearSignatureSelection,
    setBatchOperationMode,
    setBulkEditMode,
    setSignatureSearchQuery,
    setSignatureFilterCriteria,
    updateSignatureAnalytics,
  } = useAppStore();

  const {
    selectedSignatures,
    signatureAnalytics,
    batchOperationMode,
    bulkEditMode,
    signatureSearchQuery,
    signatureFilterCriteria,
  } = signatureManagement;

  // Selection utilities
  const selectionUtils = useMemo(() => ({
    isSelected: (signatureId: string) => selectedSignatures.has(signatureId),
    selectedCount: selectedSignatures.size,
    hasSelection: selectedSignatures.size > 0,
    selectedIds: Array.from(selectedSignatures),
  }), [selectedSignatures]);

  // Debounced search
  const debouncedSetSignatureSearchQuery = useMemo(
    () => StateUtils.debounce(setSignatureSearchQuery, 300),
    [setSignatureSearchQuery]
  );

  return {
    // State
    selectedSignatures,
    signatureAnalytics,
    batchOperationMode,
    bulkEditMode,
    signatureSearchQuery,
    signatureFilterCriteria,

    // Selection utilities
    selectionUtils,

    // Actions
    toggleSignatureSelection,
    selectAllSignatures,
    clearSignatureSelection,
    setBatchOperationMode,
    setBulkEditMode,
    setSignatureSearchQuery: debouncedSetSignatureSearchQuery,
    setSignatureFilterCriteria,
    updateSignatureAnalytics,
  };
};

/**
 * Hook for auto-assignment functionality
 */
export const useAutoAssignment = () => {
  const {
    autoAssignment,
    userPreferences,
    setAutoAssignmentProcessing,
    updateProcessingProgress,
    addAutoAssignmentResults,
    addPendingAssignment,
    removePendingAssignment,
    addRollbackRecord,
    clearAutoAssignmentHistory,
    toggleAutoAssignment,
    setConfidenceThreshold,
  } = useAppStore();

  const {
    isProcessing,
    lastBatchResults,
    pendingAssignments,
    processingProgress,
    autoAssignmentHistory,
    rollbackHistory,
  } = autoAssignment;

  // Processing statistics
  const processingStats = useMemo(() => {
    const { total, completed, errors } = processingProgress;
    const remaining = Math.max(0, total - completed - errors);
    const progressPercentage = total > 0 ? ((completed + errors) / total) * 100 : 0;
    const successRate = (completed + errors) > 0 ? (completed / (completed + errors)) * 100 : 0;

    return {
      total,
      completed,
      errors,
      remaining,
      progressPercentage,
      successRate,
      isActive: isProcessing && total > 0,
    };
  }, [processingProgress, isProcessing]);

  // Assignment history statistics
  const historyStats = useMemo(() => {
    const totalAssignments = autoAssignmentHistory.length;
    const successfulAssignments = autoAssignmentHistory.filter(
      result => result.status === 'assigned' && result.userFeedback?.confirmed !== false
    ).length;
    const failedAssignments = autoAssignmentHistory.filter(
      result => result.status === 'rolled_back'
    ).length;
    const pendingReview = autoAssignmentHistory.filter(
      result => result.requiresReview && !result.userFeedback
    ).length;

    const overallSuccessRate = totalAssignments > 0 
      ? (successfulAssignments / totalAssignments) * 100 
      : 0;

    return {
      totalAssignments,
      successfulAssignments,
      failedAssignments,
      pendingReview,
      overallSuccessRate,
    };
  }, [autoAssignmentHistory]);

  return {
    // State
    isProcessing,
    lastBatchResults,
    pendingAssignments,
    processingProgress,
    autoAssignmentHistory,
    rollbackHistory,
    
    // User preferences
    autoAssignmentEnabled: userPreferences.autoAssignmentEnabled,
    confidenceThreshold: userPreferences.confidenceThreshold,

    // Statistics
    processingStats,
    historyStats,

    // Actions
    setAutoAssignmentProcessing,
    updateProcessingProgress,
    addAutoAssignmentResults,
    addPendingAssignment,
    removePendingAssignment,
    addRollbackRecord,
    clearAutoAssignmentHistory,
    toggleAutoAssignment,
    setConfidenceThreshold,

    // Utilities
    formatTimestamp: StateUtils.formatTimestamp,
    generateBatchId: StateUtils.generateBatchId,
  };
};

/**
 * Hook for normalized point cache functionality
 */
export const useNormalizedPointCache = () => {
  const {
    normalizedPointCache,
    updateNormalizedPointCache,
    clearNormalizedPointCache,
    getNormalizedPoints,
  } = useAppStore();

  // Cache statistics
  const cacheStats = useMemo(() => {
    const entries = Object.values(normalizedPointCache);
    const totalEntries = entries.length;
    const totalPoints = entries.reduce((sum, entry) => sum + (entry.points?.length || 0), 0);
    const averagePointsPerEquipment = totalEntries > 0 ? totalPoints / totalEntries : 0;
    
    const validEntries = entries.filter(entry => {
      const now = new Date();
      const ageMinutes = (now.getTime() - entry.lastUpdated.getTime()) / (1000 * 60);
      return ageMinutes < 30; // 30 minutes cache validity
    });
    
    const cacheHitRate = totalEntries > 0 ? (validEntries.length / totalEntries) * 100 : 0;

    return {
      totalEntries,
      totalPoints,
      averagePointsPerEquipment,
      cacheHitRate,
      validEntries: validEntries.length,
      expiredEntries: totalEntries - validEntries.length,
    };
  }, [normalizedPointCache]);

  // Cache utilities
  const cacheUtils = useMemo(() => ({
    hasCache: (equipmentId: string) => equipmentId in normalizedPointCache,
    isCacheValid: (equipmentId: string) => {
      const entry = normalizedPointCache[equipmentId];
      if (!entry) return false;
      
      const now = new Date();
      const ageMinutes = (now.getTime() - entry.lastUpdated.getTime()) / (1000 * 60);
      return ageMinutes < 30;
    },
    getCacheAge: (equipmentId: string) => {
      const entry = normalizedPointCache[equipmentId];
      if (!entry) return null;
      
      const now = new Date();
      const ageMinutes = (now.getTime() - entry.lastUpdated.getTime()) / (1000 * 60);
      return ageMinutes;
    },
  }), [normalizedPointCache]);

  return {
    // Cache data
    normalizedPointCache,
    cacheStats,
    cacheUtils,

    // Actions
    updateNormalizedPointCache,
    clearNormalizedPointCache,
    getNormalizedPoints,

    // Utilities
    formatTimestamp: StateUtils.formatTimestamp,
  };
};

/**
 * Hook for user preferences management
 */
export const useUserPreferences = () => {
  const {
    userPreferences,
    updateUserPreferences,
    resetUserPreferences,
    setConfidenceThreshold,
    toggleAutoAssignment,
    toggleNormalizedNameDisplay,
  } = useAppStore();

  // Preference categories
  const preferences = useMemo(() => ({
    general: {
      autoAssignmentEnabled: userPreferences.autoAssignmentEnabled,
      confidenceThreshold: userPreferences.confidenceThreshold,
      showNormalizedNames: userPreferences.showNormalizedNames,
    },
    signatureManagement: userPreferences.signatureManagementPrefs,
    ui: userPreferences.uiPreferences,
    defaultFilter: userPreferences.defaultEquipmentFilter,
  }), [userPreferences]);

  // Validation utilities
  const validationUtils = useMemo(() => ({
    validateConfidenceThreshold: (threshold: number) => {
      return threshold >= 0 && threshold <= 100;
    },
    validateBatchLimit: (limit: number) => {
      return limit > 0 && limit <= 1000;
    },
  }), []);

  return {
    // Preferences
    userPreferences,
    preferences,

    // Validation
    validationUtils,

    // Actions
    updateUserPreferences,
    resetUserPreferences,
    setConfidenceThreshold,
    toggleAutoAssignment,
    toggleNormalizedNameDisplay,
  };
};

/**
 * Hook for loading states and error handling
 */
export const useAppStatus = () => {
  const {
    isLoadingEquipment,
    isLoadingSignatures,
    isLoadingAnalytics,
    lastError,
    errorHistory,
    setLoadingState,
    setError,
    clearError,
    clearErrorHistory,
  } = useAppStore();

  // Loading state utilities
  const loadingUtils = useMemo(() => ({
    isLoading: isLoadingEquipment || isLoadingSignatures || isLoadingAnalytics,
    hasError: !!lastError,
    errorCount: errorHistory.length,
  }), [isLoadingEquipment, isLoadingSignatures, isLoadingAnalytics, lastError, errorHistory]);

  // Error utilities
  const errorUtils = useMemo(() => ({
    getRecentErrors: (hours: number = 24) => {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      return errorHistory.filter(error => error.timestamp > cutoff);
    },
    getErrorsByContext: (context: string) => {
      return errorHistory.filter(error => error.context === context);
    },
  }), [errorHistory]);

  return {
    // Loading states
    isLoadingEquipment,
    isLoadingSignatures,
    isLoadingAnalytics,
    loadingUtils,

    // Error states
    lastError,
    errorHistory,
    errorUtils,

    // Actions
    setLoadingState,
    setError,
    clearError,
    clearErrorHistory,

    // Utilities
    formatTimestamp: StateUtils.formatTimestamp,
  };
}; 