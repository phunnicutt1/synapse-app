import { 
  EquipmentSource, 
  EquipmentFilter, 
  EquipmentSignature,
  SignatureAnalytics,
  AutoAssignmentResult,
  BacnetPoint 
} from '../interfaces/bacnet';

/**
 * Equipment filtering utilities
 */
export class EquipmentFilterUtils {
  /**
   * Apply equipment filter to a list of equipment
   */
  static filterEquipment(
    equipment: EquipmentSource[], 
    filter: EquipmentFilter,
    mappedEquipmentIds: Set<string> = new Set()
  ): EquipmentSource[] {
    return equipment.filter(equip => {
      // Status filter
      if (filter.status !== 'all') {
        const isMapped = mappedEquipmentIds.has(equip.id);
        if (filter.status === 'mapped' && !isMapped) return false;
        if (filter.status === 'unmapped' && isMapped) return false;
      }

      // Equipment type filter
      if (filter.equipmentType && equip.equipmentType !== filter.equipmentType) {
        return false;
      }

      // Vendor filter
      if (filter.vendor && equip.vendorName !== filter.vendor) {
        return false;
      }

      // Confidence range filter
      if (filter.confidenceRange && equip.normalizationSummary) {
        const [min, max] = filter.confidenceRange;
        const confidence = equip.normalizationSummary.averageConfidence;
        if (confidence < min || confidence > max) return false;
      }

      // Normalization filter
      if (filter.hasNormalization !== undefined) {
        const hasNormalization = (equip.normalizationSummary?.normalizedPoints || 0) > 0;
        if (filter.hasNormalization !== hasNormalization) return false;
      }

      return true;
    });
  }

  /**
   * Apply search query to equipment
   */
  static searchEquipment(
    equipment: EquipmentSource[], 
    searchQuery: string
  ): EquipmentSource[] {
    if (!searchQuery.trim()) return equipment;

    const query = searchQuery.toLowerCase();
    return equipment.filter(equip => 
      equip.id.toLowerCase().includes(query) ||
      equip.equipmentType.toLowerCase().includes(query) ||
      (equip.vendorName?.toLowerCase().includes(query)) ||
      (equip.modelName?.toLowerCase().includes(query)) ||
      (equip.fullDescription?.toLowerCase().includes(query))
    );
  }

  /**
   * Sort equipment by specified criteria
   */
  static sortEquipment(
    equipment: EquipmentSource[],
    field: 'name' | 'confidence' | 'equipmentType' | 'lastUpdated',
    direction: 'asc' | 'desc'
  ): EquipmentSource[] {
    const sorted = [...equipment].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'name':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'confidence':
          aValue = a.normalizationSummary?.averageConfidence || 0;
          bValue = b.normalizationSummary?.averageConfidence || 0;
          break;
        case 'equipmentType':
          aValue = a.equipmentType;
          bValue = b.equipmentType;
          break;
        case 'lastUpdated':
          // For now, use id as proxy for last updated
          aValue = a.id;
          bValue = b.id;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }

  /**
   * Get unique values for filter options
   */
  static getFilterOptions(equipment: EquipmentSource[]) {
    const equipmentTypes = [...new Set(equipment.map(e => e.equipmentType))].sort();
    const vendors = [...new Set(equipment.map(e => e.vendorName).filter(Boolean))].sort();
    
    const confidenceRanges = equipment
      .map(e => e.normalizationSummary?.averageConfidence)
      .filter((c): c is number => c !== undefined);
    
    const minConfidence = confidenceRanges.length > 0 ? Math.min(...confidenceRanges) : 0;
    const maxConfidence = confidenceRanges.length > 0 ? Math.max(...confidenceRanges) : 100;

    return {
      equipmentTypes,
      vendors,
      confidenceRange: [minConfidence, maxConfidence] as [number, number]
    };
  }
}

/**
 * Signature management utilities
 */
