'use client';

import { useEffect, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import type { Customer, CustomerType } from '@/types/customer';
import { getCustomerDisplayName } from '@/types/customer';

const emptyForm = {
  customer_type: 'individual' as CustomerType,
  full_name: '',
  company_name: '',
  address: '',
  phone: '',
};

export default function ManageCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  const fetchCustomers = async (search = '') => {
    try {
      setLoading(true);
      const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      setCustomers(await response.json());
      setError('');
    } catch (fetchError) {
      console.error(fetchError);
      setError('ไม่สามารถโหลดข้อมูลลูกค้าได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({
        customer_type: customer.customer_type,
        full_name: customer.full_name || '',
        company_name: customer.company_name || '',
        address: customer.address || '',
        phone: customer.phone || '',
      });
    } else {
      setEditingCustomer(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const closeForm = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const requiredName = form.customer_type === 'individual' ? form.full_name : form.company_name;
    if (!requiredName.trim()) {
      setError(form.customer_type === 'individual' ? 'กรุณากรอกชื่อ-นามสกุล' : 'กรุณากรอกชื่อบริษัท');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCustomer?.id, ...form }),
      });
      if (!response.ok) throw new Error('Failed to save customer');

      setSuccess(editingCustomer ? 'แก้ไขข้อมูลลูกค้าแล้ว' : 'เพิ่มข้อมูลลูกค้าแล้ว');
      closeForm();
      fetchCustomers(searchTerm);
      setTimeout(() => setSuccess(''), 3000);
    } catch (saveError) {
      console.error(saveError);
      setError('ไม่สามารถบันทึกข้อมูลลูกค้าได้');
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete?.id) return;
    try {
      const response = await fetch(`/api/customers?id=${customerToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete customer');
      setCustomerToDelete(null);
      setSuccess('ลบข้อมูลลูกค้าแล้ว');
      fetchCustomers(searchTerm);
      setTimeout(() => setSuccess(''), 3000);
    } catch (deleteError) {
      console.error(deleteError);
      setError('ไม่สามารถลบข้อมูลลูกค้าได้');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">จัดการข้อมูลลูกค้า</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          {isMobile ? 'เพิ่ม' : 'เพิ่มลูกค้า'}
        </Button>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="ค้นหาชื่อ ชื่อบริษัท หรือเบอร์โทร..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
        }}
      />

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {loading && customers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : customers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PeopleAltOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">
            {searchTerm ? 'ไม่พบข้อมูลลูกค้า' : 'ยังไม่มีข้อมูลลูกค้า'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ประเภท</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อลูกค้า</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', md: 'table-cell' } }}>ที่อยู่</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>เบอร์ติดต่อ</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={customer.customer_type === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{getCustomerDisplayName(customer)}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'pre-wrap' }}>
                    {customer.address || '-'}
                  </TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => openForm(customer)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setCustomerToDelete(customer)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeForm} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มข้อมูลลูกค้า'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>ประเภทลูกค้า</InputLabel>
              <Select
                label="ประเภทลูกค้า"
                value={form.customer_type}
                onChange={(event) => setForm({
                  ...form,
                  customer_type: event.target.value as CustomerType,
                  full_name: '',
                  company_name: '',
                })}
              >
                <MenuItem value="individual">บุคคลธรรมดา</MenuItem>
                <MenuItem value="corporate">นิติบุคคล</MenuItem>
              </Select>
            </FormControl>

            {form.customer_type === 'individual' ? (
              <TextField
                required
                label="ชื่อ-นามสกุล"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              />
            ) : (
              <TextField
                required
                label="ชื่อบริษัท"
                value={form.company_name}
                onChange={(event) => setForm({ ...form, company_name: event.target.value })}
              />
            )}

            <TextField
              label="ที่อยู่ (ไม่บังคับ)"
              multiline
              rows={3}
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
            <TextField
              label="เบอร์ติดต่อ (ไม่บังคับ)"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(customerToDelete)} onClose={() => setCustomerToDelete(null)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          ต้องการลบ “{customerToDelete ? getCustomerDisplayName(customerToDelete) : ''}” หรือไม่?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerToDelete(null)}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
