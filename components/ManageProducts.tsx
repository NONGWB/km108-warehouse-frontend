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
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Product } from '@/types/product';
import ProductThumbnail from '@/components/ProductThumbnail';
import { prepareProductImage } from '@/lib/productImage';
import {
  PRODUCT_FIELD_MAX_LENGTHS,
  PRODUCT_PRICE_MAX,
  getProductValidationError,
} from '@/lib/productValidation';

interface ManageProductsProps {
  onProductsChange: () => void;
}

const MAX_NUMERIC_DIGITS = 10;

const hasValidNumericLength = (value: string) => {
  if (value === '') return true;
  const numericValue = Number(value);
  return (
    (value.match(/\d/g) || []).length <= MAX_NUMERIC_DIGITS
    && Number.isFinite(numericValue)
    && numericValue >= 0
    && numericValue <= PRODUCT_PRICE_MAX
    && /^\d{0,8}(?:\.\d{0,2})?$/.test(value)
  );
};

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
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
    } catch (error) {
      showSnackbar('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => () => {
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

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
    setImageFile(null);
    setRemoveImage(false);
    setImagePreviewUrl(product?.image_url || null);

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
    setImageFile(null);
    setImagePreviewUrl(null);
    setRemoveImage(false);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showSnackbar('รองรับเฉพาะไฟล์ JPG, PNG และ WebP', 'error');
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setRemoveImage(Boolean(editingProduct?.image_path));
  };

  const handleInputChange = (field: keyof Product, value: string | number) => {
    const priceFields = ['SalePrice', 'Store1Price', 'Store2Price', 'Store3Price', 'Store4Price'];
    let processedValue = value;

    if (typeof value === 'string' && field in PRODUCT_FIELD_MAX_LENGTHS) {
      const maxLength = PRODUCT_FIELD_MAX_LENGTHS[field as keyof typeof PRODUCT_FIELD_MAX_LENGTHS];
      processedValue = Array.from(value).slice(0, maxLength).join('');
    }

    if (typeof value === 'string' && priceFields.includes(field)) {
      if (!hasValidNumericLength(value)) return;
      processedValue = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));
  };

  const handleSubmit = async () => {
    const validationError = getProductValidationError(formData);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct
          ? { oldName: editingProduct.ProductName, ...formData }
          : formData),
      });
      const savedProduct = await response.json() as Product & { error?: string };

      if (!response.ok) {
        throw new Error(savedProduct.error || (editingProduct ? 'Failed to update product' : 'Failed to add product'));
      }

      let imageWarning = '';
      try {
        if (imageFile) {
          if (!savedProduct.id) throw new Error('ไม่พบรหัสสินค้า');
          const preparedImage = await prepareProductImage(imageFile);
          const imageFormData = new FormData();
          imageFormData.append('product_id', savedProduct.id);
          imageFormData.append('file', preparedImage);

          const imageResponse = await fetch('/api/products/image', {
            method: 'POST',
            body: imageFormData,
          });
          if (!imageResponse.ok) {
            const imageError = await imageResponse.json();
            throw new Error(imageError.error || 'ไม่สามารถอัปโหลดรูปได้');
          }
        } else if (removeImage && savedProduct.id) {
          const imageResponse = await fetch(
            `/api/products/image?product_id=${encodeURIComponent(savedProduct.id)}`,
            { method: 'DELETE' },
          );
          if (!imageResponse.ok) {
            const imageError = await imageResponse.json();
            throw new Error(imageError.error || 'ไม่สามารถลบรูปได้');
          }
        }
      } catch (imageError) {
        imageWarning = imageError instanceof Error ? imageError.message : 'ไม่สามารถบันทึกรูปสินค้าได้';
      }

      handleCloseDialog();
      await fetchProducts();
      onProductsChange();
      showSnackbar(
        imageWarning
          ? `บันทึกสินค้าแล้ว แต่รูปสินค้าไม่สำเร็จ: ${imageWarning}`
          : editingProduct ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ',
        imageWarning ? 'error' : 'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
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
          {/* <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleOpenUploadDialog}
            size="large"
          >
            อัปโหลด CSV
          </Button> */}
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  onClick={() => setSearchQuery('')}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ProductThumbnail product={product} size={44} />
                      <Typography variant="body2" fontWeight={600}>{product.ProductName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {product.barcode || '-'}
                  </TableCell>
                  <TableCell align="right">{formatPrice(product.SalePrice)}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store1Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {formatPrice(product.Store1Price)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store2Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {formatPrice(product.Store2Price)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store3Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {formatPrice(product.Store3Price)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {product.Store4Name || '-'}
                      </Typography>
                      <Typography variant="body2">
                        {formatPrice(product.Store4Price)}
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
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
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
                      inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.ProductName }}
                      required
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคาขาย"
                      type="number"
                      value={formData.SalePrice || ''}
                      onChange={(e) => handleInputChange('SalePrice', e.target.value)}
                      inputProps={{ min: 0, max: PRODUCT_PRICE_MAX, step: 0.01, maxLength: MAX_NUMERIC_DIGITS }}
                      size="small"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="บาร์โค้ด (ไม่บังคับ)"
                    value={formData.barcode || ''}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.barcode }}
                    placeholder="เช่น 8851234567890"
                    size="small"
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                    <ProductThumbnail
                      product={{
                        ProductName: formData.ProductName || 'รูปสินค้า',
                        image_url: imagePreviewUrl,
                      }}
                      size={88}
                      borderRadius={2}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.75 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<AddPhotoAlternateIcon />}
                      >
                        {imagePreviewUrl ? 'เปลี่ยนรูป' : 'เลือกรูปสินค้า'}
                        <input
                          hidden
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                        />
                      </Button>
                      {imagePreviewUrl && (
                        <Button
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={handleRemoveImage}
                        >
                          ลบรูป
                        </Button>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        ไม่บังคับ · ระบบจะย่อเป็น WebP ไม่เกิน 512 px
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* แหล่งที่มา */}
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
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
                      inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.Store1Name }}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store1Price || ''}
                      onChange={(e) => handleInputChange('Store1Price', e.target.value)}
                      inputProps={{ min: 0, max: PRODUCT_PRICE_MAX, step: 0.01, maxLength: MAX_NUMERIC_DIGITS }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 2"
                      value={formData.Store2Name}
                      onChange={(e) => handleInputChange('Store2Name', e.target.value)}
                      inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.Store2Name }}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store2Price || ''}
                      onChange={(e) => handleInputChange('Store2Price', e.target.value)}
                      inputProps={{ min: 0, max: PRODUCT_PRICE_MAX, step: 0.01, maxLength: MAX_NUMERIC_DIGITS }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 3"
                      value={formData.Store3Name}
                      onChange={(e) => handleInputChange('Store3Name', e.target.value)}
                      inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.Store3Name }}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store3Price || ''}
                      onChange={(e) => handleInputChange('Store3Price', e.target.value)}
                      inputProps={{ min: 0, max: PRODUCT_PRICE_MAX, step: 0.01, maxLength: MAX_NUMERIC_DIGITS }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="ร้านที่ 4"
                      value={formData.Store4Name}
                      onChange={(e) => handleInputChange('Store4Name', e.target.value)}
                      inputProps={{ maxLength: PRODUCT_FIELD_MAX_LENGTHS.Store4Name }}
                      placeholder="ชื่อร้าน"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ราคา"
                      type="number"
                      value={formData.Store4Price || ''}
                      onChange={(e) => handleInputChange('Store4Price', e.target.value)}
                      inputProps={{ min: 0, max: PRODUCT_PRICE_MAX, step: 0.01, maxLength: MAX_NUMERIC_DIGITS }}
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
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : editingProduct ? 'บันทึก' : 'เพิ่ม'}
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
