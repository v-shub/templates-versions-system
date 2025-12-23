// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from 'react-query';
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
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { templateApi, TemplateVersion } from '../../services/api';

interface VersionComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  version1: TemplateVersion;
  version2: TemplateVersion;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface ComparisonResult {
  templateId: string;
  templateName: string;
  version1: {
    id: string;
    version: number;
    changes: string;
    author: string;
    status: string;
    createdAt: Date;
    file: {
      originalName: string;
      mimeType: string;
      size: number;
      checksum: string;
    };
  };
  version2: {
    id: string;
    version: number;
    changes: string;
    author: string;
    status: string;
    createdAt: Date;
    file: {
      originalName: string;
      mimeType: string;
      size: number;
      checksum: string;
    };
  };
  differences: {
    metadata: Record<string, { old: any; new: any }>;
    fileMetadata: Record<string, { old: any; new: any }>;
    fileContent: {
      contentChanged: boolean;
      isTextFile: boolean;
      fileType: 'text' | 'office' | 'pdf' | null;
      diff: DiffPart[] | null;
      error: string | null;
    };
    summary: {
      hasChanges: boolean;
      metadataChangesCount: number;
      fileMetadataChangesCount: number;
      fileContentChanged: boolean;
      totalChangesCount: number;
    };
  };
  comparedAt: Date;
}

