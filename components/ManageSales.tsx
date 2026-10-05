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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Autocomplete,
  Tabs,
  Tab,
  Badge,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DraftsIcon from '@mui/icons-material/Drafts';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Sale, SaleItem } from '@/types/sale';
import { Product } from '@/types/product';
import type { Customer } from '@/types/customer';
import { getCustomerDisplayName } from '@/types/customer';
import {
  createSale80mmPdfPreviewUrl,
  openSaleA4Pdf,
  printSale80mmPdf,
} from '@/lib/salePdf';

interface ManageSalesProps {
  onSalesChange: () => void;
}

type SaleMethod = 'cash_slip' | 'credit_invoice' | 'cash_company_receipt';

const documentLabels: Record<Sale['document_type'], string> = {
  sales_slip: 'สลิปการขาย',
  invoice: 'ใบแจ้งหนี้',
  company_receipt: 'ใบเสร็จรับเงิน',
};

export default function ManageSales({ onSalesChange }: ManageSalesProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Current sale form
  const [currentSale, setCurrentSale] = useState<Sale>({
    sale_date: new Date().toISOString().split('T')[0],
    customer_id: null,
    customer_name: '',
    customer_phone: null,
    customer_address: null,
    total_amount: 0,
    discount: 0,
    net_amount: 0,
    payment_type: 'cash',
    document_type: 'sales_slip',
    status: 'draft',
    items: [],
  });
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [printDialog, setPrintDialog] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewLoading, setReceiptPreviewLoading] = useState(false);
  const [receiptPrinting, setReceiptPrinting] = useState(false);
  const [draftsDialog, setDraftsDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState(0); // 0 = เลือกสินค้า, 1 = ตะกร้า
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => () => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
  }, [receiptPreviewUrl]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      showSnackbar('ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSales = async () => {
    try {
      setLoadingSales(true);
      const response = await fetch('/api/sales?status=draft');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      setSales(data);
    } catch (error) {
      showSnackbar('ไม่สามารถโหลดข้อมูลรายการขายได้', 'error');
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  useEffect(() => {
    if (!customerSearchOpen) return;
    const timer = setTimeout(async () => {
      try {
        setLoadingCustomers(true);
        const url = customerSearchTerm
          ? `/api/customers?search=${encodeURIComponent(customerSearchTerm)}`
          : '/api/customers';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch customers');
        setCustomers(await response.json());
      } catch (error) {
        console.error(error);
        showSnackbar('ไม่สามารถค้นหาข้อมูลลูกค้าได้', 'error');
      } finally {
        setLoadingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchOpen, customerSearchTerm]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatPrice = (price: any): string => {
    if (price === null || price === undefined || price === '') return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateTotals = (items: SaleItem[], discount: number) => {
    const total = items.reduce((sum, item) => sum + item.total_price, 0);
    const net = Math.max(0, total - discount);
    return { total, net };
  };

  const getSaleMethod = (sale: Sale): SaleMethod => {
    if (sale.payment_type === 'credit') return 'credit_invoice';
    return sale.document_type === 'company_receipt' ? 'cash_company_receipt' : 'cash_slip';
  };

  const requiresCustomerName =
    currentSale.payment_type === 'credit' || currentSale.document_type === 'company_receipt';

  const addItemToSale = () => {
    if (!selectedProduct) {
      showSnackbar('กรุณาเลือกสินค้า', 'error');
      return;
    }

    if (quantity <= 0) {
      showSnackbar('กรุณากรอกจำนวนที่ถูกต้อง', 'error');
      return;
    }

    // Check if product already exists in items
    const existingItemIndex = currentSale.items.findIndex(
      item => selectedProduct.id
        ? item.product_id === selectedProduct.id
        : !item.product_id && item.product_name === selectedProduct.ProductName
    );

    let newItems: SaleItem[];
    if (existingItemIndex >= 0) {
      // Update quantity
      newItems = [...currentSale.items];
      newItems[existingItemIndex].quantity += quantity;
      newItems[existingItemIndex].total_price = 
        newItems[existingItemIndex].unit_price * newItems[existingItemIndex].quantity;
    } else {
      // Add new item
      const newItem: SaleItem = {
        product_id: selectedProduct.id || null,
        product_name: selectedProduct.ProductName,
        barcode: selectedProduct.barcode,
        unit_price: selectedProduct.SalePrice,
        quantity: quantity,
        total_price: selectedProduct.SalePrice * quantity,
      };
      newItems = [...currentSale.items, newItem];
    }

    const { total, net } = calculateTotals(newItems, currentSale.discount);
    setCurrentSale({
      ...currentSale,
      items: newItems,
      total_amount: total,
      net_amount: net,
    });

    // Reset
    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm('');
    showSnackbar('เพิ่มสินค้าแล้ว', 'success');
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    // ป้องกันกรณีที่ NaN หรือ undefined
    if (isNaN(newQuantity) || newQuantity === undefined || newQuantity === null) {
      return;
    }
    
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const newItems = [...currentSale.items];
    newItems[index].quantity = newQuantity;
    newItems[index].total_price = newItems[index].unit_price * newQuantity;

    const { total, net } = calculateTotals(newItems, currentSale.discount);
    setCurrentSale({
      ...currentSale,
      items: newItems,
      total_amount: total,
      net_amount: net,
    });
  };

  const removeItem = (index: number) => {
    const newItems = currentSale.items.filter((_, i) => i !== index);
    const { total, net } = calculateTotals(newItems, currentSale.discount);
    setCurrentSale({
      ...currentSale,
      items: newItems,
      total_amount: total,
      net_amount: net,
    });
  };

  const updateDiscount = (discount: number) => {
    const { total, net } = calculateTotals(currentSale.items, discount);
    setCurrentSale({
      ...currentSale,
      discount,
      net_amount: net,
    });
  };

  const saveDraft = async () => {
    if (currentSale.items.length === 0) {
      showSnackbar('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      const saleData = {
        ...currentSale,
        status: 'draft',
        amount_paid: currentSale.payment_type === 'cash' ? amountPaid : 0,
        change_amount: currentSale.payment_type === 'cash' ? Math.max(0, amountPaid - currentSale.net_amount) : 0,
      };

      const response = await fetch('/api/sales', {
        method: currentSale.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) throw new Error('Failed to save draft');
      
      showSnackbar('บันทึก Draft สำเร็จ', 'success');
      resetForm();
      fetchSales();
      onSalesChange();
    } catch (error) {
      showSnackbar('ไม่สามารถบันทึก Draft ได้', 'error');
    }
  };

  const completeSale = async () => {
    if (currentSale.items.length === 0) {
      showSnackbar('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ', 'error');
      return;
    }

    // Validate discount
    if (currentSale.discount > currentSale.total_amount) {
      showSnackbar('ส่วนลดไม่สามารถเกินยอดรวมได้', 'error');
      return;
    }

    // Formal invoices and company receipts require a customer/company name.
    if (requiresCustomerName) {
      if (!currentSale.customer_name || !currentSale.customer_name.trim()) {
        showSnackbar('กรุณากรอกชื่อลูกค้าหรือบริษัทสำหรับเอกสาร', 'error');
        return;
      }
    }

    // Validate payment for cash type
    if (currentSale.payment_type === 'cash') {
      if (amountPaid <= 0) {
        showSnackbar('กรุณากรอกจำนวนเงินที่รับมา', 'error');
        return;
      }
      if (amountPaid < currentSale.net_amount) {
        showSnackbar('จำนวนเงินที่รับมาไม่เพียงพอ', 'error');
        return;
      }
    }

    try {
      const saleData = {
        ...currentSale,
        status: 'completed',
        amount_paid: currentSale.payment_type === 'cash' ? amountPaid : 0,
        change_amount: currentSale.payment_type === 'cash' ? Math.max(0, amountPaid - currentSale.net_amount) : 0,
      };

      const response = await fetch('/api/sales', {
        method: currentSale.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) throw new Error('Failed to complete sale');
      
      const savedSale = await response.json();
      setCompletedSale(savedSale);
      setPrintDialog(true);
      
      showSnackbar('บันทึกการขายสำเร็จ', 'success');
      fetchSales();
      onSalesChange();
    } catch (error) {
      showSnackbar('ไม่สามารถบันทึกการขายได้', 'error');
    }
  };

  const handlePrintReceipt = async () => {
    if (!completedSale) return;

    const documentType = completedSale.document_type ||
      (completedSale.payment_type === 'credit' ? 'invoice' : 'sales_slip');
    const isFormalDocument = documentType !== 'sales_slip';

    try {
      if (isFormalDocument) {
        await openSaleA4Pdf(completedSale);
        setPrintDialog(false);
        setCompletedSale(null);
        resetForm();
      } else {
        setPrintDialog(false);
        setReceiptPreviewOpen(true);
        setReceiptPreviewLoading(true);
        const previewUrl = await createSale80mmPdfPreviewUrl(completedSale);
        setReceiptPreviewUrl(previewUrl);
      }
    } catch (error) {
      console.error('Error creating PDF:', error);
      setReceiptPreviewOpen(false);
      if (!isFormalDocument) setPrintDialog(true);
      showSnackbar('ไม่สามารถสร้าง PDF Preview ได้', 'error');
    } finally {
      setReceiptPreviewLoading(false);
    }
  };

  const handlePrintReceiptPreview = async () => {
    if (!completedSale) return;

    try {
      setReceiptPrinting(true);
      await printSale80mmPdf(completedSale);
    } catch (error) {
      console.error('Error printing receipt PDF:', error);
      showSnackbar('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต Popup', 'error');
    } finally {
      setReceiptPrinting(false);
    }
  };

  const handleCloseReceiptPreview = () => {
    if (receiptPreviewLoading || receiptPrinting) return;
    setReceiptPreviewOpen(false);
    setReceiptPreviewUrl(null);
    setCompletedSale(null);
    resetForm();
  };

  const handleSkipPrint = () => {
    setPrintDialog(false);
    setCompletedSale(null);
    resetForm();
  };

  const resetForm = () => {
    setCurrentSale({
      sale_date: new Date().toISOString().split('T')[0],
      customer_id: null,
      customer_name: '',
      customer_phone: null,
      customer_address: null,
      total_amount: 0,
      discount: 0,
      net_amount: 0,
      payment_type: 'cash',
      document_type: 'sales_slip',
      status: 'draft',
      items: [],
    });
    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm('');
    setAmountPaid(0);
  };

  const loadDraft = (sale: Sale) => {
    setCurrentSale(sale);
    setAmountPaid(sale.amount_paid || 0); // Load amount paid from draft
    setDraftsDialog(false);
  };

  const deleteDraft = async (id: string) => {
    try {
      const response = await fetch(`/api/sales?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete draft');
      
      showSnackbar('ลบ Draft สำเร็จ', 'success');
      fetchSales();
    } catch (error) {
      showSnackbar('ไม่สามารถลบ Draft ได้', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.ProductName.toLowerCase().includes(term) || 
           (p.barcode && p.barcode.toLowerCase().includes(term));
  });

  if (loadingProducts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, pb: { xs: 10, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          ขายสินค้า - POS
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DraftsIcon />}
            onClick={() => setDraftsDialog(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Draft</Box> ({sales.length})
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetForm}
            size={isMobile ? 'small' : 'medium'}
          >
            ยกเลิก
          </Button>
        </Box>
      </Box>

      {/* Mobile Tabs */}
      {isMobile && (
        <Paper sx={{ mb: 2 }} elevation={2}>
          <Tabs 
            value={mobileTab} 
            onChange={(_, newValue) => setMobileTab(newValue)}
            variant="fullWidth"
            indicatorColor="primary"
          >
            <Tab label="เลือกสินค้า" />
            <Tab 
              icon={
                <Badge badgeContent={currentSale.items.length} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              }
              label="ตะกร้า"
            />
          </Tabs>
        </Paper>
      )}

      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 3 }
        }}
      >
        {/* Left Panel - Product Selection */}
        <Box sx={{ 
          flex: { xs: '1', md: '0 0 40%' },
          display: { xs: mobileTab === 0 ? 'block' : 'none', md: 'block' },
          pb: { xs: isMobile && currentSale.items.length > 0 ? 12 : 0, md: 0 }
        }}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                เลือกสินค้า
              </Typography>

              <Autocomplete
                fullWidth
                options={filteredProducts}
                getOptionLabel={(option) => 
                  `${option.ProductName}${option.barcode ? ` (${option.barcode})` : ''}`
                }
                value={selectedProduct}
                onChange={(_, newValue) => setSelectedProduct(newValue)}
                inputValue={searchTerm}
                onInputChange={(_, newValue) => setSearchTerm(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="ค้นหาชื่อสินค้าหรือบาร์โค้ด..."
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.ProductName}>
                    <Box>
                      <Typography variant="body2">{option.ProductName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.barcode && `บาร์โค้ด: ${option.barcode} | `}
                        ราคา: {formatPrice(option.SalePrice)}
                      </Typography>
                    </Box>
                  </li>
                )}
                sx={{ mb: 2 }}
              />

              {selectedProduct && (
                <Box sx={{ mb: 2, p: { xs: 1.5, md: 2 }, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    สินค้าที่เลือก
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">{selectedProduct.ProductName}</Typography>
                  <Typography variant="body2" color="primary">
                    ราคา: {formatPrice(selectedProduct.SalePrice)}
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label="จำนวน"
                type="number"
                value={quantity || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity(0);
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0) {
                      setQuantity(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    setQuantity(1);
                  }
                }}
                inputProps={{ min: 1 }}
                required
                size={isMobile ? 'small' : 'medium'}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  addItemToSale();
                }}
                disabled={!selectedProduct}
                size={isMobile ? 'medium' : 'large'}
              >
                เพิ่มสินค้าในรายการ
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Right Panel - Shopping Cart */}
        <Box sx={{ 
          flex: 1,
          display: { xs: mobileTab === 1 ? 'block' : 'none', md: 'block' }
        }}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                รายการสินค้า ({currentSale.items.length})
              </Typography>

              <TableContainer sx={{ maxHeight: { xs: '40vh', md: 400 }, mb: 2 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>สินค้า</TableCell>
                      <TableCell align="right">ราคา</TableCell>
                      <TableCell align="center">จำนวน</TableCell>
                      <TableCell align="right">รวม</TableCell>
                      <TableCell align="center">ลบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentSale.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            ยังไม่มีสินค้าในรายการ
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentSale.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">{item.product_name}</Typography>
                            {item.barcode && (
                              <Typography variant="caption" color="text.secondary">
                                {item.barcode}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {formatPrice(item.unit_price)}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  // อนุญาตให้ลบได้ชั่วคราว
                                  const newItems = [...currentSale.items];
                                  newItems[index].quantity = 0;
                                  setCurrentSale({ ...currentSale, items: newItems });
                                } else {
                                  const newQty = parseInt(val);
                                  if (!isNaN(newQty) && newQty >= 0) {
                                    updateItemQuantity(index, newQty);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // ถ้าว่างหรือ 0 เมื่อ blur ให้กลับเป็น 1
                                const val = e.target.value;
                                if (val === '' || val === '0' || parseInt(val) < 1) {
                                  updateItemQuantity(index, 1);
                                }
                              }}
                              inputProps={{ min: 1, style: { textAlign: 'center' } }}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              {formatPrice(item.total_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItem(index)}
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

              <Divider sx={{ my: { xs: 1.5, md: 2 } }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
                <TextField
                  label="ส่วนลด (บาท)"
                  type="number"
                  size={isMobile ? 'small' : 'medium'}
                  value={currentSale.discount || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      updateDiscount(0);
                    } else {
                      const discount = parseFloat(val);
                      if (!isNaN(discount) && discount >= 0) {
                        updateDiscount(discount);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                      updateDiscount(0);
                    }
                  }}
                  inputProps={{ min: 0, max: currentSale.total_amount }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"></InputAdornment>,
                  }}
                  helperText={currentSale.discount > currentSale.total_amount ? 'ส่วนลดไม่สามารถเกินยอดรวมได้' : ''}
                  error={currentSale.discount > currentSale.total_amount}
                />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <TextField
                    fullWidth
                    label={requiresCustomerName ? 'ชื่อลูกค้า / บริษัท' : 'ชื่อลูกค้า (ไม่บังคับ)'}
                    type="text"
                    size={isMobile ? 'small' : 'medium'}
                    value={currentSale.customer_name || ''}
                    onChange={(e) => setCurrentSale({
                      ...currentSale,
                      customer_id: null,
                      customer_name: e.target.value,
                      customer_phone: null,
                      customer_address: null,
                    })}
                    required={requiresCustomerName}
                    error={requiresCustomerName && !currentSale.customer_name?.trim()}
                    helperText={requiresCustomerName && !currentSale.customer_name?.trim() ? 'จำเป็นสำหรับออกเอกสาร' : ''}
                  />
                  <Tooltip title="ค้นหาข้อมูลลูกค้า">
                    <IconButton
                      color="primary"
                      aria-label="ค้นหาข้อมูลลูกค้า"
                      onClick={() => setCustomerSearchOpen(true)}
                      sx={{ mt: 0.5, border: '1px solid', borderColor: 'divider' }}
                    >
                      <SearchIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>วิธีชำระและเอกสาร</InputLabel>
                  <Select
                    value={getSaleMethod(currentSale)}
                    label="วิธีชำระและเอกสาร"
                    onChange={(e) => {
                      const method = e.target.value as SaleMethod;
                      const isCredit = method === 'credit_invoice';
                      setCurrentSale({
                        ...currentSale,
                        payment_type: isCredit ? 'credit' : 'cash',
                        document_type: isCredit
                          ? 'invoice'
                          : method === 'cash_company_receipt'
                            ? 'company_receipt'
                            : 'sales_slip',
                      });
                      if (isCredit) {
                        setAmountPaid(0);
                      }
                    }}
                  >
                    <MenuItem value="cash_slip">เงินสด — รับสลิป</MenuItem>
                    <MenuItem value="credit_invoice">ลงบิล (เครดิต) — ออกใบแจ้งหนี้</MenuItem>
                    <MenuItem value="cash_company_receipt">เงินสด — ออกใบเสร็จสำหรับบริษัท</MenuItem>
                  </Select>
                </FormControl>

                {currentSale.payment_type === 'cash' && (
                  <TextField
                    label="รับเงินมา (บาท)"
                    type="text"
                    size={isMobile ? 'small' : 'medium'}
                    value={amountPaid > 0 ? amountPaid.toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, numbers and one decimal point
                      if (value === '') {
                        setAmountPaid(0);
                      } else if (/^\d*\.?\d{0,2}$/.test(value)) {
                        setAmountPaid(parseFloat(value) || 0);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                        setAmountPaid(0);
                      }
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"></InputAdornment>,
                    }}
                    required
                    helperText={amountPaid < currentSale.net_amount ? 'จำนวนเงินไม่เพียงพอ' : ''}
                    error={amountPaid > 0 && amountPaid < currentSale.net_amount}
                  />
                )}

                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>ยอดรวม:</Typography>
                    <Typography>{formatPrice(currentSale.total_amount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>ส่วนลด:</Typography>
                    <Typography color="error">-{formatPrice(currentSale.discount)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold">
                      ยอดสุทธิ:
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatPrice(currentSale.net_amount)}
                    </Typography>
                  </Box>
                  {currentSale.payment_type === 'cash' && amountPaid > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>รับเงินมา:</Typography>
                        <Typography>{formatPrice(amountPaid)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight="bold" color={amountPaid >= currentSale.net_amount ? 'success.main' : 'error.main'}>
                          เงินทอน:
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color={amountPaid >= currentSale.net_amount ? 'success.main' : 'error.main'}>
                          {formatPrice(Math.max(0, amountPaid - currentSale.net_amount))}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Action Buttons - Desktop Only */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={saveDraft}
                    disabled={currentSale.items.length === 0}
                  >
                    บันทึก Draft
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={completeSale}
                    disabled={
                      currentSale.items.length === 0 ||
                      currentSale.discount > currentSale.total_amount ||
                      (currentSale.payment_type === 'cash' && (amountPaid <= 0 || amountPaid < currentSale.net_amount)) ||
                      (requiresCustomerName && !currentSale.customer_name?.trim())
                    }
                  >
                    จบรายการ
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Mobile: Sticky Summary at Bottom */}
      {isMobile && currentSale.items.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            zIndex: 1000,
            borderRadius: '16px 16px 0 0',
            display: { xs: 'block', md: 'none' }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">ยอดสุทธิ:</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {formatPrice(currentSale.net_amount)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={saveDraft}
              disabled={currentSale.items.length === 0}
              sx={{ flex: 1 }}
            >
              Draft
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={completeSale}
              disabled={
                currentSale.items.length === 0 ||
                currentSale.discount > currentSale.total_amount ||
                (currentSale.payment_type === 'cash' && (amountPaid <= 0 || amountPaid < currentSale.net_amount)) ||
                (requiresCustomerName && !currentSale.customer_name?.trim())
              }
              sx={{ flex: 2 }}
            >
              จบรายการ
            </Button>
          </Box>
        </Paper>
      )}

      {/* Customer Search Dialog */}
      <Dialog
        open={customerSearchOpen}
        onClose={() => setCustomerSearchOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>ค้นหาข้อมูลลูกค้า</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="ค้นหาด้วยชื่อ ชื่อบริษัท หรือเบอร์โทร..."
            value={customerSearchTerm}
            onChange={(event) => setCustomerSearchTerm(event.target.value)}
            sx={{ mt: 1, mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
          />

          {loadingCustomers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : customers.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              ไม่พบข้อมูลลูกค้า
            </Typography>
          ) : (
            <List disablePadding>
              {customers.map((customer) => (
                <ListItemButton
                  key={customer.id}
                  divider
                  onClick={() => {
                    setCurrentSale({
                      ...currentSale,
                      customer_id: customer.id || null,
                      customer_name: getCustomerDisplayName(customer),
                      customer_phone: customer.phone || null,
                      customer_address: customer.address || null,
                    });
                    setCustomerSearchOpen(false);
                    setCustomerSearchTerm('');
                  }}
                >
                  <ListItemText
                    primary={getCustomerDisplayName(customer)}
                    secondary={[customer.phone, customer.address].filter(Boolean).join(' • ') || 'ไม่มีข้อมูลติดต่อ'}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={customer.customer_type === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล'}
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerSearchOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printDialog} onClose={handleSkipPrint}>
        <DialogTitle>บันทึกการขายสำเร็จ</DialogTitle>
        <DialogContent>
          <Typography>
            {(completedSale?.document_type || (completedSale?.payment_type === 'credit' ? 'invoice' : 'sales_slip')) === 'sales_slip'
              ? 'ต้องการ Preview ใบเสร็จ 80 มม. ก่อนพิมพ์หรือไม่?'
              : `ต้องการเปิด PDF ${completedSale
                ? documentLabels[completedSale.document_type || (completedSale.payment_type === 'credit' ? 'invoice' : 'sales_slip')]
                : 'เอกสาร'}หรือไม่?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSkipPrint}>ไม่เปิด</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintReceipt}
          >
            {(completedSale?.document_type || (completedSale?.payment_type === 'credit' ? 'invoice' : 'sales_slip')) === 'sales_slip'
              ? 'Preview และพิมพ์'
              : `เปิด PDF ${completedSale
                ? documentLabels[completedSale.document_type || (completedSale.payment_type === 'credit' ? 'invoice' : 'sales_slip')]
                : 'เอกสาร'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 80 mm Receipt Preview */}
      <Dialog
        open={receiptPreviewOpen}
        onClose={handleCloseReceiptPreview}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Preview ใบเสร็จ 80 มม.</DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            minHeight: { xs: '70vh', sm: 620 },
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {receiptPreviewLoading ? (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={36} />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                กำลังสร้าง Preview...
              </Typography>
            </Box>
          ) : receiptPreviewUrl ? (
            <Box
              component="iframe"
              src={receiptPreviewUrl}
              title="Preview ใบเสร็จ 80 มม."
              sx={{ width: '100%', height: { xs: '75vh', sm: 620 }, border: 0, bgcolor: 'white' }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReceiptPreview} disabled={receiptPreviewLoading || receiptPrinting}>
            ปิด
          </Button>
          <Button
            variant="contained"
            startIcon={receiptPrinting ? <CircularProgress size={18} color="inherit" /> : <PrintIcon />}
            onClick={handlePrintReceiptPreview}
            disabled={!receiptPreviewUrl || receiptPreviewLoading || receiptPrinting}
          >
            {receiptPrinting ? 'กำลังเปิดหน้าพิมพ์...' : 'พิมพ์ใบเสร็จ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drafts Dialog */}
      <Dialog 
        open={draftsDialog} 
        onClose={() => setDraftsDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>รายการ Draft</DialogTitle>
        <DialogContent>
          {loadingSales ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : sales.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              ไม่มีรายการ Draft
            </Typography>
          ) : (
            <TableContainer>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell>วันที่</TableCell>
                    <TableCell>จำนวนรายการ</TableCell>
                    <TableCell align="right">ยอดสุทธิ</TableCell>
                    <TableCell align="center">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.sale_date}</TableCell>
                      <TableCell>{sale.items.length} รายการ</TableCell>
                      <TableCell align="right">{formatPrice(sale.net_amount)}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          onClick={() => loadDraft(sale)}
                          sx={{ mr: 1 }}
                        >
                          โหลด
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => sale.id && deleteDraft(sale.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraftsDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Summary Bar for Mobile */}
      {isMobile && mobileTab === 0 && currentSale.items.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            zIndex: 1000,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            bgcolor: 'rgba(17, 17, 24, 0.88)',
            color: 'white',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            animation: 'slideUp 0.3s ease-out',
            '@keyframes slideUp': {
              from: {
                transform: 'translateY(100%)',
                opacity: 0,
              },
              to: {
                transform: 'translateY(0)',
                opacity: 1,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">
              จำนวนสินค้า: {currentSale.items.length} รายการ
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {formatPrice(currentSale.net_amount)}
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ShoppingCartIcon />}
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
            onClick={() => setMobileTab(1)}
          >
            ไปยังตะกร้า
          </Button>
        </Paper>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ 
          vertical: isMobile && mobileTab === 0 && currentSale.items.length > 0 ? 'top' : 'bottom', 
          horizontal: 'center' 
        }}
        sx={{ mt: isMobile && mobileTab === 0 && currentSale.items.length > 0 ? 2 : 0 }}
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
