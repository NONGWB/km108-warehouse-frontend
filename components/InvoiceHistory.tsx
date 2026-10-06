'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Sale } from '@/types/sale';
import SaleA4PreviewDialog from '@/components/SaleA4PreviewDialog';

type PaymentFilter = 'all' | 'unpaid' | 'paid';

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value?: string | null, includeTime = false) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
};

const getDocumentNumber = (sale: Sale) =>
  sale.document_number || `INV-${sale.id?.substring(0, 8).toUpperCase() || '-'}`;

const getPaymentStatus = (sale: Sale) => sale.payment_status || 'unpaid';

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<Sale | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales?status=completed&document_type=invoice');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      setInvoices(await response.json());
    } catch (error) {
      console.error(error);
      showSnackbar('ไม่สามารถโหลดประวัติใบแจ้งหนี้ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (paymentFilter !== 'all' && getPaymentStatus(invoice) !== paymentFilter) return false;
      if (!term) return true;

      return [
        invoice.id,
        getDocumentNumber(invoice),
        invoice.customer_name,
        invoice.customer_phone,
        invoice.customer_address,
      ].some((value) => value?.toLowerCase().includes(term));
    });
  }, [invoices, paymentFilter, searchTerm]);

  const outstandingTotal = useMemo(
    () => invoices
      .filter((invoice) => getPaymentStatus(invoice) === 'unpaid')
      .reduce((sum, invoice) => sum + Number(invoice.net_amount || 0), 0),
    [invoices]
  );

  const handleOpenPdf = (invoice: Sale) => setPdfInvoice(invoice);

  const handleMarkPaid = async () => {
    if (!invoiceToPay?.id) return;

    try {
      setSaving(true);
      const response = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoiceToPay.id,
          payment_status: 'paid',
        }),
      });

      if (!response.ok) throw new Error('Failed to update payment status');
      const updatedInvoice: Sale = await response.json();
      setInvoices((current) => current.map((invoice) =>
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      ));
      setSelectedInvoice((current) =>
        current?.id === updatedInvoice.id ? updatedInvoice : current
      );
      setInvoiceToPay(null);
      showSnackbar('บันทึกการชำระเงินแล้ว ใบแจ้งหนี้จะแสดงลายน้ำ “ชำระแล้ว”', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('ไม่สามารถบันทึกสถานะการชำระเงินได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>ประวัติใบแจ้งหนี้</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            ตรวจสอบใบแจ้งหนี้ เปิดเอกสารย้อนหลัง และยืนยันการรับชำระเงิน
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={fetchInvoices} disabled={loading}>
          โหลดใหม่
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">ใบแจ้งหนี้ทั้งหมด</Typography>
          <Typography variant="h5" fontWeight={700}>{invoices.length} รายการ</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">ยอดค้างชำระ</Typography>
          <Typography variant="h5" fontWeight={700}>{formatMoney(outstandingTotal)}</Typography>
        </Paper>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร ชื่อลูกค้า เบอร์โทร หรือที่อยู่"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 190 } }}>
            <InputLabel>สถานะการชำระ</InputLabel>
            <Select
              value={paymentFilter}
              label="สถานะการชำระ"
              onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="unpaid">ค้างชำระ</MenuItem>
              <MenuItem value="paid">ชำระแล้ว</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredInvoices.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
            ไม่พบใบแจ้งหนี้
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>เลขที่เอกสาร</TableCell>
                  <TableCell>วันที่</TableCell>
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell align="right">ยอดสุทธิ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>วันที่ชำระ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const isPaid = getPaymentStatus(invoice) === 'paid';
                  return (
                    <TableRow key={invoice.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{getDocumentNumber(invoice)}</TableCell>
                      <TableCell>{formatDate(invoice.sale_date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.customer_name || 'ไม่ระบุชื่อลูกค้า'}
                        </Typography>
                        {invoice.customer_phone && (
                          <Typography variant="caption" color="text.secondary">
                            {invoice.customer_phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatMoney(invoice.net_amount)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={isPaid ? 'success' : 'default'}
                          variant={isPaid ? 'filled' : 'outlined'}
                          label={isPaid ? 'ชำระแล้ว' : 'ค้างชำระ'}
                        />
                      </TableCell>
                      <TableCell>{isPaid ? formatDate(invoice.paid_at, true) : '-'}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="ดูรายละเอียด">
                          <IconButton onClick={() => setSelectedInvoice(invoice)}>
                            <VisibilityOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Preview PDF">
                          <IconButton onClick={() => handleOpenPdf(invoice)}>
                            <PictureAsPdfOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        {!isPaid && (
                          <Tooltip title="ยืนยันว่าชำระแล้ว">
                            <IconButton color="success" onClick={() => setInvoiceToPay(invoice)}>
                              <PaymentsOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedInvoice && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <span>{getDocumentNumber(selectedInvoice)}</span>
                <Chip
                  size="small"
                  color={getPaymentStatus(selectedInvoice) === 'paid' ? 'success' : 'default'}
                  label={getPaymentStatus(selectedInvoice) === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                />
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">ข้อมูลลูกค้า</Typography>
                  <Typography fontWeight={700}>{selectedInvoice.customer_name || '-'}</Typography>
                  <Typography variant="body2">{selectedInvoice.customer_phone || '-'}</Typography>
                  <Typography variant="body2">{selectedInvoice.customer_address || '-'}</Typography>
                </Box>
                <Box sx={{ minWidth: 220 }}>
                  <Typography variant="caption" color="text.secondary">วันที่ออกเอกสาร</Typography>
                  <Typography>{formatDate(selectedInvoice.sale_date)}</Typography>
                  {selectedInvoice.paid_at && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        วันที่รับชำระ
                      </Typography>
                      <Typography>{formatDate(selectedInvoice.paid_at, true)}</Typography>
                    </>
                  )}
                </Box>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>สินค้า</TableCell>
                      <TableCell align="right">ราคา/หน่วย</TableCell>
                      <TableCell align="right">จำนวน</TableCell>
                      <TableCell align="right">รวม</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.items.map((item) => (
                      <TableRow key={item.id || `${item.product_name}-${item.unit_price}`}>
                        <TableCell>
                          {item.product_name}
                          {item.barcode && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              บาร์โค้ด: {item.barcode}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{formatMoney(item.unit_price)}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatMoney(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>ยอดสุทธิ</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatMoney(selectedInvoice.net_amount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleOpenPdf(selectedInvoice)} startIcon={<PictureAsPdfOutlinedIcon />}>
                Preview PDF
              </Button>
              {getPaymentStatus(selectedInvoice) === 'unpaid' && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={() => setInvoiceToPay(selectedInvoice)}
                  startIcon={<PaymentsOutlinedIcon />}
                >
                  รับชำระแล้ว
                </Button>
              )}
              <Button onClick={() => setSelectedInvoice(null)}>ปิด</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(invoiceToPay)} onClose={() => !saving && setInvoiceToPay(null)}>
        <DialogTitle>ยืนยันการรับชำระเงิน</DialogTitle>
        <DialogContent>
          <Typography>
            ยืนยันว่า {invoiceToPay ? getDocumentNumber(invoiceToPay) : ''} ได้รับชำระครบ
            {invoiceToPay ? formatMoney(invoiceToPay.net_amount) : '0.00'} แล้วใช่หรือไม่?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            หลังยืนยัน PDF ใบแจ้งหนี้จะแสดงลายน้ำ “ชำระแล้ว” และบันทึกวันเวลาที่รับชำระ
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceToPay(null)} disabled={saving}>ยกเลิก</Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleMarkPaid}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : 'ยืนยันว่าชำระแล้ว'}
          </Button>
        </DialogActions>
      </Dialog>

      <SaleA4PreviewDialog sale={pdfInvoice} onClose={() => setPdfInvoice(null)} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
