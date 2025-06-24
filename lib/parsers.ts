import Papa from 'papaparse';
import { Connector, BacnetPoint, EquipmentSource } from '@/interfaces/bacnet';
import { normalizationEngine } from './normalization';

// Define known primary fields and descriptive field patterns
const PRIMARY_FIELDS = new Set(['id', 'dis', 'connStatus']);
const DESCRIPTIVE_FIELD_PATTERNS = [
  /description/i,
  /desc/i,
  /name/i,
  /vendor/i,
  /model/i,
  /type/i,
  /category/i,
  /location/i,
  /room/i,
  /building/i,
  /floor/i,
  /zone/i,
  /manufacturer/i,
  /brand/i,
  /series/i,
  /version/i,
  /status/i,
  /state/i,
  /note/i,
  /comment/i,
  /info/i,
  /detail/i
];

// Fields that are known to be descriptive
const KNOWN_DESCRIPTIVE_FIELDS = new Set([
  'vendorName',
  'modelName', 
  'descriptionFromVendor',
  'bacnetDeviceName',
  'bacnetDeviceStatus',
  'bacnetVersion',
  'connState',
  'uri'
]);

function isDescriptiveField(fieldName: string): boolean {
  // Check if it's a known descriptive field
  if (KNOWN_DESCRIPTIVE_FIELDS.has(fieldName)) {
    return true;
  }
  
  // Check if it matches descriptive patterns
  return DESCRIPTIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

function generateFullDescription(connector: Connector): string {
  const descriptionParts: string[] = [];
  
  // Add vendor and model as primary identifiers
  if (connector.vendorName) {
    descriptionParts.push(`Vendor: ${connector.vendorName}`);
  }
  
  if (connector.modelName) {
    descriptionParts.push(`Model: ${connector.modelName}`);
  }
  
  // Add BACnet device information
  if (connector.bacnetDeviceName) {
    descriptionParts.push(`Device: ${connector.bacnetDeviceName}`);
  }
  
  if (connector.bacnetDeviceStatus) {
    descriptionParts.push(`Status: ${connector.bacnetDeviceStatus}`);
  }
  
  if (connector.bacnetVersion) {
    descriptionParts.push(`Version: ${connector.bacnetVersion}`);
  }
  
  // Add vendor description if available
  if (connector.descriptionFromVendor) {
    descriptionParts.push(`Description: ${connector.descriptionFromVendor}`);
  }
  
  // Add connection state information
  if (connector.connState) {
    descriptionParts.push(`Connection: ${connector.connState}`);
  }
  
  // Add any additional descriptive fields
  if (connector.additionalDescriptiveFields) {
    Object.entries(connector.additionalDescriptiveFields).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        // Format the key name nicely
        const formattedKey = key.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, str => str.toUpperCase())
                                .trim();
        descriptionParts.push(`${formattedKey}: ${value}`);
      }
    });
  }
  
  return descriptionParts.join(' | ');
}

export function parseConnectorCsv(csvContent: string): Map<string, Connector> {
  const connectors = new Map<string, Connector>();
  const parsed = Papa.parse<any>(csvContent, { header: true, skipEmptyLines: true });

  // Get all available field names from the CSV
  const allFields = parsed.meta?.fields || [];
  console.log('Available CSV fields:', allFields);
  
  // Identify descriptive fields dynamically
  const descriptiveFields = allFields.filter(field => 
    !PRIMARY_FIELDS.has(field) && isDescriptiveField(field)
  );
  console.log('Detected descriptive fields:', descriptiveFields);

  for (const row of parsed.data) {
    if (row.id && row.dis) {
      // Start with basic connector structure
      const connector: Connector = {
        id: row.id,
        dis: row.dis.trim(),
        connStatus: row.connStatus as Connector['connStatus'],
      };
      
      // Add known descriptive fields
      if (row.vendorName) connector.vendorName = row.vendorName;
      if (row.modelName) connector.modelName = row.modelName;
      if (row.descriptionFromVendor) connector.descriptionFromVendor = row.descriptionFromVendor;
      if (row.bacnetDeviceName) connector.bacnetDeviceName = row.bacnetDeviceName;
      if (row.bacnetDeviceStatus) connector.bacnetDeviceStatus = row.bacnetDeviceStatus;
      if (row.bacnetVersion) connector.bacnetVersion = row.bacnetVersion;
      if (row.connState) connector.connState = row.connState;
      if (row.uri) connector.uri = row.uri;
      
      // Collect additional descriptive fields
      const additionalFields: Record<string, string> = {};
      descriptiveFields.forEach(field => {
        if (row[field] && !KNOWN_DESCRIPTIVE_FIELDS.has(field)) {
          const value = String(row[field]).trim();
          if (value !== '' && value !== '""' && value !== "''") {
            additionalFields[field] = value;
          }
        }
      });
      
      if (Object.keys(additionalFields).length > 0) {
        connector.additionalDescriptiveFields = additionalFields;
      }
      
      // Generate comprehensive description
      connector.fullDescription = generateFullDescription(connector);
      
      console.log(`Processed connector ${connector.dis}:`, {
        vendorName: connector.vendorName,
        modelName: connector.modelName,
        bacnetDeviceName: connector.bacnetDeviceName,
        additionalFields: Object.keys(additionalFields),
        fullDescription: connector.fullDescription
      });
      
      connectors.set(connector.dis, connector);
    }
  }
  
  console.log(`Processed ${connectors.size} connectors with enhanced descriptive information`);
  return connectors;
}

