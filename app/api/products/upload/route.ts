import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - Using custom type declaration
import Papa from 'papaparse';
import { Product } from '@/types/product';
import * as csv from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const text = await file.text();
    
    // Parse CSV
    const parseResult = Papa.parse<Product>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: parseResult.errors },
        { status: 400 }
      );
    }

    const uploadedProducts = parseResult.data;

    // Validate required fields
    const invalidProducts = uploadedProducts.filter(
      (product) => !product.ProductName || product.ProductName.trim() === ''
    );

    if (invalidProducts.length > 0) {
      return NextResponse.json(
        { error: 'Some products are missing ProductName', count: invalidProducts.length },
        { status: 400 }
      );
    }

    // Get existing products
    const existingProducts = await csv.readProducts();
    const existingNames = new Set(existingProducts.map(p => p.ProductName));

    // Separate new and duplicate products
    const newProducts: Product[] = [];
    const duplicates: string[] = [];

    uploadedProducts.forEach((product) => {
      // Ensure all fields exist with default values
      const completeProduct: Product = {
        ProductName: product.ProductName || '',
        SalePrice: product.SalePrice || 0,
        Store1Name: product.Store1Name || '',
        Store1Price: product.Store1Price || 0,
        Store2Name: product.Store2Name || '',
        Store2Price: product.Store2Price || 0,
        Store3Name: product.Store3Name || '',
        Store3Price: product.Store3Price || 0,
        Store4Name: product.Store4Name || '',
        Store4Price: product.Store4Price || 0,
      };

      if (existingNames.has(product.ProductName)) {
        duplicates.push(product.ProductName);
      } else {
        newProducts.push(completeProduct);
        existingNames.add(product.ProductName);
      }
    });

    // Add new products to existing data
    if (newProducts.length > 0) {
      const updatedProducts = [...existingProducts, ...newProducts];
      await csv.writeProducts(updatedProducts);
    }

    return NextResponse.json({
      success: true,
      added: newProducts.length,
      duplicates: duplicates.length,
      duplicateNames: duplicates,
      total: uploadedProducts.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload CSV file';
    const status = message.includes('read-only') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
