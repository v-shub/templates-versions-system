import React, { useState } from 'react';
import { IconButton } from '@mui/material';
import { useQuery } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Box,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  TextFields as CsvIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { templateApi } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

interface ExportDataProps {
  open: boolean;
  onClose: () => void;
}

const ExportData: React.FC<ExportDataProps> = ({ open, onClose }) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [includeFields, setIncludeFields] = useState<string[]>([
    'name',
    'description',
    'category',
    'department',
    'tags',
    'status',
    'version',
    'author',
    'lastModified',
  ]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [fileName, setFileName] = useState(`templates_${format(new Date(), 'yyyy-MM-dd')}`);
  const [isExporting, setIsExporting] = useState(false);

  // Загрузка шаблонов для экспорта
  const { data: templates, isLoading } = useQuery(
    'templatesForExport',
    () => templateApi.getTemplates({ limit: 1000 }),
    { enabled: open }
  );

  const availableFields = [
    { id: 'name', label: 'Название' },
    { id: 'description', label: 'Описание' },
    { id: 'category', label: 'Категория' },
    { id: 'department', label: 'Отдел' },
    { id: 'tags', label: 'Теги' },
    { id: 'file.originalName', label: 'Имя файла' },
    { id: 'file.mimeType', label: 'Тип файла' },
    { id: 'file.size', label: 'Размер файла' },
    { id: 'metadata.author', label: 'Автор' },
    { id: 'metadata.version', label: 'Версия' },
    { id: 'metadata.status', label: 'Статус' },
    { id: 'metadata.lastModified', label: 'Дата изменения' },
    { id: 'createdAt', label: 'Дата создания' },
    { id: 'updatedAt', label: 'Дата обновления' },
  ];

  const handleFieldToggle = (fieldId: string) => {
    setIncludeFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    if (includeFields.length === availableFields.length) {
      setIncludeFields([]);
    } else {
      setIncludeFields(availableFields.map((field) => field.id));
    }
  };

  const exportToExcel = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Шаблоны');
    
    // Настройка стилей колонок
    const wscols = availableFields
      .filter((field) => includeFields.includes(field.id))
      .map(() => ({ wch: 20 })); // Ширина колонок
    worksheet['!cols'] = wscols;

    // Добавление заголовка
    const title = `Экспорт шаблонов - ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
    XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A2' });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${fileName}.xlsx`);
  };

  const exportToCSV = (data: any[]) => {
    const csvContent = [
      // Заголовок
      availableFields
        .filter((field) => includeFields.includes(field.id))
        .map((field) => field.label)
        .join(','),
      // Данные
      ...data.map((item) =>
        availableFields
          .filter((field) => includeFields.includes(field.id))
          .map((field) => {
            const value = getNestedValue(item, field.id);
            // Экранирование запятых и кавычек
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName}.csv`);
  };

  const exportToPDF = async (data: any[]) => {
    // Для PDF используем jsPDF (нужно установить дополнительно)
    // Это упрощенная версия - в реальном проекте используйте jsPDF с автопереносом текста
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Заголовок
    doc.setFontSize(16);
    doc.text('Экспорт шаблонов', 14, 15);
    doc.setFontSize(10);
    doc.text(`Дата экспорта: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 22);
    
    // Таблица
    const headers = availableFields
      .filter((field) => includeFields.includes(field.id))
      .map((field) => field.label);
    
    const rows = data.map((item) =>
      availableFields
        .filter((field) => includeFields.includes(field.id))
        .map((field) => {
          const value = getNestedValue(item, field.id);
          return value !== undefined && value !== null ? String(value) : '';
        })
    );

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${fileName}.pdf`);
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const handleExport = async () => {
    if (!templates?.templates) return;

    try {
      setIsExporting(true);

      // Фильтрация данных
      let dataToExport = templates.templates;
      
      if (dateRange.start && dateRange.end) {
        dataToExport = dataToExport.filter((template: any) => {
          const lastModified = new Date(template.metadata.lastModified);
          return lastModified >= dateRange.start! && lastModified <= dateRange.end!;
        });
      }

      // Подготовка данных
      const preparedData = dataToExport.map((template: any) => {
        const row: Record<string, any> = {};
        availableFields.forEach((field) => {
          if (includeFields.includes(field.id)) {
            row[field.label] = getNestedValue(template, field.id);
          }
        });
        return row;
      });

      // Экспорт в выбранном формате
      switch (exportFormat) {
        case 'excel':
          exportToExcel(preparedData);
          break;
        case 'csv':
          exportToCSV(preparedData);
          break;
        case 'pdf':
          await exportToPDF(preparedData);
          break;
      }

      // Закрытие диалога с задержкой
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileDownloadIcon color="primary" />
          <Typography variant="h6">Экспорт данных</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isExporting}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Формат экспорта */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Формат экспорта</FormLabel>
              <RadioGroup
                row
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
              >
                <FormControlLabel
                  value="excel"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ExcelIcon color="success" />
                      <span>Excel (XLSX)</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="csv"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CsvIcon color="info" />
                      <span>CSV</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="pdf"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PdfIcon color="error" />
                      <span>PDF</span>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Область экспорта */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Область экспорта</FormLabel>
              <RadioGroup
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as any)}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio />}
                  label="Все шаблоны"
                />
                <FormControlLabel
                  value="filtered"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon fontSize="small" />
                      <span>Текущие фильтры</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="selected"
                  control={<Radio />}
                  label="Выбранные шаблоны"
                  disabled
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Диапазон дат */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Диапазон дат
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="От"
                  value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      start: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="До"
                  value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      end: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Поля для экспорта */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2">Поля для экспорта</Typography>
              <Button size="small" onClick={handleSelectAllFields}>
                {includeFields.length === availableFields.length ? 'Снять все' : 'Выбрать все'}
              </Button>
            </Box>
            <Box sx={{ maxHeight: 200, overflow: 'auto', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Grid container spacing={1}>
                {availableFields.map((field) => (
                  <Grid item xs={12} sm={6} key={field.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeFields.includes(field.id)}
                          onChange={() => handleFieldToggle(field.id)}
                          size="small"
                        />
                      }
                      label={field.label}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Выбрано {includeFields.length} из {availableFields.length} полей
            </Typography>
          </Grid>

          {/* Имя файла */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Имя файла"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              helperText="Без расширения (.xlsx, .csv, .pdf добавится автоматически)"
            />
          </Grid>

          {/* Информация */}
          <Grid item xs={12}>
            {isLoading ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography variant="body2">Загрузка данных для экспорта...</Typography>
              </Box>
            ) : (
              <Alert severity="info">
                Будет экспортировано {templates?.templates?.length || 0} шаблонов. 
                Приблизительный размер файла: ~{Math.round((templates?.templates?.length || 0) * 2)}KB
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Отмена
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          disabled={isExporting || isLoading || includeFields.length === 0}
        >
          {isExporting ? 'Экспорт...' : 'Экспортировать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportData;