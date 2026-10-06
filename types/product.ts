export interface Product {
  id?: string;
  ProductName: string;
  barcode?: string;
  image_path?: string | null;
  image_url?: string | null;
  SalePrice: number;
  Store1Name: string;
  Store1Price: number;
  Store2Name: string;
  Store2Price: number;
  Store3Name: string;
  Store3Price: number;
  Store4Name: string;
  Store4Price: number;
  created_at?: string;
  updated_at?: string;
}
