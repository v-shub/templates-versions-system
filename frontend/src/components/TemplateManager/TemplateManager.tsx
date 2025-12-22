import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Container,
  Grid,
  TextField,
  InputAdornment,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Tag as TagIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterListIcon,
  FileDownload as ExportIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { templateApi, Template, SearchParams } from '../../services/api';
import TemplateFormDialog from './TemplateFormDialog';
import TemplateVersionHistory from './TemplateVersionHistory';
import AdvancedSearch, { ApiSearchParams } from './AdvancedSearch';
import Dashboard from './Dashboard';
import FilePreview from './FilePreview';
import ExportData from './ExportData';

interface SearchResults {
  success: boolean;
  data: Template[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  took: number;
}

interface ListResults {
  templates: Template[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const TemplateManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTriggered, setSearchTriggered] = useState(false);
  
  const queryClient = useQueryClient();
  const limit = 12;

  // Подготовка параметров для обычного запроса (без поиска)
  const listParams: SearchParams = {
    page,
    limit,
    category: selectedCategory,
    department: selectedDepartment,
    status: selectedStatus,
  };

  // Определяем, используем ли мы поиск или обычный список
  const shouldUseSearch = searchTerm.trim().length > 0 && searchTriggered;

  // Обычный запрос списка шаблонов (когда нет поискового запроса)
  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    refetch: refetchList,
  } = useQuery<ListResults>(
    ['templates', page, selectedCategory, selectedDepartment, selectedStatus],
    () => templateApi.getTemplates(listParams),
    {
      enabled: !shouldUseSearch, // Запускаем только когда НЕТ поискового запроса
      keepPreviousData: true,
      onSuccess: (data) => {
        console.log('List data received:', {
          templatesCount: data.templates?.length,
          total: data.total,
          page: page,
        });
      },
      onError: (error) => {
        console.error('List query error:', error);
      }
    }
  );

  // Запрос поиска через Elasticsearch (когда есть поисковый запрос)
  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery<SearchResults>(
    ['search', searchTerm, page, selectedCategory, selectedDepartment, selectedStatus],
    () => templateApi.searchTemplates(searchTerm, {
      category: selectedCategory,
      department: selectedDepartment,
      status: selectedStatus,
      page,
      limit,
    }),
    {
      enabled: shouldUseSearch, // Запускаем только когда ЕСТЬ поисковый запрос
      keepPreviousData: true,
      onSuccess: (data) => {
        console.log('Search results received:', {
          query: searchTerm,
          total: data.total,
          hits: data.data?.length,
          success: data.success,
          took: data.took,
        });
      },
      onError: (error) => {
        console.error('Search query error:', error);
      },
    }
  );

  // Используем данные в зависимости от режима
  const displayData = shouldUseSearch ? searchData : listData;
  const isLoading = shouldUseSearch ? isSearchLoading : isListLoading;
  const error = shouldUseSearch ? searchError : listError;

  // Преобразуем данные поиска в тот же формат, что и список
  const templates = shouldUseSearch 
    ? (searchData?.data || [])
    : (listData?.templates || []);

  const total = shouldUseSearch
    ? (searchData?.total || 0)
    : (listData?.total || 0);

  const totalPages = shouldUseSearch
    ? (searchData?.totalPages || 1)
    : (listData?.totalPages || 1);

  // Получение категорий и отделов для фильтра
  const { data: categories = [] } = useQuery('categories', templateApi.getCategories, {
    onError: (error) => console.error('Categories query error:', error)
  });
  const { data: departments = [] } = useQuery('departments', templateApi.getDepartments, {
    onError: (error) => console.error('Departments query error:', error)
  });

