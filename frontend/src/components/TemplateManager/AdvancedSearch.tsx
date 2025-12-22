import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Slider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { templateApi } from '../../services/api';
import { format, subDays } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface AdvancedSearchProps {
  onSearch: (params: ApiSearchParams) => void;
  initialParams?: Partial<ApiSearchParams>;
}

interface InternalSearchParams {
  query: string;
  category: string;
  department: string;
  status: string;
  tags: string[];
  author: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  minSize: number;
  maxSize: number;
  fuzzy: boolean;
  highlight: boolean;
}

interface ApiSearchParams {
  query: string;
  category: string;
  department: string;
  status: string;
  tags: string[];
  author: string;
  dateFrom: string | null;
  dateTo: string | null;
  minSize: number;
  maxSize: number;
  fuzzy: boolean;
  highlight: boolean;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch, initialParams }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Преобразуем initialParams из API формата в internal формат
  const parseInitialParams = (params?: Partial<ApiSearchParams>): Partial<InternalSearchParams> => {
    if (!params) return {};
    
    return {
      ...params,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : null,
      dateTo: params.dateTo ? new Date(params.dateTo) : null,
    };
  };
  
  const [searchParams, setSearchParams] = useState<InternalSearchParams>({
    query: '',
    category: '',
    department: '',
    status: '',
    tags: [],
    author: '',
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
    minSize: 0,
    maxSize: 50 * 1024 * 1024,
    fuzzy: true,
    highlight: true,
    ...parseInitialParams(initialParams),
  });

  const [tagInput, setTagInput] = useState('');

  // Загрузка справочных данных
  const { data: categories = [] } = useQuery('categories', templateApi.getCategories);
  const { data: departments = [] } = useQuery('departments', templateApi.getDepartments);
  const { data: popularTags = [] } = useQuery('popularTags', () => 
    templateApi.getPopularTags(20)
  );
  
  const { data: searchSuggestions = [] } = useQuery(
    ['searchSuggestions', searchParams.query],
    () => templateApi.autocomplete(searchParams.query, 'name'),
    { 
      enabled: searchParams.query.length >= 2,
      staleTime: 30000,
    }
  );

  // Преобразование internal параметров в API параметры
  const convertToApiParams = (params: InternalSearchParams): ApiSearchParams => {
    return {
      ...params,
      dateFrom: params.dateFrom ? format(params.dateFrom, 'yyyy-MM-dd') : null,
      dateTo: params.dateTo ? format(params.dateTo, 'yyyy-MM-dd') : null,
    };
  };

  const handleSearch = () => {
    const apiParams = convertToApiParams(searchParams);
    onSearch(apiParams);
  };

  const handleClear = () => {
    const clearedParams: InternalSearchParams = {
      query: '',
      category: '',
      department: '',
      status: '',
      tags: [],
      author: '',
      dateFrom: subDays(new Date(), 30),
      dateTo: new Date(),
      minSize: 0,
      maxSize: 50 * 1024 * 1024,
      fuzzy: true,
      highlight: true,
    };
    setSearchParams(clearedParams);
    onSearch(convertToApiParams(clearedParams));
  };

  // Обработка нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleTagAdd = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !searchParams.tags.includes(trimmedTag)) {
      const newTags = [...searchParams.tags, trimmedTag];
      const updatedParams = {
        ...searchParams,
        tags: newTags,
      };
      setSearchParams(updatedParams);
      
      // Выполняем поиск после добавления тега
      setTimeout(() => {
        onSearch(convertToApiParams(updatedParams));
      }, 100);
    }
    setTagInput('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    const newTags = searchParams.tags.filter(tag => tag !== tagToRemove);
    const updatedParams = {
      ...searchParams,
      tags: newTags,
    };
    setSearchParams(updatedParams);
    
    // Выполняем поиск после удаления тега
    setTimeout(() => {
      onSearch(convertToApiParams(updatedParams));
    }, 100);
  };

  const handleQuickDate = (days: number) => {
    const dateFrom = subDays(new Date(), days);
    const updatedParams = {
      ...searchParams,
      dateFrom,
      dateTo: new Date(),
    };
    setSearchParams(updatedParams);
    
    // Выполняем поиск сразу после применения быстрой даты
    setTimeout(() => {
      onSearch(convertToApiParams(updatedParams));
    }, 100);
  };

  const handleSelectChange = (field: keyof InternalSearchParams, value: any) => {
    const updatedParams = {
      ...searchParams,
      [field]: value,
    };
    setSearchParams(updatedParams);
    
    // Для некоторых полей выполняем поиск сразу
    if (['category', 'department', 'status'].includes(field)) {
      setTimeout(() => {
        onSearch(convertToApiParams(updatedParams));
      }, 100);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Заголовок и основное поле поиска */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Расширенный поиск
          </Typography>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Основная строка поиска */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Введите поисковый запрос..."
              variant="outlined"
              value={searchParams.query}
              onChange={(e) => 
                setSearchParams({ ...searchParams, query: e.target.value })
              }
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                fullWidth
              >
                Поиск
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                startIcon={<ClearIcon />}
              >
                Очистить
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Автодополнение */}
        {searchSuggestions.length > 0 && (
          <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
            {searchSuggestions.map((suggestion: string, index: number) => (
              <Typography
                key={index}
                sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => {
                  setSearchParams({ ...searchParams, query: suggestion });
                  handleSearch();
                }}
              >
                {suggestion}
              </Typography>
            ))}
          </Paper>
        )}

        {/* Расширенные фильтры */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Базовые фильтры */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={searchParams.category}
                    label="Категория"
                    onChange={(e) => handleSelectChange('category', e.target.value)}
                  >
                    <MenuItem value="">Все категории</MenuItem>
                    {categories.map((cat: string) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Отдел</InputLabel>
                  <Select
                    value={searchParams.department}
                    label="Отдел"
                    onChange={(e) => handleSelectChange('department', e.target.value)}
                  >
                    <MenuItem value="">Все отделы</MenuItem>
                    {departments.map((dept: string) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={searchParams.status}
                    label="Статус"
                    onChange={(e) => handleSelectChange('status', e.target.value)}
                  >
                    <MenuItem value="">Все статусы</MenuItem>
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
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && tagInput.trim()) {
                            e.preventDefault();
                            handleTagAdd(tagInput.trim());
                          }
                        }}
                        placeholder="Введите тег и нажмите Enter"
                        InputProps={{
                          endAdornment: (
                            <Button
                              size="small"
                              onClick={() => handleTagAdd(tagInput.trim())}
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
                          onClick={() => handleTagAdd(tagObj.tag)}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Выбранные теги */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 40 }}>
                  {searchParams.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleTagRemove(tag)}
                      size="small"
                      color="primary"
                    />
                  ))}
                  {searchParams.tags.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Теги не выбраны
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Диапазон дат */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Дата изменения
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  {[1, 7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      size="small"
                      variant="outlined"
                      onClick={() => handleQuickDate(days)}
                    >
                      {days === 1 ? 'Сегодня' : `Последние ${days} дней`}
                    </Button>
                  ))}
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <DatePicker
                      label="От"
                      value={searchParams.dateFrom}
                      onChange={(date) => 
                        setSearchParams({ ...searchParams, dateFrom: date })
                      }
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DatePicker
                      label="До"
                      value={searchParams.dateTo}
                      onChange={(date) => 
                        setSearchParams({ ...searchParams, dateTo: date })
                      }
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Размер файла */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Размер файла: {formatFileSize(searchParams.minSize)} - {formatFileSize(searchParams.maxSize)}
                </Typography>
                <Slider
                  value={[searchParams.minSize, searchParams.maxSize]}
                  onChange={(_, newValue) => {
                    const [min, max] = newValue as number[];
                    setSearchParams({
                      ...searchParams,
                      minSize: min,
                      maxSize: max,
                    });
                  }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatFileSize(value)}
                  min={0}
                  max={100 * 1024 * 1024}
                  step={1024 * 1024}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 10 * 1024 * 1024, label: '10MB' },
                    { value: 50 * 1024 * 1024, label: '50MB' },
                    { value: 100 * 1024 * 1024, label: '100MB' },
                  ]}
                />
              </Grid>

              {/* Дополнительные опции */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Параметры поиска
                </Typography>
                <Stack direction="row" spacing={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchParams.fuzzy}
                        onChange={(e) => 
                          setSearchParams({ ...searchParams, fuzzy: e.target.checked })
                        }
                      />
                    }
                    label="Нечеткий поиск"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchParams.highlight}
                        onChange={(e) => 
                          setSearchParams({ ...searchParams, highlight: e.target.checked })
                        }
                      />
                    }
                    label="Подсветка результатов"
                  />
                </Stack>
              </Grid>

              {/* Автор */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Автор"
                  value={searchParams.author}
                  onChange={(e) => 
                    setSearchParams({ ...searchParams, author: e.target.value })
                  }
                  onKeyPress={handleKeyPress}
                  placeholder="Введите имя автора..."
                />
              </Grid>
            </Grid>

            {/* Кнопка поиска для расширенного режима */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                size="large"
                sx={{ minWidth: 200 }}
              >
                Применить фильтры
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* Быстрый просмотр выбранных фильтров */}
        {(searchParams.query || searchParams.category || searchParams.department || searchParams.tags.length > 0 || searchParams.status || searchParams.author) && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Активные фильтры:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {searchParams.query && (
                <Chip
                  label={`Поиск: ${searchParams.query}`}
                  size="small"
                  onDelete={() => {
                    setSearchParams({ ...searchParams, query: '' });
                    handleSearch();
                  }}
                />
              )}
              {searchParams.category && (
                <Chip
                  label={`Категория: ${searchParams.category}`}
                  size="small"
                  onDelete={() => {
                    setSearchParams({ ...searchParams, category: '' });
                    handleSearch();
                  }}
                />
              )}
              {searchParams.department && (
                <Chip
                  label={`Отдел: ${searchParams.department}`}
                  size="small"
                  onDelete={() => {
                    setSearchParams({ ...searchParams, department: '' });
                    handleSearch();
                  }}
                />
              )}
              {searchParams.status && (
                <Chip
                  label={`Статус: ${searchParams.status}`}
                  size="small"
                  onDelete={() => {
                    setSearchParams({ ...searchParams, status: '' });
                    handleSearch();
                  }}
                />
              )}
              {searchParams.author && (
                <Chip
                  label={`Автор: ${searchParams.author}`}
                  size="small"
                  onDelete={() => {
                    setSearchParams({ ...searchParams, author: '' });
                    handleSearch();
                  }}
                />
              )}
              {searchParams.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={`Тег: ${tag}`}
                  size="small"
                  onDelete={() => handleTagRemove(tag)}
                />
              ))}
              {searchParams.dateFrom && searchParams.dateTo && (
                <Chip
                  label={`Дата: ${format(searchParams.dateFrom, 'dd.MM.yyyy')} - ${format(searchParams.dateTo, 'dd.MM.yyyy')}`}
                  size="small"
                  onDelete={() => {
                    const clearedDates = {
                      ...searchParams,
                      dateFrom: subDays(new Date(), 30),
                      dateTo: new Date(),
                    };
                    setSearchParams(clearedDates);
                    handleSearch();
                  }}
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export type { ApiSearchParams, InternalSearchParams };
export default AdvancedSearch;