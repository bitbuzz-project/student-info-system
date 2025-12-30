// src/main.jsx
import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Box } from '@mui/material'
import rtlPlugin from 'stylis-plugin-rtl'
import { prefixer } from 'stylis'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import i18n from './utils/i18n.js' // Ensure this path is correct

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AdminProvider } from './contexts/AdminContext.jsx'
import './index.css'

// 1. Create two caches: one for RTL (with flipping plugin) and one for LTR (standard)
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: 'muiltr',
});

// 2. Define your theme configuration structure
const getTheme = (direction) => createTheme({
  direction: direction,
  palette: {
    primary: {
      main: '#3498db',
      dark: '#2980b9',
      light: '#5dade2'
    },
    secondary: {
      main: '#e74c3c',
      dark: '#c0392b',
      light: '#ec7063'
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: [
      direction === 'rtl' ? 'Almarai' : 'Roboto', // Optional: Switch font based on lang
      'sans-serif'
    ].join(','),
    h4: {
      fontWeight: 600,
      color: '#2c3e50'
    },
    h5: {
      fontWeight: 500,
      color: '#34495e'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8
          }
        }
      }
    }
  }
});

// 3. Create a Root component to handle direction logic
const Root = () => {
  const [lang, setLang] = useState(i18n.language || 'ar');

  useEffect(() => {
    // Sync document direction on mount
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.dir = dir;
    
    // Listen for language changes from anywhere in the app
    const handleLangChange = (lng) => {
      setLang(lng);
      document.dir = lng === 'ar' ? 'rtl' : 'ltr';
    };

    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  const direction = lang === 'ar' ? 'rtl' : 'ltr';
  
  // Memoize theme and cache to prevent unnecessary re-renders
  const theme = useMemo(() => getTheme(direction), [direction]);
  const currentCache = useMemo(() => direction === 'rtl' ? cacheRtl : cacheLtr, [direction]);

  return (
    <CacheProvider value={currentCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <AdminProvider>
              {/* Ensure the container also respects the direction */}
              <div dir={direction}>
                <App />
              </div>
            </AdminProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);