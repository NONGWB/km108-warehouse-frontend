'use client';

import { useState, useEffect, MouseEvent } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
  useTheme,
  Toolbar,
} from '@mui/material';
import { Product } from '@/types/product';
import ManageProducts from '@/components/ManageProducts';
import ManageOrderNotes from '@/components/ManageOrderNotes';
import NavBar from '@/components/NavBar';
import SearchBar from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import ProductTable from '@/components/ProductTable';
import PriceComparisonFab from '@/components/PriceComparisonFab';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Google Sans', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
});

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'), { noSsr: true });
  const itemsPerPage = 10;

  // Wait for client mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to safely format price with number formatting
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined || price === '') return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '-' : numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
      setError('');
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลสินค้าได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    setPage(1);
    setDisplayedProducts(filtered.slice(0, itemsPerPage));
    setHasMore(filtered.length > itemsPerPage);
  }, [searchTerm, products]);

  const loadMore = () => {
    const nextPage = page + 1;
    const startIndex = page * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const moreProducts = filteredProducts.slice(startIndex, endIndex);
    
    if (moreProducts.length > 0) {
      setDisplayedProducts(prev => [...prev, ...moreProducts]);
      setPage(nextPage);
      setHasMore(endIndex < filteredProducts.length);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (tabValue !== 0) return; // Only in search tab
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !loading) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, hasMore, loading, filteredProducts, tabValue]);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuSelect = (index: number) => {
    setTabValue(index);
    handleMenuClose();
  };

  const getBestPrice = (product: Product) => {
    const prices = [
      product.Store1Price,
      product.Store2Price,
      product.Store3Price,
      product.Store4Price,
    ].map(price => typeof price === 'string' ? parseFloat(price) : price)
     .filter(price => !isNaN(price) && price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getStoreWithBestPrice = (product: Product) => {
    const prices = [
      { store: product.Store1Name, price: product.Store1Price },
      { store: product.Store2Name, price: product.Store2Price },
      { store: product.Store3Name, price: product.Store3Price },
      { store: product.Store4Name, price: product.Store4Price },
    ].filter(item => item.price > 0 && item.store);
    
    if (prices.length === 0) return '-';
    
    const best = prices.reduce((min, item) => 
      item.price < min.price ? item : min
    );
    
    return best.store;
  };

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        tabValue={tabValue}
        anchorEl={anchorEl}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        onMenuSelect={handleMenuSelect}
      />

      {/* Toolbar spacer for fixed AppBar */}
      <Toolbar />

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {tabValue === 0 && (
          <Box>
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isMobile={isMobile}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีข้อมูลสินค้า'}
                </Typography>
              </Paper>
            ) : isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {displayedProducts.map((product, index) => (
                  <ProductCard
                    key={index}
                    product={product}
                    showPriceComparison={showPriceComparison}
                    formatPrice={formatPrice}
                    getBestPrice={getBestPrice}
                  />
                ))}
              </Box>
            ) : (
              <ProductTable
                products={displayedProducts}
                formatPrice={formatPrice}
                getBestPrice={getBestPrice}
                getStoreWithBestPrice={getStoreWithBestPrice}
              />
            )}

            {!loading && hasMore && displayedProducts.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={30} />
              </Box>
            )}

            {!loading && !hasMore && displayedProducts.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  แสดงครบทั้งหมดแล้ว ({filteredProducts.length} รายการ)
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <ManageProducts onProductsChange={fetchProducts} />
        )}

        {tabValue === 2 && (
          <ManageOrderNotes />
        )}
      </Container>

      {/* Floating Action Button for mobile price comparison toggle */}
      {isMobile && tabValue === 0 && !loading && filteredProducts.length > 0 && (
        <PriceComparisonFab
          showPriceComparison={showPriceComparison}
          onToggle={() => setShowPriceComparison(!showPriceComparison)}
        />
      )}
    </ThemeProvider>
  );
}
