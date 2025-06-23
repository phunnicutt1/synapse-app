import { BacnetPoint, Connector, NormalizationRule, PointClassification, HaystackNormalization } from '@/interfaces/bacnet';
import { NormalizationCache, PerformanceMonitor, BatchProcessor, PerformanceUtils } from './performance';

// ASHRAE 135-2024 and BACnet standard abbreviation mappings
const BACNET_ABBREVIATIONS: Record<string, string> = {
     // Temperature related
   'Tmp': 'Temperature',
   'Temp': 'Temperature',
  'Sat': 'Saturation',
  'Suct': 'Suction',
  'Disch': 'Discharge',
  'Ent': 'Entering',
  'Lvg': 'Leaving',
  'Ret': 'Return',
  'Sup': 'Supply',
  
  // Air handling
  'Sa': 'Supply Air',
  'Ra': 'Return Air',
  'Ma': 'Mixed Air',
  'Oa': 'Outside Air',
  'Ea': 'Exhaust Air',
  'Fl': 'Flow',
  'Flow': 'Flow',
  'Spd': 'Speed',
  'Fan': 'Fan',
  'Dpr': 'Damper',
  'Pos': 'Position',
  
  // Water systems
  'Chw': 'Chilled Water',
  'Hhw': 'Hot Water',
  'Hw': 'Hot Water',
  'Cw': 'Condenser Water',
  'Evap': 'Evaporator',
  'Cond': 'Condenser',
  'Ref': 'Refrigerant',
  
  // Pressure and flow
  'Pr': 'Pressure',
  'Press': 'Pressure',
  'StPr': 'Static Pressure',
  'DiffPr': 'Differential Pressure',
  'Cfm': 'CFM',
  'Gpm': 'GPM',
  
     // Control and status
   'Spt': 'Setpoint',
   'Sp': 'Setpoint',
   'Fb': 'Feedback',
   'Sts': 'Status',
   'Stat': 'Status',
  'Alm': 'Alarm',
  'Alarm': 'Alarm',
  'Cmd': 'Command',
  'En': 'Enable',
  'Enb': 'Enable',
  'Occ': 'Occupied',
  'Unocc': 'Unoccupied',
  
  // Equipment types
  'Ahu': 'Air Handling Unit',
  'Vav': 'VAV Box',
  'Fcu': 'Fan Coil Unit',
  'Rtu': 'Rooftop Unit',
  'Cuh': 'Cabinet Unit Heater',
  'Uh': 'Unit Heater',
  'Boiler': 'Boiler',
  'Chiller': 'Chiller',
  'Pump': 'Pump',
  'Tower': 'Cooling Tower',
  
  // Coils and components
  'Clg': 'Cooling',
  'Htg': 'Heating',
  'Pht': 'Preheat',
  'Reheat': 'Reheat',
  'Coil': 'Coil',
  'Vlv': 'Valve',
  'Valve': 'Valve',
  
     // Compressor and refrigeration
   'Comp': 'Compressor',
  'Circuit': 'Circuit',
  'C1': 'Circuit 1',
  'C2': 'Circuit 2',
  
     // Units and measurements
   'CO2': 'Carbon Dioxide',
   'Rh': 'Relative Humidity',
   'Psi': 'PSI',
  'InH2O': 'Inches Water Column',
  'Deg': 'Degrees',
  'Pct': 'Percent',
  'Mins': 'Minutes',
  'Hr': 'Hours',
  'Sec': 'Seconds',
  
     // Operational states
   'Run': 'Running',
   'Auto': 'Automatic',
   'Man': 'Manual',
   'Hand': 'Manual',
  'Ovrrd': 'Override',
  'Override': 'Override',
  
     // Time and scheduling
   'Act': 'Active',
   'Eff': 'Effective',
  'Dly': 'Delay',
  'Delay': 'Delay',
  'Time': 'Time',
  'Timer': 'Timer',
  
  // Safety and protection
  'Frost': 'Frost',
  'Prt': 'Protection',
  'Protect': 'Protection',
  'Safety': 'Safety',
  'Limit': 'Limit',
  'High': 'High',
  'Low': 'Low',
  'Max': 'Maximum',
  'Min': 'Minimum',
  
  // Economizer and energy
  'Econ': 'Economizer',
  'Tr': 'Trigger',
  'Trig': 'Trigger',
  'Ig': 'Ignore',
  'Ignore': 'Ignore',
  'Efficiency': 'Efficiency',
  'Kw': 'Kilowatts',
  'Pwr': 'Power',
  'Power': 'Power',
  
  // Miscellaneous
  'Outdoor': 'Outdoor',
  'Indoor': 'Indoor',
  'Room': 'Room',
  'Zone': 'Zone',
  'Space': 'Space',
  'Lab': 'Laboratory',
  'Office': 'Office',
  'Lobby': 'Lobby'
};

