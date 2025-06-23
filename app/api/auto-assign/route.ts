import { NextRequest, NextResponse } from 'next/server';
import { autoAssignmentService } from '@/lib/autoAssignment';
import { database } from '@/lib/mockDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const equipmentId = searchParams.get('equipmentId');

    switch (action) {
      case 'recommendations':
        // Get auto-assignment recommendations for all equipment or specific equipment
        const equipment = equipmentId 
          ? [database.getEquipmentById(equipmentId)].filter((eq): eq is NonNullable<typeof eq> => Boolean(eq))
          : undefined;
        
        const recommendations = autoAssignmentService.getAutoAssignmentRecommendations(equipment);
        
        return NextResponse.json({
          success: true,
          recommendations,
          total: recommendations.length,
          highConfidence: recommendations.filter(r => r.confidence >= 95).length
        });

      case 'verified-signatures':
        // Get verified signature pool
        const verifiedSignatures = autoAssignmentService.getVerifiedSignaturePool();
        
        return NextResponse.json({
          success: true,
          verifiedSignatures,
          total: verifiedSignatures.length
        });

      case 'performance':
        // Get system performance metrics
        const metrics = autoAssignmentService.getPerformanceMetrics();
        
        return NextResponse.json({
          success: true,
          metrics
        });

      case 'audit-log':
        // Get audit log for monitoring
        const auditLog = autoAssignmentService.getAuditLog();
        const limit = parseInt(searchParams.get('limit') || '100');
        
        return NextResponse.json({
          success: true,
          auditLog: auditLog.slice(-limit),
          total: auditLog.length
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Auto-assignment GET error:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, equipmentId, dryRun = false, userId } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'process-equipment':
        // Process single equipment for auto-assignment
        if (!equipmentId) {
          return NextResponse.json(
            { success: false, message: 'Equipment ID is required' },
            { status: 400 }
          );
        }

        const equipment = database.getEquipmentById(equipmentId);
        if (!equipment) {
          return NextResponse.json(
            { success: false, message: 'Equipment not found' },
            { status: 404 }
          );
        }

        const assignment = await autoAssignmentService.processEquipmentForAutoAssignment(
          equipment,
          { dryRun, userId }
        );

        if (assignment) {
          return NextResponse.json({
            success: true,
            assignment,
            message: dryRun 
              ? `Equipment ${equipmentId} would be auto-assigned with ${assignment.confidence}% confidence`
              : `Equipment ${equipmentId} auto-assigned successfully`
          });
        } else {
          return NextResponse.json({
            success: false,
            message: 'No suitable signature match found for auto-assignment',
            equipmentId
          });
        }

      case 'update-learning':
        // Update signature learning patterns
        await autoAssignmentService.updateSignatureLearning();
        
        return NextResponse.json({
          success: true,
          message: 'Signature learning updated successfully'
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Auto-assignment POST error:', error);
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