import { BacnetPoint, EquipmentSource, EquipmentSignature } from '@/interfaces/bacnet';

// Performance monitoring and optimization utilities
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static maxMetrics = 1000;

  static startTimer(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation);
  }

  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove oldest metric
    }
  }

  static getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  static getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const totalTime = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / operationMetrics.length;
  }

  static clearMetrics(): void {
    this.metrics = [];
  }
}

export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(metadata?: Record<string, any>): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    PerformanceMonitor.recordMetric({
      operation: this.operation,
      duration,
      timestamp: new Date(),
      metadata
    });

    return duration;
  }
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Caching strategies
export class NormalizationCache {
  private static cache = new Map<string, CacheEntry>();
  private static maxCacheSize = 10000;
  private static defaultTTL = 30 * 60 * 1000; // 30 minutes

  static getCacheKey(pointName: string, equipmentType: string, vendor: string): string {
    return `${pointName}|${equipmentType}|${vendor}`.toLowerCase();
  }

  static get(pointName: string, equipmentType: string, vendor: string): NormalizationResult | null {
    const key = this.getCacheKey(pointName, equipmentType, vendor);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.result;
  }

  static set(pointName: string, equipmentType: string, vendor: string, result: NormalizationResult, ttl?: number): void {
    const key = this.getCacheKey(pointName, equipmentType, vendor);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    // If cache is full, remove least recently used entries
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      result,
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 1
    });
  }

  private static evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateHitRate(),
      averageAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length || 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private static calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Mock hit rate
  }

  private static estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    return this.cache.size * 200; // Estimate 200 bytes per entry
  }
}

interface CacheEntry {
  result: NormalizationResult;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
}

interface NormalizationResult {
  normalizedName: string | null;
  confidence: number;
  haystackTags?: string[];
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  averageAccessCount: number;
  memoryUsage: number;
}

// Batch processing utilities
export class BatchProcessor {
  static async processEquipmentBatch<T>(
    equipment: EquipmentSource[],
    processor: (equipment: EquipmentSource) => Promise<T>,
    batchSize: number = 10,
    onProgress?: (completed: number, total: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const total = equipment.length;
    
    for (let i = 0; i < equipment.length; i += batchSize) {
      const batch = equipment.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
      
      if (onProgress) {
        onProgress(results.length, total);
      }
      
      // Small delay to prevent blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  static async processPointsBatch<T>(
    points: BacnetPoint[],
    processor: (point: BacnetPoint) => T,
    batchSize: number = 100,
    onProgress?: (completed: number, total: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const total = points.length;
    
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchResults = batch.map(processor);
      results.push(...batchResults);
      
      if (onProgress) {
        onProgress(results.length, total);
      }
      
      // Yield control to prevent blocking
      if (i % (batchSize * 5) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }
}

// Memory management utilities
export class MemoryManager {
  private static memoryThreshold = 100 * 1024 * 1024; // 100MB threshold
  private static cleanupCallbacks: (() => void)[] = [];

  static registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  static async checkMemoryUsage(): Promise<void> {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo.usedJSHeapSize > this.memoryThreshold) {
        await this.performCleanup();
      }
    }
  }

  private static async performCleanup(): Promise<void> {
    console.log('🧹 Performing memory cleanup...');
    
    // Clear caches
    NormalizationCache.clear();
    
    // Run registered cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback failed:', error);
      }
    }
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  static getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Lazy loading utilities
export class LazyLoader {
  private static loadedChunks = new Set<string>();
  private static loadingPromises = new Map<string, Promise<any>>();

  static async loadComponent(componentName: string): Promise<any> {
    if (this.loadedChunks.has(componentName)) {
      return; // Already loaded
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const loadPromise = this.dynamicImport(componentName);
    this.loadingPromises.set(componentName, loadPromise);

    try {
      await loadPromise;
      this.loadedChunks.add(componentName);
      this.loadingPromises.delete(componentName);
    } catch (error) {
      this.loadingPromises.delete(componentName);
      throw error;
    }
  }

  private static async dynamicImport(componentName: string): Promise<any> {
    switch (componentName) {
      case 'SignatureAnalytics':
        return import('@/app/components/SignatureAnalytics');
      case 'PointNormalizationDisplay':
        return import('@/app/components/PointNormalizationDisplay');
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
  }

  static isLoaded(componentName: string): boolean {
    return this.loadedChunks.has(componentName);
  }

  static preloadComponents(componentNames: string[]): Promise<any[]> {
    return Promise.all(componentNames.map(name => this.loadComponent(name)));
  }
}

// Debouncing and throttling utilities
export class PerformanceUtils {
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  static async measureAsync<T>(
    operation: string,
    asyncFunc: () => Promise<T>
  ): Promise<T> {
    const timer = PerformanceMonitor.startTimer(operation);
    try {
      const result = await asyncFunc();
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

// Performance optimization configuration
export interface PerformanceConfig {
  caching: {
    enabled: boolean;
    maxCacheSize: number;
    defaultTTL: number;
  };
  batching: {
    equipmentBatchSize: number;
    pointsBatchSize: number;
    enableProgressReporting: boolean;
  };
  memory: {
    threshold: number;
    enableAutoCleanup: boolean;
    cleanupInterval: number;
  };
  ui: {
    debounceDelay: number;
    throttleLimit: number;
    enableLazyLoading: boolean;
  };
}

export const defaultPerformanceConfig: PerformanceConfig = {
  caching: {
    enabled: true,
    maxCacheSize: 10000,
    defaultTTL: 30 * 60 * 1000 // 30 minutes
  },
  batching: {
    equipmentBatchSize: 10,
    pointsBatchSize: 100,
    enableProgressReporting: true
  },
  memory: {
    threshold: 100 * 1024 * 1024, // 100MB
    enableAutoCleanup: true,
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  },
  ui: {
    debounceDelay: 300,
    throttleLimit: 100,
    enableLazyLoading: true
  }
};

// Performance optimization manager
export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: PerformanceConfig = defaultPerformanceConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (this.config.memory.enableAutoCleanup) {
      this.cleanupInterval = setInterval(
        () => MemoryManager.checkMemoryUsage(),
        this.config.memory.cleanupInterval
      );
    }

    // Register memory cleanup for caches
    MemoryManager.registerCleanupCallback(() => {
      if (this.config.caching.enabled) {
        NormalizationCache.clear();
      }
    });
  }

  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup interval if needed
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.initialize();
  }

  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  getPerformanceReport(): PerformanceReport {
    return {
      cacheStats: NormalizationCache.getStats(),
      memoryInfo: MemoryManager.getMemoryInfo(),
      metrics: PerformanceMonitor.getMetrics(),
      config: this.config
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

interface PerformanceReport {
  cacheStats: CacheStats;
  memoryInfo: MemoryInfo | null;
  metrics: PerformanceMetric[];
  config: PerformanceConfig;
}

export default PerformanceOptimizer; 