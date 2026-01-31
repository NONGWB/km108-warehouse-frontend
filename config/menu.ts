export interface MenuItem {
  id: number;
  label: string;
  key: string;
}

export const menuItems: MenuItem[] = [
  { id: 0, label: 'ค้นหาสินค้า', key: 'search' },
  { id: 1, label: 'จัดการสินค้า', key: 'products' },
  { id: 2, label: 'รายการเติมสต็อค', key: 'stock' },
  { id: 3, label: 'ข้อมูลร้านค้า/เซลล์', key: 'contacts' },
];

export const appConfig = {
  appName: 'KM 108 Shop',
};
