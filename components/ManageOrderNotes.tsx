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
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InventoryIcon from '@mui/icons-material/Inventory';
import { OrderNote, OrderNoteItem } from '@/types/orderNote';

export default function ManageOrderNotes() {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<OrderNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<OrderNote | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  
  // Form state
  const [noteName, setNoteName] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<OrderNoteItem[]>([]);
  const [newItemName, setNewItemName] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/order-notes');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setNotes(data);
      setError('');
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (note?: OrderNote) => {
    if (note) {
      setEditingNote(note);
      setNoteName(note.note_name);
      setNoteDate(note.note_date);
      setItems(note.items || []);
    } else {
      setEditingNote(null);
      setNoteName('');
      setNoteDate(new Date().toISOString().split('T')[0]);
      setItems([]);
    }
    setNewItemName('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
    setNoteName('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setNewItemName('');
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([...items, { item_name: newItemName.trim(), is_completed: false }]);
      setNewItemName('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!noteName.trim()) {
      setError('กรุณากรอกชื่อโน้ต');
      return;
    }

    try {
      const payload = {
        id: editingNote?.id,
        note_name: noteName.trim(),
        note_date: noteDate,
        items: items
      };

      const response = await fetch('/api/order-notes', {
        method: editingNote ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      setSuccess(editingNote ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
      handleCloseDialog();
      fetchNotes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('ไม่สามารถบันทึกได้');
      console.error(err);
    }
  };

  const handleDeleteClick = (note: OrderNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete?.id) return;

    try {
      const response = await fetch(`/api/order-notes?id=${noteToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('ลบสำเร็จ');
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      fetchNotes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('ไม่สามารถลบได้');
      console.error(err);
    }
  };

  const handleToggleItem = async (noteId: string, itemId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/order-notes/toggle-item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, is_completed: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to toggle');

      // Update local state
      setNotes(notes.map(note => {
        if (note.id === noteId) {
          return {
            ...note,
            items: note.items.map(item => 
              item.id === itemId ? { ...item, is_completed: !currentStatus } : item
            )
          };
        }
        return note;
      }));
    } catch (err) {
      setError('ไม่สามารถอัพเดทได้');
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletionStats = (note: OrderNote) => {
    const total = note.items.length;
    const completed = note.items.filter(item => item.is_completed).length;
    return { total, completed };
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          รายการเติมสต็อค
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

      {/* Notes List */}
      {notes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            ยังไม่มีรายการเติมสต็อค
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {notes.map((note) => {
            const stats = getCompletionStats(note);
            const isExpanded = expandedNoteId === note.id;

            return (
              <Card key={note.id} elevation={2}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {note.note_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(note.note_date)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={`${stats.completed}/${stats.total}`}
                        size="small"
                        color={stats.completed === stats.total && stats.total > 0 ? 'success' : 'default'}
                        variant={stats.completed === stats.total && stats.total > 0 ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    onClick={() => setExpandedNoteId(isExpanded ? null : note.id!)}
                    endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {isExpanded ? 'ซ่อนรายการ' : `ดูรายการ (${stats.total})`}
                  </Button>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(note)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(note)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>

                <Collapse in={isExpanded}>
                  <Divider />
                  <List dense sx={{ py: 0 }}>
                    {note.items.length === 0 ? (
                      <ListItem>
                        <ListItemText 
                          primary="ไม่มีรายการ" 
                          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                        />
                      </ListItem>
                    ) : (
                      note.items.map((item) => (
                        <ListItem key={item.id} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              edge="start"
                              checked={item.is_completed}
                              onChange={() => handleToggleItem(note.id!, item.id!, item.is_completed)}
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.item_name}
                            sx={{
                              textDecoration: item.is_completed ? 'line-through' : 'none',
                              color: item.is_completed ? 'text.secondary' : 'text.primary'
                            }}
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                </Collapse>
              </Card>
            );
          })}
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
          {editingNote ? 'แก้ไขรายการเติมสต็อค' : 'เพิ่มรายการเติมสต็อคใหม่'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="ชื่อโน้ต"
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              fullWidth
              required
              size={isMobile ? 'small' : 'medium'}
            />
            <TextField
              label="วันที่"
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              fullWidth
              required
              size={isMobile ? 'small' : 'medium'}
              InputLabelProps={{ shrink: true }}
            />

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              รายการของที่ต้องสั่ง
            </Typography>

            {/* Add new item */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="ชื่อรายการ"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                fullWidth
                size="small"
              />
              <IconButton 
                color="primary" 
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
              >
                <AddIcon />
              </IconButton>
            </Box>

            {/* Items list */}
            {items.length > 0 && (
              <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                <List dense>
                  {items.map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText primary={item.item_name} />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={() => handleRemoveItem(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained">
            {editingNote ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>
            ต้องการลบ "{noteToDelete?.note_name}" หรือไม่?
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