// Equipment type patterns for context-aware normalization
const EQUIPMENT_TYPE_PATTERNS: Record<string, string[]> = {
  'AHU': ['Air Handling Unit', 'ahu', 'air handler', 'air handling'],
  'VAV': ['VAV Box', 'Variable Air Volume', 'vav'],
  'RTU': ['Rooftop Unit', 'rtu', 'rooftop'],
  'FCU': ['Fan Coil Unit', 'fcu', 'fan coil'],
  'CUH': ['Cabinet Unit Heater', 'cuh', 'cabinet heater'],
  'UH': ['Unit Heater', 'uh', 'unit heater'],
  'CHILLER': ['Chiller', 'chiller', 'chw'],
  'BOILER': ['Boiler', 'boiler', 'hhw', 'hw'],
  'PUMP': ['Pump', 'pump'],
  'TOWER': ['Cooling Tower', 'tower', 'ct'],
  'LAB': ['Laboratory', 'lab', 'laboratory equipment']
};

// Vendor-specific abbreviation overrides
const VENDOR_SPECIFIC_MAPPINGS: Record<string, Record<string, string>> = {
  'Schneider Electric': {
    'MP': 'Modular Processor',
    'SE': 'Schneider Electric',
    'TB': 'Terminal Box'
  },
  'ABB': {
    'Eclipse': 'Eclipse Drive',
    'ACH': 'AC Drive'
  },
  'Daikin Applied': {
    'AGZ': 'Air-Cooled Chiller',
    'POL': 'Polar Control'
  },
  'AERCO': {
    'G': 'Gas Boiler'
  }
};

// Point classification patterns
const POINT_CLASSIFICATION_PATTERNS: Record<string, { keywords: string[], classification: PointClassification['classification'], subClassification?: string }> = {
  'temperature_sensor': {
    keywords: ['temp', 'tmp', 't'],
    classification: 'sensor',
    subClassification: 'temperature'
  },
  'pressure_sensor': {
    keywords: ['press', 'pr', 'pressure'],
    classification: 'sensor',
    subClassification: 'pressure'
  },
  'flow_sensor': {
    keywords: ['flow', 'fl', 'cfm', 'gpm'],
    classification: 'sensor',
    subClassification: 'flow'
  },
  'humidity_sensor': {
    keywords: ['rh', 'humidity', 'humid'],
    classification: 'sensor',
    subClassification: 'humidity'
  },
  'setpoint': {
    keywords: ['spt', 'sp', 'setpoint', 'set'],
    classification: 'setpoint'
  },
  'command': {
    keywords: ['cmd', 'command', 'pos', 'position', 'spd', 'speed'],
    classification: 'command'
  },
  'status': {
    keywords: ['sts', 'st', 'status', 'stat', 'run', 'start', 'stop'],
    classification: 'status'
  },
  'alarm': {
    keywords: ['alm', 'alarm', 'fault', 'warning', 'alert'],
    classification: 'alarm'
  }
};

