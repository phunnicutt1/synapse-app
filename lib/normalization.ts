import { BacnetPoint, Connector, NormalizationRule, PointClassification, HaystackNormalization } from '@/interfaces/bacnet';
import { NormalizationCache, PerformanceMonitor, BatchProcessor, PerformanceUtils } from './performance';

// ASHRAE 135-2024 and BACnet standard abbreviation mappings
const BACNET_ABBREVIATIONS: Record<string, string> = {
     // Temperature related
   'Tmp': 'Temperature',
   'Temp': 'Temperature',
   'Oat': 'Outside Air Temperature',
   'oat': 'Outside Air Temperature',
   'Rat': 'Return Air Temperature',
   'rat': 'Return Air Temperature',
   'Sat': 'Supply Air Temperature',
   'sat': 'Supply Air Temperature',
   'Mat': 'Mixed Air Temperature',
   'mat': 'Mixed Air Temperature',
   'Zat': 'Zone Air Temperature',
   'zat': 'Zone Air Temperature',
   'Znt': 'Zone Temperature',
   'znt': 'Zone Temperature',
  'Saturation': 'Saturation',
  'Suct': 'Suction',
  'Disch': 'Discharge',
  'Ent': 'Entering',
  'Lvg': 'Leaving',
  'Ret': 'Return',
  'Sup': 'Supply',
  
  // Air handling
  'Sa': 'Supply Air',
  'Su': 'Supply',
  'Sply': 'Supply',
  'Ra': 'Return Air',
  'Ma': 'Mixed Air',
  'Oa': 'Outside Air',
  'Osa': 'Outside Air',
  'osa': 'Outside Air',
  'Ea': 'Exhaust Air',
  'Ex': 'Exhaust',
  'Air': 'Air',
  'Vol': 'Volume',
  'Fl': 'Flow',
  'Flow': 'Flow',
  'Spd': 'Speed',
  'Vel': 'Velocity',
  'Velocity': 'Velocity',
  'Fan': 'Fan',
  'Dpr': 'Damper',
  'Dmp': 'Damper',
  'Dmpr': 'Damper',
  'Da': 'Discharge Air',
  'Radmp': 'Return Air Damper',
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
  'Diff': 'Differential',
  'P': 'Pressure',
  'Cfm': 'CFM',
  'Gpm': 'GPM',
  
     // Control and status
   'Spt': 'Setpoint',
   'Sp': 'Setpoint',
   'Stpt': 'Setpoint',
   'SetPt': 'Setpoint',
   'SetPoint': 'Setpoint',
   'Fb': 'Feedback',
     'Sts': 'Status',
  'Stat': 'Status',
  'Req': 'Request',
  'Trck': 'Track',
  'Alm': 'Alarm',
  'Alarm': 'Alarm',
  'Cmd': 'Command',
  'En': 'Enable',
  'Enb': 'Enable',
  'Occ': 'Occupied',
  'Unocc': 'Unoccupied',
  'Ovr': 'Override',
  'Ovrd': 'Override',
  'Rem': 'Remote',
  'Lt': 'Light',
  'Lmt': 'Limit',
  'Sen': 'Sensor',
  'Ofs': 'Offset',
  'Dmd': 'Demand',
  
  // Equipment types
  'Ahu': 'Air Handling Unit',
  'Vav': 'VAV',
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
  'clg': 'Cooling',
  'Cl': 'Cooling',
  'cl': 'Cooling',
  'Htg': 'Heating',
  'htg': 'Heating',
  'Ht': 'Heating',
  'ht': 'Heating',
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
   'Co2': 'Carbon Dioxide',
   'co2': 'Carbon Dioxide',
   'Co': 'Carbon Dioxide',
   'co': 'Carbon Dioxide',
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
   'Ef': 'Effective',
   'Eval': 'Evaluation',
  'Dly': 'Delay',
  'Delay': 'Delay',
  'Time': 'Time',
  'Timer': 'Timer',
  'Adj': 'Adjustment',
  'Dpsp': 'Duct Static Pressure Setpoint',
  
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
  'Eco': 'Economy',
  'Tr': 'Trigger',
  'Trig': 'Trigger',
  'Ig': 'Ignore',
  'Ignore': 'Ignore',
  'Efficiency': 'Efficiency',
  'Kw': 'Kilowatts',
  'Pwr': 'Power',
  'Power': 'Power',
  
  // Control and Equipment
  'Vfd': 'Variable Frequency Drive',
  'VFD': 'Variable Frequency Drive',
  'Dcv': 'Demand Control Ventilation',
  'dcv': 'Demand Control Ventilation',
  'DCV': 'Demand Control Ventilation',
  'Ao': 'Analog Output',
  'ao': 'Analog Output',
  'AO': 'Analog Output',
  'Ai': 'Analog Input',
  'ai': 'Analog Input',
  'AI': 'Analog Input',
  'Bo': 'Binary Output',
  'BO': 'Binary Output',
  'Bi': 'Binary Input',
  'BI': 'Binary Input',
  'Do': 'Digital Output',
  'DO': 'Digital Output',
  'Di': 'Digital Input',
  'DI': 'Digital Input',
  'Rf': 'Return Fan',
  'rf': 'Return Fan',
  'RF': 'Return Fan',
  'Sf': 'Supply Fan',
  'SF': 'Supply Fan',
  'Exf': 'Exhaust Fan',
  'EXF': 'Exhaust Fan',
  
  // Miscellaneous - Enhanced for CamelCase edge cases
  'Outdoor': 'Outdoor',
  'Indoor': 'Indoor',
  'Room': 'Room',
  'Rm': 'Room',        // Recommendation #2: Handle "Rm" edge case
  'Cmf': 'Comfort',
  'Tot': 'Total',
  'Zone': 'Zone',
  'Zn': 'Zone',        // Additional zone abbreviation
  'Space': 'Space',
  'Spc': 'Space',      // Additional space abbreviation
  'Lab': 'Laboratory',
  'Office': 'Office',
  'Lobby': 'Lobby',
  'Apt': 'Apartment',  // Additional room types
  'Flr': 'Floor',
  'Bldg': 'Building',
  'Lvl': 'Level',
  'Coef': 'Coefficient'
};

