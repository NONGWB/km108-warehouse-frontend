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
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
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
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

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
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const itemsPerPage = 10;

  // Helper function to safely format price
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined || price === '') return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '-' : numPrice.toFixed(2);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ mb: { xs: 2, md: 4 }, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            color="primary" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }
            }}
          >
            KM 108 Shop
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
          >
            ระบบค้นหาและเปรียบเทียบราคาสินค้า
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="ค้นหาสินค้า" />
            <Tab label="จัดการสินค้า" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
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
          
          {isMobile && !loading && filteredProducts.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <RadioGroup
                row
                value={showPriceComparison ? 'show' : 'hide'}
                onChange={(e) => setShowPriceComparison(e.target.value === 'show')}
                sx={{ justifyContent: 'center' }}
              >
                <FormControlLabel 
                  value="show" 
                  control={<Radio size="small" />} 
                  label="แสดงเปรียบเทียบราคา" 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <FormControlLabel 
                  value="hide" 
                  control={<Radio size="small" />} 
                  label="ไม่แสดง" 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
              </RadioGroup>
            </Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {displayedProducts.map((product, index) => (
                <Card key={index} elevation={2}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle1" gutterBottom color="primary" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      {product.ProductName}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        ราคาขาย
                      </Typography>
                      <Typography variant="h6" color="secondary" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        ฿{formatPrice(product.SalePrice)}
                      </Typography>
                    </Box>

                    {showPriceComparison && (
                      <>
                        <Divider sx={{ my: 1.5 }} />

                        <Typography variant="caption" gutterBottom sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                          เปรียบเทียบราคา:
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
                          {[
                            { name: product.Store1Name, price: product.Store1Price },
                            { name: product.Store2Name, price: product.Store2Price },
                            { name: product.Store3Name, price: product.Store3Price },
                            { name: product.Store4Name, price: product.Store4Price },
                          ].filter(store => store.name && store.price > 0).map((store, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 0.75,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: store.price === getBestPrice(product) ? 'success.light' : 'background.paper',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.3 }}>
                                <StoreIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.7rem' }}>
                                  {store.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                                ฿{formatPrice(store.price)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip 
                            label={`ถูกที่สุด: ${getStoreWithBestPrice(product)}`}
                            color="success"
                            size="small"
                            icon={<StoreIcon />}
                            sx={{ fontSize: '0.7rem', height: 24 }}
                          />
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                            ฿{formatPrice(getBestPrice(product))}
                          </Typography>
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
                        ฿{formatPrice(product.SalePrice)}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store1Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            ฿{formatPrice(product.Store1Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store2Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            ฿{formatPrice(product.Store2Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store3Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            ฿{formatPrice(product.Store3Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {product.Store4Name || '-'}
                          </Typography>
                          <Typography variant="body2">
                            ฿{formatPrice(product.Store4Price)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        ฿{formatPrice(getBestPrice(product))}
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
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ManageProducts onProductsChange={fetchProducts} />
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
}
