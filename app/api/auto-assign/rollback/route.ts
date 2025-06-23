import { NextRequest, NextResponse } from 'next/server';
import { autoAssignmentService } from '@/lib/autoAssignment';
import { database } from '@/lib/mockDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipmentId, signatureId, reason, userId } = body;

    // Validate required fields
    if (!equipmentId || !signatureId || !reason) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Equipment ID, signature ID, and reason are required' 
        },
        { status: 400 }
      );
    }

    // Validate that the assignment exists
    const assignments = database.getAutoAssignments();
    const assignment = assignments.find(
      a => a.equipmentId === equipmentId && 
           a.signatureId === signatureId && 
           a.status === 'assigned'
    );

    if (!assignment) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No active assignment found for the specified equipment and signature' 
        },
        { status: 404 }
      );
    }

    // Check if rollback is allowed
    const config = autoAssignmentService.getConfig();
    if (!config.rollbackEnabled) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Rollback functionality is currently disabled' 
        },
        { status: 403 }
      );
    }

    // Perform the rollback
    const rollbackSuccess = await autoAssignmentService.rollbackAssignment(
      equipmentId,
      signatureId,
      reason,
      userId
    );

    if (rollbackSuccess) {
      return NextResponse.json({
        success: true,
        message: `Assignment rolled back successfully for equipment ${equipmentId}`,
        rollback: {
          equipmentId,
          signatureId,
          reason,
          userId,
          timestamp: new Date().toISOString(),
          originalConfidence: assignment.confidence
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to rollback assignment. Please check server logs for details.' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during rollback',
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

    switch (action) {
      case 'history':
        // Get rollback history
        const auditLog = autoAssignmentService.getAuditLog();
        const rollbackHistory = auditLog
          .filter(log => log.action === 'rollback')
          .filter(log => !equipmentId || log.equipmentId === equipmentId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 50); // Limit to 50 most recent

        return NextResponse.json({
          success: true,
          rollbackHistory: rollbackHistory.map(log => ({
            id: log.id,
            equipmentId: log.equipmentId,
            signatureId: log.signatureId,
            reason: log.reason,
            userId: log.userId,
            timestamp: log.timestamp,
            confidence: log.confidence
          })),
          total: rollbackHistory.length
        });

      case 'candidates':
        // Get assignments that might be candidates for rollback (low user feedback, etc.)
        const assignments = database.getAutoAssignments();
        const candidates = assignments
          .filter(a => a.status === 'assigned')
          .filter(a => {
            // Flag assignments with negative feedback or low confidence
            return a.userFeedback?.confirmed === false || 
                   a.confidence < 98 || 
                   a.requiresReview;
          })
          .map(a => {
            const equipment = database.getEquipmentById(a.equipmentId);
            const signature = database.getSignatures().find(s => s.id === a.signatureId);
            
            return {
              equipmentId: a.equipmentId,
              equipmentName: equipment?.id || 'Unknown',
              equipmentType: equipment?.equipmentType || 'Unknown',
              signatureId: a.signatureId,
              signatureName: signature?.name || 'Unknown',
              confidence: a.confidence,
              timestamp: a.timestamp,
              requiresReview: a.requiresReview,
              userFeedback: a.userFeedback,
              autoAssigned: a.autoAssigned,
              reason: a.userFeedback?.confirmed === false 
                ? 'Negative user feedback' 
                : a.confidence < 98 
                  ? 'Low confidence assignment' 
                  : 'Requires review'
            };
          })
          .sort((a, b) => a.confidence - b.confidence); // Lowest confidence first

        return NextResponse.json({
          success: true,
          candidates,
          total: candidates.length,
          summary: {
            negativeFeedback: candidates.filter(c => c.userFeedback?.confirmed === false).length,
            lowConfidence: candidates.filter(c => c.confidence < 98).length,
            requiresReview: candidates.filter(c => c.requiresReview).length
          }
        });

      case 'stats':
        // Get rollback statistics
        const allAuditLog = autoAssignmentService.getAuditLog();
        const rollbacks = allAuditLog.filter(log => log.action === 'rollback');
        const assignmentsLog = allAuditLog.filter(log => log.action === 'assign');
        
        const rollbackRate = assignmentsLog.length > 0 
          ? (rollbacks.length / assignmentsLog.length) * 100 
          : 0;

        // Group rollbacks by reason
        const rollbackReasons = rollbacks.reduce((acc, rollback) => {
          const reason = rollback.reason || 'Unknown';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Group rollbacks by signature
        const rollbacksBySignature = rollbacks.reduce((acc, rollback) => {
          acc[rollback.signatureId] = (acc[rollback.signatureId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
          success: true,
          stats: {
            totalRollbacks: rollbacks.length,
            totalAssignments: assignmentsLog.length,
            rollbackRate: rollbackRate,
            rollbackReasons,
            rollbacksBySignature,
            recentRollbacks: rollbacks
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, 10)
              .map(r => ({
                equipmentId: r.equipmentId,
                signatureId: r.signatureId,
                reason: r.reason,
                timestamp: r.timestamp
              }))
          }
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Rollback GET error:', error);
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