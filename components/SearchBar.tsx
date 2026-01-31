'use client';

import { TextField, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isMobile: boolean;
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  isMobile,
}: SearchBarProps) {
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="ค้นหาสินค้า..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        size={isMobile ? 'small' : 'medium'}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
        }}
      />
    </Box>
  );
}
