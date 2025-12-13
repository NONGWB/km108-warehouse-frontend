import { NextRequest, NextResponse } from 'next/server';
import { readProducts, addProduct, updateProduct, deleteProduct } from '@/lib/db';

export async function GET() {
  try {
    const products = await readProducts();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await addProduct(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add product';
    const status = message.includes('read-only') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldName, ...product } = body;
    const updated = await updateProduct(oldName, product);
    
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    const status = message.includes('read-only') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('name');
    
    if (!productName) {
      return NextResponse.json({ error: 'Product name required' }, { status: 400 });
    }
    
    const deleted = await deleteProduct(productName);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    const status = message.includes('read-only') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
