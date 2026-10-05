'use client';

import { createTheme, PaletteMode } from '@mui/material/styles';

export const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#8b5cf6' : '#6d28d9',
        light: isDark ? '#a78bfa' : '#8b5cf6',
        dark: isDark ? '#6d28d9' : '#5b21b6',
        contrastText: '#ffffff',
      },
      secondary: {
        main: isDark ? '#22d3ee' : '#0891b2',
        light: '#67e8f9',
        dark: '#0e7490',
      },
      background: {
        default: isDark ? '#050507' : '#f4f4f5',
        paper: isDark ? 'rgba(24, 24, 27, 0.68)' : 'rgba(255, 255, 255, 0.72)',
      },
      text: {
        primary: isDark ? '#fafafa' : '#18181b',
        secondary: isDark ? '#a1a1aa' : '#52525b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 24, 27, 0.10)',
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(24, 24, 27, 0.05)',
        selected: isDark ? 'rgba(139, 92, 246, 0.16)' : 'rgba(109, 40, 217, 0.10)',
      },
    },
    typography: {
      fontFamily: "'Google Sans', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 14,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            minHeight: '100vh',
            backgroundColor: isDark ? '#050507' : '#f4f4f5',
            backgroundImage: isDark
              ? 'radial-gradient(circle at 15% 10%, rgba(139, 92, 246, 0.18), transparent 32%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.10), transparent 28%), linear-gradient(145deg, #050507 0%, #09090b 48%, #111118 100%)'
              : 'radial-gradient(circle at 15% 10%, rgba(139, 92, 246, 0.15), transparent 32%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.12), transparent 28%), linear-gradient(145deg, #fafafa 0%, #f4f4f5 50%, #eef2ff 100%)',
            backgroundAttachment: 'fixed',
            transition: 'background-color 200ms ease, color 200ms ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(24, 24, 27, 0.68)' : 'rgba(255, 255, 255, 0.72)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 24, 27, 0.08)'}`,
            boxShadow: isDark
              ? '0 18px 50px rgba(0, 0, 0, 0.32)'
              : '0 18px 50px rgba(63, 63, 70, 0.12)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(5, 5, 7, 0.72)' : 'rgba(255, 255, 255, 0.72)',
            color: isDark ? '#fafafa' : '#18181b',
            border: 0,
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 24, 27, 0.08)'}`,
            boxShadow: isDark
              ? '0 12px 36px rgba(0, 0, 0, 0.30)'
              : '0 12px 36px rgba(63, 63, 70, 0.10)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.015))'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.80), rgba(255, 255, 255, 0.42))',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(12px)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(24, 24, 27, 0.30)',
            },
          },
          notchedOutline: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(24, 24, 27, 0.14)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
            ...(isDark && {
              '&.MuiButton-contained': {
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
                '& .MuiButton-startIcon, & .MuiButton-endIcon': {
                  color: 'inherit',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.62)',
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  backgroundImage: 'none',
                  textShadow: 'none',
                },
              },
              '&.MuiButton-outlined': {
                color: '#f4f4f5',
                borderColor: 'rgba(255, 255, 255, 0.32)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.58)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.46)',
                  borderColor: 'rgba(255, 255, 255, 0.16)',
                },
              },
              '&.MuiButton-text': {
                color: '#e4e4e7',
                '&:hover': {
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.40)',
                },
              },
            }),
          },
          containedPrimary: {
            backgroundImage: isDark
              ? 'linear-gradient(135deg, #9f7aea, #7c3aed)'
              : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(109, 40, 217, 0.25)',
            '&:hover': {
              backgroundImage: isDark
                ? 'linear-gradient(135deg, #b39af3, #8b5cf6)'
                : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              boxShadow: '0 10px 28px rgba(124, 58, 237, 0.36)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? 'rgba(17, 17, 24, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(24, 24, 27, 0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(10px)',
          },
        },
      },
    },
  });
};
