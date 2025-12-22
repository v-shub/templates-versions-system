import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  disabled?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    'text/plain': ['.txt'],
  },
  disabled = false,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Обработка отклоненных файлов
      rejectedFiles.forEach((rejectedFile) => {
        const error = rejectedFile.errors[0];
        if (error.code === 'file-too-large') {
          setErrors((prev) => ({
            ...prev,
            [rejectedFile.file.name]: `Файл слишком большой (макс. ${maxSize / 1024 / 1024}MB)`,
          }));
        } else if (error.code === 'file-invalid-type') {
          setErrors((prev) => ({
            ...prev,
            [rejectedFile.file.name]: 'Неподдерживаемый тип файла',
          }));
        }
      });

      // Ограничение количества файлов
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      setFiles(newFiles);
      onFilesSelected(newFiles);

      // Симуляция загрузки
      acceptedFiles.forEach((file) => {
        simulateUpload(file);
      });
    },
    [files, maxFiles, maxSize, onFilesSelected]
  );

  const simulateUpload = (file: File) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: progress,
      }));
    }, 200);
  };

  const removeFile = (fileName: string) => {
    const newFiles = files.filter((file) => file.name !== fileName);
    setFiles(newFiles);
    onFilesSelected(newFiles);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fileName];
      return newErrors;
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const clearAll = () => {
    setFiles([]);
    onFilesSelected([]);
    setErrors({});
    setUploadProgress({});
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    disabled,
    noClick: disabled,
  });

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '';
      case 'doc':
      case 'docx':
        return '';
      case 'xls':
      case 'xlsx':
        return '';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '';
      default:
        return '';
    }
  };

  return (
    <Box>
      {/* Зона перетаскивания */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'primary.50' : 'background.paper',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            backgroundColor: disabled ? 'background.paper' : 'primary.50',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon
          sx={{
            fontSize: 48,
            color: isDragActive ? 'primary.main' : 'text.secondary',
            mb: 2,
          }}
        />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          или нажмите для выбора файлов
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          sx={{ mt: 2 }}
        >
          <Chip label="PDF" size="small" variant="outlined" />
          <Chip label="DOC/DOCX" size="small" variant="outlined" />
          <Chip label="XLS/XLSX" size="small" variant="outlined" />
          <Chip label="JPG/PNG" size="small" variant="outlined" />
          <Chip label="TXT" size="small" variant="outlined" />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Максимум {maxFiles} файлов, каждый до {formatFileSize(maxSize)}
        </Typography>
      </Paper>

      {/* Список загруженных файлов */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">
              Выбранные файлы ({files.length}/{maxFiles})
            </Typography>
            <IconButton size="small" onClick={clearAll} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>

          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {files.map((file) => {
              const progress = uploadProgress[file.name] || 0;
              const error = errors[file.name];
              const isUploading = progress > 0 && progress < 100;
              const isUploaded = progress === 100;

              return (
                <Paper key={file.name} variant="outlined" sx={{ mb: 1 }}>
                  <ListItem>
                    <ListItemIcon>
                      <Typography fontSize="large">
                        {getFileIcon(file.name)}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap>
                          {file.name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" component="div">
                            {formatFileSize(file.size)}
                          </Typography>
                          {isUploading && (
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ mt: 1, height: 4, borderRadius: 2 }}
                            />
                          )}
                        </>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {error && <ErrorIcon color="error" fontSize="small" />}
                      {isUploaded && <CheckCircleIcon color="success" fontSize="small" />}
                      {isUploading && (
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}%
                        </Typography>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeFile(file.name)}
                        disabled={isUploading}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {error && (
                    <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
                      {error}
                    </Alert>
                  )}
                </Paper>
              );
            })}
          </List>

          {/* Информация о свободном месте */}
          {files.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Использовано {files.length} из {maxFiles} слотов. Общий размер:{' '}
              {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FileUploadZone;