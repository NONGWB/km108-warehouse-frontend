'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(username, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card elevation={10} sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}>
              <LockOutlinedIcon />
            </Box>
          </Box>
          <Typography variant="h4" align="center" fontWeight={800}>KM 108 Shop</Typography>
          <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>เข้าสู่ระบบ POS</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              inputProps={{ maxLength: 50, autoCapitalize: 'none' }}
              autoFocus
              required
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              inputProps={{ minLength: 8, maxLength: 128 }}
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting || !username.trim() || !password}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'เข้าสู่ระบบ'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
