'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { MouseEvent } from 'react';

interface NavBarProps {
  tabValue: number;
  anchorEl: HTMLElement | null;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onMenuSelect: (index: number) => void;
}

export default function NavBar({
  tabValue,
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onMenuSelect,
}: NavBarProps) {
  return (
    <AppBar position="fixed" sx={{ top: 0, left: 0, right: 0, zIndex: 1100 }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, fontWeight: 'bold' }}
        >
          KM 108 Shop
        </Typography>
        
        {/* Desktop Menu */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button 
            color="inherit" 
            onClick={() => onMenuSelect(0)}
            sx={{ 
              bgcolor: tabValue === 0 ? 'rgba(255,255,255,0.15)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
            }}
          >
            ค้นหาสินค้า
          </Button>
          <Button 
            color="inherit" 
            onClick={() => onMenuSelect(1)}
            sx={{ 
              bgcolor: tabValue === 1 ? 'rgba(255,255,255,0.15)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
            }}
          >
            จัดการสินค้า
          </Button>
          <Button 
            color="inherit" 
            onClick={() => onMenuSelect(2)}
            sx={{ 
              bgcolor: tabValue === 2 ? 'rgba(255,255,255,0.15)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
            }}
          >
            รายการเติมสต็อค
          </Button>
        </Box>

        {/* Mobile Menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            color="inherit"
            onClick={onMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem 
              onClick={() => onMenuSelect(0)}
              selected={tabValue === 0}
            >
              ค้นหาสินค้า
            </MenuItem>
            <MenuItem 
              onClick={() => onMenuSelect(1)}
              selected={tabValue === 1}
            >
              จัดการสินค้า
            </MenuItem>
            <MenuItem 
              onClick={() => onMenuSelect(2)}
              selected={tabValue === 2}
            >
              รายการเติมสต็อค
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
