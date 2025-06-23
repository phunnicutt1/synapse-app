import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function POST(request: Request) {
  const { skySparkEquipmentId, cxAlloyEquipmentId } = await request.json();

  if (!skySparkEquipmentId || !cxAlloyEquipmentId) {
    return NextResponse.json({ error: 'skySparkEquipmentId and cxAlloyEquipmentId are required' }, { status: 400 });
  }

  try {
    const mapping = database.createMapping(skySparkEquipmentId, cxAlloyEquipmentId);
    return NextResponse.json(mapping, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}