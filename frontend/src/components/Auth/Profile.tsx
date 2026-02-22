import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Person as PersonIcon, Lock as LockIcon, ArrowBack as ArrowBackIcon, DeleteForever as DeleteForeverIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileProps {
  onBack?: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user, updateProfile, changePassword, deleteAccount, error, clearError } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  const handleDeleteAccountClick = () => setDeleteDialogOpen(true);
  const handleDeleteDialogClose = () => {
    if (!deleteSubmitting) {
      setDeleteDialogOpen(false);
      setDeletePassword('');
    }
  };
  const handleDeleteAccountConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setDeleteSubmitting(true);
    try {
      await deleteAccount(deletePassword);
      handleDeleteDialogClose();
    } catch {
      // error set in context
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 4, maxWidth: 520, mx: 'auto', px: 2 }}>
      {onBack && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mb: 2 }}
          variant="text"
          color="primary"
        >
          Назад
        </Button>
      )}
      <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 3 }} fontWeight={700} color="primary.main">
        Мой профиль
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Profile form */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
            {profileSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Сохранить'}
          </Button>
        </form>
      </Paper>

      {/* Password form */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
            {passwordSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Сменить пароль'}
          </Button>
        </form>
      </Paper>

      {/* Delete account */}
      <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DeleteForeverIcon color="error" />
          <Typography variant="h6" color="error.main">
            Удалить аккаунт
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Это действие необратимо. Все данные вашего аккаунта будут удалены.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteAccountClick}
          disabled={deleteSubmitting}
        >
          Удалить аккаунт
        </Button>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} maxWidth="xs" fullWidth>
        <form onSubmit={handleDeleteAccountConfirm}>
          <DialogTitle>Удалить аккаунт?</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Для подтверждения введите ваш пароль. После удаления войти с этим аккаунтом будет невозможно.
            </DialogContentText>
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              autoComplete="current-password"
              error={!!error}
              helperText={error}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleDeleteDialogClose} disabled={deleteSubmitting}>
              Отмена
            </Button>
            <Button type="submit" color="error" variant="contained" disabled={deleteSubmitting || !deletePassword}>
              {deleteSubmitting ? <CircularProgress size={24} /> : 'Удалить навсегда'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
