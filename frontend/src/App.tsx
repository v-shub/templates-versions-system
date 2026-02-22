import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TemplateManager from './components/TemplateManager/TemplateManager';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Profile from './components/Auth/Profile';
import { Box, AppBar, Toolbar, Typography, Container, Button, CircularProgress, IconButton } from '@mui/material';
import { FolderSpecial as TemplateIcon, Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a5f',
      light: '#2d4a6f',
      dark: '#152a47',
      contrastText: '#fff',
    },
    secondary: {
      main: '#0d9488',
      light: '#14b8a6',
      dark: '#0f766e',
      contrastText: '#fff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#0284c7' },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f1f5f9' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1e3a5f 0%, #152a47 100%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(30,58,95,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          '&:hover': { boxShadow: '0 4px 12px rgba(30,58,95,0.25)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
        size: 'medium' as const,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1e3a5f',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

type AuthView = 'login' | 'register';
type MainView = 'dashboard' | 'profile';

function AppContent() {
  const { token, user, loading, logout } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const prevTokenRef = useRef<boolean>(!!token);

  // Always go to TemplateManager (dashboard) after login
  useEffect(() => {
    const hadToken = prevTokenRef.current;
    const hasToken = !!token;
    prevTokenRef.current = hasToken;
    if (!hadToken && hasToken) {
      setMainView('dashboard');
    }
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <TemplateIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Template Manager
            </Typography>
          </Toolbar>
        </AppBar>
        <Box component="main">
          {authView === 'login' ? (
            <Login onNavigateToRegister={() => setAuthView('register')} />
          ) : (
            <Register onNavigateToLogin={() => setAuthView('login')} />
          )}
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <TemplateIcon sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer', '&:hover': { opacity: 0.9 } }}
            onClick={() => setMainView('dashboard')}
          >
            Template Manager
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              onClick={() => setMainView('profile')}
              title="Мой профиль"
              size="small"
            >
              <PersonIcon />
            </IconButton>
            <Button
              color="inherit"
              size="small"
              onClick={() => setMainView('profile')}
              sx={{ textTransform: 'none', minWidth: 'auto' }}
            >
              {user?.name || user?.email}
            </Button>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout} size="small">
              Выход
            </Button>
            <Typography variant="body2">v1.0.0</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ minHeight: 'calc(100vh - 64px)' }}>
        <Container maxWidth={false} sx={{ py: 3 }}>
          {mainView === 'dashboard' ? (
            <TemplateManager />
          ) : (
            <Profile onBack={() => setMainView('dashboard')} />
          )}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2.5,
          px: 2,
          mt: 'auto',
          backgroundColor: 'rgba(30,58,95,0.04)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Template Management System. Все права защищены.
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ReactQueryProvider>
  );
}

export default App;