export class SignatureManagementUtils {
  /**
   * Filter signatures based on criteria
   */
  static filterSignatures(
    signatures: EquipmentSignature[],
    criteria: {
      equipmentType?: string;
      source?: 'auto-generated' | 'user-validated';
      minConfidence?: number;
      hasLearningData?: boolean;
    },
    searchQuery?: string
  ): EquipmentSignature[] {
    let filtered = signatures;

    // Apply criteria filters
    if (criteria.equipmentType) {
      filtered = filtered.filter(sig => sig.equipmentType === criteria.equipmentType);
    }

    if (criteria.source) {
      filtered = filtered.filter(sig => sig.source === criteria.source);
    }

    if (criteria.minConfidence !== undefined) {
      filtered = filtered.filter(sig => sig.confidence >= criteria.minConfidence!);
    }

    if (criteria.hasLearningData !== undefined) {
      filtered = filtered.filter(sig => {
        const hasData = sig.learningData && 
          (sig.learningData.userConfirmations > 0 || sig.learningData.userRejections > 0);
        return criteria.hasLearningData ? hasData : !hasData;
      });
    }

    // Apply search query
    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sig =>
        sig.name.toLowerCase().includes(query) ||
        sig.equipmentType.toLowerCase().includes(query) ||
        sig.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Calculate signature analytics
   */
  static calculateSignatureAnalytics(
    signature: EquipmentSignature,
    assignmentHistory: AutoAssignmentResult[]
  ): SignatureAnalytics {
    const signatureAssignments = assignmentHistory.filter(
      result => result.signatureId === signature.id
    );

    const totalMatches = signatureAssignments.length;
    const accurateMatches = signatureAssignments.filter(
      result => result.userFeedback?.confirmed === true
    ).length;

    const accuracy = totalMatches > 0 ? (accurateMatches / totalMatches) * 100 : 0;
    
    const confidences = signatureAssignments.map(result => result.confidence);
    const averageConfidence = confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : signature.confidence;

    const recentAssignments = signatureAssignments.filter(
      result => result.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
    const usageFrequency = recentAssignments.length;

    const lastUsed = signatureAssignments.length > 0
      ? new Date(Math.max(...signatureAssignments.map(result => result.timestamp.getTime())))
      : new Date();

    const positiveFeeback = signatureAssignments.filter(
      result => result.userFeedback?.confirmed === true
    ).length;

    const negativeFeeback = signatureAssignments.filter(
      result => result.userFeedback?.confirmed === false
    ).length;

    return {
      signatureId: signature.id,
      totalMatches,
      accurateMatches,
      accuracy,
      averageConfidence,
      usageFrequency,
      lastUsed,
      userFeedback: {
        positive: positiveFeeback,
        negative: negativeFeeback
      }
    };
  }

  /**
   * Get signature performance metrics
   */
  static getSignaturePerformanceMetrics(analytics: SignatureAnalytics[]) {
    if (analytics.length === 0) {
      return {
        averageAccuracy: 0,
        totalAssignments: 0,
        topPerformingSignatures: [],
        lowPerformingSignatures: [],
        recentlyUsedSignatures: []
      };
    }

    const averageAccuracy = analytics.reduce((sum, a) => sum + a.accuracy, 0) / analytics.length;
    const totalAssignments = analytics.reduce((sum, a) => sum + a.totalMatches, 0);

    const topPerformingSignatures = analytics
      .filter(a => a.totalMatches >= 5) // Only consider signatures with enough data
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 10);

    const lowPerformingSignatures = analytics
      .filter(a => a.totalMatches >= 5 && a.accuracy < 70) // Poor performing signatures
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    const recentlyUsedSignatures = analytics
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 10);

    return {
      averageAccuracy,
      totalAssignments,
      topPerformingSignatures,
      lowPerformingSignatures,
      recentlyUsedSignatures
    };
  }
}

/**
 * Normalized point cache utilities
 */
export class NormalizedPointCacheUtils {
  /**
   * Check if cached data is still valid
   */
  static isCacheValid(
    cacheEntry: { lastUpdated: Date },
    maxAgeMinutes: number = 30
  ): boolean {
    const now = new Date();
    const ageMinutes = (now.getTime() - cacheEntry.lastUpdated.getTime()) / (1000 * 60);
    return ageMinutes < maxAgeMinutes;
  }

