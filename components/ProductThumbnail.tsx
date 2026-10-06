'use client';

import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { Product } from '@/types/product';

interface ProductThumbnailProps {
  product: Pick<Product, 'ProductName' | 'image_url'>;
  size?: number | string;
  borderRadius?: number;
}

export default function ProductThumbnail({
  product,
  size = 48,
  borderRadius = 1,
}: ProductThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isFixedSize = typeof size === 'number';

  useEffect(() => setImageFailed(false), [product.image_url]);

  return (
    <Box
      sx={{
        width: size,
        height: isFixedSize ? size : 'auto',
        aspectRatio: '1 / 1',
        flex: isFixedSize ? `0 0 ${size}px` : undefined,
        borderRadius,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {product.image_url && !imageFailed ? (
        <Box
          component="img"
          src={product.image_url}
          alt={product.ProductName}
          loading="lazy"
          onError={() => setImageFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Inventory2OutlinedIcon sx={{ color: 'text.disabled', fontSize: isFixedSize ? size * 0.48 : '40%' }} />
      )}
    </Box>
  );
}