/**
 * Find a connector by searching for the FULL equipment name within connector entries
 * Searches for the complete equipment name as a substring within connector dis fields
 */
function findConnectorByEquipmentName(
  equipmentName: string, 
  connectors: Map<string, Connector>
): Connector | null {
  // First try exact match (current behavior)
  const exactMatch = connectors.get(equipmentName);
  if (exactMatch) {
    console.log(`Found exact match for equipment: ${equipmentName}`);
    return exactMatch;
  }
  
  // Search for the FULL equipment name within connector entries
  const cleanEquipmentName = equipmentName.toLowerCase().trim();
  
  for (const [connectorDis, connector] of connectors.entries()) {
    const cleanConnectorDis = connectorDis.toLowerCase().trim();
    
    // Check if the FULL equipment name appears anywhere within the connector dis
    if (cleanConnectorDis.includes(cleanEquipmentName)) {
      console.log(`Found equipment name "${equipmentName}" within connector: ${connectorDis}`);
      return connector;
    }
  }
  
  // Try with normalized separators (replace _ with - and vice versa)
  const normalizedEquipmentName = equipmentName.toLowerCase().replace(/[_]/g, '-');
  const altNormalizedEquipmentName = equipmentName.toLowerCase().replace(/[-]/g, '_');
  
  for (const [connectorDis, connector] of connectors.entries()) {
    const cleanConnectorDis = connectorDis.toLowerCase().trim();
    
    // Check with normalized separators
    if (cleanConnectorDis.includes(normalizedEquipmentName) || 
        cleanConnectorDis.includes(altNormalizedEquipmentName)) {
      console.log(`Found normalized equipment name "${equipmentName}" within connector: ${connectorDis}`);
      return connector;
    }
  }
  
  return null;
}

