'use client';

import React from 'react';
import { 
  useEquipmentFiltering, 
  useSignatureManagement, 
  useAutoAssignment, 
  useNormalizedPointCache,
  useUserPreferences,
  useAppStatus 
} from '../hooks/useEquipmentFiltering';

/**
 * Demonstration component showing enhanced state management capabilities
 */
export const StateManagementDemo: React.FC = () => {
  // Mock data for demonstration
  const mockEquipment = [
    {
      id: 'AHU-1',
      connectorId: 'conn-1',
      equipmentType: 'AHU',
      vendorName: 'Schneider Electric',
      modelName: 'Model-A',
      points: [],
      normalizationSummary: {
        totalPoints: 25,
        normalizedPoints: 20,
        averageConfidence: 85.5
      }
    },
    {
      id: 'VAV-1',
      connectorId: 'conn-2',
      equipmentType: 'VAV',
      vendorName: 'Johnson Controls',
      modelName: 'Model-B',
      points: [],
      normalizationSummary: {
        totalPoints: 15,
        normalizedPoints: 12,
        averageConfidence: 72.3
      }
    }
  ];

  const mappedEquipmentIds = new Set(['AHU-1']);

  // Use enhanced state management hooks
  const equipmentFiltering = useEquipmentFiltering(mockEquipment, mappedEquipmentIds);
  const signatureManagement = useSignatureManagement();
  const autoAssignment = useAutoAssignment();
  const normalizedPointCache = useNormalizedPointCache();
  const userPreferences = useUserPreferences();
  const appStatus = useAppStatus();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Enhanced State Management Demo
        </h1>
        
        {/* Equipment Filtering Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Equipment Filtering & Search
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Filter Statistics</h3>
              <div className="space-y-1 text-sm">
                <div>Total Equipment: {equipmentFiltering.statistics.total}</div>
                <div>Filtered Results: {equipmentFiltering.statistics.filtered}</div>
                <div>Mapped: {equipmentFiltering.statistics.mapped}</div>
                <div>Unmapped: {equipmentFiltering.statistics.unmapped}</div>
                <div>Avg Confidence: {equipmentFiltering.formatConfidence(equipmentFiltering.statistics.averageConfidence)}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Current Filter</h3>
              <div className="space-y-1 text-sm">
                <div>Status: {equipmentFiltering.equipmentFilter.status}</div>
                <div>Equipment Type: {equipmentFiltering.equipmentFilter.equipmentType || 'All'}</div>
                <div>Vendor: {equipmentFiltering.equipmentFilter.vendor || 'All'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Filter Options</h3>
              <div className="space-y-1 text-sm">
                <div>Equipment Types: {equipmentFiltering.filterOptions.equipmentTypes.join(', ')}</div>
                <div>Vendors: {equipmentFiltering.filterOptions.vendors.join(', ')}</div>
                <div>Confidence Range: {equipmentFiltering.filterOptions.confidenceRange.join(' - ')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Signature Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Selection State</h3>
              <div className="space-y-1 text-sm">
                <div>Selected Count: {signatureManagement.selectionUtils.selectedCount}</div>
                <div>Has Selection: {signatureManagement.selectionUtils.hasSelection ? 'Yes' : 'No'}</div>
                <div>Batch Mode: {signatureManagement.batchOperationMode ? 'Enabled' : 'Disabled'}</div>
                <div>Bulk Edit: {signatureManagement.bulkEditMode ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Filter Criteria</h3>
              <div className="space-y-1 text-sm">
                <div>Equipment Type: {signatureManagement.signatureFilterCriteria.equipmentType || 'All'}</div>
                <div>Source: {signatureManagement.signatureFilterCriteria.source || 'All'}</div>
                <div>Min Confidence: {signatureManagement.signatureFilterCriteria.minConfidence || 'None'}</div>
                <div>Has Learning Data: {signatureManagement.signatureFilterCriteria.hasLearningData?.toString() || 'All'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Assignment Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Auto-Assignment System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Processing Status</h3>
              <div className="space-y-1 text-sm">
                <div>Is Processing: {autoAssignment.isProcessing ? 'Yes' : 'No'}</div>
                <div>Progress: {autoAssignment.processingStats.progressPercentage.toFixed(1)}%</div>
                <div>Success Rate: {autoAssignment.processingStats.successRate.toFixed(1)}%</div>
                <div>Remaining: {autoAssignment.processingStats.remaining}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">History Statistics</h3>
              <div className="space-y-1 text-sm">
                <div>Total Assignments: {autoAssignment.historyStats.totalAssignments}</div>
                <div>Successful: {autoAssignment.historyStats.successfulAssignments}</div>
                <div>Failed: {autoAssignment.historyStats.failedAssignments}</div>
                <div>Pending Review: {autoAssignment.historyStats.pendingReview}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Settings</h3>
              <div className="space-y-1 text-sm">
                <div>Auto-Assignment: {autoAssignment.autoAssignmentEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Confidence Threshold: {autoAssignment.confidenceThreshold}%</div>
                <div>Pending Assignments: {autoAssignment.pendingAssignments.length}</div>
                <div>Rollback History: {autoAssignment.rollbackHistory.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Normalized Point Cache Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Normalized Point Cache
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Cache Statistics</h3>
              <div className="space-y-1 text-sm">
                <div>Total Entries: {normalizedPointCache.cacheStats.totalEntries}</div>
                <div>Total Points: {normalizedPointCache.cacheStats.totalPoints}</div>
                <div>Avg Points/Equipment: {normalizedPointCache.cacheStats.averagePointsPerEquipment.toFixed(1)}</div>
                <div>Cache Hit Rate: {normalizedPointCache.cacheStats.cacheHitRate.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Cache Health</h3>
              <div className="space-y-1 text-sm">
                <div>Valid Entries: {normalizedPointCache.cacheStats.validEntries}</div>
                <div>Expired Entries: {normalizedPointCache.cacheStats.expiredEntries}</div>
                <div>Example Equipment Cached: {normalizedPointCache.cacheUtils.hasCache('AHU-1') ? 'Yes' : 'No'}</div>
                <div>Example Cache Valid: {normalizedPointCache.cacheUtils.isCacheValid('AHU-1') ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Preferences Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            User Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">General</h3>
              <div className="space-y-1 text-sm">
                <div>Auto-Assignment: {userPreferences.preferences.general.autoAssignmentEnabled ? 'On' : 'Off'}</div>
                <div>Confidence Threshold: {userPreferences.preferences.general.confidenceThreshold}%</div>
                <div>Show Normalized Names: {userPreferences.preferences.general.showNormalizedNames ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Signature Management</h3>
              <div className="space-y-1 text-sm">
                <div>Show Analytics: {userPreferences.preferences.signatureManagement.showAnalytics ? 'Yes' : 'No'}</div>
                <div>Auto Refresh: {userPreferences.preferences.signatureManagement.autoRefreshAnalytics ? 'Yes' : 'No'}</div>
                <div>Batch Limit: {userPreferences.preferences.signatureManagement.batchOperationLimit}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">UI Preferences</h3>
              <div className="space-y-1 text-sm">
                <div>Compact View: {userPreferences.preferences.ui.compactView ? 'Yes' : 'No'}</div>
                <div>Show Confidence: {userPreferences.preferences.ui.showConfidenceScores ? 'Yes' : 'No'}</div>
                <div>Highlight Auto-Assigned: {userPreferences.preferences.ui.highlightAutoAssigned ? 'Yes' : 'No'}</div>
                <div>Group by Type: {userPreferences.preferences.ui.groupByEquipmentType ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Default Filter</h3>
              <div className="space-y-1 text-sm">
                <div>Status: {userPreferences.preferences.defaultFilter.status}</div>
                <div>Equipment Type: {userPreferences.preferences.defaultFilter.equipmentType || 'All'}</div>
                <div>Vendor: {userPreferences.preferences.defaultFilter.vendor || 'All'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* App Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Application Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Loading States</h3>
              <div className="space-y-1 text-sm">
                <div>Equipment Loading: {appStatus.isLoadingEquipment ? 'Yes' : 'No'}</div>
                <div>Signatures Loading: {appStatus.isLoadingSignatures ? 'Yes' : 'No'}</div>
                <div>Analytics Loading: {appStatus.isLoadingAnalytics ? 'Yes' : 'No'}</div>
                <div>Any Loading: {appStatus.loadingUtils.isLoading ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Error Handling</h3>
              <div className="space-y-1 text-sm">
                <div>Has Error: {appStatus.loadingUtils.hasError ? 'Yes' : 'No'}</div>
                <div>Last Error: {appStatus.lastError || 'None'}</div>
                <div>Error Count: {appStatus.loadingUtils.errorCount}</div>
                <div>Recent Errors (24h): {appStatus.errorUtils.getRecentErrors(24).length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons Section */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Interactive Controls
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => equipmentFiltering.setEquipmentFilter({ status: 'mapped' })}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Filter Mapped Equipment
            </button>
            
            <button
              onClick={() => equipmentFiltering.setEquipmentFilter({ status: 'unmapped' })}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Filter Unmapped Equipment
            </button>
            
            <button
              onClick={() => equipmentFiltering.resetEquipmentFilter()}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset Filter
            </button>
            
            <button
              onClick={() => signatureManagement.setBatchOperationMode(!signatureManagement.batchOperationMode)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Toggle Batch Mode
            </button>
            
            <button
              onClick={() => userPreferences.toggleAutoAssignment()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Toggle Auto-Assignment
            </button>
            
            <button
              onClick={() => userPreferences.toggleNormalizedNameDisplay()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Toggle Normalized Names
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 