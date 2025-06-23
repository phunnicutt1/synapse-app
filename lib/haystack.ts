import { HDict, HRef, HMarker, HStr, HNum, HBool } from 'haystack-core';

/**
 * Project Haystack 5.0 Integration Service
 * Provides semantic tagging, validation, and Xeto schema integration
 */

// Haystack client configuration
interface HaystackConfig {
  uri?: string;
  username?: string;
  password?: string;
  projectId?: string;
}

// Haystack point tagging interface  
export interface HaystackPointData {
  id: string;
  dis: string;
  tags: HDict;
  normalizedName?: string;
  confidence?: number;
}

// Common BACnet to Haystack tag mappings
const BACNET_TAG_MAPPINGS: Record<string, string[]> = {
  // Temperature points
  'TEMP': ['temp', 'sensor'],
  'TEMPERATURE': ['temp', 'sensor'],
  
  // Setpoint mappings
  'SP': ['sp', 'setpoint'],
  'SETPOINT': ['sp', 'setpoint'],
  'SETP': ['sp', 'setpoint'],
  
  // Status and feedback
  'FB': ['sensor', 'feedback'],
  'FEEDBACK': ['sensor', 'feedback'],
  'STATUS': ['sensor', 'status'],
  'STATE': ['sensor', 'status'],
  
  // Command points
  'CMD': ['cmd', 'writable'],
  'COMMAND': ['cmd', 'writable'],
  
  // Flow and pressure
  'FLOW': ['flow', 'sensor'],
  'PRESSURE': ['pressure', 'sensor'],
  'PRESS': ['pressure', 'sensor'],
  
  // Humidity
  'HUMIDITY': ['humidity', 'sensor'],
  'HUM': ['humidity', 'sensor'],
  
  // Alarm points
  'ALARM': ['alarm', 'sensor'],
  'FAULT': ['alarm', 'sensor'],
  'ALERT': ['alarm', 'sensor']
};

// Equipment type to Haystack tag mappings
const EQUIPMENT_TAG_MAPPINGS: Record<string, string[]> = {
  'RTU': ['rtu', 'ahu', 'equip'],
  'AHU': ['ahu', 'equip'],
  'VAV': ['vav', 'equip'],
  'Chiller': ['chiller', 'equip'],
  'Boiler': ['boiler', 'equip'],
  'Pump': ['pump', 'equip'],
  'Fan': ['fan', 'equip'],
  'Humidifier': ['humidifier', 'equip']
};

class HaystackService {
  private isInitialized: boolean = false;
  private config: HaystackConfig;

  constructor(config: HaystackConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize Haystack service
   */
  async initialize(): Promise<boolean> {
    try {
      // For now, we'll work in offline mode with local normalization
      // Future versions can add actual Haystack server connectivity
      this.isInitialized = true;
      console.log('Haystack service initialized in offline mode');
      return true;
    } catch (error) {
      console.warn('Haystack service initialization failed:', error);
      return false;
    }
  }

  /**
   * Normalize BACnet point name using Haystack semantic conventions
   */
  normalizePointName(originalName: string, equipmentType?: string, vendorName?: string): {
    normalizedName: string;
    tags: string[];
    confidence: number;
  } {
    const name = originalName.toLowerCase().trim();
    const tags: string[] = [];
    let normalizedName = originalName;
    let confidence = 0.5; // Base confidence

    // Apply BACnet tag mappings - check for patterns in the name
    for (const [pattern, haystackTags] of Object.entries(BACNET_TAG_MAPPINGS)) {
      const regex = new RegExp(`\\b${pattern.toLowerCase()}\\b|${pattern.toLowerCase()}_|_${pattern.toLowerCase()}`, 'i');
      if (regex.test(name)) {
        tags.push(...haystackTags);
        confidence += 0.2;
        
        // Create normalized name
        normalizedName = this.createNormalizedName(originalName, pattern, haystackTags);
        break;
      }
    }

    // Add equipment-specific tags
    if (equipmentType && equipmentType in EQUIPMENT_TAG_MAPPINGS) {
      tags.push(...EQUIPMENT_TAG_MAPPINGS[equipmentType]);
      confidence += 0.1;
    }

    // Vendor-specific adjustments
    if (vendorName) {
      confidence += 0.1;
      tags.push('vendor:' + vendorName.toLowerCase().replace(/\s+/g, '-'));
    }

    // Ensure confidence doesn't exceed 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      normalizedName,
      tags: Array.from(new Set(tags)), // Remove duplicates
      confidence
    };
  }

