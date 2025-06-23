import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  BacnetPoint,
  EquipmentSource,
  EquipmentSignature,
  CxAlloyEquipment,
} from '@/interfaces/bacnet';
import { parseConnectorCsv, parseTrioFile } from './parsers';
import { database } from './mockDatabase';

function normalizePointSignature(points: BacnetPoint[]): string {
  // Create signature based on functional characteristics, not equipment-specific names
  return points
    .map(p => {
      // Use bacnetDesc as the primary identifier since it describes function
      // Fall back to a normalized version of dis if bacnetDesc is not available
      const identifier = p.bacnetDesc || 
        p.dis.replace(/['"]?[^']*'[^']*'[^']*'[^']*['"]?/g, '') // Remove equipment-specific path
               .replace(/['"]/g, '') // Remove quotes
               .trim();
      return `${identifier}|${p.kind}|${p.unit || ''}`;
    })
    .sort()
    .join(';');
}

export async function processDataFiles() {
  console.log("Starting data processing pipeline...");
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const pointsDir = path.join(dataDir, 'sample_point_data');

  const connectorCsvPath = path.join(dataDir, 'ConnectorData.csv');
  const connectorCsvContent = await fs.readFile(connectorCsvPath, 'utf-8');
  const connectors = parseConnectorCsv(connectorCsvContent);

  const equipmentSources: EquipmentSource[] = [];
  const pointFiles = await fs.readdir(pointsDir);

  for (const fileName of pointFiles) {
    if (fileName.endsWith('.trio')) {
      const filePath = path.join(pointsDir, fileName);
      const trioContent = await fs.readFile(filePath, 'utf-8');
      const equipment = parseTrioFile(fileName, trioContent, connectors);
      if (equipment) {
        equipmentSources.push(equipment);
      } else {
        console.log(`Failed to parse equipment from file: ${fileName}`);
      }
    }
  }
  
  console.log(`Total equipment sources parsed: ${equipmentSources.length}`);

  // No longer auto-create signatures - they will be created by users
  const signatures: EquipmentSignature[] = [];
  console.log(`Signatures will be created by users as needed.`);
  
  const mockCxAlloyEquipment: CxAlloyEquipment[] = [
      { id: 'cx-1', name: 'RTU-2 Office Wing' }, { id: 'cx-2', name: 'RTU-6 Lab Wing' },
      { id: 'cx-3', name: 'RTU-7 Main Lobby' }, { id: 'cx-4', name: 'RTU-8 West Corridor' },
      { id: 'cx-5', name: 'VAV-2.9 Conference Room A' }, { id: 'cx-6', name: 'VAV-2.15 Office 215B' },
      { id: 'cx-7', name: 'VAV-E5 Atrium East' }, { id: 'cx-8', name: 'Fume Hood Lab 17' },
      { id: 'cx-9', name: 'General Exhaust L-5' }, { id: 'cx-10', name: 'Lab Supply/Exhaust L-1/L-2' },
      { id: 'cx-11', name: 'RTU-3 (Offline)' }, { id: 'cx-12', name: 'Humidifier H-1' },
  ];

  database.initialize(signatures, equipmentSources, mockCxAlloyEquipment);
}