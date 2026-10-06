'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { AppProfile, AppRole } from '@/types/auth';
import { roleLabels } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

type FormState = {
  id?: string;
  username: string;
  name: string;
  role: AppRole;
  password: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  username: '',
  name: '',
  role: 'seller',
  password: '',
  is_active: true,
};

export default function ManageUsers() {
  const { profile: currentProfile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
      setUsers(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (user: AppProfile) => {
    setForm({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || (!form.id && (!form.username.trim() || form.password.length < 8))) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/users', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'บันทึกผู้ใช้ไม่สำเร็จ');
      if (form.id === currentProfile?.id) await refreshProfile();
      setOpen(false);
      await fetchUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'บันทึกผู้ใช้ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>จัดการผู้ใช้งาน</Typography>
          <Typography color="text.secondary">กำหนดบัญชีและสิทธิ์การใช้งานระบบ</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>เพิ่มผู้ใช้</Button>
      </Stack>

      {error && !open && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ผู้ใช้</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>สิทธิ์</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={user.avatar_url || undefined}>{user.name.slice(0, 1)}</Avatar>
                      <Typography fontWeight={600}>{user.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{roleLabels[user.role]}</TableCell>
                  <TableCell>
                    <Chip size="small" color={user.is_active ? 'success' : 'default'} label={user.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(user)}>แก้ไข</Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center">ยังไม่มีข้อมูลผู้ใช้</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={saving ? undefined : () => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Username"
            value={form.username}
            disabled={Boolean(form.id)}
            onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
            inputProps={{ maxLength: 50 }}
            helperText={!form.id ? '3-50 ตัว: a-z, 0-9, จุด, _ หรือ -' : undefined}
            required
          />
          <TextField label="ชื่อที่แสดง" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} inputProps={{ maxLength: 255 }} required />
          <FormControl>
            <InputLabel>สิทธิ์</InputLabel>
            <Select label="สิทธิ์" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="shop_owner">Shop Owner</MenuItem>
              <MenuItem value="seller">Seller</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={form.id ? 'รหัสผ่านใหม่ (ไม่บังคับ)' : 'รหัสผ่าน'}
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            inputProps={{ minLength: 8, maxLength: 128 }}
            helperText="อย่างน้อย 8 ตัวอักษร"
            required={!form.id}
          />
          {form.id && (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography fontWeight={600}>เปิดใช้งานบัญชี</Typography>
                <Typography variant="body2" color="text.secondary">ปิดเพื่อระงับการเข้าสู่ระบบ</Typography>
              </Box>
              <Switch checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.name.trim() || (!form.id && (!form.username.trim() || form.password.length < 8))}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
