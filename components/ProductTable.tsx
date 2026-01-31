'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { Product } from '@/types/product';

interface ProductTableProps {
  products: Product[];
  formatPrice: (price: number) => string;
  getBestPrice: (product: Product) => number;
  getStoreWithBestPrice: (product: Product) => string;
}

export default function ProductTable({
  products,
  formatPrice,
  getBestPrice,
  getStoreWithBestPrice,
}: ProductTableProps) {
  return (
    <TableContainer component={Paper} elevation={3}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อสินค้า</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
              ราคาขาย
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
              ร้านที่ 1
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
              ร้านที่ 2
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
              ร้านที่ 3
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
              ร้านที่ 4
            </TableCell>
            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
              ราคาต่ำสุด
            </TableCell>
            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
              ร้านที่ถูกที่สุด
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product, index) => (
            <TableRow
              key={index}
              sx={{
                '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <TableCell component="th" scope="row">
                {product.ProductName}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                {formatPrice(product.SalePrice)}
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {product.Store1Name || '-'}
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(product.Store1Price)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {product.Store2Name || '-'}
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(product.Store2Price)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {product.Store3Name || '-'}
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(product.Store3Price)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {product.Store4Name || '-'}
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(product.Store4Price)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {formatPrice(getBestPrice(product))}
              </TableCell>
              <TableCell align="center">
                {getStoreWithBestPrice(product)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
