export interface BacnetPoint {
    id: string;
    dis: string;
    bacnetCur: string;
    kind: 'Number' | 'Bool' | 'Str';
    unit?: string;
    writable: boolean;
    bacnetDesc: string;
    // Haystack integration fields
    normalizedName?: string;
    haystackTags?: string[];
    normalizationConfidence?: number;
    // Semantic metadata fields
    semanticMetadata?: {
      vendorSpecific: boolean;
      equipmentSpecific: boolean;
      deviceContext: {
        isVFD: boolean;
        isController: boolean;
        isMonitoring: boolean;
        communicationProtocol: string;
      };
      reasoning: string[];
    };
  }
  
  export interface Connector {
    id: string;
    dis: string;
    connStatus: 'ok' | 'fault' | 'disabled';
    vendorName?: string;
    modelName?: string;
    descriptionFromVendor?: string;
    bacnetDeviceName?: string;
    bacnetDeviceStatus?: string;
    bacnetVersion?: string;
    connState?: string;
    uri?: string;
    additionalDescriptiveFields?: Record<string, string>;
    fullDescription?: string;
  }
  
  export interface EquipmentSource {
    id: string;
    connectorId: string;
    equipmentType: string;
    vendorName?: string;
    modelName?: string;
    points: BacnetPoint[];
    fullDescription?: string;
    bacnetDeviceName?: string;
    bacnetDeviceStatus?: string;
    bacnetVersion?: string;
    connState?: string;
    uri?: string;
    additionalDescriptiveFields?: Record<string, string>;
    // Haystack integration fields
    haystackEquipTags?: string[];
    normalizationSummary?: {
      totalPoints: number;
      normalizedPoints: number;
      averageConfidence: number;
    };
  }
  
  export interface EquipmentSignature {
    id: string;
    name: string;
    equipmentType: string;
    pointSignature: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[];
    source: 'auto-generated' | 'user-validated' | 'user-created';
    confidence: number;
    matchingEquipmentIds: string[];
    // Enhanced confidence and learning fields
    detailedConfidence?: {
      patternMatch: number;
      vendorMatch: number;
      equipmentTypeMatch: number;
      historicalAccuracy: number;
    };
    learningData?: {
      userConfirmations: number;
      userRejections: number;
      lastUpdated: Date;
      accuracyTrend: number[];
    };
  }

  // Haystack-specific interfaces for normalization and classification
  export interface HaystackNormalization {
    originalName: string;
    normalizedName: string;
    tags: string[];
    confidence: number;
    method: 'pattern-match' | 'vendor-specific' | 'manual-override';
    timestamp: Date;
  }

  export interface NormalizationRule {
    id: string;
    name: string;
    pattern: string | RegExp;
    replacement: string;
    tags: string[];
    equipmentTypes?: string[];
    vendors?: string[];
    priority: number;
    isActive: boolean;
  }

  export interface PointClassification {
    pointId: string;
    classification: 'sensor' | 'setpoint' | 'command' | 'status' | 'alarm' | 'unknown';
    subClassification?: string;
    confidence: number;
    reasoning: string[];
  }

  export interface ConfidenceFactors {
    pointNameSimilarity: number;
    pointCountMatch: number;
    pointTypeMatch: number;
    vendorModelMatch: number;
    equipmentTypeMatch: number;
    historicalAccuracy: number;
    semanticSimilarity: number;
    structuralConsistency: number;
  }

  export interface SignatureMatchResult {
    signatureId: string;
    confidence: number;
    factors: ConfidenceFactors;
    reasoning: string[];
    autoAssignmentEligible: boolean;
  }

  export interface AutoAssignmentResult {
    equipmentId: string;
    signatureId: string;
    confidence: number;
    reasoning: string[];
    status: 'assigned' | 'rolled_back' | 'pending';
    timestamp: Date;
    autoAssigned: boolean;
    requiresReview?: boolean;
    userFeedback?: {
      confirmed: boolean;
      userId?: string;
      timestamp: Date;
      notes?: string;
    };
    metadata?: {
      factors?: ConfidenceFactors;
      verificationScore?: number;
      equipmentType?: string;
      vendorName?: string;
      rollbackReason?: string;
      rollbackTimestamp?: Date;
      rollbackUserId?: string;
    };
  }

  // Enhanced filtering and state management interfaces
  export interface EquipmentFilter {
    status: 'all' | 'mapped' | 'unmapped';
    equipmentType?: string;
    vendor?: string;
    confidenceRange?: [number, number];
    hasNormalization?: boolean;
    autoAssigned?: boolean;
  }

  export interface SignatureAnalytics {
    signatureId: string;
    totalMatches: number;
    accurateMatches: number;
    accuracy: number;
    averageConfidence: number;
    usageFrequency: number;
    lastUsed: Date;
    userFeedback: {
      positive: number;
      negative: number;
    };
  }
  
  export interface CxAlloyEquipment {
      id: string;
      name: string;
  }
  
  export interface EquipmentMapping {
    id: string;
    cxAlloyEquipmentId: string;
    cxAlloyEquipmentName: string;
    skySparkEquipmentId: string;
    signatureId: string;
    mappedAt: Date;
    mappedBy: string;
    // Enhanced mapping fields
    confidence?: number;
    isAutoAssigned?: boolean;
    userValidated?: boolean;
    validationNotes?: string;
  }