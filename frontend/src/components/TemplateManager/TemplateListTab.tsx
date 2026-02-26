/**
 * "All templates" tab: search bar, filters, sort, grid of TemplateCard, pagination.
 */

import React from 'react';
import {
  Box,
  Grid,
  TextField,
  InputAdornment,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  FileDownload as ExportIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { Template } from '../../services/api';
import type { useTemplateList } from './useTemplateList';
import TemplateCard from './TemplateCard';

export interface TemplateListTabProps {
  list: ReturnType<typeof useTemplateList>;
  onOpenForm: (template: Template | null) => void;
  onOpenExport: () => void;
  onSwitchToAdvancedSearch: () => void;
  onPreview: (template: Template) => void;
  onViewVersions: (template: Template) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, template: Template) => void;
}

const TemplateListTab: React.FC<TemplateListTabProps> = ({
  list,
  onOpenForm,
  onOpenExport,
  onSwitchToAdvancedSearch,
  onPreview,
  onViewVersions,
  onMenuOpen,
}) => {

  const {
    templates,
    total,
    totalPages,
    page,
    setPage,
    isLoading,
    error,
    categories,
    departments,
    searchTerm,
    selectedCategory,
    selectedDepartment,
    selectedStatus,
    shouldUseSearch,
    sortBy,
    sortOrder,
    handleSearch,
    handleSearchSubmit,
    handleClearSearch,
    handleKeyPress,
    handleSort,
    handleCategoryChange,
    handleDepartmentChange,
    handleStatusChange,
    handleDownload,
  } = list;

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );
  };

  return (
    <>
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
                        <Button size="small" onClick={handleClearSearch}>
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
            <Stack
              direction="row"
              spacing={2}
              justifyContent="flex-end"
              useFlexGap
              sx={{
                flexWrap: 'wrap',
                '& .MuiButton-root': {
                  whiteSpace: 'nowrap',
                  minWidth: 'min-content',
                },
              }}
            >
              <Button
                startIcon={<FilterListIcon />}
                onClick={onSwitchToAdvancedSearch}
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
                onClick={onOpenExport}
                variant="outlined"
              >
                Экспорт
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onOpenForm(null)}
              >
                Создать
              </Button>
            </Stack>
          </Grid>
        </Grid>

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
                {Array.isArray(categories) &&
                  categories.map((cat: any, index: number) => (
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
                {Array.isArray(departments) &&
                  departments.map((dept: any, index: number) => (
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

        {shouldUseSearch && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2">
              Режим поиска: &quot;{searchTerm}&quot; | Найдено: {total} результатов
            </Typography>
            <Button size="small" onClick={handleClearSearch} sx={{ mt: 0.5 }}>
              Вернуться к списку
            </Button>
          </Box>
        )}
      </Paper>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Ошибка: {(error as Error).message}
        </Alert>
      )}

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
                {templates.map((template: Template) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={template?._id || Math.random()}>
                    <TemplateCard
                      template={template}
                      onMenuOpen={onMenuOpen}
                      onDownload={handleDownload}
                      onPreview={onPreview}
                      onViewVersions={onViewVersions}
                    />
                  </Grid>
                ))}
              </Grid>

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
};

export default TemplateListTab;