export function parseTrioFile(
  fileName: string,
  trioContent: string,
  connectors: Map<string, Connector>
): EquipmentSource | null {
  const equipmentId = fileName.replace('.trio', '');
  
  // Use enhanced matching logic instead of simple exact match
  const connector = findConnectorByEquipmentName(equipmentId, connectors);

  if (!connector) {
    console.warn(`No connector found for equipment: ${equipmentId} (tried exact and substring matching)`);
    return null;
  }

  console.log(`Parsing trio file for equipment: ${equipmentId}`);
  console.log(`Matched connector: ${connector.dis} with metadata:`, {
    vendorName: connector.vendorName,
    modelName: connector.modelName,
    bacnetDeviceName: connector.bacnetDeviceName,
    fullDescription: connector.fullDescription
  });

  const points: BacnetPoint[] = [];
  const pointChunks = trioContent.split('---').filter(s => s.trim());
  console.log(`Found ${pointChunks.length} point chunks for ${equipmentId}`);

  for (const chunk of pointChunks) {
    const lines = chunk.trim().split('\n');
    const point: Partial<BacnetPoint> & { dis?: string } = { writable: false };

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key === 'dis') point.dis = value.replace(/"/g, '');
      else if (key === 'bacnetCur') point.bacnetCur = value;
      else if (key === 'kind') point.kind = value as BacnetPoint['kind'];
      else if (key === 'unit') point.unit = value.replace(/"/g, '');
      else if (key === 'bacnetDesc') point.bacnetDesc = value;
      else if (key === 'writable' || key === 'cmd') point.writable = true;
    });

    // Check for required fields: dis, bacnetCur, kind
    // Use dis as bacnetDesc if bacnetDesc is not provided (which is typical for trio files)
    if (point.dis && point.bacnetCur && point.kind) {
      if (!point.bacnetDesc) {
        point.bacnetDesc = point.dis; // Use dis as fallback for bacnetDesc
      }
      
      points.push({
        id: `${equipmentId}-${point.bacnetCur}`,
        ...point,
      } as BacnetPoint);
    } else {
      console.log(`Skipping incomplete point in ${equipmentId}:`, {
        dis: point.dis,
        bacnetCur: point.bacnetCur,
        kind: point.kind,
        hasRequiredFields: !!(point.dis && point.bacnetCur && point.kind)
      });
    }
  }

  console.log(`Successfully parsed ${points.length} points for ${equipmentId}`);

  // Extract equipment type from the first segment of the filename
  let equipmentType = 'Unknown';
  const segments = equipmentId.split(/[_-]/);
  if (segments.length > 0) {
    const firstSegment = segments[0].toLowerCase();
    if (firstSegment.startsWith('rtu')) equipmentType = 'RTU';
    else if (firstSegment.startsWith('vvr') || firstSegment.startsWith('vv')) equipmentType = 'VAV';
    else if (firstSegment.startsWith('l')) equipmentType = 'Lab Equipment';
    else if (firstSegment.startsWith('h')) equipmentType = 'Humidifier';
    else if (firstSegment.startsWith('misc')) equipmentType = 'Miscellaneous';
    else equipmentType = firstSegment.toUpperCase();
  }

  // Extract semantic metadata from connector for enhanced normalization
  const semanticMetadata = extractSemanticMetadata(connector);
  
  console.log(`Semantic metadata for ${equipmentId}:`, {
    vendor: semanticMetadata.vendorRules?.name || 'Unknown',
    equipment: semanticMetadata.equipmentStrategy?.contextPrefix || 'Unknown',
    deviceContext: semanticMetadata.deviceContext,
    confidenceModifiers: semanticMetadata.confidenceModifiers
  });

  // Apply enhanced normalization to all points with semantic context
  console.log(`Applying enhanced normalization to ${points.length} points for ${equipmentId}`);
  const { normalizations, classifications } = normalizationEngine.batchNormalizePointsSync(
    points, 
    connector, 
    equipmentType
  );

  // Update points with enhanced normalization data including semantic metadata
  points.forEach((point, index) => {
    const normalization = normalizations[index];
    const classification = classifications[index];
    
    // Apply semantic classification for enhanced point typing
    const semanticClassification = classifyPointWithSemanticMetadata(
      point.dis || point.bacnetDesc || '',
      connector,
      semanticMetadata
    );
    
    // Use semantic classification if it provides higher confidence
    const finalNormalizedName = semanticClassification.confidence > normalization.confidence
      ? semanticClassification.pointType
      : normalization.normalizedName;
      
    const finalConfidence = Math.max(normalization.confidence, semanticClassification.confidence);
    
    // Merge tags from both approaches
    const combinedTags = [...new Set([
      ...normalization.tags,
      ...semanticClassification.tags
    ])];
    
    point.normalizedName = finalNormalizedName;
    point.haystackTags = combinedTags;
    point.normalizationConfidence = finalConfidence;
    
    // Add semantic metadata to point
    point.semanticMetadata = {
      vendorSpecific: semanticClassification.confidence > 80,
      equipmentSpecific: semanticMetadata.equipmentStrategy !== null,
      deviceContext: semanticMetadata.deviceContext,
      reasoning: semanticClassification.reasoning
    };
    
    console.log(`Point "${point.dis}" -> "${point.normalizedName}" (${point.normalizationConfidence}% confidence)`, {
      semanticClassification: semanticClassification.pointType,
      semanticConfidence: semanticClassification.confidence,
      vendorSpecific: point.semanticMetadata.vendorSpecific,
      reasoning: semanticClassification.reasoning.slice(0, 2) // Show first 2 reasoning items
    });
  });

  // Calculate enhanced normalization summary
  const normalizationStats = normalizationEngine.getNormalizationStats(normalizations);
  const semanticStats = {
    vendorSpecificPoints: points.filter(p => p.semanticMetadata?.vendorSpecific).length,
    equipmentSpecificPoints: points.filter(p => p.semanticMetadata?.equipmentSpecific).length,
    averageSemanticConfidence: points.reduce((sum, p) => sum + (p.normalizationConfidence || 0), 0) / points.length
  };
  
  console.log(`Enhanced normalization summary for ${equipmentId}:`, {
    ...normalizationStats,
    ...semanticStats
  });

  return {
    id: equipmentId,
    connectorId: connector.id,
    equipmentType,
    vendorName: connector.vendorName,
    modelName: connector.modelName,
    points,
    // Pass through enhanced descriptive information
    fullDescription: connector.fullDescription,
    bacnetDeviceName: connector.bacnetDeviceName,
    bacnetDeviceStatus: connector.bacnetDeviceStatus,
    bacnetVersion: connector.bacnetVersion,
    connState: connector.connState,
    uri: connector.uri,
    additionalDescriptiveFields: connector.additionalDescriptiveFields,
    // Add Haystack integration fields
    normalizationSummary: {
      totalPoints: normalizationStats.totalPoints,
      normalizedPoints: normalizationStats.normalizedPoints,
      averageConfidence: normalizationStats.averageConfidence
    }
  };
}

