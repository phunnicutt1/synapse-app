import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  BacnetPoint,
  EquipmentSource,
  EquipmentSignature,
  CxAlloyEquipment,
  AutoAssignmentResult,
  SignatureAnalytics,
  ConfidenceFactors,
  SignatureMatchResult,
} from '@/interfaces/bacnet';
import { parseConnectorCsv, parseTrioFile } from './parsers';
import { database } from './mockDatabase';

// Advanced confidence scoring interfaces
interface LearningDataPoint {
  equipmentId: string;
  signatureId: string;
  userConfirmed: boolean;
  confidenceAtTime: number;
  factors: ConfidenceFactors;
  timestamp: Date;
}

// Machine learning-inspired confidence scoring engine
class IntelligentConfidenceScorer {
  private learningData: LearningDataPoint[] = [];
  private signatureAnalytics: Map<string, SignatureAnalytics> = new Map();
  
  // Weights for different confidence factors (can be learned over time)
  private factorWeights = {
    pointNameSimilarity: 0.25,
    pointCountMatch: 0.15,
    pointTypeMatch: 0.20,
    vendorModelMatch: 0.10,
    equipmentTypeMatch: 0.10,
    historicalAccuracy: 0.08,
    semanticSimilarity: 0.07,
    structuralConsistency: 0.05
  };

  constructor() {
    this.loadLearningData();
  }

  /**
   * Calculate comprehensive confidence score for equipment-signature matching
   */
  calculateSignatureMatch(
    equipment: EquipmentSource,
    signature: EquipmentSignature
  ): SignatureMatchResult {
    const factors = this.calculateConfidenceFactors(equipment, signature);
    const confidence = this.calculateWeightedConfidence(factors);
    const reasoning = this.generateReasoning(factors, signature);
    const autoAssignmentEligible = confidence >= 95;

    // Update signature analytics
    this.updateSignatureAnalytics(signature.id, confidence);

    return {
      signatureId: signature.id,
      confidence: Math.round(confidence * 100) / 100,
      factors,
      reasoning,
      autoAssignmentEligible
    };
  }

  /**
   * Calculate individual confidence factors
   */
  private calculateConfidenceFactors(
    equipment: EquipmentSource,
    signature: EquipmentSignature
  ): ConfidenceFactors {
    return {
      pointNameSimilarity: this.calculatePointNameSimilarity(equipment.points, signature.pointSignature),
      pointCountMatch: this.calculatePointCountMatch(equipment.points, signature.pointSignature),
      pointTypeMatch: this.calculatePointTypeMatch(equipment.points, signature.pointSignature),
      vendorModelMatch: this.calculateVendorModelMatch(equipment, signature),
      equipmentTypeMatch: this.calculateEquipmentTypeMatch(equipment, signature),
      historicalAccuracy: this.getHistoricalAccuracy(signature.id),
      semanticSimilarity: this.calculateSemanticSimilarity(equipment.points, signature.pointSignature),
      structuralConsistency: this.calculateStructuralConsistency(equipment.points, signature.pointSignature)
    };
  }

