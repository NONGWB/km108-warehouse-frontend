'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Inventory,
  Store,
  AttachMoney,
} from '@mui/icons-material';

interface DashboardStats {
  sales: {
    today: number;
    yesterday: number;
    todayChange: number;
    thisMonth: number;
    lastMonth: number;
    monthChange: number;
    todayOrders: number;
  };
  stats: {
    totalProducts: number;
    totalContacts: number;
    inventoryValue: number;
  };
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, subtitle, trend, icon, color }: StatCardProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 1.5, sm: 2.5, md: 3 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-4px)',
          transition: 'all 0.3s ease',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 5, md: 10 },
          right: { xs: 5, md: 10 },
          opacity: 0.08,
          transform: { xs: 'scale(1.2)', md: 'scale(1.8)' },
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {icon}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, md: 2 }, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            bgcolor: `${color}15`,
            color: color,
            p: { xs: 0.5, md: 1 },
            borderRadius: 2,
            display: 'flex',
            mr: { xs: 1, md: 2 },
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
          {title}
        </Typography>
      </Box>

      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 700, 
          mb: { xs: 0.5, md: 1 }, 
          position: 'relative', 
          zIndex: 1,
          fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }
        }}
      >
        {value}
      </Typography>

      {subtitle && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            position: 'relative', 
            zIndex: 1,
            fontSize: { xs: '0.7rem', sm: '0.875rem' }
          }}
        >
          {subtitle}
        </Typography>
      )}

      {trend !== undefined && trend !== 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, position: 'relative', zIndex: 1 }}>
          {trend > 0 ? (
            <>
              <TrendingUp sx={{ fontSize: 20, color: 'success.main', mr: 0.5 }} />
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                +{trend.toFixed(1)}%
              </Typography>
            </>
          ) : (
            <>
              <TrendingDown sx={{ fontSize: 20, color: 'error.main', mr: 0.5 }} />
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                {trend.toFixed(1)}%
              </Typography>
            </>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError('');
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลสถิติได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) return null;

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: { xs: 1.5, md: 3 }, 
          fontWeight: 700,
          fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }
        }}
      >
        📊 ภาพรวมระบบ
      </Typography>

      {/* Sales Summary */}
      <Typography 
        variant="h6" 
        sx={{ 
          mb: { xs: 1, md: 2 }, 
          fontWeight: 600,
          fontSize: { xs: '0.875rem', sm: '1.125rem', md: '1.25rem' }
        }}
      >
        สรุปการขายและการเงิน
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, sm: 2.5, md: 3 },
          mb: { xs: 2, md: 4 },
        }}
      >
          <StatCard
            title="ยอดขายวันนี้"
            value={`฿${formatCurrency(stats.sales.today)}`}
            subtitle={`เมื่อวาน: ฿${formatCurrency(stats.sales.yesterday)}`}
            trend={stats.sales.todayChange}
            icon={<AttachMoney />}
            color="#2e7d32"
          />
        <StatCard
            title="ยอดขายเดือนนี้"
            value={`฿${formatCurrency(stats.sales.thisMonth)}`}
            subtitle={`เดือนที่แล้ว: ฿${formatCurrency(stats.sales.lastMonth)}`}
            trend={stats.sales.monthChange}
            icon={<TrendingUp />}
            color="#1976d2"
          />
        <StatCard
            title="จำนวนออเดอร์วันนี้"
            value={stats.sales.todayOrders.toString()}
            subtitle="ออเดอร์ที่เสร็จสมบูรณ์"
            icon={<ShoppingCart />}
            color="#ed6c02"
          />
      </Box>

      {/* Additional Stats */}
      <Typography 
        variant="h6" 
        sx={{ 
          mb: { xs: 1, md: 2 }, 
          fontWeight: 600,
          fontSize: { xs: '0.875rem', sm: '1.125rem', md: '1.25rem' }
        }}
      >
        สถิติเพิ่มเติม
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, sm: 2.5, md: 3 },
        }}
      >
          <StatCard
            title="จำนวนสินค้าทั้งหมด"
            value={stats.stats.totalProducts.toString()}
            subtitle="รายการสินค้าในระบบ"
            icon={<Inventory />}
            color="#9c27b0"
          />
        <StatCard
            title="จำนวนร้านค้า/เซลล์"
            value={stats.stats.totalContacts.toString()}
            subtitle="ผู้ติดต่อทั้งหมด"
            icon={<Store />}
            color="#d32f2f"
          />
        <StatCard
            title="มูลค่าสินค้าคงคลัง"
            value={`฿${formatCurrency(stats.stats.inventoryValue)}`}
            subtitle="มูลค่ารวมทั้งหมด"
            icon={<AttachMoney />}
            color="#0288d1"
          />
      </Box>
    </Box>
  );
}
