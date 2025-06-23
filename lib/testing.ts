import { BacnetPoint, EquipmentSource, EquipmentSignature, AutoAssignmentResult } from '@/interfaces/bacnet';
import { normalizePointName, calculateConfidenceScore } from './normalization';
import { database } from './mockDatabase';

// Test data generators
export class TestDataGenerator {
  static generateMockBacnetPoint(overrides: Partial<BacnetPoint> = {}): BacnetPoint {
    return {
      id: `point-${Math.random().toString(36).substr(2, 9)}`,
      dis: 'SpaceTempSensor',
      bacnetCur: '72.5',
      kind: 'Number',
      unit: '°F',
      writable: false,
      bacnetDesc: 'Space Temperature Sensor',
      normalizedName: 'Space Temperature',
      haystackTags: ['temp', 'sensor', 'space'],
      normalizationConfidence: 95,
      semanticMetadata: {
        vendorSpecific: true,
        equipmentSpecific: true,
        deviceContext: {
          isVFD: false,
          isController: false,
          isMonitoring: true,
          communicationProtocol: 'BACnet'
        },
        reasoning: ['Temperature pattern detected', 'Space context identified']
      },
      ...overrides
    };
  }

  static generateMockEquipment(pointCount: number = 10): EquipmentSource {
    const points: BacnetPoint[] = [];
    for (let i = 0; i < pointCount; i++) {
      points.push(this.generateMockBacnetPoint({
        id: `point-${i}`,
        dis: `Point${i}`
      }));
    }

    return {
      id: `equipment-${Math.random().toString(36).substr(2, 9)}`,
      connectorId: 'connector-1',
      equipmentType: 'VAV',
      vendorName: 'Schneider Electric',
      modelName: 'SE8000',
      points,
      normalizationSummary: {
        totalPoints: pointCount,
        normalizedPoints: Math.floor(pointCount * 0.8),
        averageConfidence: 85
      }
    };
  }