/**
 * Utility function to validate and analyze CSV structure for descriptive fields
 * This can be used to test how the parser handles different CSV formats
 */
export function analyzeCsvStructure(csvContent: string): {
  totalFields: number;
  primaryFields: string[];
  descriptiveFields: string[];
  unknownFields: string[];
  sampleRow?: any;
} {
  const parsed = Papa.parse<any>(csvContent, { header: true, skipEmptyLines: true });
  const allFields = parsed.meta?.fields || [];
  
  const primaryFields = allFields.filter(field => PRIMARY_FIELDS.has(field));
  const descriptiveFields = allFields.filter(field => 
    !PRIMARY_FIELDS.has(field) && isDescriptiveField(field)
  );
  const unknownFields = allFields.filter(field => 
    !PRIMARY_FIELDS.has(field) && !isDescriptiveField(field)
  );
  
  return {
    totalFields: allFields.length,
    primaryFields,
    descriptiveFields,
    unknownFields,
    sampleRow: parsed.data[0] || null
  };
}

// Vendor-specific rule engines for enhanced normalization
const VENDOR_SPECIFIC_RULES: Record<string, {
  name: string;
  patterns: Array<{
    pattern: RegExp;
    pointType: string;
    confidence: number;
    tags: string[];
  }>;
  modelSpecificRules?: Record<string, Array<{
    pattern: RegExp;
    pointType: string;
    confidence: number;
    tags: string[];
  }>>;
}> = {
  'schneider electric': {
    name: 'Schneider Electric',
    patterns: [
      {
        pattern: /^(Sa|Supply).*(Tmp|Temp|Temperature)/i,
        pointType: 'Supply Air Temperature',
        confidence: 85,
        tags: ['air', 'temp', 'supply', 'sensor']
      },
      {
        pattern: /^(Ra|Return).*(Tmp|Temp|Temperature)/i,
        pointType: 'Return Air Temperature',
        confidence: 85,
        tags: ['air', 'temp', 'return', 'sensor']
      },
      {
        pattern: /^(Ma|Mixed).*(Tmp|Temp|Temperature)/i,
        pointType: 'Mixed Air Temperature',
        confidence: 85,
        tags: ['air', 'temp', 'mixed', 'sensor']
      },
      {
        pattern: /^(Oa|Outside).*(Tmp|Temp|Temperature)/i,
        pointType: 'Outside Air Temperature',
        confidence: 85,
        tags: ['air', 'temp', 'outside', 'sensor']
      },
      {
        pattern: /(Htg|Heat).*(Spt|Setpoint)/i,
        pointType: 'Heating Setpoint',
        confidence: 80,
        tags: ['heating', 'setpoint', 'control']
      },
      {
        pattern: /(Clg|Cool).*(Spt|Setpoint)/i,
        pointType: 'Cooling Setpoint',
        confidence: 80,
        tags: ['cooling', 'setpoint', 'control']
      },
      {
        pattern: /(Dmpr|Damper).*(Pos|Position)/i,
        pointType: 'Damper Position',
        confidence: 80,
        tags: ['damper', 'position', 'actuator']
      },
      {
        pattern: /(Fan|Spd|Speed)/i,
        pointType: 'Fan Speed',
        confidence: 75,
        tags: ['fan', 'speed', 'control']
      }
    ],
    modelSpecificRules: {
      'MP-V-7A': [
        {
          pattern: /^Vav/i,
          pointType: 'VAV Box Control',
          confidence: 90,
          tags: ['vav', 'control', 'terminal']
        }
      ],
      'MP-C-36A': [
        {
          pattern: /^(Ahu|Rtu)/i,
          pointType: 'Air Handler Control',
          confidence: 90,
          tags: ['ahu', 'control', 'central']
        }
      ],
      'MP-C-24A': [
        {
          pattern: /^(Chw|Hhw)/i,
          pointType: 'Plant System Control',
          confidence: 90,
          tags: ['plant', 'control', 'system']
        }
      ]
    }
  },
  'abb, inc.': {
    name: 'ABB',
    patterns: [
      {
        pattern: /^(Motor|Pump).*(Spd|Speed)/i,
        pointType: 'Motor Speed Control',
        confidence: 85,
        tags: ['motor', 'speed', 'vfd', 'control']
      },
      {
        pattern: /^(Freq|Frequency)/i,
        pointType: 'Frequency Control',
        confidence: 80,
        tags: ['frequency', 'vfd', 'control']
      },
      {
        pattern: /^(Current|Amps)/i,
        pointType: 'Motor Current',
        confidence: 80,
        tags: ['current', 'motor', 'sensor']
      },
      {
        pattern: /^(Power|Watts)/i,
        pointType: 'Power Consumption',
        confidence: 80,
        tags: ['power', 'energy', 'sensor']
      }
    ],
    modelSpecificRules: {
      'ABB ECLIPSE 80 ACH580': [
        {
          pattern: /^(Drive|Vfd)/i,
          pointType: 'VFD Control',
          confidence: 95,
          tags: ['vfd', 'drive', 'control', 'motor']
        }
      ]
    }
  },
  'daikin applied': {
    name: 'Daikin Applied',
    patterns: [
      {
        pattern: /^(Chiller|Chill)/i,
        pointType: 'Chiller Control',
        confidence: 90,
        tags: ['chiller', 'cooling', 'plant']
      },
      {
        pattern: /^(Evap|Evaporator)/i,
        pointType: 'Evaporator Control',
        confidence: 85,
        tags: ['evaporator', 'cooling', 'heat-exchanger']
      },
      {
        pattern: /^(Cond|Condenser)/i,
        pointType: 'Condenser Control',
        confidence: 85,
        tags: ['condenser', 'cooling', 'heat-exchanger']
      },
      {
        pattern: /^(Refrig|Refrigerant)/i,
        pointType: 'Refrigerant Control',
        confidence: 85,
        tags: ['refrigerant', 'cooling', 'control']
      }
    ]
  },
  'aerco': {
    name: 'AERCO',
    patterns: [
      {
        pattern: /^(Boiler|Blr)/i,
        pointType: 'Boiler Control',
        confidence: 90,
        tags: ['boiler', 'heating', 'plant']
      },
      {
        pattern: /^(Gas|Fuel)/i,
        pointType: 'Fuel Control',
        confidence: 85,
        tags: ['fuel', 'gas', 'control']
      },
      {
        pattern: /^(Flue|Exhaust)/i,
        pointType: 'Flue Gas Control',
        confidence: 85,
        tags: ['flue', 'exhaust', 'combustion']
      }
    ]
  },
  'setra': {
    name: 'SETRA',
    patterns: [
      {
        pattern: /^(Press|Pressure)/i,
        pointType: 'Pressure Sensor',
        confidence: 90,
        tags: ['pressure', 'sensor', 'monitoring']
      },
      {
        pattern: /^(Diff|Differential)/i,
        pointType: 'Differential Pressure',
        confidence: 90,
        tags: ['pressure', 'differential', 'sensor']
      },
      {
        pattern: /^(Room|Zone)/i,
        pointType: 'Room Monitoring',
        confidence: 85,
        tags: ['room', 'zone', 'monitoring']
      }
    ]
  }
};

