import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function GET() {
  const equipment = database.getUnmappedCxAlloy();
  return NextResponse.json(equipment);
}