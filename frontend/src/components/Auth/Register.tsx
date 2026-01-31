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

interface RegisterProps {
  onNavigateToLogin?: () => void;
}

export default function Register({ onNavigateToLogin }: RegisterProps) {
  const { register, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password.length < 6) {
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password, name);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка регистрации';
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
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Регистрация
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="normal"
            autoComplete="name"
          />
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
            autoComplete="new-password"
            helperText="Не менее 6 символов"
            error={password.length > 0 && password.length < 6}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting || password.length < 6}
            sx={{ mt: 3, mb: 2 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
          </Button>
        </form>
        <Typography variant="body2" align="center">
          Уже есть аккаунт?{' '}
          <Link component="button" variant="body2" onClick={onNavigateToLogin} sx={{ cursor: 'pointer' }}>
            Войти
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
