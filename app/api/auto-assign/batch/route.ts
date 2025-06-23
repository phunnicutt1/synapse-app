import { NextRequest, NextResponse } from 'next/server';
import { autoAssignmentService } from '@/lib/autoAssignment';
import { database } from '@/lib/mockDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      equipmentIds, 
      dryRun = false, 
      userId, 
      maxAssignments = 10,
      equipmentType,
      vendorName 
    } = body;

    // Validate input
    if (!equipmentIds || !Array.isArray(equipmentIds)) {
      return NextResponse.json(
        { success: false, message: 'Equipment IDs array is required' },
        { status: 400 }
      );
    }

    if (equipmentIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one equipment ID is required' },
        { status: 400 }
      );
    }

    if (equipmentIds.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Maximum 100 equipment items can be processed in a single batch' },
        { status: 400 }
      );
    }

    // Get equipment objects
    let equipmentList = equipmentIds
      .map(id => database.getEquipmentById(id))
      .filter((eq): eq is NonNullable<typeof eq> => Boolean(eq));

    // Apply filters if specified
    if (equipmentType) {
      equipmentList = equipmentList.filter(eq => eq.equipmentType === equipmentType);
    }

    if (vendorName) {
      equipmentList = equipmentList.filter(eq => eq.vendorName === vendorName);
    }

    if (equipmentList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid equipment found matching criteria' },
        { status: 404 }
      );
    }

    console.log(`Starting batch auto-assignment for ${equipmentList.length} equipment items`);

    // Process batch
    const result = await autoAssignmentService.batchProcessEquipment(
      equipmentList,
      { dryRun, userId, maxAssignments }
    );

    // Calculate additional metrics
    const highConfidenceAssignments = result.assignments.filter(a => a.confidence >= 98);
    const mediumConfidenceAssignments = result.assignments.filter(a => a.confidence >= 95 && a.confidence < 98);
    
    const responseData = {
      success: true,
      result,
      metrics: {
        highConfidence: highConfidenceAssignments.length,
        mediumConfidence: mediumConfidenceAssignments.length,
        requiresReview: result.assignments.filter(a => a.requiresReview).length,
        processingTime: new Date().toISOString()
      },
      message: dryRun 
        ? `Batch analysis complete: ${result.summary.assigned} equipment would be auto-assigned`
        : `Batch processing complete: ${result.summary.assigned} equipment auto-assigned successfully`
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Batch auto-assignment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during batch processing',
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

    switch (action) {
      case 'status':
        // Get batch processing status and recommendations
        const allEquipment = database.getAllEquipment();
        const recommendations = autoAssignmentService.getAutoAssignmentRecommendations();
        
        const eligibleForBatch = recommendations.filter(r => r.confidence >= 95);
        const byEquipmentType = eligibleForBatch.reduce((acc, r) => {
          const type = r.equipment.equipmentType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const byVendor = eligibleForBatch.reduce((acc, r) => {
          const vendor = r.equipment.vendorName || 'Unknown';
          acc[vendor] = (acc[vendor] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
          success: true,
          status: {
            totalEquipment: allEquipment.length,
            eligibleForAutoAssignment: eligibleForBatch.length,
            averageConfidence: eligibleForBatch.length > 0 
              ? eligibleForBatch.reduce((sum, r) => sum + r.confidence, 0) / eligibleForBatch.length 
              : 0,
            byEquipmentType,
            byVendor,
            topRecommendations: eligibleForBatch.slice(0, 10).map(r => ({
              equipmentId: r.equipment.id,
              equipmentType: r.equipment.equipmentType,
              vendorName: r.equipment.vendorName,
              signatureName: r.recommendedSignature?.name || 'Unknown',
              confidence: r.confidence
            }))
          }
        });

      case 'queue':
        // Get equipment queue ready for batch processing
        const queueRecommendations = autoAssignmentService.getAutoAssignmentRecommendations()
          .filter(r => r.confidence >= 95)
          .sort((a, b) => b.confidence - a.confidence);

        return NextResponse.json({
          success: true,
          queue: queueRecommendations.map(r => ({
            equipmentId: r.equipment.id,
            equipmentName: r.equipment.id,
            equipmentType: r.equipment.equipmentType,
            vendorName: r.equipment.vendorName,
            modelName: r.equipment.modelName,
            pointCount: r.equipment.points.length,
            recommendedSignature: r.recommendedSignature?.name || 'Unknown',
            confidence: r.confidence,
            reasoning: r.reasoning
          })),
          total: queueRecommendations.length
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Batch auto-assignment GET error:', error);
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