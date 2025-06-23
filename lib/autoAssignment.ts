import { 
  EquipmentSource, 
  EquipmentSignature, 
  AutoAssignmentResult, 
  SignatureAnalytics,
  SignatureMatchResult 
} from '@/interfaces/bacnet';
import { confidenceScorer } from './analysis';
import { database } from './mockDatabase';

// Configuration constants
const AUTO_ASSIGNMENT_THRESHOLD = 95; // 95% confidence threshold
const HIGH_CONFIDENCE_THRESHOLD = 90; // For verified signature pool
const ERROR_RATE_ALERT_THRESHOLD = 5; // Alert if error rate exceeds 5%

// Enhanced interfaces for auto-assignment
interface AutoAssignmentConfig {
  confidenceThreshold: number;
  batchSize: number;
  enableLearning: boolean;
  rollbackEnabled: boolean;
}

interface AssignmentAuditLog {
  id: string;
  equipmentId: string;
  signatureId: string;
  action: 'assign' | 'rollback' | 'feedback';
  confidence: number;
  timestamp: Date;
  userId?: string;
  reason: string;
}

interface VerifiedSignature {
  signature: EquipmentSignature;
  verificationScore: number;
  successRate: number;
  lastVerified: Date;
  userConfirmations: number;
}

export class ProactiveAutoAssignmentService {
  private config: AutoAssignmentConfig;
  private auditLog: AssignmentAuditLog[] = [];
  private verifiedSignaturePool: Map<string, VerifiedSignature> = new Map();
  private errorRateTracker: Map<string, { total: number; errors: number }> = new Map();

  constructor(config?: Partial<AutoAssignmentConfig>) {
    this.config = {
      confidenceThreshold: AUTO_ASSIGNMENT_THRESHOLD,
      batchSize: 10,
      enableLearning: true,
      rollbackEnabled: true,
      ...config
    };

    this.initializeVerifiedSignaturePool();
  }

  /**
   * Process a single equipment for auto-assignment
   */
  async processEquipmentForAutoAssignment(
    equipment: EquipmentSource,
    options?: { dryRun?: boolean; userId?: string }
  ): Promise<AutoAssignmentResult | null> {
    try {
      // Get signature matches from confidence scorer
      const matches = confidenceScorer.getAllSignatureMatches(equipment);
      
      // Find the best match that exceeds threshold
      const bestMatch = matches.find(match => 
        match.confidence >= this.config.confidenceThreshold && 
        match.autoAssignmentEligible
      );

      if (!bestMatch) {
        console.log(`No auto-assignment candidate for equipment ${equipment.id} (best confidence: ${matches[0]?.confidence || 0}%)`);
        return null;
      }

      // Verify signature is in verified pool
      const verifiedSignature = this.verifiedSignaturePool.get(bestMatch.signatureId);
      if (!verifiedSignature || verifiedSignature.successRate < 0.85) {
        console.log(`Signature ${bestMatch.signatureId} not in verified pool or has low success rate`);
        return null;
      }

      const assignment: AutoAssignmentResult = {
        equipmentId: equipment.id,
        signatureId: bestMatch.signatureId,
        confidence: bestMatch.confidence,
        reasoning: bestMatch.reasoning,
        status: 'assigned',
        timestamp: new Date(),
        autoAssigned: true,
        requiresReview: bestMatch.confidence < 98, // High confidence assignments need less review
        metadata: {
          factors: bestMatch.factors,
          verificationScore: verifiedSignature.verificationScore,
          equipmentType: equipment.equipmentType,
          vendorName: equipment.vendorName
        }
      };

      // Dry run mode - return assignment without persisting
      if (options?.dryRun) {
        return assignment;
      }

      // Create the assignment in database
      const createdAssignment = database.createAutoAssignment(assignment);

      // Update signature analytics
      this.updateSignatureUsage(bestMatch.signatureId, bestMatch.confidence);

      // Log the assignment
      this.logAssignment({
        id: `${equipment.id}-${bestMatch.signatureId}-${Date.now()}`,
        equipmentId: equipment.id,
        signatureId: bestMatch.signatureId,
        action: 'assign',
        confidence: bestMatch.confidence,
        timestamp: new Date(),
        userId: options?.userId,
        reason: `Auto-assigned with ${bestMatch.confidence}% confidence`
      });

      console.log(`Auto-assigned equipment ${equipment.id} to signature ${bestMatch.signatureId} with ${bestMatch.confidence}% confidence`);
      
      return createdAssignment;

    } catch (error) {
      console.error(`Error processing equipment ${equipment.id} for auto-assignment:`, error);
      return null;
    }
  }

