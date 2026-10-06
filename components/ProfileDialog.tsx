'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/types/auth';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { profile, refreshProfile, changePassword } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setPassword('');
      setConfirmPassword('');
      setMessage(null);
    }
  }, [open, profile]);

  if (!profile) return null;

  const saveProfile = async () => {
    if (!name.trim()) return;
    if (password && (password.length < 8 || password !== confirmPassword)) {
      setMessage({ type: 'error', text: password.length < 8 ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'ยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'บันทึกข้อมูลไม่สำเร็จ');
      if (password) await changePassword(password);
      await refreshProfile();
      setPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'บันทึกข้อมูลส่วนตัวแล้ว' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ' });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'อัปโหลดรูปไม่สำเร็จ');
      await refreshProfile();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'อัปโหลดรูปไม่สำเร็จ' });
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    setSaving(true);
    const response = await fetch('/api/profile/avatar', { method: 'DELETE' });
    if (response.ok) await refreshProfile();
    else setMessage({ type: 'error', text: 'ลบรูปไม่สำเร็จ' });
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>ข้อมูลส่วนตัว</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
        {message && <Alert severity={message.type}>{message.text}</Alert>}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={profile.avatar_url || undefined} sx={{ width: 72, height: 72 }}>
            {profile.name.slice(0, 1)}
          </Avatar>
          <Box>
            <Button component="label" variant="outlined" size="small" disabled={saving}>
              เลือกรูป
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
            </Button>
            {profile.avatar_path && <Button color="error" size="small" onClick={removeAvatar} disabled={saving}>ลบรูป</Button>}
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>JPG, PNG หรือ WebP ไม่เกิน 2 MB</Typography>
          </Box>
        </Box>
        <TextField label="Username" value={profile.username} disabled />
        <TextField label="Role" value={roleLabels[profile.role]} disabled />
        <TextField label="ชื่อที่แสดง" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 255 }} required />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>เปลี่ยนรหัสผ่าน (ไม่บังคับ)</Typography>
        <TextField label="รหัสผ่านใหม่" type="password" value={password} onChange={(event) => setPassword(event.target.value)} inputProps={{ minLength: 8, maxLength: 128 }} />
        <TextField label="ยืนยันรหัสผ่านใหม่" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} inputProps={{ maxLength: 128 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>ปิด</Button>
        <Button variant="contained" onClick={saveProfile} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={20} color="inherit" /> : 'บันทึก'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
