'use client';

import { Fab, Tooltip } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface PriceComparisonFabProps {
  showPriceComparison: boolean;
  onToggle: () => void;
}

export default function PriceComparisonFab({
  showPriceComparison,
  onToggle,
}: PriceComparisonFabProps) {
  return (
    <Tooltip 
      title={showPriceComparison ? 'ซ่อนเปรียบเทียบราคา' : 'แสดงเปรียบเทียบราคา'} 
      placement="left"
    >
      <Fab
        color={showPriceComparison ? 'primary' : 'default'}
        size="medium"
        onClick={onToggle}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <CompareArrowsIcon />
      </Fab>
    </Tooltip>
  );
}