// Haystack tag mappings for semantic enrichment
const HAYSTACK_TAG_MAPPINGS: Record<string, string[]> = {
  'temperature': ['temp', 'sensor'],
  'pressure': ['pressure', 'sensor'],
  'flow': ['flow', 'sensor'],
  'humidity': ['humidity', 'sensor'],
  'setpoint': ['sp', 'point'],
  'command': ['cmd', 'point'],
  'status': ['sensor', 'point'],
  'alarm': ['alarm', 'point'],
  'supply_air': ['supply', 'air'],
  'return_air': ['return', 'air'],
  'mixed_air': ['mixed', 'air'],
  'outside_air': ['outside', 'air'],
  'exhaust_air': ['exhaust', 'air'],
  'chilled_water': ['chilled', 'water'],
  'hot_water': ['hot', 'water'],
  'condenser_water': ['condenser', 'water'],
  'fan': ['fan', 'equip'],
  'damper': ['damper', 'equip'],
  'valve': ['valve', 'equip'],
  'coil': ['coil', 'equip']
};

export class BACnetNormalizationEngine {
  private normalizationRules: NormalizationRule[] = [];
  private normalizationCache = new Map<string, HaystackNormalization>();
  private memoizedNormalize: typeof this.normalizePointName;
  private debouncedClearCache: () => void;

  constructor() {
    this.initializeDefaultRules();
    
    // Memoize the normalization function for better performance
    this.memoizedNormalize = PerformanceUtils.memoize(
      this.normalizePointName.bind(this),
      (point, connector, equipmentType) => 
        `${point.dis}|${equipmentType || 'unknown'}|${connector?.vendorName || 'unknown'}`
    );
    
    // Debounced cache clearing to prevent excessive cleanup
    this.debouncedClearCache = PerformanceUtils.debounce(() => {
      this.clearCache();
    }, 5000);
  }

  private initializeDefaultRules(): void {
    // Create normalization rules from abbreviation mappings
    Object.entries(BACNET_ABBREVIATIONS).forEach(([abbrev, fullForm], index) => {
      this.normalizationRules.push({
        id: `default_${index}`,
        name: `${abbrev} -> ${fullForm}`,
        pattern: new RegExp(`\\b${abbrev}\\b`, 'gi'),
        replacement: fullForm,
        tags: this.getTagsForTerm(fullForm.toLowerCase()),
        priority: 100,
        isActive: true
      });
    });
  }

     private getTagsForTerm(term: string): string[] {
     const tags: string[] = [];
     
     // Map common terms to Haystack tags
     for (const [key, haystackTags] of Object.entries(HAYSTACK_TAG_MAPPINGS)) {
       if (term.includes(key.replace('_', ' '))) {
         tags.push(...haystackTags);
       }
     }
     
     return [...new Set(tags)]; // Remove duplicates
   }

   private splitCamelCase(text: string): string[] {
     // Split on camelCase, underscores, hyphens, and numbers
     return text
       .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
       .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals
       .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Split letters from numbers
       .replace(/(\d)([a-zA-Z])/g, '$1 $2') // Split numbers from letters
       .split(/[\s_-]+/) // Split on whitespace, underscores, hyphens
       .filter(part => part.length > 0);
   }

  /**
   * Normalize a BACnet point name using pattern matching and vendor context
   */
  public normalizePointName(
    point: BacnetPoint, 
    connector?: Connector,
    equipmentType?: string
  ): HaystackNormalization {
    const timer = PerformanceMonitor.startTimer('Point Normalization');
    
    try {
      // Check performance cache first
      const cacheResult = NormalizationCache.get(
        point.dis, 
        equipmentType || 'unknown', 
        connector?.vendorName || 'unknown'
      );
      
      if (cacheResult) {
        timer.end({ cached: true });
        return {
          originalName: point.dis,
          normalizedName: cacheResult.normalizedName || point.dis,
          confidence: cacheResult.confidence,
          tags: cacheResult.haystackTags || [],
          method: 'pattern-match',
          timestamp: new Date()
        };
      }
      
      const result = this.performNormalization(point, connector, equipmentType);
      
      // Cache the result
      NormalizationCache.set(
        point.dis,
        equipmentType || 'unknown',
        connector?.vendorName || 'unknown',
        {
          normalizedName: result.normalizedName,
          confidence: result.confidence,
          haystackTags: result.tags
        }
      );
      
      timer.end({ cached: false, confidence: result.confidence });
      return result;
    } catch (error) {
      timer.end({ error: true });
      throw error;
    }
  }

