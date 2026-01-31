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
import { menuItems, appConfig } from '@/config/menu';

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
          {appConfig.appName}
        </Typography>
        
        {/* Desktop Menu */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {menuItems.map((item) => (
            <Button
              key={item.id}
              color="inherit"
              onClick={() => onMenuSelect(item.id)}
              sx={{
                bgcolor: tabValue === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
              }}
            >
              {item.label}
            </Button>
          ))}
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
            {menuItems.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => onMenuSelect(item.id)}
                selected={tabValue === item.id}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
