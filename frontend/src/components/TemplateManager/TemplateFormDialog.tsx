// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
} from '@mui/material';
import { CloudUpload as UploadIcon, Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { templateApi, Template } from '../../services/api';

interface TemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  template?: Template | null;
}

const TemplateFormDialog: React.FC<TemplateFormDialogProps> = ({
  open,
  onClose,
  template,
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!template;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    department: '',
    author: '',
    status: 'draft',
    tags: [] as string[],
    changes: '',
    createVersion: false,
  });

  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Загрузка справочных данных
  const { data: categories = [] } = useQuery('categories', templateApi.getCategories);
  const { data: departments = [] } = useQuery('departments', templateApi.getDepartments);
  const { data: popularTags = [] } = useQuery('popularTags', () => 
    templateApi.getPopularTags(10)
  );

  useEffect(() => {
    if (isEditMode && template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        department: template.department,
        author: template.metadata.author,
        status: template.metadata.status,
        tags: template.tags || [],
        changes: '',
        createVersion: false,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        department: '',
        author: '',
        status: 'draft',
        tags: [],
        changes: '',
        createVersion: false,
      });
      setFile(null);
    }
    setErrors({});
  }, [template, isEditMode]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Название обязательно';
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно';
    if (!formData.category) newErrors.category = 'Выберите категорию';
    if (!formData.department) newErrors.department = 'Выберите отдел';
    if (!isEditMode && !file) newErrors.file = 'Файл обязателен';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation(
    (formDataToSend: FormData) => templateApi.createTemplate(formDataToSend),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        queryClient.invalidateQueries('categories');
        queryClient.invalidateQueries('departments');
        queryClient.invalidateQueries('popularTags');
        onClose();
      },
      onError: (error: any) => {
        console.error('Create mutation error:', error);
        console.error('Response data:', error.response?.data);
        console.error('Status:', error.response?.status);
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, formData }: { id: string; formData: FormData }) =>
      templateApi.updateTemplate(id, formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        queryClient.invalidateQueries(['template', template?._id]);
        queryClient.invalidateQueries('categories');
        queryClient.invalidateQueries('departments');
        queryClient.invalidateQueries('popularTags');
        onClose();
      },
      onError: (error: any) => {
        console.error('Update mutation error:', error);
        console.error('Response data:', error.response?.data);
        console.error('Status:', error.response?.status);
      }
    }
  );

  const handleSubmit = async () => {
    // Сбрасываем ошибки
    setErrors({});

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    try {
      console.log('=== SUBMITTING FORM ===');
      const formDataToSend = new FormData();

      // Добавляем обязательные поля в точном соответствии с сервером
      const fields = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        department: formData.department,
        author: formData.author?.trim() || 'system',
        status: formData.status || 'draft',
      };

      // Добавляем все поля
      Object.entries(fields).forEach(([key, value]) => {
        if (value) {
          formDataToSend.append(key, value);
          console.log(`Added field: ${key} = ${value}`);
        }
      });

      // Обработка тегов - сервер ожидает JSON строку
      if (formData.tags && formData.tags.length > 0) {
        // Используем JSON как в работающем примере
        const tagsJson = JSON.stringify(formData.tags);
        formDataToSend.append('tags', tagsJson);
        console.log(`Added tags: ${tagsJson}`);
      } else {
        // Если тегов нет, отправляем пустой массив
        formDataToSend.append('tags', '[]');
      }

      // Для режима редактирования добавляем изменения
      if (isEditMode) {
        if (formData.changes?.trim()) {
          formDataToSend.append('changes', formData.changes.trim());
          console.log(`Added changes: ${formData.changes.trim()}`);
        }
        if (formData.createVersion) {
          formDataToSend.append('createVersion', 'true');
          console.log('Added createVersion: true');
        }
      }

      // Добавляем файл
      if (file) {
        formDataToSend.append('file', file);
        console.log(`Added file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      } else if (!isEditMode) {
        // Для создания файл обязателен
        console.error('File is required for new template');
        setErrors({ ...errors, file: 'Файл обязателен' });
        return;
      }

      // Отладочная информация
      console.log('FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // Отправляем запрос
      if (isEditMode && template) {
        console.log(`Updating template with ID: ${template._id}`);
        updateMutation.mutate({ id: template._id, formData: formDataToSend });
      } else {
        console.log('Creating new template');
        createMutation.mutate(formDataToSend);
      }

    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Проверка размера файла (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, file: 'Файл слишком большой (макс. 10MB)' });
        return;
      }

      // Проверка типа файла
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/html',
        'text/csv',
        'application/rtf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/svg+xml',
        'application/json',
        'application/xml'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        console.warn('File type not in allowed list, checking extension');
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.html', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.json', '.xml'];
        const extension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
        
        if (!allowedExtensions.includes(extension)) {
          setErrors({ ...errors, file: `Недопустимый тип файла. Разрешены: ${allowedExtensions.join(', ')}` });
          return;
        }
      }

      setFile(selectedFile);
      if (errors.file) {
        const newErrors = { ...errors };
        delete newErrors.file;
        setErrors(newErrors);
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      event.preventDefault();
      handleAddTag();
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        {isEditMode ? 'Редактирование шаблона' : 'Создание нового шаблона'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Основная информация */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Название шаблона *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Описание *"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={!!errors.description}
              helperText={errors.description}
            />
          </Grid>

          {/* Категория и отдел */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Категория *</InputLabel>
              <Select
                value={formData.category}
                label="Категория *"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="">
                  <em>Выберите категорию</em>
                </MenuItem>
                {categories.map((cat: string) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
              {errors.category && (
                <Typography variant="caption" color="error">
                  {errors.category}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.department}>
              <InputLabel>Отдел *</InputLabel>
              <Select
                value={formData.department}
                label="Отдел *"
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <MenuItem value="">
                  <em>Выберите отдел</em>
                </MenuItem>
                {departments.map((dept: string) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
              {errors.department && (
                <Typography variant="caption" color="error">
                  {errors.department}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Автор и статус */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Автор"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Не указан"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={formData.status}
                label="Статус"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="approved">Утвержден</MenuItem>
                <MenuItem value="deprecated">Устарел</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Теги */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Теги
            </Typography>
            
            {/* Ввод новых тегов */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs>
                  <TextField
                    fullWidth
                    size="small"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите тег и нажмите Enter"
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={handleAddTag}
                          disabled={!tagInput.trim()}
                        >
                          Добавить
                        </Button>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Популярные теги */}
            {popularTags.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Популярные теги:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {popularTags.map((tagObj: any) => (
                    <Chip
                      key={tagObj.tag}
                      label={`${tagObj.tag} (${tagObj.count})`}
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (!formData.tags.includes(tagObj.tag)) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, tagObj.tag],
                          });
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Выбранные теги */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 40 }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
              {formData.tags.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Теги не добавлены
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Загрузка файла */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {isEditMode ? 'Новый файл (оставьте пустым, чтобы сохранить текущий)' : 'Файл шаблона *'}
            </Typography>
            
            <Box
              sx={{
                border: '2px dashed',
                borderColor: errors.file ? 'error.main' : 'grey.300',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                backgroundColor: 'grey.50',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'grey.100',
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              {file ? (
                <Stack alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight="medium">
                     {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Нажмите для загрузки файла
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG (макс. 10MB)
                  </Typography>
                </>
              )}
            </Box>
            {errors.file && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {errors.file}
              </Typography>
            )}
            
            {isEditMode && template && !file && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Текущий файл: {template.file.originalName}
              </Typography>
            )}
          </Grid>

          {/* Описание изменений (для редактирования) */}
          {isEditMode && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание изменений"
                value={formData.changes}
                onChange={(e) => setFormData({ ...formData, changes: e.target.value })}
                placeholder="Опишите, что было изменено..."
                multiline
                rows={2}
                helperText="Это описание будет сохранено в истории версий"
              />
            </Grid>
          )}

          {/* Создание новой версии (для редактирования) */}
          {isEditMode && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Создать новую версию?</InputLabel>
                <Select
                  value={formData.createVersion.toString()}
                  label="Создать новую версию?"
                  onChange={(e) => setFormData({ ...formData, createVersion: e.target.value === 'true' })}
                >
                  <MenuItem value="false">Нет, обновить текущую версию</MenuItem>
                  <MenuItem value="true">Да, создать новую версию</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Новая версия будет создана если: 1) загружен новый файл, 
                2) изменены важные поля (название, описание), или 3) выбран этот параметр
              </Typography>
            </Grid>
          )}
        </Grid>

        {/* Сообщения об ошибках */}
        {(createMutation.error || updateMutation.error) && (
          <Alert 
            severity="error" 
            sx={{ mt: 3 }}
            onClose={() => {
              createMutation.reset();
              updateMutation.reset();
            }}
          >
            Ошибка при сохранении шаблона
            <br />
            <Typography variant="caption">
              {createMutation.error?.message || updateMutation.error?.message}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Сохранение...' : isEditMode ? 'Обновить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFormDialog;