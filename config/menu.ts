export interface MenuItem {
  id: number;
  label: string;
  key: string;
}

export const menuItems: MenuItem[] = [
  { id: 0, label: 'หน้าแรก', key: 'dashboard' },
  { id: 1, label: 'ขายสินค้า', key: 'sales' },
  { id: 7, label: 'ประวัติใบแจ้งหนี้', key: 'invoices' },
  { id: 2, label: 'ค้นหาสินค้า', key: 'search' },
];

export const backOfficeMenuItems: MenuItem[] = [
  { id: 3, label: 'จัดการสินค้า', key: 'products' },
  { id: 4, label: 'รายการเติมสต็อค', key: 'stock' },
  { id: 5, label: 'ข้อมูลร้านค้า/เซลล์', key: 'contacts' },
  { id: 6, label: 'จัดการข้อมูลลูกค้า', key: 'customers' },
];

export const appConfig = {
  appName: 'KM 108 Shop',
};
