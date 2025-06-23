import { NextRequest, NextResponse } from 'next/server';
import { autoAssignmentService } from '@/lib/autoAssignment';
import { database } from '@/lib/mockDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipmentId, signatureId, confirmed, userId, notes } = body;

    // Validate required fields
    if (!equipmentId || !signatureId || typeof confirmed !== 'boolean') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Equipment ID, signature ID, and confirmed status (boolean) are required' 
        },
        { status: 400 }
      );
    }

    // Validate that the assignment exists
    const assignments = database.getAutoAssignments();
    const assignment = assignments.find(
      a => a.equipmentId === equipmentId && a.signatureId === signatureId
    );

    if (!assignment) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No assignment found for the specified equipment and signature' 
        },
        { status: 404 }
      );
    }

    // Check if feedback already exists
    if (assignment.userFeedback) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Feedback has already been provided for this assignment',
          existingFeedback: assignment.userFeedback
        },
        { status: 409 }
      );
    }

    // Record the feedback
    await autoAssignmentService.recordUserFeedback(
      equipmentId,
      signatureId,
      confirmed,
      userId,
      notes
    );

    // Get updated assignment to return
    const updatedAssignment = database.getAutoAssignments().find(
      a => a.equipmentId === equipmentId && a.signatureId === signatureId
    );

    return NextResponse.json({
      success: true,
      message: `User feedback recorded successfully: ${confirmed ? 'confirmed' : 'rejected'}`,
      feedback: {
        equipmentId,
        signatureId,
        confirmed,
        userId,
        notes,
        timestamp: new Date().toISOString(),
        originalConfidence: assignment.confidence
      },
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Feedback recording error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error while recording feedback',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const equipmentId = searchParams.get('equipmentId');
    const signatureId = searchParams.get('signatureId');

    switch (action) {
      case 'pending':
        // Get assignments pending user feedback
        const assignments = database.getAutoAssignments();
        const pendingFeedback = assignments
          .filter(a => a.status === 'assigned' && !a.userFeedback)
          .filter(a => !equipmentId || a.equipmentId === equipmentId)
          .filter(a => !signatureId || a.signatureId === signatureId)
          .map(a => {
            const equipment = database.getEquipmentById(a.equipmentId);
            const signature = database.getSignatures().find(s => s.id === a.signatureId);
            
            return {
              equipmentId: a.equipmentId,
              equipmentName: equipment?.id || 'Unknown',
              equipmentType: equipment?.equipmentType || 'Unknown',
              vendorName: equipment?.vendorName || 'Unknown',
              signatureId: a.signatureId,
              signatureName: signature?.name || 'Unknown',
              confidence: a.confidence,
              timestamp: a.timestamp,
              autoAssigned: a.autoAssigned,
              requiresReview: a.requiresReview,
              reasoning: a.reasoning
            };
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return NextResponse.json({
          success: true,
          pendingFeedback,
          total: pendingFeedback.length,
          summary: {
            highConfidence: pendingFeedback.filter(p => p.confidence >= 98).length,
            mediumConfidence: pendingFeedback.filter(p => p.confidence >= 95 && p.confidence < 98).length,
            requiresReview: pendingFeedback.filter(p => p.requiresReview).length,
            autoAssigned: pendingFeedback.filter(p => p.autoAssigned).length
          }
        });

      case 'history':
        // Get feedback history
        const auditLog = autoAssignmentService.getAuditLog();
        const feedbackHistory = auditLog
          .filter(log => log.action === 'feedback')
          .filter(log => !equipmentId || log.equipmentId === equipmentId)
          .filter(log => !signatureId || log.signatureId === signatureId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 100) // Limit to 100 most recent
          .map(log => ({
            id: log.id,
            equipmentId: log.equipmentId,
            signatureId: log.signatureId,
            reason: log.reason,
            userId: log.userId,
            timestamp: log.timestamp,
            confidence: log.confidence,
            confirmed: log.reason.includes('confirmed')
          }));

        return NextResponse.json({
          success: true,
          feedbackHistory,
          total: feedbackHistory.length,
          summary: {
            confirmed: feedbackHistory.filter(f => f.confirmed).length,
            rejected: feedbackHistory.filter(f => !f.confirmed).length,
            confirmationRate: feedbackHistory.length > 0 
              ? (feedbackHistory.filter(f => f.confirmed).length / feedbackHistory.length) * 100 
              : 0
          }
        });

      case 'analytics':
        // Get feedback analytics and learning insights
        const learningStats = autoAssignmentService.getPerformanceMetrics();
        const allAssignments = database.getAutoAssignments();
        
        // Calculate feedback metrics
        const withFeedback = allAssignments.filter(a => a.userFeedback);
        const confirmed = withFeedback.filter(a => a.userFeedback?.confirmed);
        const rejected = withFeedback.filter(a => a.userFeedback?.confirmed === false);

        // Group feedback by confidence ranges
        const feedbackByConfidence = {
          '95-97%': { total: 0, confirmed: 0 },
          '98-99%': { total: 0, confirmed: 0 },
          '100%': { total: 0, confirmed: 0 }
        };

        withFeedback.forEach(a => {
          const confidence = a.confidence;
          let range: keyof typeof feedbackByConfidence;
          
          if (confidence >= 100) range = '100%';
          else if (confidence >= 98) range = '98-99%';
          else range = '95-97%';
          
          feedbackByConfidence[range].total++;
          if (a.userFeedback?.confirmed) {
            feedbackByConfidence[range].confirmed++;
          }
        });

        // Calculate accuracy by confidence range
        Object.keys(feedbackByConfidence).forEach(range => {
          const data = feedbackByConfidence[range as keyof typeof feedbackByConfidence];
          (data as any).accuracy = data.total > 0 ? (data.confirmed / data.total) * 100 : 0;
        });

        // Get signature performance from feedback
        const signaturePerformance = withFeedback.reduce((acc, a) => {
          const sigId = a.signatureId;
          if (!acc[sigId]) {
            acc[sigId] = { total: 0, confirmed: 0, signature: null };
          }
          acc[sigId].total++;
          if (a.userFeedback?.confirmed) {
            acc[sigId].confirmed++;
          }
          return acc;
        }, {} as Record<string, { total: number; confirmed: number; signature: any }>);

        // Add signature names and calculate accuracy
        Object.keys(signaturePerformance).forEach(sigId => {
          const sig = database.getSignatures().find(s => s.id === sigId);
          signaturePerformance[sigId].signature = sig?.name || 'Unknown';
          (signaturePerformance[sigId] as any).accuracy = 
            signaturePerformance[sigId].total > 0 
              ? (signaturePerformance[sigId].confirmed / signaturePerformance[sigId].total) * 100 
              : 0;
        });

        return NextResponse.json({
          success: true,
          analytics: {
            overall: {
              totalAssignments: allAssignments.length,
              withFeedback: withFeedback.length,
              confirmed: confirmed.length,
              rejected: rejected.length,
              confirmationRate: withFeedback.length > 0 
                ? (confirmed.length / withFeedback.length) * 100 
                : 0,
              averageConfidence: withFeedback.length > 0
                ? withFeedback.reduce((sum, a) => sum + a.confidence, 0) / withFeedback.length
                : 0
            },
            byConfidenceRange: feedbackByConfidence,
            signaturePerformance: Object.entries(signaturePerformance)
              .map(([id, data]) => ({
                signatureId: id,
                signatureName: data.signature,
                total: data.total,
                confirmed: data.confirmed,
                accuracy: (data as any).accuracy
              }))
              .sort((a, b) => b.accuracy - a.accuracy),
            learningMetrics: learningStats
          }
        });

      case 'recommendations':
        // Get feedback recommendations (assignments that should be prioritized for feedback)
        const allAssignmentsForRec = database.getAutoAssignments();
        const needsFeedback = allAssignmentsForRec
          .filter(a => a.status === 'assigned' && !a.userFeedback)
          .map(a => {
            const equipment = database.getEquipmentById(a.equipmentId);
            const signature = database.getSignatures().find(s => s.id === a.signatureId);
            
            // Calculate priority score based on various factors
            let priorityScore = 0;
            
            // Higher priority for lower confidence
            priorityScore += (100 - a.confidence) * 0.4;
            
            // Higher priority for auto-assigned items
            if (a.autoAssigned) priorityScore += 20;
            
            // Higher priority for items requiring review
            if (a.requiresReview) priorityScore += 15;
            
            // Higher priority for newer assignments
            const daysSinceAssignment = (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceAssignment < 1) priorityScore += 10;
            
            return {
              equipmentId: a.equipmentId,
              equipmentName: equipment?.id || 'Unknown',
              equipmentType: equipment?.equipmentType || 'Unknown',
              signatureId: a.signatureId,
              signatureName: signature?.name || 'Unknown',
              confidence: a.confidence,
              timestamp: a.timestamp,
              autoAssigned: a.autoAssigned,
              requiresReview: a.requiresReview,
              priorityScore,
              daysSinceAssignment: Math.round(daysSinceAssignment * 10) / 10
            };
          })
          .sort((a, b) => b.priorityScore - a.priorityScore)
          .slice(0, 20); // Top 20 recommendations

        return NextResponse.json({
          success: true,
          recommendations: needsFeedback,
          total: needsFeedback.length,
          message: 'Assignments prioritized by feedback importance'
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 