// Equipment type-specific normalization strategies
const EQUIPMENT_TYPE_STRATEGIES: Record<string, {
  contextPrefix: string;
  commonPatterns: Array<{
    pattern: RegExp;
    pointType: string;
    confidence: number;
    tags: string[];
  }>;
}> = {
  'VAV': {
    contextPrefix: 'Terminal',
    commonPatterns: [
      {
        pattern: /^(Rmtmp|Room.*Temp)/i,
        pointType: 'Room Temperature',
        confidence: 85,
        tags: ['room', 'temp', 'sensor', 'zone']
      },
      {
        pattern: /^(Airflow|Flow)/i,
        pointType: 'Airflow Control',
        confidence: 80,
        tags: ['airflow', 'control', 'terminal']
      },
      {
        pattern: /^(Occ|Occupancy)/i,
        pointType: 'Occupancy Status',
        confidence: 80,
        tags: ['occupancy', 'sensor', 'zone']
      }
    ]
  },
  'AHU': {
    contextPrefix: 'Central Air Handler',
    commonPatterns: [
      {
        pattern: /^(Filter|Flt)/i,
        pointType: 'Filter Status',
        confidence: 80,
        tags: ['filter', 'maintenance', 'air-quality']
      },
      {
        pattern: /^(Coil|Htg|Clg)/i,
        pointType: 'Coil Control',
        confidence: 80,
        tags: ['coil', 'control', 'heating-cooling']
      },
      {
        pattern: /^(Economizer|Econ)/i,
        pointType: 'Economizer Control',
        confidence: 85,
        tags: ['economizer', 'control', 'energy-saving']
      }
    ]
  },
  'Chiller': {
    contextPrefix: 'Chiller Plant',
    commonPatterns: [
      {
        pattern: /^(Capacity|Cap)/i,
        pointType: 'Cooling Capacity',
        confidence: 85,
        tags: ['capacity', 'cooling', 'performance']
      },
      {
        pattern: /^(Efficiency|Eff|Kw\/Ton)/i,
        pointType: 'Energy Efficiency',
        confidence: 85,
        tags: ['efficiency', 'energy', 'performance']
      }
    ]
  },
  'Boiler': {
    contextPrefix: 'Boiler Plant',
    commonPatterns: [
      {
        pattern: /^(Firing|Fire)/i,
        pointType: 'Firing Rate',
        confidence: 85,
        tags: ['firing', 'combustion', 'control']
      },
      {
        pattern: /^(Stack|Flue)/i,
        pointType: 'Stack Control',
        confidence: 85,
        tags: ['stack', 'flue', 'combustion']
      }
    ]
  }
};

