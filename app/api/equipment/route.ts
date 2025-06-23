import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const signatureId = searchParams.get('signatureId');
  const groupByType = searchParams.get('groupByType');

  if (groupByType === 'true') {
    // Return equipment grouped by equipment type
    const allEquipment = database.getAllEquipment();
    console.log(`API: Found ${allEquipment.length} total equipment items`);
    
    const groupedEquipment = allEquipment.reduce((acc, equipment) => {
      const type = equipment.equipmentType || 'Unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(equipment);
      return acc;
    }, {} as Record<string, typeof allEquipment>);
    
    console.log(`API: Grouped into ${Object.keys(groupedEquipment).length} types:`, Object.keys(groupedEquipment));
    
    return NextResponse.json(groupedEquipment);
  }

  if (!signatureId) {
    return NextResponse.json({ error: 'signatureId is required when groupByType is not specified' }, { status: 400 });
  }
  
  const equipment = database.getEquipmentBySignature(signatureId);
  return NextResponse.json(equipment);
}
