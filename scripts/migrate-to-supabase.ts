// Migration script to upload CSV data to Supabase
// Run this once: node --loader ts-node/esm scripts/migrate-to-supabase.ts

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { Product } from '../types/product';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
  try {
    console.log('📖 Reading CSV file...');
    const csvFilePath = path.join(process.cwd(), 'data', 'products.csv');
    const fileContent = await fs.readFile(csvFilePath, 'utf-8');
    
    console.log('🔄 Parsing CSV...');
    const result = Papa.parse<Product>(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    
    const products = result.data;
    console.log(`✅ Found ${products.length} products in CSV`);
    
    if (products.length === 0) {
      console.log('No products to migrate');
      return;
    }
    
    console.log('🗄️  Uploading to Supabase...');
    
    // Convert to database format and clean data
    const rows = products.map((p) => ({
      product_name: p.ProductName || '',
      sale_price: Number(p.SalePrice) || 0,
      store1_name: (p.Store1Name || '').toString().trim(),
      store1_price: Number(p.Store1Price) || 0,
      store2_name: (p.Store2Name || '').toString().trim(),
      store2_price: Number(p.Store2Price) || 0,
      store3_name: (p.Store3Name || '').toString().trim(),
      store3_price: Number(p.Store3Price) || 0,
      store4_name: (p.Store4Name || '').toString().trim(),
      store4_price: Number(p.Store4Price) || 0,
    }));
    
    const { data, error } = await supabase
      .from('products')
      .insert(rows)
      .select();
    
    if (error) {
      console.error('❌ Error uploading to Supabase:', error);
      process.exit(1);
    }
    
    console.log(`✅ Successfully migrated ${data?.length || 0} products to Supabase!`);
    console.log('🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