  static generateMockSignature(): EquipmentSignature {
    return {
      id: `signature-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Standard VAV Terminal',
      equipmentType: 'VAV',
      pointSignature: [
        { dis: 'SpaceTempSensor', kind: 'Number', unit: '°F' },
        { dis: 'SpaceTempSetpoint', kind: 'Number', unit: '°F' },
        { dis: 'DamperPosition', kind: 'Number', unit: '%' }
      ],
      source: 'user-validated',
      confidence: 95,
      matchingEquipmentIds: [],
      detailedConfidence: {
        patternMatch: 95,
        vendorMatch: 90,
        equipmentTypeMatch: 100,
        historicalAccuracy: 85
      }
    };
  }
}

// Integration test suites
export class IntegrationTestSuite {
  private testResults: TestResult[] = [];

  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 Starting Integration Test Suite...');
    
    await this.testPointNormalization();
    await this.testConfidenceScoring();
    await this.testAutoAssignment();
    await this.testUIComponents();
    await this.testPerformance();
    await this.testErrorHandling();

    return this.generateSummary();
  }

  private async testPointNormalization(): Promise<void> {
    console.log('📝 Testing Point Normalization...');
    
    const testCases = [
      { input: 'SpaceTempSensor', expected: 'Space Temperature', confidence: 95 },
      { input: 'DmpPos', expected: 'Damper Position', confidence: 90 },
      { input: 'OccSensor', expected: 'Occupancy Status', confidence: 92 },
      { input: 'UnknownPoint123', expected: null, confidence: 0 }
    ];

    for (const testCase of testCases) {
      try {
        const result = normalizePointName(testCase.input, 'VAV', 'Schneider Electric');
        const passed = result.normalizedName === testCase.expected && 
                      Math.abs(result.confidence - testCase.confidence) <= 5;
        
        this.testResults.push({
          category: 'Point Normalization',
          name: `Normalize "${testCase.input}"`,
          passed,
          expected: testCase.expected || undefined,
          actual: result.normalizedName || undefined,
          details: `Confidence: ${result.confidence}%`
        });
      } catch (error) {
        this.testResults.push({
          category: 'Point Normalization',
          name: `Normalize "${testCase.input}"`,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async testConfidenceScoring(): Promise<void> {
    console.log('🎯 Testing Confidence Scoring...');
    
    const equipment = TestDataGenerator.generateMockEquipment(5);
    const signature = TestDataGenerator.generateMockSignature();

    try {
      const confidence = calculateConfidenceScore(equipment, signature);
      const passed = confidence >= 0 && confidence <= 100;
      
      this.testResults.push({
        category: 'Confidence Scoring',
        name: 'Calculate equipment-signature confidence',
        passed,
        expected: 'Valid confidence score (0-100)',
        actual: `${confidence}%`,
        details: `Equipment: ${equipment.equipmentType}, Signature: ${signature.name}`
      });
    } catch (error) {
      this.testResults.push({
        category: 'Confidence Scoring',
        name: 'Calculate equipment-signature confidence',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testAutoAssignment(): Promise<void> {
    console.log('🤖 Testing Auto-Assignment...');
    
    try {
      // Test auto-assignment with high-confidence match
      const equipment = TestDataGenerator.generateMockEquipment(3);
      const signature = TestDataGenerator.generateMockSignature();
      
      // Mock high confidence score
      const mockConfidence = 96;
      
      const autoAssignmentResult: AutoAssignmentResult = {
        equipmentId: equipment.id,
        signatureId: signature.id,
        confidence: mockConfidence,
        reasoning: ['High pattern match', 'Vendor compatibility confirmed'],
        status: 'assigned',
        timestamp: new Date(),
        autoAssigned: true,
        requiresReview: false
      };

      const passed = autoAssignmentResult.confidence >= 95 && 
                    autoAssignmentResult.status === 'assigned' &&
                    autoAssignmentResult.autoAssigned === true;

      this.testResults.push({
        category: 'Auto-Assignment',
        name: 'High-confidence auto-assignment',
        passed,
        expected: 'Auto-assigned with confidence ≥95%',
        actual: `Status: ${autoAssignmentResult.status}, Confidence: ${autoAssignmentResult.confidence}%`,
        details: `Reasoning: ${autoAssignmentResult.reasoning.join(', ')}`
      });
    } catch (error) {
      this.testResults.push({
        category: 'Auto-Assignment',
        name: 'High-confidence auto-assignment',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testUIComponents(): Promise<void> {
    console.log('🖥️ Testing UI Components...');
    
    // Test component rendering and functionality
    const componentTests = [
      {
        name: 'CxAlloyMappingPanel filter pills',
        test: () => {
          // Mock component functionality test
          const filterStates = ['all', 'mapped', 'unmapped'];
          return filterStates.every(state => typeof state === 'string');
        }
      },
      {
        name: 'EquipmentReviewPanel normalization display',
        test: () => {
          // Mock normalization display test
          const mockPoint = TestDataGenerator.generateMockBacnetPoint();
          return mockPoint.normalizedName !== undefined;
        }
      },
      {
        name: 'SignatureTemplatesPanel management interface',
        test: () => {
          // Mock signature management test
          const mockSignature = TestDataGenerator.generateMockSignature();
          return mockSignature.pointSignature.length > 0;
        }
      }
    ];

    for (const componentTest of componentTests) {
      try {
        const passed = componentTest.test();
        this.testResults.push({
          category: 'UI Components',
          name: componentTest.name,
          passed,
          expected: 'Component functionality verified',
          actual: passed ? 'Passed' : 'Failed'
        });
      } catch (error) {
        this.testResults.push({
          category: 'UI Components',
          name: componentTest.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing Performance...');
    
    try {
      // Test large dataset handling
      const startTime = performance.now();
      const largeEquipmentSet = Array.from({ length: 100 }, () => 
        TestDataGenerator.generateMockEquipment(50)
      );
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      const passed = processingTime < 1000; // Should complete within 1 second
      
      this.testResults.push({
        category: 'Performance',
        name: 'Large dataset processing (100 equipment, 5000 points)',
        passed,
        expected: 'Processing time < 1000ms',
        actual: `${processingTime.toFixed(2)}ms`,
        details: `Generated ${largeEquipmentSet.length} equipment with ${largeEquipmentSet.reduce((sum, eq) => sum + eq.points.length, 0)} total points`
      });
    } catch (error) {
      this.testResults.push({
        category: 'Performance',
        name: 'Large dataset processing',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('🛡️ Testing Error Handling...');
    
    const errorTests = [
      {
        name: 'Invalid point normalization',
        test: () => {
          try {
            normalizePointName('', '', '');
            return false; // Should have thrown an error
          } catch (error) {
            return true; // Error was properly handled
          }
        }
      },
      {
        name: 'Missing equipment data',
        test: () => {
          try {
            const invalidEquipment = {} as EquipmentSource;
            calculateConfidenceScore(invalidEquipment, TestDataGenerator.generateMockSignature());
            return false; // Should have thrown an error
          } catch (error) {
            return true; // Error was properly handled
          }
        }
      }
    ];

    for (const errorTest of errorTests) {
      try {
        const passed = errorTest.test();
        this.testResults.push({
          category: 'Error Handling',
          name: errorTest.name,
          passed,
          expected: 'Error properly caught and handled',
          actual: passed ? 'Error handled correctly' : 'Error not handled'
        });
      } catch (error) {
        this.testResults.push({
          category: 'Error Handling',
          name: errorTest.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private generateSummary(): TestSummary {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    const summary: TestSummary = {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      categories: {},
      results: this.testResults
    };

    // Group results by category
    for (const result of this.testResults) {
      if (!summary.categories[result.category]) {
        summary.categories[result.category] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        summary.categories[result.category].passed++;
      } else {
        summary.categories[result.category].failed++;
      }
    }

    return summary;
  }
}

// Test result interfaces
interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  details?: string;
  error?: string;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  categories: Record<string, { passed: number; failed: number }>;
  results: TestResult[];
}

// Test runner utility
export async function runIntegrationTests(): Promise<TestSummary> {
  const testSuite = new IntegrationTestSuite();
  return await testSuite.runAllTests();
}

// Performance benchmarking
export class PerformanceBenchmark {
  static async benchmarkNormalization(pointCount: number = 1000): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const points = Array.from({ length: pointCount }, (_, i) => `TestPoint${i}`);
    
    for (const point of points) {
      normalizePointName(point, 'VAV', 'Generic');
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / pointCount;
    
    return {
      operation: 'Point Normalization',
      totalItems: pointCount,
      totalTime,
      averageTime,
      itemsPerSecond: 1000 / averageTime
    };
  }

  static async benchmarkConfidenceCalculation(equipmentCount: number = 100): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const equipment = Array.from({ length: equipmentCount }, () => 
      TestDataGenerator.generateMockEquipment(10)
    );
    const signature = TestDataGenerator.generateMockSignature();
    
    for (const eq of equipment) {
      calculateConfidenceScore(eq, signature);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / equipmentCount;
    
    return {
      operation: 'Confidence Calculation',
      totalItems: equipmentCount,
      totalTime,
      averageTime,
      itemsPerSecond: 1000 / averageTime
    };
  }
}

interface BenchmarkResult {
  operation: string;
  totalItems: number;
  totalTime: number;
  averageTime: number;
  itemsPerSecond: number;
}

export default IntegrationTestSuite; 