const VersionComparisonDialog: React.FC<VersionComparisonDialogProps> = ({
  open,
  onClose,
  templateId,
  version1,
  version2,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const {
    data: comparison,
    isLoading,
    error,
  } = useQuery<ComparisonResult>(
    ['compareVersions', templateId, version1._id, version2._id],
    () => templateApi.compareVersions(templateId, version1._id, version2._id),
    {
      enabled: open && !!version1 && !!version2,
      staleTime: 5 * 60 * 1000, // 5 минут
    }
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'draft': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  const renderDiffContent = (diff: DiffPart[] | null) => {
    if (!diff || diff.length === 0) {
      return (
        <Alert severity="info">
          Файлы идентичны. Изменений не обнаружено.
        </Alert>
      );
    }

    return (
      <Box
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          maxHeight: '600px',
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {diff.map((part, index) => {
          let bgColor = 'transparent';
          let textColor = 'text.primary';
          let prefix = ' ';

          if (part.added) {
            bgColor = 'success.light';
            textColor = 'success.contrastText';
            prefix = '+';
          } else if (part.removed) {
            bgColor = 'error.light';
            textColor = 'error.contrastText';
            prefix = '-';
          }

          // Разбиваем на строки для правильного отображения
          const lines = part.value.split('\n');
          
          return (
            <React.Fragment key={index}>
              {lines.map((line, lineIndex) => {
                // Пропускаем последнюю пустую строку, если она есть
                if (lineIndex === lines.length - 1 && line === '' && lines.length > 1) {
                  return null;
                }
                
                return (
                  <Box
                    key={`${index}-${lineIndex}`}
                    sx={{
                      display: 'flex',
                      bgcolor: bgColor,
                      color: textColor,
                      px: 1,
                      py: 0.5,
                      borderLeft: part.added || part.removed ? '3px solid' : 'none',
                      borderLeftColor: part.added ? 'success.main' : part.removed ? 'error.main' : 'transparent',
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: '20px',
                        textAlign: 'right',
                        mr: 1,
                        color: part.added || part.removed ? textColor : 'text.secondary',
                        fontWeight: part.added || part.removed ? 'bold' : 'normal',
                      }}
                    >
                      {part.added || part.removed ? prefix : ' '}
                    </Box>
                    <Box
                      component="pre"
                      sx={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                    >
                      {line || ' '}
                    </Box>
                  </Box>
                );
              })}
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  const renderDiffValue = (field: string, oldValue: any, newValue: any) => {
    const hasChanged = oldValue !== newValue;
    
    return (
      <Box>
        {hasChanged ? (
          <Stack spacing={0.5}>
            <Box
              sx={{
                p: 1,
                bgcolor: 'error.light',
                color: 'error.contrastText',
                borderRadius: 1,
                textDecoration: 'line-through',
              }}
            >
              <Typography variant="body2" component="span">
                {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: 'success.light',
                color: 'success.contrastText',
                borderRadius: 1,
                fontWeight: 'medium',
              }}
            >
              <Typography variant="body2" component="span">
                {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Box
            sx={{
              p: 1,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CompareIcon color="primary" />
          <Box>
            <Typography variant="h6">Сравнение версий</Typography>
            {comparison && (
              <Typography variant="caption" color="text.secondary">
                {comparison.templateName}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Состояние загрузки */}
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Состояние ошибки */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Ошибка при загрузке сравнения версий
          </Alert>
        )}

        {/* Результаты сравнения */}
        {!isLoading && !error && comparison && (
          <Stack spacing={3}>
            {/* Сводка изменений */}
            <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Сводка изменений
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Всего изменений
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {comparison.differences.summary.totalChangesCount}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Изменения метаданных
                    </Typography>
                    <Typography variant="h6">
                      {comparison.differences.summary.metadataChangesCount}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Изменения файла
                    </Typography>
                    <Typography variant="h6">
                      {comparison.differences.summary.fileContentChanged ? 'Да' : 'Нет'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Информация о версиях */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, border: '2px solid', borderColor: 'error.main' }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Версия {comparison.version1.version} (Старая)
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Описание изменений
                      </Typography>
                      <Typography variant="body2">
                        {comparison.version1.changes || 'Не указано'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Автор
                      </Typography>
                      <Typography variant="body2">{comparison.version1.author}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Дата создания
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(comparison.version1.createdAt), 'dd.MM.yyyy HH:mm', {
                          locale: ru,
                        })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Статус
                      </Typography>
                      <Chip
                        label={comparison.version1.status}
                        size="small"
                        color={getStatusColor(comparison.version1.status) as any}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Файл
                      </Typography>
                      <Typography variant="body2">
                        {comparison.version1.file.originalName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(comparison.version1.file.size)} • {comparison.version1.file.mimeType}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, border: '2px solid', borderColor: 'success.main' }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Версия {comparison.version2.version} (Новая)
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Описание изменений
                      </Typography>
                      <Typography variant="body2">
                        {comparison.version2.changes || 'Не указано'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Автор
                      </Typography>
                      <Typography variant="body2">{comparison.version2.author}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Дата создания
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(comparison.version2.createdAt), 'dd.MM.yyyy HH:mm', {
                          locale: ru,
                        })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Статус
                      </Typography>
                      <Chip
                        label={comparison.version2.status}
                        size="small"
                        color={getStatusColor(comparison.version2.status) as any}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Файл
                      </Typography>
                      <Typography variant="body2">
                        {comparison.version2.file.originalName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(comparison.version2.file.size)} • {comparison.version2.file.mimeType}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Вкладки для сравнения */}
            <Paper sx={{ p: 2 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Содержимое файла" />
                <Tab label="Метаданные" />
                <Tab label="Метаданные файла" />
              </Tabs>

              {/* Содержимое файла */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Сравнение содержимого файлов
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  {comparison.differences.fileContent.error && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {comparison.differences.fileContent.error}
                    </Alert>
                  )}

                  {!comparison.differences.fileContent.contentChanged ? (
                    <Alert severity="info">
                      Содержимое файлов идентично. Изменений не обнаружено.
                    </Alert>
                  ) : !comparison.differences.fileContent.isTextFile ? (
                    <Alert severity="info">
                      Файл является бинарным. Сравнение содержимого недоступно.
                      Файлы различаются по содержимому (разные checksum).
                    </Alert>
                  ) : (
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Изменения в содержимом файла (зеленый = добавлено, красный = удалено):
                        </Typography>
                        {comparison.differences.fileContent.fileType === 'office' && (
                          <Chip 
                            label="Office документ (DOCX/XLSX/PPTX)" 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 1 }}
                          />
                        )}
                        {comparison.differences.fileContent.fileType === 'pdf' && (
                          <Chip 
                            label="PDF документ" 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 1 }}
                          />
                        )}
                        {comparison.differences.fileContent.fileType === 'text' && (
                          <Chip 
                            label="Текстовый файл" 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 1 }}
                          />
                        )}
                        {comparison.differences.fileContent.fileType === 'office' && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            Сравнение Office документов: показывается извлеченный текст. 
                            Форматирование и структура могут быть упрощены.
                          </Alert>
                        )}
                        {comparison.differences.fileContent.fileType === 'pdf' && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            Сравнение PDF: показывается извлеченный текст. 
                            Форматирование, изображения и таблицы не отображаются.
                          </Alert>
                        )}
                      </Box>
                      {renderDiffContent(comparison.differences.fileContent.diff)}
                    </Box>
                  )}
                </Box>
              )}

              {/* Метаданные */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Сравнение метаданных
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  {Object.keys(comparison.differences.metadata).length === 0 ? (
                    <Alert severity="info">
                      Метаданные идентичны. Изменений не обнаружено.
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Поле</TableCell>
                            <TableCell>Значение</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(comparison.differences.metadata).map(([field, diff]) => (
                            <TableRow key={field}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {field === 'version' && 'Версия'}
                                  {field === 'changes' && 'Описание изменений'}
                                  {field === 'author' && 'Автор'}
                                  {field === 'status' && 'Статус'}
                                  {field === 'created' && 'Дата создания'}
                                  {field === 'name' && 'Название'}
                                  {field === 'description' && 'Описание'}
                                  {!['version', 'changes', 'author', 'status', 'created', 'name', 'description'].includes(field) && field}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {renderDiffValue(field, diff.old, diff.new)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Метаданные файла */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Сравнение метаданных файла
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  {Object.keys(comparison.differences.fileMetadata).length === 0 ? (
                    <Alert severity="info">
                      Метаданные файла идентичны. Изменений не обнаружено.
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Поле</TableCell>
                            <TableCell>Значение</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(comparison.differences.fileMetadata).map(([field, diff]) => (
                            <TableRow key={field}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {field === 'originalName' && 'Имя файла'}
                                  {field === 'mimeType' && 'Тип файла'}
                                  {field === 'size' && 'Размер'}
                                  {!['originalName', 'mimeType', 'size'].includes(field) && field}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {field === 'size'
                                  ? renderDiffValue(
                                      field,
                                      formatFileSize(diff.old),
                                      formatFileSize(diff.new)
                                    )
                                  : renderDiffValue(field, diff.old, diff.new)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Paper>

            {/* Сообщение если нет изменений */}
            {!comparison.differences.summary.hasChanges && (
              <Alert severity="info">
                Версии идентичны. Изменений не обнаружено.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersionComparisonDialog;
