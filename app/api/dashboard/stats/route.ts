import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get current date in local timezone (YYYY-MM-DD format)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

    // Get start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toLocaleDateString('en-CA');

    // Get start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfLastMonthStr = startOfLastMonth.toLocaleDateString('en-CA');
    
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfCurrentMonthStr = startOfCurrentMonth.toLocaleDateString('en-CA');

    // ยอดขายวันนี้
    const { data: todaySales, error: todayError } = await supabase
      .from('sales')
      .select('net_amount')
      .eq('status', 'completed')
      .gte('sale_date', todayStr)
      .lt('sale_date', tomorrowStr);

    if (todayError) throw todayError;

    const todayTotal = todaySales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0;

    // ยอดขายเมื่อวาน
    const { data: yesterdaySales, error: yesterdayError } = await supabase
      .from('sales')
      .select('net_amount')
      .eq('status', 'completed')
      .gte('sale_date', yesterdayStr)
      .lt('sale_date', todayStr);

    if (yesterdayError) throw yesterdayError;

    const yesterdayTotal = yesterdaySales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0;

    // จำนวนออเดอร์วันนี้
    const { count: todayOrdersCount, error: ordersError } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('sale_date', todayStr)
      .lt('sale_date', tomorrowStr);

    if (ordersError) throw ordersError;

    // ยอดขายเดือนนี้
    const { data: thisMonthSales, error: thisMonthError } = await supabase
      .from('sales')
      .select('net_amount')
      .eq('status', 'completed')
      .gte('sale_date', startOfMonthStr);

    if (thisMonthError) throw thisMonthError;

    const thisMonthTotal = thisMonthSales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0;

    // ยอดขายเดือนที่แล้ว
    const { data: lastMonthSales, error: lastMonthError } = await supabase
      .from('sales')
      .select('net_amount')
      .eq('status', 'completed')
      .gte('sale_date', startOfLastMonthStr)
      .lt('sale_date', startOfCurrentMonthStr);

    if (lastMonthError) throw lastMonthError;

    const lastMonthTotal = lastMonthSales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0;

    // จำนวนสินค้าทั้งหมด
    const { count: productsCount, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsError) throw productsError;

    // จำนวนร้านค้า/เซลล์
    const { count: contactsCount, error: contactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    if (contactsError) throw contactsError;

    // มูลค่าสินค้าคงคลัง
    const { data: products, error: inventoryError } = await supabase
      .from('products')
      .select('sale_price');

    if (inventoryError) throw inventoryError;

    const inventoryValue = products?.reduce((sum, product) => sum + (product.sale_price || 0), 0) || 0;

    return NextResponse.json({
      sales: {
        today: todayTotal,
        yesterday: yesterdayTotal,
        todayChange: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
        thisMonth: thisMonthTotal,
        lastMonth: lastMonthTotal,
        monthChange: lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0,
        todayOrders: todayOrdersCount || 0,
      },
      stats: {
        totalProducts: productsCount || 0,
        totalContacts: contactsCount || 0,
        inventoryValue: inventoryValue,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