  // Мутация для удаления
  const deleteMutation = useMutation(
    (id: string) => templateApi.deleteTemplate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        queryClient.invalidateQueries('search');
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        console.error('Delete mutation error:', error);
      }
    }
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Search input changed:', value);
    setSearchTerm(value);
    
    // Если строка поиска пустая, сбрасываем флаг поиска
    if (value.trim().length === 0) {
      setSearchTriggered(false);
      setPage(1);
    }
  };

  const handleSearchSubmit = () => {
    if (searchTerm.trim().length > 0) {
      console.log('Search submitted:', searchTerm);
      setSearchTriggered(true);
      setPage(1);
    }
  };

  const handleClearSearch = () => {
    console.log('Clearing search');
    setSearchTerm('');
    setSearchTriggered(false);
    setPage(1);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && searchTerm.trim().length > 0) {
      event.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleAdvancedSearch = (params: ApiSearchParams) => {
    console.log('Advanced search params:', params);
    setSearchTerm(params.query || '');
    setSelectedCategory(params.category || '');
    setSelectedDepartment(params.department || '');
    setSelectedStatus(params.status || '');
    setPage(1);
    
    // Если есть поисковый запрос, активируем поиск
    if (params.query && params.query.trim().length > 0) {
      setSearchTriggered(true);
    } else {
      setSearchTriggered(false);
    }
    
    setActiveTab(0); // Переключение на вкладку "Все шаблоны"
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    setPage(1);
    // Если был активен поиск, сбрасываем его при изменении фильтров
    setSearchTriggered(false);
  };

  const handleDepartmentChange = (event: any) => {
    setSelectedDepartment(event.target.value);
    setPage(1);
    // Если был активен поиск, сбрасываем его при изменении фильтров
    setSearchTriggered(false);
  };

  const handleStatusChange = (event: any) => {
    setSelectedStatus(event.target.value);
    setPage(1);
    // Если был активен поиск, сбрасываем его при изменении фильтров
    setSearchTriggered(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: Template) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setIsFormDialogOpen(true);
    handleMenuClose();
  };

  const handleViewVersions = () => {
    setIsVersionDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
    }
  };

  const handleDownload = (id: string) => {
    window.open(templateApi.downloadTemplate(id), '_blank');
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '';
    if (mimeType.includes('pdf')) return '';
    if (mimeType.includes('word') || mimeType.includes('doc')) return '';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '';
    if (mimeType.includes('image')) return '';
    return '';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'draft': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0: // Все шаблоны
        return (
          <>
            {/* Панель управления */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Поиск шаблонов..."
                    value={searchTerm}
                    onChange={handleSearch}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" spacing={1}>
                            {searchTerm && (
                              <Button 
                                size="small" 
                                onClick={handleClearSearch}
                              >
                                Очистить
                              </Button>
                            )}
                            <Button 
                              size="small" 
                              variant="contained"
                              onClick={handleSearchSubmit}
                              disabled={searchTerm.trim().length === 0}
                            >
                              Найти
                            </Button>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      startIcon={<FilterListIcon />}
                      onClick={() => setActiveTab(1)}
                      variant="outlined"
                    >
                      Расширенный поиск
                    </Button>
                    <Tooltip title="Сортировка по имени">
                      <Button
                        startIcon={<SortIcon />}
                        endIcon={renderSortIcon('name')}
                        onClick={() => handleSort('name')}
                        variant={sortBy === 'name' ? 'contained' : 'outlined'}
                      >
                        Имя
                      </Button>
                    </Tooltip>
                    <Tooltip title="Сортировка по дате">
                      <Button
                        startIcon={<SortIcon />}
                        endIcon={renderSortIcon('lastModified')}
                        onClick={() => handleSort('lastModified')}
                        variant={sortBy === 'lastModified' ? 'contained' : 'outlined'}
                      >
                        Дата
                      </Button>
                    </Tooltip>
                    <Button
                      startIcon={<ExportIcon />}
                      onClick={() => setIsExportDialogOpen(true)}
                      variant="outlined"
                    >
                      Экспорт
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setSelectedTemplate(null);
                        setIsFormDialogOpen(true);
                      }}
                    >
                      Создать
                    </Button>
                  </Stack>
                </Grid>
              </Grid>

              {/* Быстрые фильтры */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Категория</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Категория"
                      onChange={handleCategoryChange}
                    >
                      <MenuItem value="">Все категории</MenuItem>
                      {Array.isArray(categories) && categories.map((cat: any, index: number) => (
                        <MenuItem key={cat?.id || cat || index} value={cat?.name || cat}>
                          {cat?.name || cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Отдел</InputLabel>
                    <Select
                      value={selectedDepartment}
                      label="Отдел"
                      onChange={handleDepartmentChange}
                    >
                      <MenuItem value="">Все отделы</MenuItem>
                      {Array.isArray(departments) && departments.map((dept: any, index: number) => (
                        <MenuItem key={dept?.id || dept || index} value={dept?.name || dept}>
                          {dept?.name || dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={selectedStatus}
                      label="Статус"
                      onChange={handleStatusChange}
                    >
                      <MenuItem value="">Все статусы</MenuItem>
                      <MenuItem value="draft">Черновик</MenuItem>
                      <MenuItem value="approved">Утвержден</MenuItem>
                      <MenuItem value="deprecated">Устарел</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Информация о режиме поиска */}
              {shouldUseSearch && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Режим поиска: "{searchTerm}" | Найдено: {total} результатов
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={handleClearSearch}
                    sx={{ mt: 0.5 }}
                  >
                    Вернуться к списку
                  </Button>
                </Box>
              )}
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
                Ошибка: {(error as Error).message}
              </Alert>
            )}

            {/* Сетка карточек */}
            {!isLoading && !error && (
              <>
                {templates.length === 0 ? (
                  <Alert severity="info">
                    {shouldUseSearch 
                      ? `По запросу "${searchTerm}" ничего не найдено` 
                      : 'Шаблоны не найдены. Создайте первый шаблон!'}
                  </Alert>
                ) : (
                  <>
                    <Grid container spacing={3}>
                      {templates.map((template: Template) => {
                        // Безопасное извлечение свойств
                        const templateId = template?._id || `template-${Math.random()}`;
                        const templateName = template?.name || 'Без названия';
                        const templateDescription = template?.description || 'Нет описания';
                        const templateCategory = template?.category || 'Не указана';
                        const templateDepartment = template?.department || 'Не указан';
                        const templateFile = template?.file || {};
                        const templateMetadata = template?.metadata || {};
                        const templateTags = template?.tags || [];
                        
                        return (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={templateId}>
                            <Card sx={{ 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              transition: 'transform 0.2s',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6,
                              }
                            }}>
                              <CardContent sx={{ flexGrow: 1 }}>
                                {/* Заголовок с иконкой файла */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                    {getFileIcon(templateFile?.mimeType)} {templateName}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, template)}
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </Box>

                                {/* Описание */}
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  {templateDescription.length > 100
                                    ? `${templateDescription.substring(0, 100)}...`
                                    : templateDescription}
                                </Typography>

                                {/* Метаданные */}
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CategoryIcon fontSize="small" color="action" />
                                    <Typography variant="caption">{templateCategory}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BusinessIcon fontSize="small" color="action" />
                                    <Typography variant="caption">{templateDepartment}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TagIcon fontSize="small" color="action" />
                                    <Typography variant="caption">
                                      Версия: {templateMetadata?.version || 1}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Размер: {formatFileSize(templateFile?.size)}
                                    </Typography>
                                  </Box>
                                </Stack>

                                {/* Теги */}
                                {templateTags.length > 0 && (
                                  <Box sx={{ mb: 2 }}>
                                    {templateTags.slice(0, 3).map((tag, index) => (
                                      <Chip
                                        key={tag || index}
                                        label={tag || 'тег'}
                                        size="small"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                      />
                                    ))}
                                    {templateTags.length > 3 && (
                                      <Chip
                                        label={`+${templateTags.length - 3}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                )}

                                {/* Статус и дата */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Chip
                                    label={templateMetadata?.status || 'draft'}
                                    size="small"
                                    color={getStatusColor(templateMetadata?.status) as any}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {templateMetadata?.lastModified 
                                      ? new Date(templateMetadata.lastModified).toLocaleDateString()
                                      : 'Нет даты'}
                                  </Typography>
                                </Box>
                              </CardContent>

                              <CardActions>
                                <Tooltip title="Скачать">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownload(templateId)}
                                    disabled={!templateId}
                                  >
                                    <DownloadIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Предпросмотр">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreview(template)}
                                    disabled={!templateFile?.url}
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="История версий">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setIsVersionDialogOpen(true);
                                    }}
                                  >
                                    <HistoryIcon />
                                  </IconButton>
                                </Tooltip>
                              </CardActions>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>

                    {/* Пагинация */}
                    {totalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            variant="outlined"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                          >
                            Назад
                          </Button>
                          <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                            <Typography>
                              Страница {page} из {totalPages}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                          >
                            Вперед
                          </Button>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            Всего: {total} шаблонов
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                  </>
                )}
              </>
            )}
          </>
        );
      
      case 1: // Расширенный поиск
        return (
          <AdvancedSearch 
            onSearch={handleAdvancedSearch}
          />
        );
      
      case 2: // Статистика
        return <Dashboard />;
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Управление шаблонами
        </Typography>
        <Badge 
          badgeContent={total || 0} 
          color="primary" 
          showZero
          sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
        >
          <DashboardIcon color="action" />
        </Badge>
      </Box>

      {/* Вкладки */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 60,
            }
          }}
        >
          <Tab 
            icon={<CategoryIcon />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Все шаблоны</span>
                {total > 0 && (
                  <Chip 
                    label={total} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>
            } 
          />
          <Tab icon={<FilterListIcon />} label="Расширенный поиск" />
          <Tab icon={<DashboardIcon />} label="Статистика" />
        </Tabs>
      </Paper>

      {/* Контент вкладок */}
      {renderContent()}

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleViewVersions}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          История версий
        </MenuItem>
        <MenuItem onClick={() => selectedTemplate && handleDeleteClick(selectedTemplate._id)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Диалог удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить шаблон "{selectedTemplate?.name || 'выбранный шаблон'}"?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог предпросмотра */}
      {selectedTemplate && (
        <FilePreview
          open={isPreviewDialogOpen}
          onClose={() => setIsPreviewDialogOpen(false)}
          template={selectedTemplate}
        />
      )}

      {/* Диалог формы */}
      {isFormDialogOpen && (
        <TemplateFormDialog
          open={isFormDialogOpen}
          onClose={() => setIsFormDialogOpen(false)}
          template={selectedTemplate}
        />
      )}

      {/* Диалог истории версий */}
      {isVersionDialogOpen && selectedTemplate && (
        <TemplateVersionHistory
          open={isVersionDialogOpen}
          onClose={() => setIsVersionDialogOpen(false)}
          template={selectedTemplate}
        />
      )}

      {/* Диалог экспорта */}
      <ExportData
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </Container>
  );
};

export default TemplateManager;