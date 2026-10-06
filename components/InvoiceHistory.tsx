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
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import type { Sale } from '@/types/sale';
import SaleA4PreviewDialog from '@/components/SaleA4PreviewDialog';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/types/auth';

type PaymentFilter = 'all' | 'unpaid' | 'paid' | 'voided';

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
const isVoided = (sale: Sale) => sale.status === 'voided';

export default function InvoiceHistory() {
  const { profile } = useAuth();
  const canVoidSale = Boolean(profile && isManagerRole(profile.role));
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<Sale | null>(null);
  const [invoiceToVoid, setInvoiceToVoid] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
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
      const response = await fetch('/api/sales?status=completed,voided&document_type=invoice');
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
      if (paymentFilter === 'voided' && !isVoided(invoice)) return false;
      if (paymentFilter === 'paid' && (isVoided(invoice) || getPaymentStatus(invoice) !== 'paid')) return false;
      if (paymentFilter === 'unpaid' && (isVoided(invoice) || getPaymentStatus(invoice) !== 'unpaid')) return false;
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
      .filter((invoice) => !isVoided(invoice) && getPaymentStatus(invoice) === 'unpaid')
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

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'ไม่สามารถบันทึกสถานะการชำระเงินได้');
      }
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
      showSnackbar(error instanceof Error ? error.message : 'ไม่สามารถบันทึกสถานะการชำระเงินได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVoidSale = async () => {
    if (!invoiceToVoid?.id) return;
    if (voidReason.trim().length < 3) {
      showSnackbar('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 3 ตัวอักษร', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoiceToVoid.id,
          action: 'void',
          reason: voidReason.trim(),
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'ไม่สามารถยกเลิกบิลได้');
      }

      const updatedInvoice: Sale = await response.json();
      setInvoices((current) => current.map((invoice) =>
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      ));
      setSelectedInvoice((current) =>
        current?.id === updatedInvoice.id ? updatedInvoice : current
      );
      setPdfInvoice((current) =>
        current?.id === updatedInvoice.id ? updatedInvoice : current
      );
      setInvoiceToVoid(null);
      setVoidReason('');
      showSnackbar('ยกเลิกบิลแล้ว เอกสารย้อนหลังจะแสดงลายน้ำ “ยกเลิก”', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar(error instanceof Error ? error.message : 'ไม่สามารถยกเลิกบิลได้', 'error');
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
            <InputLabel>สถานะเอกสาร</InputLabel>
            <Select
              value={paymentFilter}
              label="สถานะเอกสาร"
              onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="unpaid">ค้างชำระ</MenuItem>
              <MenuItem value="paid">ชำระแล้ว</MenuItem>
              <MenuItem value="voided">ยกเลิกแล้ว</MenuItem>
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
                  const voided = isVoided(invoice);
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
                          color={voided ? 'error' : isPaid ? 'success' : 'default'}
                          variant={voided || isPaid ? 'filled' : 'outlined'}
                          label={voided ? 'ยกเลิกแล้ว' : isPaid ? 'ชำระแล้ว' : 'ค้างชำระ'}
                        />
                      </TableCell>
                      <TableCell>{!voided && isPaid ? formatDate(invoice.paid_at, true) : '-'}</TableCell>
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
                        {!voided && !isPaid && (
                          <Tooltip title="ยืนยันว่าชำระแล้ว">
                            <IconButton color="success" onClick={() => setInvoiceToPay(invoice)}>
                              <PaymentsOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canVoidSale && !voided && (
                          <Tooltip title="ยกเลิกบิล">
                            <IconButton color="error" onClick={() => setInvoiceToVoid(invoice)}>
                              <BlockOutlinedIcon />
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
                  color={isVoided(selectedInvoice) ? 'error' : getPaymentStatus(selectedInvoice) === 'paid' ? 'success' : 'default'}
                  label={isVoided(selectedInvoice) ? 'ยกเลิกแล้ว' : getPaymentStatus(selectedInvoice) === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
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
                  {isVoided(selectedInvoice) && (
                    <>
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        ยกเลิกเมื่อ
                      </Typography>
                      <Typography>{formatDate(selectedInvoice.voided_at, true)}</Typography>
                      <Typography variant="body2">โดย {selectedInvoice.voided_by_name || '-'}</Typography>
                    </>
                  )}
                </Box>
              </Stack>

              {isVoided(selectedInvoice) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  เหตุผลที่ยกเลิก: {selectedInvoice.void_reason || '-'}
                </Alert>
              )}

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
              {!isVoided(selectedInvoice) && getPaymentStatus(selectedInvoice) === 'unpaid' && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={() => setInvoiceToPay(selectedInvoice)}
                  startIcon={<PaymentsOutlinedIcon />}
                >
                  รับชำระแล้ว
                </Button>
              )}
              {canVoidSale && !isVoided(selectedInvoice) && (
                <Button
                  color="error"
                  onClick={() => setInvoiceToVoid(selectedInvoice)}
                  startIcon={<BlockOutlinedIcon />}
                >
                  ยกเลิกบิล
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

      <Dialog
        open={Boolean(invoiceToVoid)}
        onClose={() => {
          if (saving) return;
          setInvoiceToVoid(null);
          setVoidReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ยกเลิกบิล</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            บิลจะยังอยู่ในประวัติและถูกตัดออกจากยอดขาย แต่ไม่สามารถแก้กลับเป็นบิลปกติได้
          </Alert>
          <Typography sx={{ mb: 2 }}>
            {invoiceToVoid ? getDocumentNumber(invoiceToVoid) : ''}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="เหตุผลการยกเลิก"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value.slice(0, 500))}
            inputProps={{ maxLength: 500 }}
            helperText={`${voidReason.length}/500 ตัวอักษร`}
            error={voidReason.length > 0 && voidReason.trim().length < 3}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInvoiceToVoid(null);
              setVoidReason('');
            }}
            disabled={saving}
          >
            กลับ
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleVoidSale}
            disabled={saving || voidReason.trim().length < 3}
          >
            {saving ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกบิล'}
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
