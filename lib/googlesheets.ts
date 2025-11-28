import { google } from 'googleapis';
import { Product } from '@/types/product';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = 'Sheet1'; // Change if your sheet has a different name

// Initialize Google Sheets API
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Convert row array to Product object
function rowToProduct(row: any[]): Product {
  return {
    ProductName: row[0] || '',
    SalePrice: parseFloat(row[1]) || 0,
    Store1Name: row[2] || '',
    Store1Price: parseFloat(row[3]) || 0,
    Store2Name: row[4] || '',
    Store2Price: parseFloat(row[5]) || 0,
    Store3Name: row[6] || '',
    Store3Price: parseFloat(row[7]) || 0,
    Store4Name: row[8] || '',
    Store4Price: parseFloat(row[9]) || 0,
  };
}

// Convert Product object to row array
function productToRow(product: Product): any[] {
  return [
    product.ProductName,
    product.SalePrice || 0,
    product.Store1Name || '',
    product.Store1Price || 0,
    product.Store2Name || '',
    product.Store2Price || 0,
    product.Store3Name || '',
    product.Store3Price || 0,
    product.Store4Name || '',
    product.Store4Price || 0,
  ];
}

export async function readProducts(): Promise<Product[]> {
  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:J`, // Skip header row, read all data
    });

    const rows = response.data.values || [];
    return rows.map(row => rowToProduct(row));
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return [];
  }
}

export async function writeProducts(products: Product[]): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();
    const values = products.map(product => productToRow(product));

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:J`,
    });

    // Write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw error;
  }
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