  private performNormalization(
    point: BacnetPoint, 
    connector?: Connector,
    equipmentType?: string
  ): HaystackNormalization {
    const cacheKey = `${point.dis}_${connector?.vendorName || ''}_${equipmentType || ''}`;
    
    // Check cache first
    if (this.normalizationCache.has(cacheKey)) {
      return this.normalizationCache.get(cacheKey)!;
    }

    let normalizedName = point.dis;
    let confidence = 0;
    let method: HaystackNormalization['method'] = 'pattern-match';
    const appliedTags = new Set<string>();

    // Step 1: Apply vendor-specific mappings if available
    if (connector?.vendorName && VENDOR_SPECIFIC_MAPPINGS[connector.vendorName]) {
      const vendorMappings = VENDOR_SPECIFIC_MAPPINGS[connector.vendorName];
      for (const [abbrev, replacement] of Object.entries(vendorMappings)) {
        const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
        if (regex.test(normalizedName)) {
          normalizedName = normalizedName.replace(regex, replacement);
          confidence += 15;
          method = 'vendor-specific';
        }
      }
    }

         // Step 2: Apply standard BACnet abbreviation mappings
     // First, split camelCase and handle compound abbreviations
     const parts = this.splitCamelCase(normalizedName);
     let expandedParts: string[] = [];
     
     for (const part of parts) {
       let expandedPart = part;
       let partExpanded = false;
       
       // Try to match each part with abbreviations
       for (const [abbrev, fullForm] of Object.entries(BACNET_ABBREVIATIONS)) {
         const regex = new RegExp(`^${abbrev}$`, 'i');
         if (regex.test(part)) {
           expandedPart = fullForm;
           partExpanded = true;
           confidence += 15;
           
           // Add tags for this expansion
           const tags = this.getTagsForTerm(fullForm.toLowerCase());
           tags.forEach(tag => appliedTags.add(tag));
           break;
         }
       }
       
       // If no exact match, try partial matches for compound words
       if (!partExpanded) {
         for (const [abbrev, fullForm] of Object.entries(BACNET_ABBREVIATIONS)) {
           // Only try partial matches for longer abbreviations and avoid double replacements
           if (abbrev.length > 2 && part.toLowerCase().includes(abbrev.toLowerCase()) && !expandedPart.toLowerCase().includes(fullForm.toLowerCase())) {
             const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
             if (regex.test(part)) {
               expandedPart = part.replace(regex, fullForm);
               confidence += 8;
               
               const tags = this.getTagsForTerm(fullForm.toLowerCase());
               tags.forEach(tag => appliedTags.add(tag));
               break;
             }
           }
         }
       }
       
       expandedParts.push(expandedPart);
     }
     
     normalizedName = expandedParts.join(' ');

    // Step 3: Add contextual information based on equipment type
    if (equipmentType) {
      const contextualPrefix = this.getContextualPrefix(equipmentType);
      if (contextualPrefix && !normalizedName.toLowerCase().includes(contextualPrefix.toLowerCase())) {
        normalizedName = `${contextualPrefix} ${normalizedName}`;
        confidence += 5;
      }
    }

    // Step 4: Format the normalized name
    normalizedName = this.formatNormalizedName(normalizedName);

    // Step 5: Add unit-based tags
    if (point.unit) {
      const unitTags = this.getTagsForUnit(point.unit);
      unitTags.forEach(tag => appliedTags.add(tag));
      confidence += 5;
    }

    // Step 6: Add tags based on point characteristics
    if (point.writable) {
      appliedTags.add('writable');
      appliedTags.add('point');
    } else {
      appliedTags.add('sensor');
      appliedTags.add('point');
    }

    // Normalize confidence to 0-100 scale
    confidence = Math.min(confidence, 100);

    const result: HaystackNormalization = {
      originalName: point.dis,
      normalizedName,
      tags: Array.from(appliedTags),
      confidence,
      method,
      timestamp: new Date()
    };

    // Cache the result
    this.normalizationCache.set(cacheKey, result);

    return result;
  }

