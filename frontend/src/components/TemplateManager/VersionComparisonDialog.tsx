// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from 'react-query';
import * as Diff from 'diff';
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
  Tabs,
  Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
      fileType1?: 'text' | 'office' | 'pdf' | null;
      fileType2?: 'text' | 'office' | 'pdf' | null;
      diff: DiffPart[] | null;
      text1: string | null;
      text2: string | null;
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
  const [v1Preview, setV1Preview] = useState<{ url?: string; html?: string } | null>(null);
  const [v2Preview, setV2Preview] = useState<{ url?: string; html?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const {
    data: comparison,
    isLoading,
    error,
  } = useQuery<ComparisonResult>(
    ['compareVersions', templateId, version1._id, version2._id],
    () => templateApi.compareVersions(templateId, version1._id, version2._id),
    {
      enabled: open && !!version1 && !!version2,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const fcContent = comparison?.differences?.fileContent;
  const hasContentError = Boolean(fcContent?.error);
  const fileType = fcContent?.fileType;
  const fileType1 = fcContent?.fileType1 ?? fileType;
  const fileType2 = fcContent?.fileType2 ?? fileType;
  const differentFileTypes =
    fileType1 != null && fileType2 != null && fileType1 !== fileType2;
  const showPreviews =
    !hasContentError &&
    (fileType === 'pdf' ||
      fileType === 'office' ||
      fileType1 === 'pdf' ||
      fileType1 === 'office' ||
      fileType2 === 'pdf' ||
      fileType2 === 'office');

  useEffect(() => {
    if (!open || !comparison || !showPreviews) {
      setV1Preview(null);
      setV2Preview(null);
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setV1Preview(null);
    setV2Preview(null);
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];

    (async () => {
      try {
        const [p1, p2] = await Promise.all([
          templateApi.fetchVersionPreviewBlob(templateId, version1._id),
          templateApi.fetchVersionPreviewBlob(templateId, version2._id),
        ]);
        if (cancelled) return;
        if (p1.contentType.includes('text/html') && p2.contentType.includes('text/html')) {
          const [html1, html2] = await Promise.all([p1.blob.text(), p2.blob.text()]);
          if (cancelled) return;
          setV1Preview({ html: html1 });
          setV2Preview({ html: html2 });
        } else {
          const u1 = URL.createObjectURL(p1.blob);
          const u2 = URL.createObjectURL(p2.blob);
          blobUrlsRef.current = [u1, u2];
          setV1Preview({ url: u1 });
          setV2Preview({ url: u2 });
        }
      } catch {
        if (!cancelled) {
          setV1Preview(null);
          setV2Preview(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, comparison, showPreviews, templateId, version1._id, version2._id]);

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

  const diffPreviewSx = {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    overflow: 'auto' as const,
    p: 2,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    minHeight: 280,
    height: '50vh',
  };

  /** Word segmenter for diff (supports Cyrillic etc.). Library default treats non-Latin as single chars. */
  const diffWordsOptions = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const segmenter = new Intl.Segmenter('ru', { granularity: 'word' });
        return { intlSegmenter: segmenter };
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, []);

  /** Get text for word diff: use text1/text2 from API, or reconstruct from line diff when missing */
  const getTextForWordDiff = () => {
    const fc = comparison?.differences?.fileContent;
    if (!fc) return { text1: '', text2: '' };
    let t1 = fc.text1;
    let t2 = fc.text2;
    // Reconstruct from line diff if API didn't send text1/text2 (e.g. cached response)
    if ((t1 == null || t1 === '') && (t2 == null || t2 === '') && fc.diff?.length) {
      t1 = fc.diff.filter((p: DiffPart) => !p.added).map((p: DiffPart) => p.value ?? '').join('');
      t2 = fc.diff.filter((p: DiffPart) => !p.removed).map((p: DiffPart) => p.value ?? '').join('');
    }
    return { text1: String(t1 ?? ''), text2: String(t2 ?? '') };
  };

  /** Left column: version preview = text with removals highlighted (red), by word. */
  const renderLeftPreview = (text1: string | null, text2: string | null) => {
    const t1 = text1 ?? '';
    const t2 = text2 ?? '';
    const parts = Diff.diffWords(t1, t2, diffWordsOptions);
    const hasContent = parts.some((p) => p.value.length > 0);
    return (
      <Paper variant="outlined" sx={diffPreviewSx}>
        {hasContent ? (
          parts.map((part, i) => {
            if (part.added) return null;
            return (
              <Box
                key={i}
                component="span"
                sx={{
                  bgcolor: part.removed ? (theme) => alpha(theme.palette.error.main, 0.28) : 'transparent',
                  color: 'text.primary',
                }}
              >
                {part.value}
              </Box>
            );
          })
        ) : (
          <Typography color="text.secondary">Текст для сравнения недоступен.</Typography>
        )}
      </Paper>
    );
  };

  /** Right column: version preview = text with additions highlighted (green), by word. */
  const renderRightPreview = (text1: string | null, text2: string | null) => {
    const t1 = text1 ?? '';
    const t2 = text2 ?? '';
    const parts = Diff.diffWords(t1, t2, diffWordsOptions);
    const hasContent = parts.some((p) => p.value.length > 0);
    return (
      <Paper variant="outlined" sx={diffPreviewSx}>
        {hasContent ? (
          parts.map((part, i) => {
            if (part.removed) return null;
            return (
              <Box
                key={i}
                component="span"
                sx={{
                  bgcolor: part.added ? (theme) => alpha(theme.palette.success.main, 0.40) : 'transparent',
                  color: 'text.primary',
                }}
              >
                {part.value}
              </Box>
            );
          })
        ) : (
          <Typography color="text.secondary">Текст для сравнения недоступен.</Typography>
        )}
      </Paper>
    );
  };

  /** Fallback: render line-based diff when we have diff array but no text1/text2 (e.g. from cache). */
  const renderLineDiffFallback = () => {
    const fc = comparison?.differences?.fileContent;
    const diff = fc?.diff;
    if (!diff?.length) return null;
    return (
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" gutterBottom>Версия {comparison?.version1?.version}</Typography>
          <Paper variant="outlined" sx={{ ...diffPreviewSx, bgcolor: 'grey.50' }}>
            <Box component="pre" sx={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
              {diff.filter((p: DiffPart) => !p.added).map((p: DiffPart, i) => (
                <Box
                  key={i}
                  component="span"
                  sx={{
                    bgcolor: p.removed ? (theme) => alpha(theme.palette.error.main, 0.28) : 'transparent',
                    color: 'text.primary',
                  }}
                >
                  {p.value ?? ''}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" gutterBottom>Версия {comparison?.version2?.version}</Typography>
          <Paper variant="outlined" sx={{ ...diffPreviewSx, bgcolor: 'grey.50' }}>
            <Box component="pre" sx={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
              {diff.filter((p: DiffPart) => !p.removed).map((p: DiffPart, i) => (
                <Box
                  key={i}
                  component="span"
                  sx={{
                    bgcolor: p.added ? (theme) => alpha(theme.palette.success.main, 0.40) : 'transparent',
                    color: 'text.primary',
                  }}
                >
                  {p.value ?? ''}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
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

            {/* Вкладки: Содержимое файла | Метаданные */}
            <Paper sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Содержимое файла" />
                <Tab label="Метаданные" />
              </Tabs>

              {/* Содержимое: при ошибке (файл не найден и т.п.) — только одно сообщение, без лишних предупреждений и пустых областей */}
              {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  {comparison.differences.fileContent.error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {comparison.differences.fileContent.error}
                    </Alert>
                  ) : (
                    <>
                      {!comparison.differences.fileContent.contentChanged && (
                        <Alert severity="info" sx={{ mb: 2 }}>Содержимое файлов идентично.</Alert>
                      )}

                      {comparison.differences.fileContent.contentChanged && differentFileTypes && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Сравнение разных форматов: {comparison.version1.file.originalName} ({comparison.version1.file.mimeType}) и {comparison.version2.file.originalName} ({comparison.version2.file.mimeType}). Показан извлечённый текст для сравнения.
                        </Alert>
                      )}

                      {comparison.differences.fileContent.contentChanged && !comparison.differences.fileContent.isTextFile && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Файл бинарный. Сравнение по содержимому недоступно.
                        </Alert>
                      )}

                      {comparison.differences.fileContent.contentChanged && comparison.differences.fileContent.isTextFile && (() => {
                        const { text1, text2 } = getTextForWordDiff();
                        const hasText = text1.length > 0 || text2.length > 0;
                        const hasDiff = (comparison.differences.fileContent.diff?.length ?? 0) > 0;
                        if (!hasText && hasDiff) {
                          return renderLineDiffFallback();
                        }
                        return (
                          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="subtitle2" gutterBottom>Версия {comparison.version1.version}</Typography>
                              {renderLeftPreview(text1 || null, text2 || null)}
                            </Grid>
                            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="subtitle2" gutterBottom>Версия {comparison.version2.version}</Typography>
                              {renderRightPreview(text1 || null, text2 || null)}
                            </Grid>
                          </Grid>
                        );
                      })()}

                      {comparison.differences.fileContent.contentChanged && (!comparison.differences.fileContent.isTextFile || differentFileTypes) && showPreviews && (
                        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Версия {comparison.version1.version}
                              {differentFileTypes && ` (${comparison.version1.file.originalName})`}
                            </Typography>
                            <Paper variant="outlined" sx={{ minHeight: 280, height: '50vh', overflow: 'hidden' }}>
                              {previewLoading && <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>}
                              {v1Preview?.url && <iframe src={v1Preview.url} title="v1" style={{ width: '100%', height: '100%', border: 'none' }} />}
                              {v1Preview?.html && <iframe srcDoc={v1Preview.html} title="v1" sandbox="allow-same-origin" style={{ width: '100%', height: '100%', border: 'none' }} />}
                              {!v1Preview && !previewLoading && <Box p={2} color="text.secondary">Нет предпросмотра</Box>}
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Версия {comparison.version2.version}
                              {differentFileTypes && ` (${comparison.version2.file.originalName})`}
                            </Typography>
                            <Paper variant="outlined" sx={{ minHeight: 280, height: '50vh', overflow: 'hidden' }}>
                              {previewLoading && <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>}
                              {v2Preview?.url && <iframe src={v2Preview.url} title="v2" style={{ width: '100%', height: '100%', border: 'none' }} />}
                              {v2Preview?.html && <iframe srcDoc={v2Preview.html} title="v2" sandbox="allow-same-origin" style={{ width: '100%', height: '100%', border: 'none' }} />}
                              {!v2Preview && !previewLoading && <Box p={2} color="text.secondary">Нет предпросмотра</Box>}
                            </Paper>
                          </Grid>
                        </Grid>
                      )}
                    </>
                  )}
                </Box>
              )}

              {/* Метаданные: две карточки версий (как раньше вверху окна) */}
              {activeTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, border: '2px solid', borderColor: 'error.main' }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Версия {comparison.version1.version} (Старая)
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Описание изменений</Typography>
                          <Typography variant="body2">{comparison.version1.changes || 'Не указано'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Автор</Typography>
                          <Typography variant="body2">{comparison.version1.author}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Дата создания</Typography>
                          <Typography variant="body2">
                            {format(new Date(comparison.version1.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Статус</Typography>
                          <Chip
                            label={comparison.version1.status}
                            size="small"
                            color={getStatusColor(comparison.version1.status) as any}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Файл</Typography>
                          <Typography variant="body2">{comparison.version1.file.originalName}</Typography>
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
                          <Typography variant="caption" color="text.secondary">Описание изменений</Typography>
                          <Typography variant="body2">{comparison.version2.changes || 'Не указано'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Автор</Typography>
                          <Typography variant="body2">{comparison.version2.author}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Дата создания</Typography>
                          <Typography variant="body2">
                            {format(new Date(comparison.version2.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Статус</Typography>
                          <Chip
                            label={comparison.version2.status}
                            size="small"
                            color={getStatusColor(comparison.version2.status) as any}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Файл</Typography>
                          <Typography variant="body2">{comparison.version2.file.originalName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(comparison.version2.file.size)} • {comparison.version2.file.mimeType}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
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
