'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  IconButton,
  Button,
  Fab,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import MenuIcon from '@mui/icons-material/Menu';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Product } from '@/types/product';
import ManageProducts from '@/components/ManageProducts';

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
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
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" sx={{ mb: 2 }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ flexGrow: 1, fontWeight: 'bold' }}
          >
            KM 108 Shop
          </Typography>
          
          {/* Desktop Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button 
              color="inherit" 
              onClick={() => setTabValue(0)}
              sx={{ 
                bgcolor: tabValue === 0 ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
              }}
            >
              ค้นหาสินค้า
            </Button>
            <Button 
              color="inherit" 
              onClick={() => setTabValue(1)}
              sx={{ 
                bgcolor: tabValue === 1 ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
              }}
            >
              จัดการสินค้า
            </Button>
          </Box>

          {/* Mobile Menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              color="inherit"
              onClick={handleMenuOpen}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem 
                onClick={() => handleMenuSelect(0)}
                selected={tabValue === 0}
              >
                ค้นหาสินค้า
              </MenuItem>
              <MenuItem 
                onClick={() => handleMenuSelect(1)}
                selected={tabValue === 1}
              >
                จัดการสินค้า
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {tabValue === 0 && (
          <Box>
          <Box sx={{ mb: { xs: 2, md: 3 } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Box>

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
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {displayedProducts.map((product, index) => (
                <Card key={index} elevation={1} sx={{ borderRadius: 1 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', fontSize: '0.875rem', flex: 1, mr: 1 }}>
                        {product.ProductName}
                      </Typography>
                      <Typography variant="body2" color="secondary" sx={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {formatPrice(product.SalePrice)}
                      </Typography>
                    </Box>

                    {showPriceComparison && (
                      <>
                        <Divider sx={{ my: 0.75 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {[
                            { name: product.Store1Name, price: product.Store1Price },
                            { name: product.Store2Name, price: product.Store2Price },
                            { name: product.Store3Name, price: product.Store3Price },
                            { name: product.Store4Name, price: product.Store4Price },
                          ].filter(store => store.name && store.price > 0).map((store, idx) => (
                            <Chip
                              key={idx}
                              label={`${store.name}: ${formatPrice(store.price)}${store.price === getBestPrice(product) ? ' ✓ถูกสุด' : ''}`}
                              size="small"
                              color={store.price === getBestPrice(product) ? 'success' : 'default'}
                              variant={store.price === getBestPrice(product) ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
              </Box>
            </>
          ) : (
            <TableContainer component={Paper} elevation={3}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อสินค้า</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                      ราคาขาย
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      ร้านที่ 1
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      ร้านที่ 2
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      ร้านที่ 3
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      ร้านที่ 4
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                      ราคาต่ำสุด
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                      ร้านที่ถูกที่สุด
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedProducts.map((product, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {product.ProductName}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                        {formatPrice(product.SalePrice)}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store1Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            {formatPrice(product.Store1Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store2Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            {formatPrice(product.Store2Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store3Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            {formatPrice(product.Store3Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store4Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            {formatPrice(product.Store4Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatPrice(getBestPrice(product))}
                      </TableCell>
                      <TableCell align="center">
                        {getStoreWithBestPrice(product)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
      </Container>

      {/* Floating Action Button for mobile price comparison toggle */}
      {isMobile && tabValue === 0 && !loading && filteredProducts.length > 0 && (
        <Tooltip title={showPriceComparison ? 'ซ่อนเปรียบเทียบราคา' : 'แสดงเปรียบเทียบราคา'} placement="left">
          <Fab
            color={showPriceComparison ? 'primary' : 'default'}
            size="medium"
            onClick={() => setShowPriceComparison(!showPriceComparison)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <CompareArrowsIcon />
          </Fab>
        </Tooltip>
      )}
    </ThemeProvider>
  );
}
