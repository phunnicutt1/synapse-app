import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  EquipmentFilter, 
  SignatureAnalytics, 
  AutoAssignmentResult,
  BacnetPoint,
  EquipmentSource,
  EquipmentSignature,
  HaystackNormalization
} from '../interfaces/bacnet';

// Enhanced state management interfaces
export interface UserPreferences {
  autoAssignmentEnabled: boolean;
  confidenceThreshold: number;
  showNormalizedNames: boolean;
  defaultEquipmentFilter: EquipmentFilter;
  signatureManagementPrefs: {
    showAnalytics: boolean;
    autoRefreshAnalytics: boolean;
    batchOperationLimit: number;
  };
  uiPreferences: {
    compactView: boolean;
    showConfidenceScores: boolean;
    highlightAutoAssigned: boolean;
    groupByEquipmentType: boolean;
  };
}

export interface NormalizedPointCache {
  [equipmentId: string]: {
    points: BacnetPoint[];
    normalizations: HaystackNormalization[];
    lastUpdated: Date;
    averageConfidence: number;
  };
}

export interface SignatureManagementState {
  selectedSignatures: Set<string>;
  signatureAnalytics: { [signatureId: string]: SignatureAnalytics };
  batchOperationMode: boolean;
  bulkEditMode: boolean;
  signatureSearchQuery: string;
  signatureFilterCriteria: {
    equipmentType?: string;
    source?: 'auto-generated' | 'user-validated';
    minConfidence?: number;
    hasLearningData?: boolean;
  };
}

export interface AutoAssignmentState {
  isProcessing: boolean;
  lastBatchResults: AutoAssignmentResult[];
  pendingAssignments: AutoAssignmentResult[];
  processingProgress: {
    total: number;
    completed: number;
    errors: number;
  };
  autoAssignmentHistory: AutoAssignmentResult[];
  rollbackHistory: {
    batchId: string;
    rollbackTimestamp: Date;
    affectedEquipment: string[];
    reason: string;
  }[];
}

interface AppState {
  // Existing state
  selectedSignatureId: string | null;
  selectedSourceEquipmentId: string | null;
  selectedEquipmentId: string | null;
  isEditModalOpen: boolean;
  expandedSignatureId: string | null;
  expandedEquipmentId: string | null;
  expandedEquipmentTypes: Set<string>;

  // Enhanced filtering state
  equipmentFilter: EquipmentFilter;
  searchQuery: string;
  sortCriteria: {
    field: 'name' | 'confidence' | 'equipmentType' | 'lastUpdated';
    direction: 'asc' | 'desc';
  };

  // Signature management state
  signatureManagement: SignatureManagementState;

  // Auto-assignment state
  autoAssignment: AutoAssignmentState;

  // Normalized point data cache
  normalizedPointCache: NormalizedPointCache;

  // User preferences (persisted)
  userPreferences: UserPreferences;

  // Loading states
  isLoadingEquipment: boolean;
  isLoadingSignatures: boolean;
  isLoadingAnalytics: boolean;

  // Error handling
  lastError: string | null;
  errorHistory: { timestamp: Date; error: string; context: string }[];

  // Actions for existing functionality
  setSelectedSignatureId: (id: string | null) => void;
  setSelectedSourceEquipmentId: (id: string | null) => void;
  setSelectedEquipmentId: (id: string | null) => void;
  openEditModal: () => void;
  closeEditModal: () => void;
  setExpandedSignatureId: (id: string | null) => void;
  setExpandedEquipmentId: (id: string | null) => void;
  toggleExpandedEquipmentType: (type: string) => void;

  // Enhanced filtering actions
  setEquipmentFilter: (filter: Partial<EquipmentFilter>) => void;
  resetEquipmentFilter: () => void;
  setSearchQuery: (query: string) => void;
  setSortCriteria: (field: string, direction: 'asc' | 'desc') => void;

  // Signature management actions
  toggleSignatureSelection: (signatureId: string) => void;
  selectAllSignatures: (signatureIds: string[]) => void;
  clearSignatureSelection: () => void;
  setBatchOperationMode: (enabled: boolean) => void;
  setBulkEditMode: (enabled: boolean) => void;
  setSignatureSearchQuery: (query: string) => void;
  setSignatureFilterCriteria: (criteria: Partial<SignatureManagementState['signatureFilterCriteria']>) => void;
  updateSignatureAnalytics: (signatureId: string, analytics: SignatureAnalytics) => void;

  // Auto-assignment actions
  setAutoAssignmentProcessing: (processing: boolean) => void;
  updateProcessingProgress: (progress: Partial<AutoAssignmentState['processingProgress']>) => void;
  addAutoAssignmentResults: (results: AutoAssignmentResult[]) => void;
  addPendingAssignment: (assignment: AutoAssignmentResult) => void;
  removePendingAssignment: (equipmentId: string) => void;
  addRollbackRecord: (record: AutoAssignmentState['rollbackHistory'][0]) => void;
  clearAutoAssignmentHistory: () => void;