// Equipment type patterns for context-aware normalization
const EQUIPMENT_TYPE_PATTERNS: Record<string, string[]> = {
  'AHU': ['Air Handling Unit', 'ahu', 'air handler', 'air handling'],
      'VAV': ['VAV Box', 'VAV', 'vav'],
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

// Enhanced vendor-specific abbreviation mappings - Recommendation #1
const VENDOR_SPECIFIC_MAPPINGS: Record<string, Record<string, string>> = {
  'Schneider Electric': {
    // Controller and device types
    'MP': 'Modular Processor',
    'SE': 'Schneider Electric',
    'TB': 'Terminal Box',
    'SBC': 'SmartX Building Controller',
    'AC': 'Application Controller',
    'IO': 'Input Output Module',
    'TAC': 'Terminal Application Controller',
    
    // Schneider-specific point types
    'EnaDly': 'Enable Delay',
    'DisDly': 'Disable Delay',
    'OffDly': 'Off Delay',
    'OnDly': 'On Delay',
    'SchdEna': 'Schedule Enable',
    'ManOvr': 'Manual Override',
    'LcLp': 'Local Loop',
    'NetSt': 'Network Status',
    'CommFlt': 'Communication Fault',
    'OpHrs': 'Operating Hours',
    'CycCnt': 'Cycle Count',
    'FltSt': 'Fault Status',
    
    // Schneider energy and power
    'KwHr': 'Kilowatt Hours',
    'KwDmd': 'Kilowatt Demand',
    'PF': 'Power Factor',
    'VA': 'Volt Amperes',
    'VAR': 'Volt Amperes Reactive'
  },
  
  'Johnson Controls': {
    // Metasys specific abbreviations
    'MS': 'Metasys',
    'NAE': 'Network Automation Engine',
    'NCE': 'Network Control Engine',
    'SNE': 'System Network Engine',
    'AD': 'Application Director',
    'UI': 'User Interface',
    
    // Johnson Controls point types
    'AdjSpt': 'Adjust Setpoint',
    'EffSpt': 'Effective Setpoint',
    'LocSpt': 'Local Setpoint',
    'NetSpt': 'Network Setpoint',
    'TotEff': 'Total Effective',
    'HiLmt': 'High Limit',
    'LoLmt': 'Low Limit',
    'OperSt': 'Operational State',
    'SysSt': 'System State',
    'AlmSt': 'Alarm State'
  },
  
  'Honeywell': {
    // Honeywell WEBs systems
    'WEB': 'WEBs System',
    'XL': 'Excel Controller',
    'WS': 'WEBs Supervisor',
    'W7750': 'WEBs Controller',
    'JACE': 'Java Application Control Engine',
    
    // Honeywell specific points
    'DigOut': 'Digital Output',
    'AnaOut': 'Analog Output',
    'DigIn': 'Digital Input',
    'AnaIn': 'Analog Input',
    'TrendPt': 'Trend Point',
    'SumPt': 'Summary Point',
    'LogPt': 'Logic Point',
    'CalcPt': 'Calculated Point'
  },
  
  'Trane': {
    // Tracer series
    'TR': 'Tracer',
    'TCS': 'Tracer Concierge',
    'TCU': 'Terminal Control Unit',
    'UCM': 'Unit Control Module',
    'ZTU': 'Zone Terminal Unit',
    
    // Trane equipment specific
    'RTAC': 'Rooftop Air Conditioner',
    'CGAM': 'CenTravac Air Cooled Chiller',
    'CGWM': 'CenTravac Water Cooled Chiller',
    'RTHD': 'Rooftop Heat Pump',
    'IntelliPak': 'IntelliPak Unit'
  },
  
  'Siemens': {
    // Building Technologies
    'BT': 'Building Technologies',
    'PXC': 'Programmable Controller',
    'TRA': 'Terminal Room Automation',
    'RXC': 'Room Controller',
    'QMX': 'Universal Module',
    
    // Siemens communication
    'BACnet': 'BACnet Protocol',
    'LON': 'LonWorks Protocol',
    'ModBus': 'Modbus Protocol',
    'Insight': 'Insight Software',
    'Navigator': 'Navigator System'
  },
  
  'ABB': {
    // ABB drives and automation
    'Eclipse': 'Eclipse Drive',
    'ACH': 'AC Drive',
    'DCS': 'Distributed Control System',
    'PLC': 'Programmable Logic Controller',
    'HMI': 'Human Machine Interface',
    'SCADA': 'Supervisory Control And Data Acquisition'
  },
  
  'Daikin Applied': {
    // Daikin equipment
    'AGZ': 'Air-Cooled Chiller',
    'WGZ': 'Water-Cooled Chiller',
    'POL': 'Polar Control',
    'Magnitude': 'Magnitude Chiller',
    'Pathfinder': 'Pathfinder Controls'
  },
  
  'Carrier': {
    // Carrier equipment and controls
    'CCN': 'Carrier Comfort Network',
    'i-Vu': 'i-Vu Building Automation',
    'ComfortLink': 'ComfortLink System',
    'AquaForce': 'AquaForce Chiller',
    'WeatherExpert': 'WeatherExpert RTU'
  },
  
  'AERCO': {
    // AERCO boiler systems
    'BMK': 'Boiler Management Kit',
    'BMS': 'Boiler Management System',
    'Innovation': 'Innovation Boiler',
    'Benchmark': 'Benchmark Boiler'
  },
  
  'Titus': {
    // Titus VAV and terminals
    'ADVT': 'Advanced Variable Volume Terminal',
    'MLD': 'Multi-Location Damper',
    'RIU': 'Remote Interface Unit',
    'VAV': 'VAV Box'
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
    
    // Clear cache to ensure new abbreviation logic takes effect
    this.clearCache();
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
     // Recommendation #2: Enhanced CamelCase splitting to handle edge cases like "Rm" → "Room"
     
     // Pre-process common edge case abbreviations before splitting
     let processed = text;
     
     // Handle room abbreviations specifically (case insensitive)
     processed = processed.replace(/\bRm([A-Z])/g, 'Room $1'); // RmTmp → Room Tmp
     processed = processed.replace(/\bZn([A-Z])/g, 'Zone $1'); // ZnTmp → Zone Tmp  
     processed = processed.replace(/\bSpc([A-Z])/g, 'Space $1'); // SpcTmp → Space Tmp
     processed = processed.replace(/\bFlr([A-Z])/g, 'Floor $1'); // FlrTmp → Floor Tmp
     
     // Handle other common edge cases
     processed = processed.replace(/\bEq([A-Z])/g, 'Equipment $1'); // EqSts → Equipment Sts
     processed = processed.replace(/\bDr([A-Z])/g, 'Drive $1'); // DrSpd → Drive Spd
     processed = processed.replace(/\bMtr([A-Z])/g, 'Motor $1'); // MtrSpd → Motor Spd
     
     // Split on camelCase, underscores, hyphens, and numbers
     return processed
       .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
       .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals
       .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Split letters from numbers
       .replace(/(\d)([a-zA-Z])/g, '$1 $2') // Split numbers from letters
       .split(/[\s_-]+/) // Split on whitespace, underscores, hyphens
       .filter(part => part.length > 0); // Only filter out empty parts, keep single characters
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

    // Step 1: Enhanced vendor-specific mappings - Recommendation #1
    let vendorSpecificApplied = false;
    if (connector?.vendorName && VENDOR_SPECIFIC_MAPPINGS[connector.vendorName]) {
      const vendorMappings = VENDOR_SPECIFIC_MAPPINGS[connector.vendorName];
      
      // First pass: Split the name and apply vendor mappings to individual parts
      const nameParts = this.splitCamelCase(normalizedName);
      let processedParts: string[] = [];
      
      for (const part of nameParts) {
        let processedPart = part;
        let partMatched = false;
        
        // Check exact matches first (higher confidence)
        for (const [abbrev, replacement] of Object.entries(vendorMappings)) {
          if (part.toLowerCase() === abbrev.toLowerCase()) {
            processedPart = replacement;
            confidence += 20;
            vendorSpecificApplied = true;
            partMatched = true;
            method = 'vendor-specific';
            break;
          }
        }
        
        // If no exact match, try partial matches within the part
        if (!partMatched) {
          for (const [abbrev, replacement] of Object.entries(vendorMappings)) {
            const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
            if (regex.test(processedPart)) {
              processedPart = processedPart.replace(regex, replacement);
              confidence += 12;
              vendorSpecificApplied = true;
              method = 'vendor-specific';
            }
          }
        }
        
        processedParts.push(processedPart);
      }
      
      normalizedName = processedParts.join(' ');
      
      // Second pass: Check for vendor-specific patterns in the full string
      for (const [abbrev, replacement] of Object.entries(vendorMappings)) {
        // Handle compound abbreviations and case variations
        const patterns = [
          new RegExp(`\\b${abbrev}\\b`, 'gi'),           // Exact word boundaries
          new RegExp(`^${abbrev}([A-Z])`, 'g'),          // Start of camelCase
          new RegExp(`([a-z])${abbrev}([A-Z])`, 'g'),    // Middle of camelCase
          new RegExp(`${abbrev}$`, 'gi')                 // End of string
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(normalizedName)) {
            normalizedName = normalizedName.replace(pattern, (match, ...groups) => {
              vendorSpecificApplied = true;
              confidence += 8;
              method = 'vendor-specific';
              
              // Preserve camelCase structure if needed
              if (groups.length > 0) {
                return groups.length === 2 ? 
                  `${groups[0]}${replacement} ${groups[1]}` : 
                  `${replacement} ${groups[0]}`;
              }
              return replacement;
            });
          }
        }
      }
    }

         // Step 2: Apply standard BACnet abbreviation mappings with multiple passes
     // First, split camelCase and handle compound abbreviations
     const parts = this.splitCamelCase(normalizedName);
     let expandedParts: string[] = [];
     
     for (const part of parts) {
       let expandedPart = part;
       let partExpanded = false;
       
       // Try to match each part with abbreviations (exact match first)
       for (const [abbrev, fullForm] of Object.entries(BACNET_ABBREVIATIONS)) {
         const regex = new RegExp(`^${abbrev}$`, 'i');
         if (regex.test(expandedPart)) {
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
           // Try partial matches within words
           if (abbrev.length >= 2 && expandedPart.toLowerCase().includes(abbrev.toLowerCase()) && !expandedPart.toLowerCase().includes(fullForm.toLowerCase())) {
             const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
             if (regex.test(expandedPart)) {
               expandedPart = expandedPart.replace(regex, fullForm);
               confidence += 8;
               partExpanded = true;
               
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
     
     // Step 2.5: Additional pass to catch any remaining abbreviations in the full string
     let previousName = '';
     let passCount = 0;
     while (normalizedName !== previousName && passCount < 3) {
       previousName = normalizedName;
       for (const [abbrev, fullForm] of Object.entries(BACNET_ABBREVIATIONS)) {
         // Case-insensitive word boundary replacement
         const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
         if (regex.test(normalizedName)) {
           // Only skip replacement if the exact full form already exists as a separate word
           const fullFormRegex = new RegExp(`\\b${fullForm}\\b`, 'i');
           if (!fullFormRegex.test(normalizedName)) {
             normalizedName = normalizedName.replace(regex, fullForm);
             confidence += 5;
             
             const tags = this.getTagsForTerm(fullForm.toLowerCase());
             tags.forEach(tag => appliedTags.add(tag));
           }
         }
       }
       passCount++;
     }

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
    // Equipment type abbreviations that should stay in all caps
    const equipmentAbbreviations = ['VAV', 'AHU', 'RTU', 'FCU', 'VFD', 'UPS', 'PDU', 'RTU', 'BAS', 'DDC', 'PLC'];
    
    // Remove extra spaces and format properly
    return name
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => {
        const upperWord = word.toUpperCase();
        // Keep equipment abbreviations in all caps
        if (equipmentAbbreviations.includes(upperWord)) {
          return upperWord;
        }
        // Standard title case for other words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
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
    NormalizationCache.clear();
    console.log('🗑️ Normalization cache cleared - new abbreviations will take effect');
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