  private getContextualPrefix(equipmentType: string): string | null {
    const type = equipmentType.toUpperCase();
    switch (type) {
      case 'AHU':
        return 'AHU';
      case 'VAV':
        return 'VAV';
      case 'RTU':
        return 'RTU';
      case 'FCU':
        return 'FCU';
      case 'CHILLER':
        return 'Chiller';
      case 'BOILER':
        return 'Boiler';
      case 'PUMP':
        return 'Pump';
      default:
        return null;
    }
  }

  private formatNormalizedName(name: string): string {
    // Remove extra spaces and format properly
    return name
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getTagsForUnit(unit: string): string[] {
    const tags: string[] = [];
    const unitLower = unit.toLowerCase();

    if (unitLower.includes('°f') || unitLower.includes('°c')) {
      tags.push('temp', 'sensor');
    } else if (unitLower.includes('cfm') || unitLower.includes('m³/h')) {
      tags.push('flow', 'air', 'sensor');
    } else if (unitLower.includes('gpm') || unitLower.includes('l/s')) {
      tags.push('flow', 'water', 'sensor');
    } else if (unitLower.includes('%')) {
      tags.push('sensor');
    } else if (unitLower.includes('psi') || unitLower.includes('inh₂o') || unitLower.includes('pa')) {
      tags.push('pressure', 'sensor');
    }

    return tags;
  }

  /**
   * Classify a point based on its characteristics
   */
  public classifyPoint(point: BacnetPoint, normalizedName: string): PointClassification {
    const pointName = normalizedName.toLowerCase();
    let bestMatch: PointClassification = {
      pointId: point.id,
      classification: 'unknown',
      confidence: 0,
      reasoning: []
    };

    for (const [patternName, pattern] of Object.entries(POINT_CLASSIFICATION_PATTERNS)) {
      let matchScore = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of pattern.keywords) {
        if (pointName.includes(keyword)) {
          matchScore += 1;
          matchedKeywords.push(keyword);
        }
      }

      if (matchScore > 0) {
        const confidence = (matchScore / pattern.keywords.length) * 100;
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            pointId: point.id,
            classification: pattern.classification,
            subClassification: pattern.subClassification,
            confidence,
            reasoning: [`Matched keywords: ${matchedKeywords.join(', ')}`]
          };
        }
      }
    }

    // Additional classification based on point properties
    if (point.writable && bestMatch.classification === 'unknown') {
      bestMatch.classification = 'command';
      bestMatch.confidence = 60;
      bestMatch.reasoning.push('Point is writable, likely a command point');
    }

    return bestMatch;
  }

  /**
   * Batch normalize multiple points with equipment context
   */
  public async batchNormalizePoints(
    points: BacnetPoint[],
    connector?: Connector,
    equipmentType?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ normalizations: HaystackNormalization[], classifications: PointClassification[] }> {
    const timer = PerformanceMonitor.startTimer('Batch Point Normalization');
    
    try {
      const normalizations = await BatchProcessor.processPointsBatch(
        points,
        (point) => this.normalizePointName(point, connector, equipmentType),
        100, // Process 100 points at a time
        onProgress
      );
      
      const classifications = normalizations.map((norm, index) => 
        this.classifyPoint(points[index], norm.normalizedName || '')
      );
      
      timer.end({ 
        pointCount: points.length, 
        averageConfidence: normalizations.reduce((sum, n) => sum + n.confidence, 0) / normalizations.length 
      });
      
      return { normalizations, classifications };
    } catch (error) {
      timer.end({ error: true });
      throw error;
    }
  }

  public batchNormalizePointsSync(
    points: BacnetPoint[],
    connector?: Connector,
    equipmentType?: string
  ): { normalizations: HaystackNormalization[], classifications: PointClassification[] } {
    const normalizations: HaystackNormalization[] = [];
    const classifications: PointClassification[] = [];

    for (const point of points) {
      const normalization = this.normalizePointName(point, connector, equipmentType);
      const classification = this.classifyPoint(point, normalization.normalizedName);
      
      normalizations.push(normalization);
      classifications.push(classification);
    }

    return { normalizations, classifications };
  }

  /**
   * Get normalization statistics for a set of points
   */
  public getNormalizationStats(normalizations: HaystackNormalization[]): {
    totalPoints: number;
    normalizedPoints: number;
    averageConfidence: number;
    methodDistribution: Record<string, number>;
  } {
    const totalPoints = normalizations.length;
    const normalizedPoints = normalizations.filter(n => n.confidence > 50).length;
    const averageConfidence = normalizations.reduce((sum, n) => sum + n.confidence, 0) / totalPoints;
    
    const methodDistribution: Record<string, number> = {};
    normalizations.forEach(n => {
      methodDistribution[n.method] = (methodDistribution[n.method] || 0) + 1;
    });

    return {
      totalPoints,
      normalizedPoints,
      averageConfidence,
      methodDistribution
    };
  }

  /**
   * Clear normalization cache
   */
  public clearCache(): void {
    this.normalizationCache.clear();
  }

  /**
   * Add custom normalization rule
   */
  public addNormalizationRule(rule: Omit<NormalizationRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: NormalizationRule = { ...rule, id };
    this.normalizationRules.push(newRule);
    this.clearCache(); // Clear cache to apply new rules
    return id;
  }

  /**
   * Remove normalization rule
   */
  public removeNormalizationRule(ruleId: string): boolean {
    const index = this.normalizationRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.normalizationRules.splice(index, 1);
      this.clearCache();
      return true;
    }
    return false;
  }

  /**
   * Get all normalization rules
   */
  public getNormalizationRules(): NormalizationRule[] {
    return [...this.normalizationRules];
  }
}