  // Normalized point cache actions
  updateNormalizedPointCache: (equipmentId: string, data: NormalizedPointCache[string]) => void;
  clearNormalizedPointCache: (equipmentId?: string) => void;
  getNormalizedPoints: (equipmentId: string) => BacnetPoint[] | null;

  // User preferences actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  resetUserPreferences: () => void;
  setConfidenceThreshold: (threshold: number) => void;
  toggleAutoAssignment: () => void;
  toggleNormalizedNameDisplay: () => void;

  // Loading state actions
  setLoadingState: (state: 'equipment' | 'signatures' | 'analytics', loading: boolean) => void;

  // Error handling actions
  setError: (error: string, context?: string) => void;
  clearError: () => void;
  clearErrorHistory: () => void;
}

// Default values
const defaultEquipmentFilter: EquipmentFilter = {
  status: 'all',
  equipmentType: undefined,
  vendor: undefined,
  confidenceRange: undefined,
  hasNormalization: undefined,
  autoAssigned: undefined,
};

const defaultUserPreferences: UserPreferences = {
  autoAssignmentEnabled: true,
  confidenceThreshold: 95,
  showNormalizedNames: true,
  defaultEquipmentFilter: defaultEquipmentFilter,
  signatureManagementPrefs: {
    showAnalytics: true,
    autoRefreshAnalytics: true,
    batchOperationLimit: 50,
  },
  uiPreferences: {
    compactView: false,
    showConfidenceScores: true,
    highlightAutoAssigned: true,
    groupByEquipmentType: false,
  },
};

const defaultSignatureManagement: SignatureManagementState = {
  selectedSignatures: new Set<string>(),
  signatureAnalytics: {},
  batchOperationMode: false,
  bulkEditMode: false,
  signatureSearchQuery: '',
  signatureFilterCriteria: {},
};

