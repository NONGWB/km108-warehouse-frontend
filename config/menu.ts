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
  { id: 8, label: 'จัดการผู้ใช้งาน', key: 'users' },
];

export function getMenuItemsForRole(role: AppRole) {
  if (role === 'admin') {
    return menuItems.filter((item) => ![1, 2, 7].includes(item.id));
  }
  return menuItems;
}

export function getBackOfficeMenuItemsForRole(role: AppRole) {
  if (role === 'admin') {
    return backOfficeMenuItems.filter((item) => ![4, 5].includes(item.id));
  }
  if (role === 'seller') {
    return backOfficeMenuItems.filter((item) => item.id !== 8);
  }
  return backOfficeMenuItems;
}

export function getAllowedTabIds(role: AppRole) {
  return new Set([
    ...getMenuItemsForRole(role).map((item) => item.id),
    ...getBackOfficeMenuItemsForRole(role).map((item) => item.id),
  ]);
}

export const appConfig = {
  appName: 'KM 108 Shop',
};
import type { AppRole } from '@/types/auth';