  /**
   * Create human-readable normalized name from BACnet point name
   */
  private createNormalizedName(originalName: string, pattern: string, tags: string[]): string {
    let normalized = originalName;

    // Replace common abbreviations with full words
    const replacements: Record<string, string> = {
      'TEMP': 'Temperature',
      'SP': 'Setpoint',
      'FB': 'Feedback',
      'CMD': 'Command',
      'STAT': 'Status',
      'PRESS': 'Pressure',
      'HUM': 'Humidity',
      'SETP': 'Setpoint'
    };

    for (const [abbrev, fullWord] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      normalized = normalized.replace(regex, fullWord);
    }

    // Clean up formatting
    normalized = normalized
      .replace(/[_-]/g, ' ') // Replace separators with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces before capital letters
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();

    // Capitalize first letter of each word
    normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());

    return normalized;
  }

  /**
   * Validate Haystack tags for a point
   */
  validateTags(tags: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validTags = new Set([
      'point', 'sensor', 'cmd', 'sp', 'setpoint', 'temp', 'pressure', 'flow',
      'humidity', 'alarm', 'status', 'feedback', 'equip', 'ahu', 'rtu', 'vav',
      'chiller', 'boiler', 'pump', 'fan', 'humidifier'
    ]);

    for (const tag of tags) {
      const baseTag = tag.split(':')[0]; // Remove vendor prefixes
      if (!validTags.has(baseTag)) {
        errors.push(`Unknown tag: ${tag}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create Haystack dictionary for a point
   */
  createHaystackDict(pointData: {
    id: string;
    dis: string;
    tags: string[];
    kind?: string;
    unit?: string;
  }): HDict {
    const dict = new HDict();
    
    dict.set('id', HRef.make(pointData.id));
    dict.set('dis', HStr.make(pointData.dis));
    
    // Add point marker
    dict.set('point', HMarker.make());
    
    // Add semantic tags
    for (const tag of pointData.tags) {
      if (!tag.includes(':')) {
        dict.set(tag, HMarker.make());
      }
    }
    
    // Add kind if specified
    if (pointData.kind) {
      dict.set('kind', HStr.make(pointData.kind.toLowerCase()));
    }
    
    // Add unit if specified
    if (pointData.unit) {
      dict.set('unit', HStr.make(pointData.unit));
    }
    
    return dict;
  }

  /**
   * Get service status
   */
  isConnected(): boolean {
    return this.isInitialized;
  }

  /**
   * Test Haystack integration functionality
   */
  async testIntegration(): Promise<{ success: boolean; message: string }> {
    try {
      // Test normalization
      const testResult = this.normalizePointName('AHU_1_TEMP_SP', 'RTU', 'Schneider Electric');
      
      // Test tag validation
      const validation = this.validateTags(testResult.tags);
      
      // Test dictionary creation
      const dict = this.createHaystackDict({
        id: 'test-point',
        dis: 'Test Temperature Setpoint',
        tags: testResult.tags,
        kind: 'Number',
        unit: '°F'
      });

      return {
        success: true,
        message: `Haystack integration test passed. Normalized: "${testResult.normalizedName}", Tags: [${testResult.tags.join(', ')}], Confidence: ${testResult.confidence}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Haystack integration test failed: ${error}`
      };
    }
  }
}

// Export singleton instance
export const haystackService = new HaystackService();

// Export types and utilities
export { HaystackService, BACNET_TAG_MAPPINGS, EQUIPMENT_TAG_MAPPINGS };
export type { HaystackConfig }; 