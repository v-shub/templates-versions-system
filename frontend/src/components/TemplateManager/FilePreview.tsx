import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Image as ImageIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import { templateApi, Template } from '../../services/api';

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  template: Template;
}

const FilePreview: React.FC<FilePreviewProps> = ({ open, onClose, template }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && template) {
      loadPreview();
    }
  }, [open, template]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = templateApi.previewTemplate(template._id);
      
      // Проверяем доступность предпросмотра
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('Предпросмотр недоступен для этого типа файла');
      }

      setPreviewUrl(url);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке предпросмотра');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    const mimeType = template.file.mimeType.toLowerCase();
    if (mimeType.includes('pdf')) return <PdfIcon fontSize="large" color="error" />;
    if (mimeType.includes('word') || mimeType.includes('doc')) return <DocIcon fontSize="large" color="info" />;
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return <DocIcon fontSize="large" color="success" />;
    if (mimeType.includes('image')) return <ImageIcon fontSize="large" color="primary" />;
    if (mimeType.includes('text')) return <TextIcon fontSize="large" color="secondary" />;
    return <DocIcon fontSize="large" />;
  };

  const getPreviewContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    const mimeType = template.file.mimeType.toLowerCase();

    if (mimeType.includes('pdf')) {
      return (
        <Box sx={{ height: '70vh', width: '100%' }}>
          <iframe
            src={previewUrl || ''}
            title={template.name}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </Box>
      );
    }

    if (mimeType.includes('image')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <img
            src={previewUrl || ''}
            alt={template.name}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              transform: `scale(${scale})`,
              transition: 'transform 0.2s',
            }}
          />
        </Box>
      );
    }

    if (mimeType.includes('text')) {
      return (
        <Box sx={{ height: '70vh', overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
          <pre style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {loading ? 'Загрузка...' : 'Текстовый предпросмотр'}
          </pre>
        </Box>
      );
    }

    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Предпросмотр недоступен для этого типа файла. Скачайте файл для просмотра.
      </Alert>
    );
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const handleDownload = () => {
    window.open(templateApi.downloadTemplate(template._id), '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={fullscreen}
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getFileIcon()}
          <Box>
            <Typography variant="h6">{template.name}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip label={template.category} size="small" />
              <Chip label={`v${template.metadata.version}`} size="small" color="primary" />
              <Chip label={formatFileSize(template.file.size)} size="small" variant="outlined" />
            </Stack>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleDownload} size="small" title="Скачать">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={() => setFullscreen(!fullscreen)} size="small" title="Полный экран">
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Панель инструментов */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            gap: 1,
            bgcolor: 'background.paper',
            p: 1,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<ZoomOutIcon />}
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            -
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleResetZoom}
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ZoomInIcon />}
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            +
          </Button>
        </Box>

        {/* Контент предпросмотра */}
        {getPreviewContent()}
      </DialogContent>

      {/* Информация о файле */}
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          Тип файла: {template.file.mimeType} | 
          Последнее изменение: {new Date(template.metadata.lastModified).toLocaleDateString()} | 
          Автор: {template.metadata.author}
        </Typography>
      </Box>
    </Dialog>
  );
};

export default FilePreview;