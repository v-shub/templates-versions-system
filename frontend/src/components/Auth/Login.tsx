import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onNavigateToRegister?: () => void;
}

export default function Login({ onNavigateToRegister }: LoginProps) {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка входа';
      console.error(message || err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        background: 'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          maxWidth: 420,
          width: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 24px rgba(30,58,95,0.08)',
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center" fontWeight={700} color="primary.main">
          Вход
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Войдите в систему управления шаблонами
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            autoComplete="email"
          />
          <TextField
            fullWidth
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
          </Button>
        </form>
        <Typography variant="body2" align="center" color="text.secondary">
          Нет аккаунта?{' '}
          <Link component="button" variant="body2" onClick={onNavigateToRegister} sx={{ cursor: 'pointer', fontWeight: 600 }}>
            Зарегистрироваться
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