  /**
   * Calculate point name similarity using advanced string matching
   */
  private calculatePointNameSimilarity(
    equipmentPoints: BacnetPoint[],
    signaturePoints: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]
  ): number {
    if (signaturePoints.length === 0) return 0;

    let totalSimilarity = 0;
    let matchedPoints = 0;

    for (const sigPoint of signaturePoints) {
      let bestMatch = 0;
      
      for (const eqPoint of equipmentPoints) {
        const similarity = this.calculateStringSimilarity(
          this.normalizePointName(eqPoint.dis),
          this.normalizePointName(sigPoint.dis)
        );
        
        // Also check normalized names if available
        if (eqPoint.normalizedName) {
          const normalizedSimilarity = this.calculateStringSimilarity(
            this.normalizePointName(eqPoint.normalizedName),
            this.normalizePointName(sigPoint.dis)
          );
          bestMatch = Math.max(bestMatch, similarity, normalizedSimilarity);
        } else {
          bestMatch = Math.max(bestMatch, similarity);
        }
      }
      
      if (bestMatch > 0.6) { // Threshold for considering a match
        totalSimilarity += bestMatch;
        matchedPoints++;
      }
    }

    return matchedPoints > 0 ? (totalSimilarity / signaturePoints.length) * 100 : 0;
  }

  /**
   * Calculate point count match factor
   */
  private calculatePointCountMatch(
    equipmentPoints: BacnetPoint[],
    signaturePoints: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]
  ): number {
    if (signaturePoints.length === 0) return 0;
    
    const ratio = Math.min(equipmentPoints.length, signaturePoints.length) / 
                  Math.max(equipmentPoints.length, signaturePoints.length);
    
    // Bonus for exact match
    if (equipmentPoints.length === signaturePoints.length) {
      return ratio * 100 + 10;
    }
    
    return ratio * 100;
  }

  /**
   * Calculate point type and unit consistency
   */
  private calculatePointTypeMatch(
    equipmentPoints: BacnetPoint[],
    signaturePoints: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]
  ): number {
    if (signaturePoints.length === 0) return 0;

    let typeMatches = 0;
    let unitMatches = 0;
    let totalComparisons = 0;

    for (const sigPoint of signaturePoints) {
      const matchingEqPoints = equipmentPoints.filter(ep => 
        this.calculateStringSimilarity(
          this.normalizePointName(ep.dis),
          this.normalizePointName(sigPoint.dis)
        ) > 0.7
      );

      for (const eqPoint of matchingEqPoints) {
        totalComparisons++;
        
        if (eqPoint.kind === sigPoint.kind) {
          typeMatches++;
        }
        
        if (this.normalizeUnit(eqPoint.unit) === this.normalizeUnit(sigPoint.unit)) {
          unitMatches++;
        }
      }
    }

    if (totalComparisons === 0) return 0;
    
    const typeScore = (typeMatches / totalComparisons) * 60;
    const unitScore = (unitMatches / totalComparisons) * 40;
    
    return typeScore + unitScore;
  }

  /**
   * Calculate vendor and model match bonus
   */
  private calculateVendorModelMatch(
    equipment: EquipmentSource,
    signature: EquipmentSignature
  ): number {
    let score = 0;
    
    // Check if signature has vendor/model specific data (from learning)
    const analytics = this.signatureAnalytics.get(signature.id);
    if (!analytics) return 0;

    // This would be enhanced with actual vendor/model tracking in signatures
    // For now, return base score
    if (equipment.vendorName) score += 30;
    if (equipment.modelName) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate equipment type consistency
   */
  private calculateEquipmentTypeMatch(
    equipment: EquipmentSource,
    signature: EquipmentSignature
  ): number {
    if (equipment.equipmentType === signature.equipmentType) {
      return 100;
    }
    
    // Check for compatible equipment types
    const compatibleTypes = this.getCompatibleEquipmentTypes(equipment.equipmentType);
    if (compatibleTypes.includes(signature.equipmentType)) {
      return 75;
    }
    
    return 0;
  }

  /**
   * Get historical accuracy for a signature
   */
  private getHistoricalAccuracy(signatureId: string): number {
    const analytics = this.signatureAnalytics.get(signatureId);
    if (!analytics || analytics.totalMatches === 0) {
      return 50; // Neutral score for new signatures
    }
    
    return analytics.accuracy * 100;
  }

  /**
   * Calculate semantic similarity using normalized point names
   */
  private calculateSemanticSimilarity(
    equipmentPoints: BacnetPoint[],
    signaturePoints: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]
  ): number {
    if (signaturePoints.length === 0) return 0;

    let semanticMatches = 0;
    
    for (const sigPoint of signaturePoints) {
      const sigSemantics = this.extractSemanticKeywords(sigPoint.dis);
      
      for (const eqPoint of equipmentPoints) {
        const eqSemantics = this.extractSemanticKeywords(
          eqPoint.normalizedName || eqPoint.dis
        );
        
        const semanticOverlap = this.calculateSetSimilarity(sigSemantics, eqSemantics);
        if (semanticOverlap > 0.5) {
          semanticMatches++;
          break;
        }
      }
    }
    
    return (semanticMatches / signaturePoints.length) * 100;
  }

  /**
   * Calculate structural consistency (point relationships)
   */
  private calculateStructuralConsistency(
    equipmentPoints: BacnetPoint[],
    signaturePoints: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]
  ): number {
    // Check for common HVAC patterns
    const equipmentStructure = this.analyzePointStructure(equipmentPoints);
    const signatureStructure = this.analyzeSignatureStructure(signaturePoints);
    
    let consistencyScore = 0;
    const patterns = ['sensors', 'setpoints', 'commands', 'status'];
    
    for (const pattern of patterns) {
      const eqCount = equipmentStructure[pattern] || 0;
      const sigCount = signatureStructure[pattern] || 0;
      
      if (eqCount > 0 && sigCount > 0) {
        const ratio = Math.min(eqCount, sigCount) / Math.max(eqCount, sigCount);
        consistencyScore += ratio * 25; // 25 points per pattern category
      }
    }
    
    return consistencyScore;
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedConfidence(factors: ConfidenceFactors): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = this.factorWeights[factor as keyof typeof this.factorWeights];
      if (weight && value > 0) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }

    // Normalize to 0-100 scale
    return totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  }

  /**
   * Generate human-readable reasoning for the confidence score
   */
  private generateReasoning(factors: ConfidenceFactors, signature: EquipmentSignature): string[] {
    const reasoning: string[] = [];
    
    if (factors.pointNameSimilarity > 80) {
      reasoning.push(`High point name similarity (${factors.pointNameSimilarity.toFixed(1)}%)`);
    } else if (factors.pointNameSimilarity > 60) {
      reasoning.push(`Moderate point name similarity (${factors.pointNameSimilarity.toFixed(1)}%)`);
    } else if (factors.pointNameSimilarity < 40) {
      reasoning.push(`Low point name similarity (${factors.pointNameSimilarity.toFixed(1)}%)`);
    }

    if (factors.equipmentTypeMatch === 100) {
      reasoning.push(`Perfect equipment type match (${signature.equipmentType})`);
    } else if (factors.equipmentTypeMatch > 70) {
      reasoning.push(`Compatible equipment type (${signature.equipmentType})`);
    } else if (factors.equipmentTypeMatch === 0) {
      reasoning.push(`Equipment type mismatch (${signature.equipmentType})`);
    }

    if (factors.pointCountMatch > 90) {
      reasoning.push(`Excellent point count match (${factors.pointCountMatch.toFixed(1)}%)`);
    } else if (factors.pointCountMatch < 60) {
      reasoning.push(`Significant point count difference (${factors.pointCountMatch.toFixed(1)}%)`);
    }

    if (factors.historicalAccuracy > 85) {
      reasoning.push(`High historical accuracy (${factors.historicalAccuracy.toFixed(1)}%)`);
    } else if (factors.historicalAccuracy < 50) {
      reasoning.push(`Below average historical accuracy (${factors.historicalAccuracy.toFixed(1)}%)`);
    }

    if (factors.semanticSimilarity > 70) {
      reasoning.push(`Strong semantic similarity (${factors.semanticSimilarity.toFixed(1)}%)`);
    }

    return reasoning;
  }

  /**
   * Learn from user confirmations to improve future predictions
   */
  recordUserFeedback(
    equipmentId: string,
    signatureId: string,
    confirmed: boolean,
    confidenceAtTime: number,
    factors: ConfidenceFactors
  ): void {
    const learningPoint: LearningDataPoint = {
      equipmentId,
      signatureId,
      userConfirmed: confirmed,
      confidenceAtTime,
      factors,
      timestamp: new Date()
    };

    this.learningData.push(learningPoint);
    this.updateSignatureAnalytics(signatureId, confidenceAtTime, confirmed);
    this.adaptWeights();
    this.saveLearningData();
  }

  /**
   * Update signature analytics based on usage and feedback
   */
  private updateSignatureAnalytics(
    signatureId: string,
    confidence: number,
    userConfirmed?: boolean
  ): void {
    let analytics = this.signatureAnalytics.get(signatureId);
    
    if (!analytics) {
      analytics = {
        signatureId,
        totalMatches: 0,
        accurateMatches: 0,
        accuracy: 0,
        averageConfidence: 0,
        usageFrequency: 0,
        lastUsed: new Date(),
        userFeedback: { positive: 0, negative: 0 }
      };
    }

    analytics.totalMatches++;
    analytics.averageConfidence = (analytics.averageConfidence * (analytics.totalMatches - 1) + confidence) / analytics.totalMatches;
    analytics.usageFrequency++;
    analytics.lastUsed = new Date();

    if (userConfirmed !== undefined) {
      if (userConfirmed) {
        analytics.accurateMatches++;
        analytics.userFeedback.positive++;
      } else {
        analytics.userFeedback.negative++;
      }
      analytics.accuracy = analytics.accurateMatches / analytics.totalMatches;
    }

    this.signatureAnalytics.set(signatureId, analytics);
  }

  /**
   * Adapt factor weights based on learning data
   */
  private adaptWeights(): void {
    if (this.learningData.length < 10) return; // Need minimum data

    // Calculate correlation between factors and user confirmations
    const factorNames = Object.keys(this.factorWeights) as (keyof ConfidenceFactors)[];
    const correlations: Record<string, number> = {};

    for (const factorName of factorNames) {
      const factorValues = this.learningData.map(ld => ld.factors[factorName]);
      const confirmations = this.learningData.map(ld => ld.userConfirmed ? 1 : 0);
      
      correlations[factorName] = this.calculateCorrelation(factorValues, confirmations);
    }

    // Adjust weights based on correlations (simplified adaptation)
    const totalCorrelation = Object.values(correlations).reduce((sum, corr) => sum + Math.abs(corr), 0);
    
    if (totalCorrelation > 0) {
      for (const factorName of factorNames) {
        const newWeight = Math.abs(correlations[factorName]) / totalCorrelation;
        this.factorWeights[factorName] = newWeight * 0.1 + this.factorWeights[factorName] * 0.9; // Gradual adaptation
      }
    }
  }

  /**
   * Get all signature matches for equipment with confidence scores
   */
  getAllSignatureMatches(equipment: EquipmentSource): SignatureMatchResult[] {
    const signatures = database.getSignatures();
    const matches: SignatureMatchResult[] = [];

    for (const signature of signatures) {
      const match = this.calculateSignatureMatch(equipment, signature);
      matches.push(match);
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get auto-assignment recommendations
   */
  getAutoAssignmentRecommendations(): AutoAssignmentResult[] {
    const equipment = database.getAllEquipment();
    const recommendations: AutoAssignmentResult[] = [];

    for (const equip of equipment) {
      const matches = this.getAllSignatureMatches(equip);
      const bestMatch = matches[0];

      if (bestMatch && bestMatch.autoAssignmentEligible) {
        recommendations.push({
          equipmentId: equip.id,
          signatureId: bestMatch.signatureId,
          confidence: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
          status: 'pending',
          timestamp: new Date(),
          autoAssigned: false
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  // Utility methods
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private normalizePointName(name: string): string {
    return name.toLowerCase()
               .replace(/[^a-z0-9]/g, '')
               .trim();
  }

  private normalizeUnit(unit?: string): string {
    if (!unit) return '';
    return unit.toLowerCase().replace(/[^a-z]/g, '');
  }

  private extractSemanticKeywords(text: string): Set<string> {
    const keywords = new Set<string>();
    const commonTerms = [
      'temp', 'temperature', 'flow', 'pressure', 'humidity', 'setpoint',
      'command', 'status', 'alarm', 'sensor', 'air', 'water', 'steam',
      'supply', 'return', 'exhaust', 'outside', 'room', 'zone'
    ];
    
    const normalized = text.toLowerCase();
    for (const term of commonTerms) {
      if (normalized.includes(term)) {
        keywords.add(term);
      }
    }
    
    return keywords;
  }

  private calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private analyzePointStructure(points: BacnetPoint[]): Record<string, number> {
    const structure: Record<string, number> = {
      sensors: 0,
      setpoints: 0,
      commands: 0,
      status: 0
    };

    for (const point of points) {
      const name = (point.normalizedName || point.dis).toLowerCase();
      
      if (name.includes('temp') || name.includes('pressure') || name.includes('flow') || name.includes('sensor')) {
        structure.sensors++;
      } else if (name.includes('setpoint') || name.includes('spt')) {
        structure.setpoints++;
      } else if (name.includes('command') || name.includes('cmd') || point.writable) {
        structure.commands++;
      } else if (name.includes('status') || name.includes('alarm')) {
        structure.status++;
      }
    }

    return structure;
  }

  private analyzeSignatureStructure(points: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[]): Record<string, number> {
    const structure: Record<string, number> = {
      sensors: 0,
      setpoints: 0,
      commands: 0,
      status: 0
    };

    for (const point of points) {
      const name = point.dis.toLowerCase();
      
      if (name.includes('temp') || name.includes('pressure') || name.includes('flow') || name.includes('sensor')) {
        structure.sensors++;
      } else if (name.includes('setpoint') || name.includes('spt')) {
        structure.setpoints++;
      } else if (name.includes('command') || name.includes('cmd')) {
        structure.commands++;
      } else if (name.includes('status') || name.includes('alarm')) {
        structure.status++;
      }
    }

    return structure;
  }

  private getCompatibleEquipmentTypes(equipmentType: string): string[] {
    const compatibilityMap: Record<string, string[]> = {
      'AHU': ['RTU', 'Air Handler'],
      'RTU': ['AHU', 'Rooftop Unit'],
      'VAV': ['Terminal Unit', 'VAV Box'],
      'Chiller': ['Cooling Plant', 'CHW'],
      'Boiler': ['Heating Plant', 'HHW']
    };

    return compatibilityMap[equipmentType] || [];
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < x.length; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private loadLearningData(): void {
    // In a real implementation, this would load from persistent storage
    // For now, we'll start with empty learning data
    this.learningData = [];
    this.signatureAnalytics = new Map();
  }

  private saveLearningData(): void {
    // In a real implementation, this would save to persistent storage
    // For now, we'll just keep it in memory
  }

  // Public methods for external access
  getSignatureAnalytics(signatureId: string): SignatureAnalytics | undefined {
    return this.signatureAnalytics.get(signatureId);
  }

  getAllSignatureAnalytics(): SignatureAnalytics[] {
    return Array.from(this.signatureAnalytics.values());
  }

  getLearningDataSummary(): {
    totalFeedback: number;
    positiveRate: number;
    averageConfidenceAccuracy: number;
  } {
    if (this.learningData.length === 0) {
      return { totalFeedback: 0, positiveRate: 0, averageConfidenceAccuracy: 0 };
    }

    const positive = this.learningData.filter(ld => ld.userConfirmed).length;
    const positiveRate = positive / this.learningData.length;
    
    const avgConfidenceAccuracy = this.learningData.reduce((sum, ld) => {
      return sum + (ld.userConfirmed ? ld.confidenceAtTime : 100 - ld.confidenceAtTime);
    }, 0) / this.learningData.length;

    return {
      totalFeedback: this.learningData.length,
      positiveRate,
      averageConfidenceAccuracy: avgConfidenceAccuracy
    };
  }
}

// Export singleton instance
export const confidenceScorer = new IntelligentConfidenceScorer();

// Original functions for backward compatibility
function normalizePointSignature(points: BacnetPoint[]): string {
  // Create signature based on functional characteristics, not equipment-specific names
  return points
    .map(p => {
      // Use bacnetDesc as the primary identifier since it describes function
      // Fall back to a normalized version of dis if bacnetDesc is not available
      const identifier = p.bacnetDesc || 
        p.dis.replace(/['"]?[^']*'[^']*'[^']*'[^']*['"]?/g, '') // Remove equipment-specific path
               .replace(/['"]/g, '') // Remove quotes
               .trim();
      return `${identifier}|${p.kind}|${p.unit || ''}`;
    })
    .sort()
    .join(';');
}

export async function processDataFiles() {
  console.log("Starting data processing pipeline...");
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const pointsDir = path.join(dataDir, 'sample_point_data');

  const connectorCsvPath = path.join(dataDir, 'ConnectorData.csv');
  const connectorCsvContent = await fs.readFile(connectorCsvPath, 'utf-8');
  const connectors = parseConnectorCsv(connectorCsvContent);

  const equipmentSources: EquipmentSource[] = [];
  const pointFiles = await fs.readdir(pointsDir);

  for (const fileName of pointFiles) {
    if (fileName.endsWith('.trio')) {
      const filePath = path.join(pointsDir, fileName);
      const trioContent = await fs.readFile(filePath, 'utf-8');
      const equipment = parseTrioFile(fileName, trioContent, connectors);
      if (equipment) {
        equipmentSources.push(equipment);
      } else {
        console.log(`Failed to parse equipment from file: ${fileName}`);
      }
    }
  }
  
  console.log(`Total equipment sources parsed: ${equipmentSources.length}`);

  // No longer auto-create signatures - they will be created by users
  const signatures: EquipmentSignature[] = [];
  console.log(`Signatures will be created by users as needed.`);
  
  const mockCxAlloyEquipment: CxAlloyEquipment[] = [
      { id: 'cx-1', name: 'RTU-2 Office Wing' }, { id: 'cx-2', name: 'RTU-6 Lab Wing' },
      { id: 'cx-3', name: 'RTU-7 Main Lobby' }, { id: 'cx-4', name: 'RTU-8 West Corridor' },
      { id: 'cx-5', name: 'VAV-2.9 Conference Room A' }, { id: 'cx-6', name: 'VAV-2.15 Office 215B' },
      { id: 'cx-7', name: 'VAV-E5 Atrium East' }, { id: 'cx-8', name: 'Fume Hood Lab 17' },
      { id: 'cx-9', name: 'General Exhaust L-5' }, { id: 'cx-10', name: 'Lab Supply/Exhaust L-1/L-2' },
      { id: 'cx-11', name: 'RTU-3 (Offline)' }, { id: 'cx-12', name: 'Humidifier H-1' },
  ];

  database.initialize(signatures, equipmentSources, mockCxAlloyEquipment);
}