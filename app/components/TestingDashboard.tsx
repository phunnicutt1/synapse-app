'use client';

import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3, Activity, Clock } from 'lucide-react';
import { ProgressIndicator, LoadingError } from './ErrorBoundary';

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

interface BenchmarkResult {
  operation: string;
  totalItems: number;
  totalTime: number;
  averageTime: number;
  itemsPerSecond: number;
}

interface PerformanceReport {
  cacheStats: {
    size: number;
    maxSize: number;
    hitRate: number;
    averageAccessCount: number;
    memoryUsage: number;
  };
  memoryInfo: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  recentMetrics: Array<{
    operation: string;
    duration: number;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}

const TestingDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkResult> | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [includeBenchmarks, setIncludeBenchmarks] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/testing?benchmarks=${includeBenchmarks}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Test execution failed');
      }
      
      setTestResults(data.testResults);
      setBenchmarkResults(data.benchmarkResults);
      setPerformanceReport(data.performanceReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const getFilteredResults = () => {
    if (!testResults) return [];
    if (selectedCategory === 'all') return testResults.results;
    return testResults.results.filter(result => result.category === selectedCategory);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integration Testing Dashboard</h1>
        <p className="text-gray-600">
          Comprehensive testing suite for BACnet mapping system performance and reliability
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Tests
                </>
              )}
            </button>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeBenchmarks}
                onChange={(e) => setIncludeBenchmarks(e.target.checked)}
                className="mr-2"
              />
              Include Performance Benchmarks
            </label>
          </div>

          {testResults && (
            <div className="text-sm text-gray-500">
              Last run: {new Date().toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <LoadingError
          error={error}
          onRetry={runTests}
          className="mb-6"
        />
      )}

      {/* Test Results Summary */}
      {testResults && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {testResults.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Tests</p>
                <p className="text-2xl font-semibold text-gray-900">{testResults.totalTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Passed</p>
                <p className="text-2xl font-semibold text-green-600">{testResults.passedTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-red-600">{testResults.failedTests}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {testResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded text-sm ${
                selectedCategory === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({testResults.totalTests})
            </button>
            {Object.entries(testResults.categories).map(([category, stats]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedCategory === category 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category} ({stats.passed + stats.failed})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Results */}
        {testResults && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {getFilteredResults().map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.passed 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start">
                      {result.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{result.name}</h3>
                          <span className="text-xs text-gray-500">{result.category}</span>
                        </div>
                        {result.expected && (
                          <p className="text-xs text-gray-600 mt-1">
                            Expected: {result.expected}
                          </p>
                        )}
                        {result.actual && (
                          <p className="text-xs text-gray-600">
                            Actual: {result.actual}
                          </p>
                        )}
                        {result.details && (
                          <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                        )}
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {performanceReport && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
            </div>
            <div className="p-4">
              {/* Cache Statistics */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Cache Performance</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cache Size:</span>
                    <span className="ml-2 font-medium">
                      {performanceReport.cacheStats.size} / {performanceReport.cacheStats.maxSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hit Rate:</span>
                    <span className="ml-2 font-medium">
                      {(performanceReport.cacheStats.hitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory Usage:</span>
                    <span className="ml-2 font-medium">
                      {formatBytes(performanceReport.cacheStats.memoryUsage)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Access:</span>
                    <span className="ml-2 font-medium">
                      {performanceReport.cacheStats.averageAccessCount.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Memory Information */}
              {performanceReport.memoryInfo && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Memory Usage</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Used Heap:</span>
                      <span className="font-medium">
                        {formatBytes(performanceReport.memoryInfo.usedJSHeapSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Heap:</span>
                      <span className="font-medium">
                        {formatBytes(performanceReport.memoryInfo.totalJSHeapSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Heap Limit:</span>
                      <span className="font-medium">
                        {formatBytes(performanceReport.memoryInfo.jsHeapSizeLimit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Operations */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Operations</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {performanceReport.recentMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{metric.operation}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatDuration(metric.duration)}</span>
                        <Clock className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark Results */}
        {benchmarkResults && (
          <div className="bg-white rounded-lg border border-gray-200 lg:col-span-2">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Performance Benchmarks</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(benchmarkResults).map(([key, benchmark]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{benchmark.operation}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Items:</span>
                        <span className="font-medium">{benchmark.totalItems.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Time:</span>
                        <span className="font-medium">{formatDuration(benchmark.totalTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Average Time:</span>
                        <span className="font-medium">{formatDuration(benchmark.averageTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Items/Second:</span>
                        <span className="font-medium">{benchmark.itemsPerSecond.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator for Running Tests */}
      {isRunning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <ProgressIndicator
              progress={0}
              total={100}
              operation="Running Integration Tests"
              className="mb-4"
            />
            <p className="text-center text-gray-600">
              Please wait while tests are executing...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingDashboard; 