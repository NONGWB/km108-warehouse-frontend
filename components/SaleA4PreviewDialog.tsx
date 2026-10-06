'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import type { Sale } from '@/types/sale';
import { createSaleA4PdfPreviewUrl } from '@/lib/salePdf';

interface SaleA4PreviewDialogProps {
  sale: Sale | null;
  onClose: () => void;
}

export default function SaleA4PreviewDialog({ sale, onClose }: SaleA4PreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sale) {
      setPreviewUrl(null);
      setError('');
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setError('');

    createSaleA4PdfPreviewUrl(sale)
      .then((url) => {
        objectUrl = url;
        if (active) setPreviewUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch((caught) => {
        console.error('Error creating A4 PDF preview:', caught);
        if (active) setError('ไม่สามารถสร้าง PDF Preview ได้');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sale]);

  const printPdf = () => {
    const previewWindow = iframeRef.current?.contentWindow;
    if (!previewWindow) return;
    previewWindow.focus();
    previewWindow.print();
  };

  return (
    <Dialog
      open={Boolean(sale)}
      onClose={loading ? undefined : onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: '95vw' },
          maxWidth: 'none',
          height: { xs: '100dvh', sm: '95dvh' },
          maxHeight: 'none',
          m: { xs: 0, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ py: 1.5 }}>
        Preview ใบแจ้งหนี้ {sale?.document_number || ''}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ p: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'action.hover' }}
      >
        {loading ? (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>กำลังสร้าง Preview...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : previewUrl ? (
          <Box
            ref={iframeRef}
            component="iframe"
            src={previewUrl}
            title="Preview ใบแจ้งหนี้ A4"
            sx={{ width: '100%', height: '100%', border: 0, bgcolor: 'white' }}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2 }}>
        <Button onClick={onClose} disabled={loading}>ปิด</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={printPdf} disabled={!previewUrl || loading}>
          พิมพ์
        </Button>
      </DialogActions>
    </Dialog>
  );
}
