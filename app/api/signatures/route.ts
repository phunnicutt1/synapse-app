import { NextResponse } from 'next/server';
import { database } from '@/lib/mockDatabase';

export async function GET() {
  const signatures = database.getSignatures();
  return NextResponse.json(signatures);
}

export async function POST(request: Request) {
    const signatureData = await request.json();
    try {
        const created = database.createSignature(signatureData);
        return NextResponse.json(created);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const { id, ...updates } = await request.json();
    if (!id) {
        return NextResponse.json({ error: 'Signature ID is required' }, { status: 400 });
    }
    try {
        const updated = database.updateSignature(id, updates);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
}

export async function DELETE(request: Request) {
    const { id } = await request.json();
    if (!id) {
        return NextResponse.json({ error: 'Signature ID is required' }, { status: 400 });
    }
    try {
        database.deleteSignature(id);
        return NextResponse.json({ success: true, message: 'Signature deleted successfully' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
}