// Export convenience functions
export const normalizationEngine = new BACnetNormalizationEngine();

export function normalizePointName(
  pointName: string, 
  equipmentType: string, 
  vendor: string
): { normalizedName: string | null; confidence: number } {
  const mockPoint: BacnetPoint = {
    id: 'temp',
    dis: pointName,
    bacnetCur: '',
    kind: 'Number',
    writable: false,
    bacnetDesc: pointName
  };
  
  const mockConnector: Connector = {
    id: 'temp',
    dis: 'temp',
    connStatus: 'ok',
    vendorName: vendor,
    modelName: ''
  };
  
  const result = normalizationEngine.normalizePointName(mockPoint, mockConnector, equipmentType);
  return {
    normalizedName: result.normalizedName,
    confidence: result.confidence
  };
}

export function calculateConfidenceScore(
  equipment: any, 
  signature: any
): number {
  if (!equipment || !signature) {
    throw new Error('Equipment and signature are required');
  }
  
  // Mock confidence calculation - in a real implementation this would be more sophisticated
  const baseConfidence = 75;
  const equipmentTypeMatch = equipment.equipmentType === signature.equipmentType ? 20 : 0;
  const pointCountFactor = Math.min(equipment.points?.length || 0, 10) * 0.5;
  
  return Math.min(100, baseConfidence + equipmentTypeMatch + pointCountFactor);
} 