'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import ContactsIcon from '@mui/icons-material/Contacts';
import { Contact } from '@/types/contact';

export default function ManageContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [note, setNote] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchContacts(searchTerm);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchContacts = async (search?: string) => {
    try {
      setLoading(true);
      const url = search ? `/api/contacts?search=${encodeURIComponent(search)}` : '/api/contacts';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setContacts(data);
      setError('');
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setPhone(contact.phone || '');
      setLineId(contact.line_id || '');
      setNote(contact.note || '');
    } else {
      setEditingContact(null);
      setName('');
      setPhone('');
      setLineId('');
      setNote('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContact(null);
    setName('');
    setPhone('');
    setLineId('');
    setNote('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('กรุณากรอกชื่อเซลล์/ร้านค้า');
      return;
    }

    try {
      const payload = {
        id: editingContact?.id,
        name: name.trim(),
        phone: phone.trim() || null,
        line_id: lineId.trim() || null,
        note: note.trim() || null
      };

      const response = await fetch('/api/contacts', {
        method: editingContact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      setSuccess(editingContact ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
      handleCloseDialog();
      fetchContacts(searchTerm);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('ไม่สามารถบันทึกได้');
      console.error(err);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete?.id) return;

    try {
      const response = await fetch(`/api/contacts?id=${contactToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('ลบสำเร็จ');
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      fetchContacts(searchTerm);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('ไม่สามารถลบได้');
      console.error(err);
    }
  };

  if (loading && contacts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          ข้อมูลร้านค้า/เซลล์
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size={isMobile ? 'small' : 'medium'}
        >
          {isMobile ? 'เพิ่ม' : 'เพิ่มรายการใหม่'}
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="ค้นหาชื่อ, เบอร์โทร, Line ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ContactsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูลร้านค้า/เซลล์'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {contacts.map((contact) => (
            <Card key={contact.id} elevation={2}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1rem' }}>
                      {contact.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {contact.phone && (
                        <Chip
                          icon={<PhoneIcon />}
                          label={contact.phone}
                          size="small"
                          variant="outlined"
                          component="a"
                          href={`tel:${contact.phone}`}
                          clickable
                        />
                      )}
                      {contact.line_id && (
                        <Chip
                          icon={<ChatIcon />}
                          label={contact.line_id}
                          size="small"
                          variant="outlined"
                          color="success"
                        />
                      )}
                    </Box>

                    {contact.note && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {contact.note}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleOpenDialog(contact)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(contact)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editingContact ? 'แก้ไขข้อมูล' : 'เพิ่มร้านค้า/เซลล์ใหม่'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="ชื่อเซลล์/ร้านค้า"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="เบอร์ติดต่อ"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Line ID"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ChatIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="หมายเหตุ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained">
            {editingContact ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>
            ต้องการลบ "{contactToDelete?.name}" หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