// Enhanced semantic metadata extraction
interface SemanticMetadata {
  vendorRules: typeof VENDOR_SPECIFIC_RULES[string] | null;
  equipmentStrategy: typeof EQUIPMENT_TYPE_STRATEGIES[string] | null;
  deviceContext: {
    isVFD: boolean;
    isController: boolean;
    isMonitoring: boolean;
    communicationProtocol: string;
  };
  confidenceModifiers: {
    vendorMatch: number;
    modelMatch: number;
    deviceNameMatch: number;
    contextMatch: number;
  };
}

function extractSemanticMetadata(connector: Connector): SemanticMetadata {
  const vendorKey = connector.vendorName?.toLowerCase().trim() || '';
  const modelName = connector.modelName?.toLowerCase().trim() || '';
  const deviceName = connector.bacnetDeviceName?.toLowerCase().trim() || '';
  
  // Extract vendor-specific rules
  const vendorRules = VENDOR_SPECIFIC_RULES[vendorKey] || null;
  
  // Determine equipment type from connector dis
  let equipmentStrategy = null;
  const connectorDis = connector.dis.toLowerCase();
  
  if (connectorDis.includes('vav')) {
    equipmentStrategy = EQUIPMENT_TYPE_STRATEGIES['VAV'];
  } else if (connectorDis.includes('ahu') || connectorDis.includes('rtu')) {
    equipmentStrategy = EQUIPMENT_TYPE_STRATEGIES['AHU'];
  } else if (connectorDis.includes('chill')) {
    equipmentStrategy = EQUIPMENT_TYPE_STRATEGIES['Chiller'];
  } else if (connectorDis.includes('boiler') || connectorDis.includes('blr')) {
    equipmentStrategy = EQUIPMENT_TYPE_STRATEGIES['Boiler'];
  }
  
  // Analyze device context
  const deviceContext = {
    isVFD: modelName.includes('ach580') || modelName.includes('vfd') || modelName.includes('drive'),
    isController: modelName.includes('mp-') || modelName.includes('controller') || modelName.includes('tb'),
    isMonitoring: modelName.includes('apm') || modelName.includes('monitor') || vendorKey.includes('setra'),
    communicationProtocol: connector.uri?.includes('bacnet') ? 'BACnet' : 'Unknown'
  };
  
  // Calculate confidence modifiers
  const confidenceModifiers = {
    vendorMatch: vendorRules ? 15 : 0,
    modelMatch: modelName ? 10 : 0,
    deviceNameMatch: deviceName ? 8 : 0,
    contextMatch: equipmentStrategy ? 12 : 0
  };
  
  return {
    vendorRules,
    equipmentStrategy,
    deviceContext,
    confidenceModifiers
  };
}

