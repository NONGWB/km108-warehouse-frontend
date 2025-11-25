import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { Product } from '@/types/product';

const csvFilePath = path.join(process.cwd(), 'data', 'products.csv');

export async function readProducts(): Promise<Product[]> {
  try {
    const fileContent = await fs.readFile(csvFilePath, 'utf-8');
    const result = Papa.parse<Product>(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    return result.data;
  } catch (error) {
    console.error('Error reading CSV:', error);
    return [];
  }
}

export async function writeProducts(products: Product[]): Promise<void> {
  const csv = Papa.unparse(products);
  await fs.writeFile(csvFilePath, csv, 'utf-8');
}

export async function addProduct(product: Product): Promise<Product> {
  const products = await readProducts();
  products.push(product);
  await writeProducts(products);
  return product;
}

export async function updateProduct(productName: string, updatedProduct: Product): Promise<Product | null> {
  const products = await readProducts();
  const index = products.findIndex(p => p.ProductName === productName);
  
  if (index === -1) {
    return null;
  }
  
  products[index] = updatedProduct;
  await writeProducts(products);
  return updatedProduct;
}

export async function deleteProduct(productName: string): Promise<boolean> {
  const products = await readProducts();
  const filteredProducts = products.filter(p => p.ProductName !== productName);
  
  if (filteredProducts.length === products.length) {
    return false;
  }
  
  await writeProducts(filteredProducts);
  return true;
}
