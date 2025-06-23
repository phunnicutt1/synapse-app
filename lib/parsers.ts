import Papa from 'papaparse';
import { Connector, BacnetPoint, EquipmentSource } from '@/interfaces/bacnet';

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