  /**
   * Batch process multiple equipment for auto-assignment
   */
  async batchProcessEquipment(
    equipmentList: EquipmentSource[],
    options?: { dryRun?: boolean; userId?: string; maxAssignments?: number }
  ): Promise<{
    assignments: AutoAssignmentResult[];
    skipped: { equipmentId: string; reason: string }[];
    summary: {
      total: number;
      assigned: number;
      skipped: number;
      averageConfidence: number;
    };
  }> {
    const assignments: AutoAssignmentResult[] = [];
    const skipped: { equipmentId: string; reason: string }[] = [];
    const maxAssignments = options?.maxAssignments || this.config.batchSize;

    console.log(`Starting batch processing of ${equipmentList.length} equipment items`);

    for (const equipment of equipmentList) {
      if (assignments.length >= maxAssignments) {
        skipped.push({
          equipmentId: equipment.id,
          reason: 'Batch size limit reached'
        });
        continue;
      }

      const assignment = await this.processEquipmentForAutoAssignment(equipment, options);
      
      if (assignment) {
        assignments.push(assignment);
      } else {
        skipped.push({
          equipmentId: equipment.id,
          reason: 'No suitable signature match found'
        });
      }

      // Add small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const averageConfidence = assignments.length > 0 
      ? assignments.reduce((sum, a) => sum + a.confidence, 0) / assignments.length 
      : 0;

    const summary = {
      total: equipmentList.length,
      assigned: assignments.length,
      skipped: skipped.length,
      averageConfidence
    };

    console.log(`Batch processing complete: ${summary.assigned} assigned, ${summary.skipped} skipped, ${summary.averageConfidence.toFixed(1)}% avg confidence`);

    return { assignments, skipped, summary };
  }

  /**
   * Rollback an incorrect auto-assignment
   */
  async rollbackAssignment(
    equipmentId: string,
    signatureId: string,
    reason: string,
    userId?: string
  ): Promise<boolean> {
    if (!this.config.rollbackEnabled) {
      throw new Error('Rollback is disabled in current configuration');
    }

    try {
      // Update assignment status in database
      const assignment = database.updateAutoAssignment(equipmentId, signatureId, {
        status: 'rolled_back',
        metadata: {
          rollbackReason: reason,
          rollbackTimestamp: new Date(),
          rollbackUserId: userId
        }
      });

      // Record negative feedback for learning
      const matches = confidenceScorer.getAllSignatureMatches(
        database.getEquipmentById(equipmentId)!
      );
      const match = matches.find(m => m.signatureId === signatureId);
      
      if (match) {
        confidenceScorer.recordUserFeedback(
          equipmentId,
          signatureId,
          false, // negative feedback
          match.confidence,
          match.factors
        );
      }

      // Update error rate tracking
      this.updateErrorRate(signatureId, true);

      // Update verified signature pool
      this.updateVerifiedSignature(signatureId, false);

      // Log the rollback
      this.logAssignment({
        id: `rollback-${equipmentId}-${signatureId}-${Date.now()}`,
        equipmentId,
        signatureId,
        action: 'rollback',
        confidence: assignment.confidence,
        timestamp: new Date(),
        userId,
        reason
      });

      console.log(`Rolled back assignment: equipment ${equipmentId} from signature ${signatureId}`);
      
      return true;

    } catch (error) {
      console.error(`Error rolling back assignment for equipment ${equipmentId}:`, error);
      return false;
    }
  }

  /**
   * Record user feedback for continuous learning
   */
  async recordUserFeedback(
    equipmentId: string,
    signatureId: string,
    confirmed: boolean,
    userId?: string,
    notes?: string
  ): Promise<void> {
    if (!this.config.enableLearning) {
      return;
    }

    try {
      // Get the assignment details
      const assignment = database.getAutoAssignments().find(
        a => a.equipmentId === equipmentId && a.signatureId === signatureId
      );

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Update assignment with feedback
      database.updateAutoAssignment(equipmentId, signatureId, {
        userFeedback: {
          confirmed,
          userId,
          timestamp: new Date(),
          notes
        }
      });

      // Record feedback in confidence scorer for learning
      const equipment = database.getEquipmentById(equipmentId);
      if (equipment) {
        const matches = confidenceScorer.getAllSignatureMatches(equipment);
        const match = matches.find(m => m.signatureId === signatureId);
        
        if (match) {
          confidenceScorer.recordUserFeedback(
            equipmentId,
            signatureId,
            confirmed,
            assignment.confidence,
            match.factors
          );
        }
      }

      // Update error rate and verified signature pool
      this.updateErrorRate(signatureId, !confirmed);
      this.updateVerifiedSignature(signatureId, confirmed);

      // Log the feedback
      this.logAssignment({
        id: `feedback-${equipmentId}-${signatureId}-${Date.now()}`,
        equipmentId,
        signatureId,
        action: 'feedback',
        confidence: assignment.confidence,
        timestamp: new Date(),
        userId,
        reason: `User feedback: ${confirmed ? 'confirmed' : 'rejected'}${notes ? ` - ${notes}` : ''}`
      });

      console.log(`Recorded user feedback for equipment ${equipmentId}: ${confirmed ? 'confirmed' : 'rejected'}`);

    } catch (error) {
      console.error(`Error recording user feedback:`, error);
      throw error;
    }
  }

  /**
   * Get verified signature pool for high-confidence assignments
   */
  getVerifiedSignaturePool(): VerifiedSignature[] {
    return Array.from(this.verifiedSignaturePool.values())
      .filter(vs => vs.successRate >= 0.85 && vs.userConfirmations >= 3)
      .sort((a, b) => b.verificationScore - a.verificationScore);
  }

  /**
   * Get auto-assignment recommendations without executing
   */
  getAutoAssignmentRecommendations(equipmentList?: EquipmentSource[]): {
    equipment: EquipmentSource;
    recommendedSignature: EquipmentSignature | null;
    confidence: number;
    reasoning: string[];
  }[] {
    const equipment = equipmentList || database.getAllEquipment();
    const recommendations = [];

    for (const equip of equipment) {
      const matches = confidenceScorer.getAllSignatureMatches(equip);
      const bestMatch = matches.find(match => 
        match.confidence >= this.config.confidenceThreshold && 
        match.autoAssignmentEligible
      );

      const signature = bestMatch 
        ? database.getSignatures().find(s => s.id === bestMatch.signatureId) || null
        : null;

      recommendations.push({
        equipment: equip,
        recommendedSignature: signature,
        confidence: bestMatch?.confidence || 0,
        reasoning: bestMatch?.reasoning || ['No suitable match found']
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics(): {
    totalAssignments: number;
    successfulAssignments: number;
    rolledBackAssignments: number;
    averageConfidence: number;
    errorRate: number;
    verifiedSignatures: number;
    learningDataPoints: number;
  } {
    const assignments = database.getAutoAssignments();
    const successful = assignments.filter(a => a.status === 'assigned' && a.userFeedback?.confirmed !== false);
    const rolledBack = assignments.filter(a => a.status === 'rolled_back');
    const avgConfidence = assignments.length > 0 
      ? assignments.reduce((sum, a) => sum + a.confidence, 0) / assignments.length 
      : 0;

    const totalErrors = Array.from(this.errorRateTracker.values())
      .reduce((sum, tracker) => sum + tracker.errors, 0);
    const totalAttempts = Array.from(this.errorRateTracker.values())
      .reduce((sum, tracker) => sum + tracker.total, 0);
    const errorRate = totalAttempts > 0 ? (totalErrors / totalAttempts) * 100 : 0;

    const learningStats = confidenceScorer.getLearningDataSummary();

    return {
      totalAssignments: assignments.length,
      successfulAssignments: successful.length,
      rolledBackAssignments: rolledBack.length,
      averageConfidence: avgConfidence,
      errorRate,
      verifiedSignatures: this.verifiedSignaturePool.size,
      learningDataPoints: learningStats.totalFeedback
    };
  }

  /**
   * Update signature learning based on usage patterns
   */
  async updateSignatureLearning(): Promise<void> {
    console.log('Updating signature learning patterns...');

    // Get all signature analytics
    const analytics = database.getAllSignatureAnalytics();
    
    for (const analytic of analytics) {
      const signature = database.getSignatures().find(s => s.id === analytic.signatureId);
      if (!signature) continue;

      // Update verified signature pool based on performance
      const successRate = analytic.totalMatches > 0 
        ? analytic.accurateMatches / analytic.totalMatches 
        : 0;

      const verificationScore = this.calculateVerificationScore(analytic);

      const verifiedSignature: VerifiedSignature = {
        signature,
        verificationScore,
        successRate,
        lastVerified: new Date(),
        userConfirmations: analytic.userFeedback.positive
      };

      this.verifiedSignaturePool.set(signature.id, verifiedSignature);
    }

    // Alert if error rates are too high
    this.checkErrorRateAlerts();

    console.log(`Updated learning for ${analytics.length} signatures`);
  }

  // Private helper methods

  private initializeVerifiedSignaturePool(): void {
    const signatures = database.getSignatures();
    
    for (const signature of signatures) {
      const analytics = database.getSignatureAnalytics(signature.id);
      if (analytics && analytics.accuracy >= 0.85) {
        const verifiedSignature: VerifiedSignature = {
          signature,
          verificationScore: this.calculateVerificationScore(analytics),
          successRate: analytics.accuracy,
          lastVerified: analytics.lastUsed,
          userConfirmations: analytics.userFeedback.positive
        };
        
        this.verifiedSignaturePool.set(signature.id, verifiedSignature);
      }
    }

    console.log(`Initialized verified signature pool with ${this.verifiedSignaturePool.size} signatures`);
  }

  private calculateVerificationScore(analytics: SignatureAnalytics): number {
    // Weighted score based on accuracy, usage frequency, and user feedback
    const accuracyWeight = 0.4;
    const usageWeight = 0.3;
    const feedbackWeight = 0.3;

    const accuracyScore = analytics.accuracy * 100;
    const usageScore = Math.min(analytics.usageFrequency * 10, 100); // Cap at 100
    const feedbackScore = analytics.userFeedback.positive > 0 
      ? (analytics.userFeedback.positive / (analytics.userFeedback.positive + analytics.userFeedback.negative)) * 100
      : 50; // Neutral if no feedback

    return (accuracyScore * accuracyWeight) + 
           (usageScore * usageWeight) + 
           (feedbackScore * feedbackWeight);
  }

  private updateSignatureUsage(signatureId: string, confidence: number): void {
    const existing = database.getSignatureAnalytics(signatureId);
    const updates: Partial<SignatureAnalytics> = {
      totalMatches: (existing?.totalMatches || 0) + 1,
      usageFrequency: (existing?.usageFrequency || 0) + 1,
      lastUsed: new Date(),
      averageConfidence: existing 
        ? ((existing.averageConfidence * existing.totalMatches) + confidence) / (existing.totalMatches + 1)
        : confidence
    };

    database.updateSignatureAnalytics(signatureId, updates);
  }

  private updateErrorRate(signatureId: string, isError: boolean): void {
    const tracker = this.errorRateTracker.get(signatureId) || { total: 0, errors: 0 };
    tracker.total += 1;
    if (isError) {
      tracker.errors += 1;
    }
    this.errorRateTracker.set(signatureId, tracker);
  }

  private updateVerifiedSignature(signatureId: string, success: boolean): void {
    const verified = this.verifiedSignaturePool.get(signatureId);
    if (verified) {
      if (success) {
        verified.userConfirmations += 1;
      }
      
      // Recalculate success rate based on recent feedback
      const analytics = database.getSignatureAnalytics(signatureId);
      if (analytics) {
        verified.successRate = analytics.accuracy;
        verified.verificationScore = this.calculateVerificationScore(analytics);
      }
      
      verified.lastVerified = new Date();
      this.verifiedSignaturePool.set(signatureId, verified);
    }
  }

  private logAssignment(log: AssignmentAuditLog): void {
    this.auditLog.push(log);
    
    // Keep only last 1000 log entries to prevent memory issues
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  private checkErrorRateAlerts(): void {
    for (const [signatureId, tracker] of this.errorRateTracker.entries()) {
      const errorRate = (tracker.errors / tracker.total) * 100;
      
      if (errorRate > ERROR_RATE_ALERT_THRESHOLD && tracker.total >= 5) {
        console.warn(`HIGH ERROR RATE ALERT: Signature ${signatureId} has ${errorRate.toFixed(1)}% error rate (${tracker.errors}/${tracker.total})`);
        
        // Remove from verified pool if error rate is too high
        const verified = this.verifiedSignaturePool.get(signatureId);
        if (verified && errorRate > 15) {
          this.verifiedSignaturePool.delete(signatureId);
          console.warn(`Removed signature ${signatureId} from verified pool due to high error rate`);
        }
      }
    }
  }

  // Public getters for monitoring and debugging
  getAuditLog(): AssignmentAuditLog[] {
    return [...this.auditLog];
  }

  getErrorRateTracker(): Map<string, { total: number; errors: number }> {
    return new Map(this.errorRateTracker);
  }

  getConfig(): AutoAssignmentConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const autoAssignmentService = new ProactiveAutoAssignmentService(); 