import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import TemplateManager from './components/TemplateManager/TemplateManager';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { FolderSpecial as TemplateIcon } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ReactQueryProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        
        {/* Шапка */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <TemplateIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Template Manager
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2">v1.0.0</Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Основной контент */}
        <Box component="main" sx={{ minHeight: 'calc(100vh - 64px)' }}>
          <Container maxWidth={false} sx={{ py: 3 }}>
            <TemplateManager />
          </Container>
        </Box>

        {/* Подвал */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: 'auto',
            backgroundColor: (theme) => theme.palette.grey[100],
            borderTop: (theme) => `1px solid ${theme.palette.grey[300]}`,
          }}
        >
          <Container maxWidth="xl">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Template Management System. 
              Все права защищены.
            </Typography>
          </Container>
        </Box>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}

export default App;