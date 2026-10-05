export type CustomerType = 'individual' | 'corporate';

export interface Customer {
  id?: string;
  customer_type: CustomerType;
  full_name?: string | null;
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const getCustomerDisplayName = (customer: Customer) =>
  customer.customer_type === 'corporate'
    ? customer.company_name || '-'
    : customer.full_name || '-';
