'use client';

import {
  Card,
  CardContent,
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  showPriceComparison: boolean;
  formatPrice: (price: number) => string;
  getBestPrice: (product: Product) => number;
}

export default function ProductCard({
  product,
  showPriceComparison,
  formatPrice,
  getBestPrice,
}: ProductCardProps) {
  const stores = [
    { name: product.Store1Name, price: product.Store1Price },
    { name: product.Store2Name, price: product.Store2Price },
    { name: product.Store3Name, price: product.Store3Price },
    { name: product.Store4Name, price: product.Store4Price },
  ].filter(store => store.name && store.price > 0);

  const bestPrice = getBestPrice(product);

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            color="primary" 
            sx={{ fontWeight: 'bold', fontSize: '0.875rem', flex: 1, mr: 1 }}
          >
            {product.ProductName}
          </Typography>
          <Typography 
            variant="body2" 
            color="secondary" 
            sx={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            {formatPrice(product.SalePrice)}
          </Typography>
        </Box>

        {showPriceComparison && stores.length > 0 && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              {stores.map((store, idx) => (
                <Chip
                  key={idx}
                  label={`${store.name}: ${formatPrice(store.price)}${store.price === bestPrice ? ' ✓ถูกสุด' : ''}`}
                  size="small"
                  color={store.price === bestPrice ? 'success' : 'default'}
                  variant={store.price === bestPrice ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
