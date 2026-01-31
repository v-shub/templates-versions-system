import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Person as PersonIcon, Lock as LockIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileProps {
  onBack?: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user, updateProfile, changePassword, error, clearError } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setProfileSuccess(false);
    setProfileSubmitting(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setProfileSuccess(true);
    } catch {
      // error set in context
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      return; // show validation
    }
    setPasswordSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // error set in context
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const passwordMismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

  return (
    <Box sx={{ py: 4, maxWidth: 480, mx: 'auto', px: 2 }}>
      {onBack && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mb: 2 }}
        >
          Назад
        </Button>
      )}
      <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
        Мой профиль
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Profile form */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">Данные профиля</Typography>
        </Box>
        <form onSubmit={handleProfileSubmit}>
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
          {profileSuccess && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setProfileSuccess(false)}>
              Профиль успешно обновлён
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={profileSubmitting}
            sx={{ mt: 2 }}
          >
            {profileSubmitting ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </form>
      </Paper>

      {/* Password form */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LockIcon color="primary" />
          <Typography variant="h6">Смена пароля</Typography>
        </Box>
        <form onSubmit={handlePasswordSubmit}>
          <TextField
            fullWidth
            label="Текущий пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="current-password"
          />
          <TextField
            fullWidth
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="new-password"
            error={!!(newPassword && newPassword.length < 6)}
            helperText={newPassword && newPassword.length < 6 ? 'Не менее 6 символов' : ''}
          />
          <TextField
            fullWidth
            label="Подтвердите пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="new-password"
            error={passwordMismatch}
            helperText={passwordMismatch ? 'Пароли не совпадают' : ''}
          />
          {passwordSuccess && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setPasswordSuccess(false)}>
              Пароль успешно изменён
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={passwordSubmitting || passwordMismatch || !!(newPassword && newPassword.length < 6)}
            sx={{ mt: 2 }}
          >
            {passwordSubmitting ? <CircularProgress size={24} /> : 'Сменить пароль'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
