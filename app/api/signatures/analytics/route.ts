import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function GET() {
  try {
    const analytics = database.getAllSignatureAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching signature analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch signature analytics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { signatureId, analytics } = await request.json();
    
    if (!signatureId || !analytics) {
      return NextResponse.json({ error: 'Signature ID and analytics data are required' }, { status: 400 });
    }

    database.updateSignatureAnalytics(signatureId, analytics);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating signature analytics:', error);
    return NextResponse.json({ error: 'Failed to update signature analytics' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { signatureId, updates } = await request.json();
    
    if (!signatureId) {
      return NextResponse.json({ error: 'Signature ID is required' }, { status: 400 });
    }

    database.updateSignatureAnalytics(signatureId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating signature analytics:', error);
    return NextResponse.json({ error: 'Failed to update signature analytics' }, { status: 500 });
  }
} 