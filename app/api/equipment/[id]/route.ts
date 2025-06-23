import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: equipmentId } = await params;
  
  const equipment = database.getEquipmentById(equipmentId);
  
  if (!equipment) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
  }
  
  return NextResponse.json(equipment);
} 