// Enhanced point classification with semantic metadata
function classifyPointWithSemanticMetadata(
  pointName: string,
  connector: Connector,
  semanticMetadata: SemanticMetadata
): {
  pointType: string;
  confidence: number;
  tags: string[];
  reasoning: string[];
} {
  let bestMatch = {
    pointType: 'Unknown',
    confidence: 0,
    tags: [] as string[],
    reasoning: [] as string[]
  };
  
  const reasoning: string[] = [];
  
  // Try vendor-specific rules first
  if (semanticMetadata.vendorRules) {
    const vendorRules = semanticMetadata.vendorRules;
    reasoning.push(`Applying ${vendorRules.name} vendor rules`);
    
    // Check model-specific rules first
    if (connector.modelName && vendorRules.modelSpecificRules) {
      const modelRules = vendorRules.modelSpecificRules[connector.modelName];
      if (modelRules) {
        for (const rule of modelRules) {
          if (rule.pattern.test(pointName)) {
            if (rule.confidence > bestMatch.confidence) {
              bestMatch = {
                pointType: rule.pointType,
                confidence: rule.confidence + semanticMetadata.confidenceModifiers.modelMatch,
                tags: [...rule.tags],
                reasoning: [...reasoning, `Model-specific rule: ${rule.pattern.source}`]
              };
            }
          }
        }
      }
    }
    
    // Check general vendor patterns
    for (const rule of vendorRules.patterns) {
      if (rule.pattern.test(pointName)) {
        const adjustedConfidence = rule.confidence + semanticMetadata.confidenceModifiers.vendorMatch;
        if (adjustedConfidence > bestMatch.confidence) {
          bestMatch = {
            pointType: rule.pointType,
            confidence: adjustedConfidence,
            tags: [...rule.tags],
            reasoning: [...reasoning, `Vendor pattern: ${rule.pattern.source}`]
          };
        }
      }
    }
  }
  
  // Try equipment-specific strategies
  if (semanticMetadata.equipmentStrategy) {
    const strategy = semanticMetadata.equipmentStrategy;
    reasoning.push(`Applying ${strategy.contextPrefix} equipment strategy`);
    
    for (const pattern of strategy.commonPatterns) {
      if (pattern.pattern.test(pointName)) {
        const adjustedConfidence = pattern.confidence + semanticMetadata.confidenceModifiers.contextMatch;
        if (adjustedConfidence > bestMatch.confidence) {
          bestMatch = {
            pointType: pattern.pointType,
            confidence: adjustedConfidence,
            tags: [...pattern.tags, 'equipment-specific'],
            reasoning: [...reasoning, `Equipment pattern: ${pattern.pattern.source}`]
          };
        }
      }
    }
  }
  
  // Add device context tags
  if (semanticMetadata.deviceContext.isVFD) {
    bestMatch.tags.push('vfd');
    reasoning.push('Device identified as VFD');
  }
  if (semanticMetadata.deviceContext.isController) {
    bestMatch.tags.push('controller');
    reasoning.push('Device identified as controller');
  }
  if (semanticMetadata.deviceContext.isMonitoring) {
    bestMatch.tags.push('monitoring');
    reasoning.push('Device identified as monitoring system');
  }
  
  return {
    ...bestMatch,
    reasoning
  };
}

// Export functions for testing
export { extractSemanticMetadata, classifyPointWithSemanticMetadata };