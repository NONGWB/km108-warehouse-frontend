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
  Avatar,
  Divider,
  ListItemIcon,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { MouseEvent, useState } from 'react';
import { appConfig, getBackOfficeMenuItemsForRole, getMenuItemsForRole } from '@/config/menu';
import type { AppProfile } from '@/types/auth';

interface NavBarProps {
  tabValue: number;
  anchorEl: HTMLElement | null;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onMenuSelect: (index: number) => void;
  themeMode: 'light' | 'dark';
  onThemeToggle: () => void;
  profile: AppProfile;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export default function NavBar({
  tabValue,
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onMenuSelect,
  themeMode,
  onThemeToggle,
  profile,
  onOpenProfile,
  onLogout,
}: NavBarProps) {
  const [backOfficeAnchorEl, setBackOfficeAnchorEl] = useState<HTMLElement | null>(null);
  const [mobileBackOfficeOpen, setMobileBackOfficeOpen] = useState(false);
  const [accountAnchorEl, setAccountAnchorEl] = useState<HTMLElement | null>(null);
  const visibleMenuItems = getMenuItemsForRole(profile.role);
  const visibleBackOfficeItems = getBackOfficeMenuItemsForRole(profile.role);
  const hasBackOfficeItems = visibleBackOfficeItems.length > 0;
  const isBackOfficeActive = visibleBackOfficeItems.some((item) => item.id === tabValue);

  const handleBackOfficeSelect = (id: number) => {
    setBackOfficeAnchorEl(null);
    setMobileBackOfficeOpen(false);
    onMenuSelect(id);
  };

  const handleMobileMenuClose = () => {
    setMobileBackOfficeOpen(false);
    onMenuClose();
  };

  const openProfile = () => {
    setAccountAnchorEl(null);
    onMenuClose();
    onOpenProfile();
  };

  const logout = () => {
    setAccountAnchorEl(null);
    onMenuClose();
    onLogout();
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
          {visibleMenuItems.map((item) => (
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
          {hasBackOfficeItems && <Button
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
          </Button>}
          {hasBackOfficeItems && <Menu
            anchorEl={backOfficeAnchorEl}
            open={Boolean(backOfficeAnchorEl)}
            onClose={() => setBackOfficeAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {visibleBackOfficeItems.map((item) => (
              <MenuItem
                key={item.id}
                selected={tabValue === item.id}
                onClick={() => handleBackOfficeSelect(item.id)}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>}
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

        <Tooltip title={profile.name}>
          <Button
            color="inherit"
            onClick={(event) => setAccountAnchorEl(event.currentTarget)}
            sx={{ ml: 0.5, minWidth: 0, gap: 1, display: { xs: 'none', md: 'flex' } }}
          >
            <Avatar src={profile.avatar_url || undefined} sx={{ width: 30, height: 30, fontSize: 14 }}>
              {profile.name.slice(0, 1)}
            </Avatar>
            <Typography variant="body2" sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }} noWrap>
              {profile.name}
            </Typography>
          </Button>
        </Tooltip>
        <Menu anchorEl={accountAnchorEl} open={Boolean(accountAnchorEl)} onClose={() => setAccountAnchorEl(null)}>
          <MenuItem onClick={openProfile}>
            <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
            ข้อมูลส่วนตัว
          </MenuItem>
          <Divider />
          <MenuItem onClick={logout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            ออกจากระบบ
          </MenuItem>
        </Menu>

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
            {visibleMenuItems.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => onMenuSelect(item.id)}
                selected={tabValue === item.id}
              >
                {item.label}
              </MenuItem>
            ))}
            {hasBackOfficeItems && <MenuItem
              onClick={() => setMobileBackOfficeOpen((open) => !open)}
              selected={isBackOfficeActive}
              sx={{ fontWeight: 600 }}
            >
              <Box component="span" sx={{ flexGrow: 1 }}>
                จัดการหลังร้าน
              </Box>
              {mobileBackOfficeOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </MenuItem>}
            {hasBackOfficeItems && <Collapse in={mobileBackOfficeOpen} timeout="auto" unmountOnExit>
              {visibleBackOfficeItems.map((item) => (
                <MenuItem
                  key={item.id}
                  selected={tabValue === item.id}
                  onClick={() => handleBackOfficeSelect(item.id)}
                  sx={{ pl: 4 }}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Collapse>}
            <Divider />
            <MenuItem onClick={openProfile}>
              <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
              ข้อมูลส่วนตัว
            </MenuItem>
            <MenuItem onClick={logout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              ออกจากระบบ
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
