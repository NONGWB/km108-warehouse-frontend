'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { Product } from '@/types/product';

interface ManageProductsProps {
  onProductsChange: () => void;
}

export default function ManageProducts({ onProductsChange }: ManageProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{added: number; duplicates: number; duplicateNames: string[]} | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Product>({
    ProductName: '',
    barcode: '',
    SalePrice: 0,
    Store1Name: '',
    Store1Price: 0,
    Store2Name: '',
    Store2Price: 0,
    Store3Name: '',
    Store3Price: 0,
    Store4Name: '',
    Store4Price: 0,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      showSnackbar('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Filter products based on search query
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(product => 
        product.ProductName.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.Store1Name?.toLowerCase().includes(query) ||
        product.Store2Name?.toLowerCase().includes(query) ||
        product.Store3Name?.toLowerCase().includes(query) ||
        product.Store4Name?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery]);

  useEffect(() => {
    // Reset pagination when filtered products change
    setPage(1);
    setHasMore(true);
    const initialProducts = filteredProducts.slice(0, itemsPerPage);
    setDisplayedProducts(initialProducts);
    setHasMore(filteredProducts.length > itemsPerPage);
  }, [filteredProducts]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loading) return;
      
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, page]);

  const loadMore = () => {
    if (!hasMore) return;
    
    const nextPage = page + 1;
    const startIndex = page * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const nextProducts = filteredProducts.slice(startIndex, endIndex);
    
    if (nextProducts.length > 0) {
      setDisplayedProducts(prev => [...prev, ...nextProducts]);
      setPage(nextPage);
      setHasMore(endIndex < filteredProducts.length);
    } else {
      setHasMore(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ProductName: product.ProductName || '',
        barcode: product.barcode || '',
        SalePrice: product.SalePrice || 0,
        Store1Name: product.Store1Name || '',
        Store1Price: product.Store1Price || 0,
        Store2Name: product.Store2Name || '',
        Store2Price: product.Store2Price || 0,
        Store3Name: product.Store3Name || '',
        Store3Price: product.Store3Price || 0,
        Store4Name: product.Store4Name || '',
        Store4Price: product.Store4Price || 0,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        ProductName: '',
        barcode: '',
        SalePrice: 0,
        Store1Name: '',
        Store1Price: 0,
        Store2Name: '',
        Store2Price: 0,
        Store3Name: '',
        Store3Price: 0,
        Store4Name: '',
        Store4Price: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleInputChange = (field: keyof Product, value: string | number) => {
    const priceFields = ['SalePrice', 'Store1Price', 'Store2Price', 'Store3Price', 'Store4Price'];
    const nameFields = ['ProductName', 'Store1Name', 'Store2Name', 'Store3Name', 'Store4Name'];
    
    let processedValue = value;
    if (typeof value === 'string' && priceFields.includes(field)) {
      processedValue = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.ProductName.trim()) {
      showSnackbar('กรุณากรอกชื่อสินค้า', 'error');
      return;
    }

    try {
      if (editingProduct) {
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: editingProduct.ProductName, ...formData }),
        });

        if (!response.ok) throw new Error('Failed to update product');
        showSnackbar('แก้ไขสินค้าสำเร็จ', 'success');
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add product');
        }
        showSnackbar('เพิ่มสินค้าสำเร็จ', 'success');
      }

      handleCloseDialog();
      await fetchProducts();
      onProductsChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      showSnackbar(message, 'error');
    }
  };

  const handleDelete = async (productName: string) => {
    if (!confirm(`ยืนยันการลบสินค้า "${productName}"?`)) return;

    try {
      const response = await fetch(`/api/products?name=${encodeURIComponent(productName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      showSnackbar('ลบสินค้าสำเร็จ', 'success');
      await fetchProducts();
      onProductsChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถลบสินค้าได้';
      showSnackbar(message, 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showSnackbar(data.error || 'เกิดข้อผิดพลาดในการอัปโหลด', 'error');
        return;
      }

      setUploadResult({
        added: data.added,
        duplicates: data.duplicates,
        duplicateNames: data.duplicateNames || [],
      });

      showSnackbar(`เพิ่มสินค้าใหม่ ${data.added} รายการสำเร็จ`, 'success');
      await fetchProducts();
      onProductsChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถอัปโหลดไฟล์ได้';
      showSnackbar(message, 'error');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadResult(null);
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadResult(null);
  };

  const handleExportCSV = () => {
    // Convert products to CSV format
    const headers = ['ProductName', 'SalePrice', 'Store1Name', 'Store1Price', 'Store2Name', 'Store2Price', 'Store3Name', 'Store3Price', 'Store4Name', 'Store4Price'];
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        product.ProductName,
        product.SalePrice || 0,
        product.Store1Name || '',
        product.Store1Price || 0,
        product.Store2Name || '',
        product.Store2Price || 0,
        product.Store3Name || '',
        product.Store3Price || 0,
        product.Store4Name || '',
        product.Store4Price || 0,
      ].join(','))
    ].join('\n');

    // Add UTF-8 BOM for proper Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Create blob and download
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSnackbar('ส่งออกข้อมูลสำเร็จ', 'success');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          จัดการข้อมูลสินค้า
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            size="large"
            color="success"
          >
            ส่งออก CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleOpenUploadDialog}
            size="large"
          >
            อัปโหลด CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            เพิ่มสินค้า
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="ค้นหาชื่อสินค้า, บาร์โค้ด หรือชื่อร้าน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="medium"
          sx={{ bgcolor: 'background.paper' }}
        />
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อสินค้า</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>บาร์โค้ด</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                ราคาขาย
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>
                ร้านที่ 1
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>
                ร้านที่ 2
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>
                ร้านที่ 3
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>
                ร้านที่ 4
              </TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                จัดการ
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">ไม่มีข้อมูลสินค้า</Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedProducts.map((product, index) => (
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
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {product.barcode || '-'}
                  </TableCell>
                  <TableCell align="right">{product.SalePrice?.toFixed(2) || '-'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store1Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {product.Store1Price?.toFixed(2) || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store2Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {product.Store2Price?.toFixed(2) || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store3Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {product.Store3Price?.toFixed(2) || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store4Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {product.Store4Price?.toFixed(2) || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(product)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(product.ProductName)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {displayedProducts.length > 0 && hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={30} />
        </Box>
      )}
      
      {displayedProducts.length > 0 && !hasMore && filteredProducts.length > itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            แสดงครบทุกรายการแล้ว
          </Typography>
        </Box>
      )}

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={false}
        scroll="paper"
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
            maxHeight: { xs: '95vh', sm: '90vh' },
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, flexShrink: 0, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, overflowY: 'auto', flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
            {/* ข้อมูลสินค้า */}
            <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1, display: 'block' }}>
                  ข้อมูลสินค้า
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ชื่อสินค้า"
                      value={formData.ProductName}
                      onChange={(e) => handleInputChange('ProductName', e.target.value)}
                      required
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคาขาย"
                      type="number"
                      value={formData.SalePrice || ''}
                      onChange={(e) => handleInputChange('SalePrice', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="บาร์โค้ด (ไม่บังคับ)"
                    value={formData.barcode || ''}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    placeholder="เช่น 8851234567890"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>

            {/* แหล่งที่มา */}
            <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1, display: 'block' }}>
                  แหล่งที่มา
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 1"
                      value={formData.Store1Name}
                      onChange={(e) => handleInputChange('Store1Name', e.target.value)}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store1Price || ''}
                      onChange={(e) => handleInputChange('Store1Price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 2"
                      value={formData.Store2Name}
                      onChange={(e) => handleInputChange('Store2Name', e.target.value)}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store2Price || ''}
                      onChange={(e) => handleInputChange('Store2Price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 3"
                      value={formData.Store3Name}
                      onChange={(e) => handleInputChange('Store3Name', e.target.value)}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store3Price || ''}
                      onChange={(e) => handleInputChange('Store3Price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 4"
                      value={formData.Store4Name}
                      onChange={(e) => handleInputChange('Store4Name', e.target.value)}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store4Price || ''}
                      onChange={(e) => handleInputChange('Store4Price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: { xs: 1.5, sm: 2 }, 
          gap: 1,
          flexShrink: 0,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button 
            onClick={handleCloseDialog} 
            color="inherit"
            size="small"
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            size="small"
          >
            {editingProduct ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openUploadDialog}
        onClose={handleCloseUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>อัปโหลดไฟล์ CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>รูปแบบไฟล์ CSV ที่ต้องการ:</strong>
              </Typography>
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
                ProductName,SalePrice,Store1Name,Store1Price,Store2Name,Store2Price,Store3Name,Store3Price,Store4Name,Store4Price
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                • สินค้าที่มีชื่อซ้ำกันจะไม่ถูกเพิ่ม<br />
                • ต้องมี ProductName เท่านั้น ฟิลด์อื่นไม่บังคับ
              </Typography>
            </Alert>

            <Button
              variant="contained"
              component="label"
              fullWidth
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
              sx={{ mb: 2 }}
            >
              {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ CSV'}
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleFileUpload}
              />
            </Button>

            {uploadResult && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>เพิ่มสินค้าสำเร็จ:</strong> {uploadResult.added} รายการ
                </Typography>
                {uploadResult.duplicates > 0 && (
                  <Typography variant="body2" color="warning.main">
                    <strong>ข้ามสินค้าซ้ำ:</strong> {uploadResult.duplicates} รายการ
                    {uploadResult.duplicateNames.length > 0 && (
                      <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: '0.85em' }}>
                        ({uploadResult.duplicateNames.slice(0, 5).join(', ')}
                        {uploadResult.duplicateNames.length > 5 && `... และอีก ${uploadResult.duplicateNames.length - 5} รายการ`})
                      </Box>
                    )}
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
