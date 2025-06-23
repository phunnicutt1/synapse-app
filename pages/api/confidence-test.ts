import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/mockDatabase';
import { confidenceScorer } from '@/lib/analysis';
import { EquipmentSignature, BacnetPoint } from '@/interfaces/bacnet';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Ensure database is initialized
    if (!database.isInitialized()) {
      return res.status(500).json({ message: 'Database not initialized' });
    }

    // Create sample signatures for testing
    const sampleSignatures = createSampleSignatures();
    
    // Store sample signatures in database
    sampleSignatures.forEach(signature => {
      const { id, ...signatureData } = signature;
      database.createSignature(signatureData);
    });

    const equipment = database.getAllEquipment();
    const results: any[] = [];

    // Test confidence scoring for first few equipment items
    for (let i = 0; i < Math.min(3, equipment.length); i++) {
      const equip = equipment[i];
      const matches = confidenceScorer.getAllSignatureMatches(equip);
      
      results.push({
        equipmentId: equip.id,
        equipmentType: equip.equipmentType,
        pointCount: equip.points.length,
        vendorName: equip.vendorName,
        modelName: equip.modelName,
        topMatches: matches.slice(0, 3).map(match => ({
          signatureId: match.signatureId,
          signatureName: sampleSignatures.find(s => s.id === match.signatureId)?.name || 'Unknown',
          confidence: match.confidence,
          autoAssignmentEligible: match.autoAssignmentEligible,
          factors: match.factors,
          reasoning: match.reasoning
        }))
      });
    }

    // Get auto-assignment recommendations
    const autoRecommendations = confidenceScorer.getAutoAssignmentRecommendations();

    // Get learning data summary
    const learningStats = confidenceScorer.getLearningDataSummary();

    // Get signature analytics
    const signatureAnalytics = confidenceScorer.getAllSignatureAnalytics();

    res.status(200).json({
      success: true,
      results,
      autoRecommendations,
      learningStats,
      signatureAnalytics,
      totalEquipment: equipment.length,
      totalSignatures: sampleSignatures.length
    });

  } catch (error) {
    console.error('Confidence test error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function createSampleSignatures(): EquipmentSignature[] {
  return [
    {
      id: 'vav-standard',
      name: 'Standard VAV Terminal Unit',
      equipmentType: 'VAV',
      pointSignature: [
        { dis: 'RmTmp', kind: 'Number', unit: '°F' },
        { dis: 'RmTmpSptClg', kind: 'Number', unit: '°F' },
        { dis: 'RmTmpSptHtg', kind: 'Number', unit: '°F' },
        { dis: 'SaTmp', kind: 'Number', unit: '°F' },
        { dis: 'AirFl', kind: 'Number', unit: 'CFM' },
        { dis: 'AirFlSpt', kind: 'Number', unit: 'CFM' },
        { dis: 'DprPos', kind: 'Number', unit: '%' },
        { dis: 'HwVlv', kind: 'Number', unit: '%' },
        { dis: 'OccSts', kind: 'Bool' },
        { dis: 'Mode', kind: 'Str' }
      ],
      source: 'auto-generated',
      confidence: 85,
      matchingEquipmentIds: []
    },
    {
      id: 'ahu-standard',
      name: 'Air Handling Unit - Standard Configuration',
      equipmentType: 'AHU',
      pointSignature: [
        { dis: 'MaTmp', kind: 'Number', unit: '°F' },
        { dis: 'SaTmp', kind: 'Number', unit: '°F' },
        { dis: 'RaTmp', kind: 'Number', unit: '°F' },
        { dis: 'OaTmp', kind: 'Number', unit: '°F' },
        { dis: 'SaFl', kind: 'Number', unit: 'CFM' },
        { dis: 'SaFlSpt', kind: 'Number', unit: 'CFM' },
        { dis: 'SaFanSts', kind: 'Bool' },
        { dis: 'SaFanCmd', kind: 'Bool' },
        { dis: 'ClgCoilCmd', kind: 'Number', unit: '%' },
        { dis: 'HtgCoilCmd', kind: 'Number', unit: '%' },
        { dis: 'OaDprPos', kind: 'Number', unit: '%' },
        { dis: 'Filter1Sts', kind: 'Bool' },
        { dis: 'Filter2Sts', kind: 'Bool' }
      ],
      source: 'auto-generated',
      confidence: 90,
      matchingEquipmentIds: []
    },
    {
      id: 'chw-plant',
      name: 'Chilled Water Plant',
      equipmentType: 'CHW',
      pointSignature: [
        { dis: 'ChwSupTmp', kind: 'Number', unit: '°F' },
        { dis: 'ChwRetTmp', kind: 'Number', unit: '°F' },
        { dis: 'ChwFl', kind: 'Number', unit: 'GPM' },
        { dis: 'ChwFlSpt', kind: 'Number', unit: 'GPM' },
        { dis: 'ChwPumpSts', kind: 'Bool' },
        { dis: 'ChwPumpCmd', kind: 'Bool' },
        { dis: 'ChwPumpSpd', kind: 'Number', unit: '%' },
        { dis: 'ChillerSts', kind: 'Bool' },
        { dis: 'ChillerCmd', kind: 'Bool' },
        { dis: 'ChillerCap', kind: 'Number', unit: '%' }
      ],
      source: 'auto-generated',
      confidence: 88,
      matchingEquipmentIds: []
    },
    {
      id: 'unit-heater',
      name: 'Unit Heater',
      equipmentType: 'UH',
      pointSignature: [
        { dis: 'RmTmp', kind: 'Number', unit: '°F' },
        { dis: 'RmTmpSpt', kind: 'Number', unit: '°F' },
        { dis: 'FanSts', kind: 'Bool' },
        { dis: 'FanCmd', kind: 'Bool' },
        { dis: 'HtgVlv', kind: 'Number', unit: '%' },
        { dis: 'OccSts', kind: 'Bool' }
      ],
      source: 'auto-generated',
      confidence: 82,
      matchingEquipmentIds: []
    },
    {
      id: 'lab-fume-hood',
      name: 'Lab Equipment - Fume Hood',
      equipmentType: 'Lab Equipment',
      pointSignature: [
        { dis: 'SashPos', kind: 'Number', unit: 'in' },
        { dis: 'FaceVel', kind: 'Number', unit: 'FPM' },
        { dis: 'FaceVelSpt', kind: 'Number', unit: 'FPM' },
        { dis: 'ExhFanSts', kind: 'Bool' },
        { dis: 'ExhFanCmd', kind: 'Bool' },
        { dis: 'ExhFanSpd', kind: 'Number', unit: '%' },
        { dis: 'AlarmSts', kind: 'Bool' },
        { dis: 'OccSts', kind: 'Bool' }
      ],
      source: 'auto-generated',
      confidence: 87,
      matchingEquipmentIds: []
    }
  ];
} 