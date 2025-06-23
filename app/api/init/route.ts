import { NextResponse } from 'next/server';
import { processDataFiles } from '@/lib/analysis';
import { database } from '@/lib/mockDatabase';

export async function GET(request: Request) {
  try {
    // This allows re-processing on demand for the demo
    const url = new URL(request.url);
    if (url.searchParams.get('force')) {
        database.reset();
    }
    await processDataFiles();
    return NextResponse.json({ message: 'Data processing complete.' });
  } catch (error: any) {
    console.error('Error during data processing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}