const defaultAutoAssignmentState: AutoAssignmentState = {
  isProcessing: false,
  lastBatchResults: [],
  pendingAssignments: [],
  processingProgress: {
    total: 0,
    completed: 0,
    errors: 0,
  },
  autoAssignmentHistory: [],
  rollbackHistory: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Existing state
      selectedSignatureId: null,
      selectedSourceEquipmentId: null,
      selectedEquipmentId: null,
      isEditModalOpen: false,
      expandedSignatureId: null,
      expandedEquipmentId: null,
      expandedEquipmentTypes: new Set<string>(),

      // Enhanced filtering state
      equipmentFilter: defaultEquipmentFilter,
      searchQuery: '',
      sortCriteria: {
        field: 'name',
        direction: 'asc',
      },

      // Signature management state
      signatureManagement: defaultSignatureManagement,

      // Auto-assignment state
      autoAssignment: defaultAutoAssignmentState,

      // Normalized point cache
      normalizedPointCache: {},

      // User preferences
      userPreferences: defaultUserPreferences,

      // Loading states
      isLoadingEquipment: false,
      isLoadingSignatures: false,
      isLoadingAnalytics: false,

      // Error handling
      lastError: null,
      errorHistory: [],

      // Existing actions
      setSelectedSignatureId: (id) => set({ 
        selectedSignatureId: id, 
        selectedSourceEquipmentId: null 
      }),
      setSelectedSourceEquipmentId: (id) => set({ selectedSourceEquipmentId: id }),
      setSelectedEquipmentId: (id) => set({ selectedEquipmentId: id }),
      openEditModal: () => set({ isEditModalOpen: true }),
      closeEditModal: () => set({ isEditModalOpen: false }),
      setExpandedSignatureId: (id) => set({ expandedSignatureId: id }),
      setExpandedEquipmentId: (id) => set({ expandedEquipmentId: id }),
      toggleExpandedEquipmentType: (type) => set((state) => {
        const newExpanded = new Set(state.expandedEquipmentTypes);
        if (newExpanded.has(type)) {
          newExpanded.delete(type);
        } else {
          newExpanded.add(type);
        }
        return { expandedEquipmentTypes: newExpanded };
      }),

      // Enhanced filtering actions
      setEquipmentFilter: (filter) => set((state) => ({
        equipmentFilter: { ...state.equipmentFilter, ...filter }
      })),
      resetEquipmentFilter: () => set({ equipmentFilter: defaultEquipmentFilter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortCriteria: (field, direction) => set({
        sortCriteria: { field: field as any, direction }
      }),

      // Signature management actions
      toggleSignatureSelection: (signatureId) => set((state) => {
        const newSelected = new Set(state.signatureManagement.selectedSignatures);
        if (newSelected.has(signatureId)) {
          newSelected.delete(signatureId);
        } else {
          newSelected.add(signatureId);
        }
        return {
          signatureManagement: {
            ...state.signatureManagement,
            selectedSignatures: newSelected
          }
        };
      }),
      selectAllSignatures: (signatureIds) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          selectedSignatures: new Set(signatureIds)
        }
      })),
      clearSignatureSelection: () => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          selectedSignatures: new Set<string>()
        }
      })),
      setBatchOperationMode: (enabled) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          batchOperationMode: enabled
        }
      })),
      setBulkEditMode: (enabled) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          bulkEditMode: enabled
        }
      })),
      setSignatureSearchQuery: (query) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          signatureSearchQuery: query
        }
      })),
      setSignatureFilterCriteria: (criteria) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          signatureFilterCriteria: {
            ...state.signatureManagement.signatureFilterCriteria,
            ...criteria
          }
        }
      })),
      updateSignatureAnalytics: (signatureId, analytics) => set((state) => ({
        signatureManagement: {
          ...state.signatureManagement,
          signatureAnalytics: {
            ...state.signatureManagement.signatureAnalytics,
            [signatureId]: analytics
          }
        }
      })),

      // Auto-assignment actions
      setAutoAssignmentProcessing: (processing) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          isProcessing: processing
        }
      })),
      updateProcessingProgress: (progress) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          processingProgress: {
            ...state.autoAssignment.processingProgress,
            ...progress
          }
        }
      })),
      addAutoAssignmentResults: (results) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          lastBatchResults: results,
          autoAssignmentHistory: [
            ...state.autoAssignment.autoAssignmentHistory,
            ...results
          ].slice(-1000) // Keep last 1000 records
        }
      })),
      addPendingAssignment: (assignment) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          pendingAssignments: [...state.autoAssignment.pendingAssignments, assignment]
        }
      })),
      removePendingAssignment: (equipmentId) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          pendingAssignments: state.autoAssignment.pendingAssignments.filter(
            a => a.equipmentId !== equipmentId
          )
        }
      })),
      addRollbackRecord: (record) => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          rollbackHistory: [record, ...state.autoAssignment.rollbackHistory].slice(0, 100)
        }
      })),
      clearAutoAssignmentHistory: () => set((state) => ({
        autoAssignment: {
          ...state.autoAssignment,
          autoAssignmentHistory: [],
          lastBatchResults: []
        }
      })),

      // Normalized point cache actions
      updateNormalizedPointCache: (equipmentId, data) => set((state) => ({
        normalizedPointCache: {
          ...state.normalizedPointCache,
          [equipmentId]: data
        }
      })),
      clearNormalizedPointCache: (equipmentId) => set((state) => {
        if (equipmentId) {
          const { [equipmentId]: removed, ...rest } = state.normalizedPointCache;
          return { normalizedPointCache: rest };
        }
        return { normalizedPointCache: {} };
      }),
      getNormalizedPoints: (equipmentId) => {
        const cached = get().normalizedPointCache[equipmentId];
        return cached?.points || null;
      },

      // User preferences actions
      updateUserPreferences: (preferences) => set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          ...preferences
        }
      })),
      resetUserPreferences: () => set({ userPreferences: defaultUserPreferences }),
      setConfidenceThreshold: (threshold) => set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          confidenceThreshold: Math.max(0, Math.min(100, threshold))
        }
      })),
      toggleAutoAssignment: () => set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          autoAssignmentEnabled: !state.userPreferences.autoAssignmentEnabled
        }
      })),
      toggleNormalizedNameDisplay: () => set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          showNormalizedNames: !state.userPreferences.showNormalizedNames
        }
      })),

      // Loading state actions
      setLoadingState: (state_type, loading) => set((state) => ({
        [`isLoading${state_type.charAt(0).toUpperCase() + state_type.slice(1)}`]: loading
      } as any)),

      // Error handling actions
      setError: (error, context = 'general') => set((state) => ({
        lastError: error,
        errorHistory: [
          { timestamp: new Date(), error, context },
          ...state.errorHistory
        ].slice(0, 50) // Keep last 50 errors
      })),
      clearError: () => set({ lastError: null }),
      clearErrorHistory: () => set({ errorHistory: [] }),
    }),
    {
      name: 'synapse-app-store',
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        equipmentFilter: state.equipmentFilter,
        expandedEquipmentTypes: Array.from(state.expandedEquipmentTypes),
        signatureManagement: {
          ...state.signatureManagement,
          selectedSignatures: Array.from(state.signatureManagement.selectedSignatures),
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Sets after rehydration
          state.expandedEquipmentTypes = new Set(state.expandedEquipmentTypes as any);
          state.signatureManagement.selectedSignatures = new Set(
            state.signatureManagement.selectedSignatures as any
          );
        }
      },
    }
  )
);