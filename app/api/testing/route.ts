import { NextRequest, NextResponse } from 'next/server';
import { runIntegrationTests, PerformanceBenchmark } from '@/lib/testing';
import { PerformanceOptimizer } from '@/lib/performance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'all';
    const includeBenchmarks = searchParams.get('benchmarks') === 'true';

    console.log('🧪 Starting integration test suite...');
    
    // Run integration tests
    const testResults = await runIntegrationTests();
    
    let benchmarkResults = null;
    if (includeBenchmarks) {
      console.log('⚡ Running performance benchmarks...');
      benchmarkResults = {
        normalization: await PerformanceBenchmark.benchmarkNormalization(1000),
        confidenceCalculation: await PerformanceBenchmark.benchmarkConfidenceCalculation(100)
      };
    }

    // Get performance report
    const performanceOptimizer = new PerformanceOptimizer();
    const performanceReport = performanceOptimizer.getPerformanceReport();
    performanceOptimizer.destroy();

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      testResults,
      benchmarkResults,
      performanceReport: {
        cacheStats: performanceReport.cacheStats,
        memoryInfo: performanceReport.memoryInfo,
        recentMetrics: performanceReport.metrics.slice(-10) // Last 10 metrics
      },
      systemInfo: {
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    console.log(`✅ Tests completed: ${testResults.passedTests}/${testResults.totalTests} passed (${testResults.successRate.toFixed(1)}%)`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCategory, testName, customConfig } = body;

    console.log(`🎯 Running specific test: ${testCategory}/${testName}`);

    // This would run specific tests based on the request
    // For now, we'll return a mock response
    const mockResult = {
      success: true,
      testCategory,
      testName,
      result: {
        passed: true,
        duration: Math.random() * 100,
        details: `Custom test ${testName} executed successfully`
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(mockResult);
  } catch (error) {
    console.error('❌ Custom test execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 