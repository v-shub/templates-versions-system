import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Folder as FolderIcon,
  History as HistoryIcon,
  CloudUpload as UploadIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { templateApi } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const Dashboard: React.FC = () => {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery('templateStats', templateApi.getStats);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Ошибка при загрузке статистики
      </Alert>
    );
  }

  // ТОЧНАЯ обработка данных по статусам
  const getStatusData = () => {
    if (!stats?.byStatus || typeof stats.byStatus !== 'object') {
      return [];
    }

    // Преобразуем объект в массив с правильными названиями
    const statusEntries = Object.entries(stats.byStatus);
    
    // Логируем для отладки
    console.log('Статистика по статусам:', stats.byStatus);
    console.log('Преобразованные записи:', statusEntries);

    return statusEntries.map(([statusKey, count]: [string, any]) => {
      let statusName;
      
      switch (statusKey.toLowerCase()) {
        case 'draft':
          statusName = 'Черновики';
          break;
        case 'approved':
          statusName = 'Утвержденные';
          break;
        case 'deprecated':
          statusName = 'Устаревшие';
          break;
        default:
          statusName = statusKey;
      }

      return {
        name: statusName,
        value: Number(count) || 0,
        originalKey: statusKey,
      };
    }).filter(item => item.value > 0); // Фильтруем только статусы с количеством > 0
  };

  const statusData = getStatusData();
  
  // Вычисляем общее количество для процентов
  const totalStatusCount = statusData.reduce((sum, item) => sum + item.value, 0);

  // Подготовка данных для графика с процентами
  const statusChartData = statusData.map(item => ({
    ...item,
    percentage: totalStatusCount > 0 ? 
      ((item.value / totalStatusCount) * 100).toFixed(1) : 
      '0.0',
    label: `${item.name}: ${item.value} (${totalStatusCount > 0 ? 
      ((item.value / totalStatusCount) * 100).toFixed(1) : 
      '0.0'}%)`
  }));

  // Логи для отладки
  console.log('Итоговые данные статусов:', statusChartData);
  console.log('Всего шаблонов по статусам:', totalStatusCount);

  const categoryData = stats?.byCategory || [];
  const departmentData = stats?.byDepartment || [];

  // Реальные данные активности (если есть в API)
  const getActivityData = () => {
    if (stats?.activityByMonth && Array.isArray(stats.activityByMonth)) {
      return stats.activityByMonth.map((item: any) => ({
        month: item.month,
        templates: item.newTemplates || 0,
        versions: item.newVersions || 0,
      }));
    }
    
    return [];
  };

  const activityData = getActivityData();

  // Получаем точное количество активных шаблонов
  const getApprovedCount = () => {
    if (stats?.byStatus?.approved !== undefined) {
      return Number(stats.byStatus.approved);
    }
    
    // Ищем в statusData
    const approvedItem = statusData.find(item => 
      item.originalKey.toLowerCase() === 'approved'
    );
    return approvedItem ? approvedItem.value : 0;
  };

  const approvedCount = getApprovedCount();
  const totalTemplates = stats?.totalTemplates || 0;
  const approvedPercentage = totalTemplates > 0 ? 
    Math.round((approvedCount / totalTemplates) * 100) : 0;

  return (
    <Box>
      {/* Заголовок и кнопка обновления */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="bold">
          Статистика шаблонов
        </Typography>
        <IconButton onClick={() => refetch()} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Основные метрики */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    p: 1.5,
                    borderRadius: 1,
                  }}
                >
                  <FolderIcon />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Всего шаблонов
                  </Typography>
                  <Typography variant="h4">{totalTemplates}</Typography>
                </Box>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={100}
                sx={{ mt: 2, height: 4, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                    p: 1.5,
                    borderRadius: 1,
                  }}
                >
                  <HistoryIcon />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Всего версий
                  </Typography>
                  <Typography variant="h4">{stats?.totalVersions || 0}</Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {totalTemplates > 0 ? 
                  `~${(stats.totalVersions / totalTemplates).toFixed(1)} версий на шаблон` : 
                  'Нет данных'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                    p: 1.5,
                    borderRadius: 1,
                  }}
                >
                  <UploadIcon />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Активные
                  </Typography>
                  <Typography variant="h4">{approvedCount}</Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {totalTemplates > 0 ? 
                  `${approvedPercentage}% от общего числа` : 
                  'Нет данных'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                    p: 1.5,
                    borderRadius: 1,
                  }}
                >
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Статусы
                  </Typography>
                  <Typography variant="h4">{statusData.length}</Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {statusData.map(item => item.name).join(', ')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Графики и диаграммы */}
      <Grid container spacing={3}>
        {/* Распределение по статусам */}
        {statusChartData.length > 0 ? (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Распределение по статусам
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  Всего: {totalStatusCount} шаблонов
                </Typography>
              </Typography>
              
              {/* Таблица с точными цифрами */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  {statusChartData.map((item, index) => (
                    <Grid item xs={12} key={item.originalKey}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1,
                        bgcolor: index % 2 === 0 ? 'grey.50' : 'transparent',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%',
                            bgcolor: COLORS[index % COLORS.length] 
                          }} />
                          <Typography variant="body2">{item.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {item.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.percentage}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Круговая диаграмма */}
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} шаблонов (${props.payload.percentage}%)`,
                        props.payload.name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        ) : (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Распределение по статусам
              </Typography>
              <Alert severity="warning">
                Нет данных о статусах шаблонов. Возможно, шаблоны не имеют статусов или API не возвращает эту информацию.
              </Alert>
            </Paper>
          </Grid>
        )}

        {/* Активность по месяцам - показываем только если есть данные */}
        {activityData.length > 0 ? (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Активность по месяцам
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="templates"
                      stroke="#8884d8"
                      name="Новые шаблоны"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="versions"
                      stroke="#82ca9d"
                      name="Новые версии"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        ) : (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Активность по месяцам
              </Typography>
              <Alert severity="info">
                Для отображения статистики активности требуется больше данных.
                Диаграмма появится после накопления информации о создании шаблонов и версий.
              </Alert>
            </Paper>
          </Grid>
        )}

        {/* Топ категорий */}
        {categoryData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon /> Топ категорий
              </Typography>
              <List dense>
                {categoryData.slice(0, 5).map((item: any, index: number) => (
                  <React.Fragment key={item._id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <Typography color="text.secondary">{index + 1}</Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={item._id || 'Без категории'}
                        secondary={`${item.count} шаблонов`}
                      />
                      <Box sx={{ width: 150 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(item.count / Math.max(categoryData[0]?.count, 1)) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Топ отделов */}
        {departmentData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon /> Топ отделов
              </Typography>
              <List dense>
                {departmentData.slice(0, 5).map((item: any, index: number) => (
                  <React.Fragment key={item._id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <Typography color="text.secondary">{index + 1}</Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={item._id || 'Без отдела'}
                        secondary={`${item.count} шаблонов`}
                      />
                      <Chip label={item.count} size="small" color="primary" />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Отладочная информация */}
      <Alert severity="info" sx={{ mt: 3 }}>
        Статистика обновлена: {stats?.lastUpdated ? 
          new Date(stats.lastUpdated).toLocaleString('ru-RU') : 
          new Date().toLocaleString('ru-RU')}
        {process.env.NODE_ENV === 'development' && (
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            Данные по статусам из API: {JSON.stringify(stats?.byStatus)}
          </Typography>
        )}
      </Alert>
    </Box>
  );
};

export default Dashboard;