  /**
   * Merge new normalized points with existing cache
   */
  static mergeNormalizedPoints(
    existingPoints: BacnetPoint[],
    newPoints: BacnetPoint[]
  ): BacnetPoint[] {
    const pointMap = new Map<string, BacnetPoint>();
    
    // Add existing points
    existingPoints.forEach(point => {
      pointMap.set(point.id, point);
    });

    // Update with new points
    newPoints.forEach(point => {
      pointMap.set(point.id, point);
    });

    return Array.from(pointMap.values());
  }

  /**
   * Calculate cache statistics
   */
  static getCacheStatistics(cache: { [equipmentId: string]: any }) {
    const entries = Object.values(cache);
    const totalEntries = entries.length;
    const totalPoints = entries.reduce((sum, entry) => sum + (entry.points?.length || 0), 0);
    const averagePointsPerEquipment = totalEntries > 0 ? totalPoints / totalEntries : 0;
    
    const now = new Date();
    const validEntries = entries.filter(entry => 
      this.isCacheValid(entry as { lastUpdated: Date })
    );
    const cacheHitRate = totalEntries > 0 ? (validEntries.length / totalEntries) * 100 : 0;

    return {
      totalEntries,
      totalPoints,
      averagePointsPerEquipment,
      cacheHitRate,
      validEntries: validEntries.length,
      expiredEntries: totalEntries - validEntries.length
    };
  }
}

/**
 * Auto-assignment utilities
 */
export class AutoAssignmentUtils {
  /**
   * Group assignment results by status
   */
  static groupResultsByStatus(results: AutoAssignmentResult[]) {
    return results.reduce((groups, result) => {
      const status = result.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(result);
      return groups;
    }, {} as Record<string, AutoAssignmentResult[]>);
  }

  /**
   * Calculate assignment success rate
   */
  static calculateSuccessRate(results: AutoAssignmentResult[]): number {
    if (results.length === 0) return 0;
    
    const successfulAssignments = results.filter(
      result => result.status === 'assigned' && result.userFeedback?.confirmed !== false
    ).length;
    
    return (successfulAssignments / results.length) * 100;
  }

  /**
   * Get assignment trends over time
   */
  static getAssignmentTrends(
    results: AutoAssignmentResult[],
    days: number = 30
  ) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentResults = results.filter(result => result.timestamp >= cutoffDate);
    
    // Group by day
    const dailyStats = recentResults.reduce((stats, result) => {
      const day = result.timestamp.toISOString().split('T')[0];
      if (!stats[day]) {
        stats[day] = { total: 0, successful: 0, failed: 0 };
      }
      
      stats[day].total++;
      if (result.status === 'assigned') {
        stats[day].successful++;
      } else {
        stats[day].failed++;
      }
      
      return stats;
    }, {} as Record<string, { total: number; successful: number; failed: number }>);

    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        ...stats,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
      }));
  }

  /**
   * Identify equipment requiring review
   */
  static getEquipmentRequiringReview(
    results: AutoAssignmentResult[],
    confidenceThreshold: number = 80
  ): AutoAssignmentResult[] {
    return results.filter(result =>
      result.status === 'assigned' &&
      (result.confidence < confidenceThreshold || result.requiresReview) &&
      !result.userFeedback
    );
  }
}

/**
 * General utility functions
 */
export class StateUtils {
  /**
   * Debounce function for search queries
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Format confidence score for display
   */
  static formatConfidence(confidence: number): string {
    return `${confidence.toFixed(1)}%`;
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString();
  }

  /**
   * Generate unique batch ID
   */
  static generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate equipment filter
   */
  static validateEquipmentFilter(filter: Partial<EquipmentFilter>): string[] {
    const errors: string[] = [];

    if (filter.confidenceRange) {
      const [min, max] = filter.confidenceRange;
      if (min < 0 || min > 100) errors.push('Minimum confidence must be between 0 and 100');
      if (max < 0 || max > 100) errors.push('Maximum confidence must be between 0 and 100');
      if (min > max) errors.push('Minimum confidence cannot be greater than maximum');
    }

    return errors;
  }
} 