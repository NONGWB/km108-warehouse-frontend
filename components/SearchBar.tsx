'use client';

import { TextField, Box, IconButton, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

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
        placeholder="ค้นหาสินค้า (ชื่อสินค้าหรือบาร์โค้ด)..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        size={isMobile ? 'small' : 'medium'}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={() => onSearchChange('')}
                edge="end"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
}
