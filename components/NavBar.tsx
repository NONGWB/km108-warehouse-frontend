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
  Tooltip,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MouseEvent, useState } from 'react';
import { menuItems, backOfficeMenuItems, appConfig } from '@/config/menu';

interface NavBarProps {
  tabValue: number;
  anchorEl: HTMLElement | null;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onMenuSelect: (index: number) => void;
  themeMode: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function NavBar({
  tabValue,
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onMenuSelect,
  themeMode,
  onThemeToggle,
}: NavBarProps) {
  const [backOfficeAnchorEl, setBackOfficeAnchorEl] = useState<HTMLElement | null>(null);
  const [mobileBackOfficeOpen, setMobileBackOfficeOpen] = useState(false);
  const isBackOfficeActive = backOfficeMenuItems.some((item) => item.id === tabValue);

  const handleBackOfficeSelect = (id: number) => {
    setBackOfficeAnchorEl(null);
    setMobileBackOfficeOpen(false);
    onMenuSelect(id);
  };

  const handleMobileMenuClose = () => {
    setMobileBackOfficeOpen(false);
    onMenuClose();
  };

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
                border: '1px solid',
                borderColor: tabValue === item.id ? 'rgba(167,139,250,0.55)' : 'transparent',
                bgcolor: tabValue === item.id ? 'rgba(139,92,246,0.18)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
              }}
            >
              {item.label}
            </Button>
          ))}
          <Button
            color="inherit"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(event) => setBackOfficeAnchorEl(event.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={Boolean(backOfficeAnchorEl)}
            sx={{
              border: '1px solid',
              borderColor: isBackOfficeActive ? 'rgba(167,139,250,0.55)' : 'transparent',
              bgcolor: isBackOfficeActive ? 'rgba(139,92,246,0.18)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            จัดการหลังร้าน
          </Button>
          <Menu
            anchorEl={backOfficeAnchorEl}
            open={Boolean(backOfficeAnchorEl)}
            onClose={() => setBackOfficeAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {backOfficeMenuItems.map((item) => (
              <MenuItem
                key={item.id}
                selected={tabValue === item.id}
                onClick={() => handleBackOfficeSelect(item.id)}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Tooltip title={themeMode === 'light' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง'}>
          <IconButton
            color="inherit"
            onClick={onThemeToggle}
            aria-label={themeMode === 'light' ? 'เปิดโหมดมืด' : 'เปิดโหมดสว่าง'}
            sx={{ ml: 1 }}
          >
            {themeMode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
        </Tooltip>

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
            onClose={handleMobileMenuClose}
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
            <MenuItem
              onClick={() => setMobileBackOfficeOpen((open) => !open)}
              selected={isBackOfficeActive}
              sx={{ fontWeight: 600 }}
            >
              <Box component="span" sx={{ flexGrow: 1 }}>
                จัดการหลังร้าน
              </Box>
              {mobileBackOfficeOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </MenuItem>
            <Collapse in={mobileBackOfficeOpen} timeout="auto" unmountOnExit>
              {backOfficeMenuItems.map((item) => (
                <MenuItem
                  key={item.id}
                  selected={tabValue === item.id}
                  onClick={() => handleBackOfficeSelect(item.id)}
                  sx={{ pl: 4 }}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Collapse>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
