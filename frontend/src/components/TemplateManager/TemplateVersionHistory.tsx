// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Paper,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  History as HistoryIcon,
  CompareArrows as CompareIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { templateApi, Template, TemplateVersion } from '../../services/api';

interface TemplateVersionHistoryProps {
  open: boolean;
  onClose: () => void;
  template: Template;
}

const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  open,
  onClose,
  template,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Загрузка версий
  const {
    data: versionsData,
    isLoading,
    error,
  } = useQuery(
    ['templateVersions', template._id, page, rowsPerPage],
    () => templateApi.getTemplateVersions(template._id, page + 1, rowsPerPage)
  );

  // Мутация для восстановления версии
  const restoreMutation = useMutation(
    ({ templateId, versionId }: { templateId: string; versionId: string }) =>
      templateApi.restoreVersion(templateId, versionId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['templateVersions', template._id]);
        queryClient.invalidateQueries(['template', template._id]);
        queryClient.invalidateQueries('templates');
        setRestoreDialogOpen(false);
        setVersionToRestore(null);
      },
    }
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, version: TemplateVersion) => {
    setAnchorEl(event.currentTarget);
    setSelectedVersion(version);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVersion(null);
  };

  const handleRestoreClick = (versionId: string) => {
    setVersionToRestore(versionId);
    setRestoreDialogOpen(true);
    handleMenuClose();
  };

  const handleRestoreConfirm = () => {
    if (versionToRestore) {
      restoreMutation.mutate({
        templateId: template._id,
        versionId: versionToRestore,
      });
    }
  };

  const handleDownload = (version: TemplateVersion) => {
    // Используем URL файла версии напрямую, как в карточке шаблона
    if (version.file?.url) {
      window.open(version.file.url, '_blank');
    } else {
      // Fallback: используем API endpoint для скачивания
      const downloadUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/templates/${template._id}/versions/${version._id}/download`;
      window.open(downloadUrl, '_blank');
    }
  };

  const handleCompare = (version: TemplateVersion) => {
    // Реализация сравнения версий
    console.log('Compare version:', version);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '';
    if (mimeType.includes('word') || mimeType.includes('doc')) return '';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '';
    if (mimeType.includes('image')) return '';
    return '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'draft': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HistoryIcon color="primary" />
            <Box>
              <Typography variant="h6">История версий</Typography>
              <Typography variant="caption" color="text.secondary">
                {template.name} (Текущая версия: {template.metadata.version})
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* Информация о шаблоне */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <Typography variant="h5">{getFileIcon(template.file.mimeType)}</Typography>
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip label={template.category} size="small" />
                  <Chip label={template.department} size="small" />
                  <Chip
                    label={`v${template.metadata.version}`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={template.metadata.status}
                    size="small"
                    color={getStatusColor(template.metadata.status) as any}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          {/* Состояние загрузки */}
          {isLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Состояние ошибки */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Ошибка при загрузке истории версий
            </Alert>
          )}

          {/* Таблица версий */}
          {!isLoading && !error && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Версия</TableCell>
                    <TableCell>Описание изменений</TableCell>
                    <TableCell>Файл</TableCell>
                    <TableCell>Автор</TableCell>
                    <TableCell>Дата создания</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versionsData?.versions?.map((version: TemplateVersion) => (
                    <TableRow
                      key={version._id}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(version.version === template.metadata.version && {
                          bgcolor: 'primary.50',
                        }),
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            fontWeight={
                              version.version === template.metadata.version ? 'bold' : 'normal'
                            }
                            color={
                              version.version === template.metadata.version ? 'primary' : 'inherit'
                            }
                          >
                            v{version.version}
                          </Typography>
                          {version.version === template.metadata.version && (
                            <Chip label="Текущая" size="small" color="primary" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {version.changes || 'Без описания'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {getFileIcon(version.file.mimeType)}
                          </Typography>
                          <Box>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {version.file.originalName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(version.file.size)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {version.metadata?.author || 'Не указан'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(version.metadata?.created), 'dd.MM.yyyy HH:mm', {
                            locale: ru,
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={version.metadata?.status || 'draft'}
                          size="small"
                          color={getStatusColor(version.metadata?.status) as any}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {version.version !== template.metadata.version && (
                            <Tooltip title="Восстановить">
                              <IconButton
                                size="small"
                                onClick={() => handleRestoreClick(version._id)}
                                color="warning"
                              >
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Скачать">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(version)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Сравнить">
                            <IconButton
                              size="small"
                              onClick={() => handleCompare(version)}
                            >
                              <CompareIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, version)}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Пагинация */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={versionsData?.total || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Строк на странице:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} из ${count !== -1 ? count : `более ${to}`}`
                }
              />
            </TableContainer>
          )}

          {/* Информация если нет версий */}
          {!isLoading && !error && versionsData?.versions?.length === 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              История версий отсутствует. Будут созданы новые версии при изменениях шаблона.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedVersion && handleRestoreClick(selectedVersion._id)}>
          <RestoreIcon fontSize="small" sx={{ mr: 1 }} />
          Восстановить эту версию
        </MenuItem>
        <MenuItem
          onClick={() =>
            selectedVersion && handleDownload(selectedVersion)
          }
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Скачать файл
        </MenuItem>
        <MenuItem onClick={() => selectedVersion && handleCompare(selectedVersion)}>
          <CompareIcon fontSize="small" sx={{ mr: 1 }} />
          Сравнить с текущей
        </MenuItem>
        <MenuItem>
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          Подробная информация
        </MenuItem>
      </Menu>

      {/* Диалог подтверждения восстановления */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
      >
        <DialogTitle>Восстановление версии</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите восстановить выбранную версию?
            Будет создана новая версия на основе выбранной.
          </Typography>
          {selectedVersion && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Восстанавливается версия v{selectedVersion.version} от{' '}
              {format(new Date(selectedVersion.metadata?.created), 'dd.MM.yyyy')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleRestoreConfirm}
            color="warning"
            variant="contained"
            disabled={restoreMutation.isLoading}
          >
            {restoreMutation.isLoading ? 'Восстановление...' : 'Восстановить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateVersionHistory;