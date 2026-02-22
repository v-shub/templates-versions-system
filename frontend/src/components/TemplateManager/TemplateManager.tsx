import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Badge,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Category as CategoryIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Template } from '../../services/api';
import { templateApi } from '../../services/api';
import TemplateFormDialog from './TemplateFormDialog';
import TemplateVersionHistory from './TemplateVersionHistory';
import AdvancedSearch from './AdvancedSearch';
import Dashboard from './Dashboard';
import FilePreview from './FilePreview';
import ExportData from './ExportData';
import TemplateListTab from './TemplateListTab';
import { useTemplateList } from './useTemplateList';

const TemplateManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const list = useTemplateList();
  const { total, deleteMutation } = list;

  const handleAdvancedSearchWithTab = (params: Parameters<typeof list.handleAdvancedSearch>[0]) => {
    list.handleAdvancedSearch(params);
    setActiveTab(0);
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
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
      deleteMutation.mutate(templateToDelete, {
        onSuccess: () => setDeleteDialogOpen(false),
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <TemplateListTab
            list={list}
            onOpenForm={(template) => {
              setSelectedTemplate(template);
              setIsFormDialogOpen(true);
            }}
            onOpenExport={() => setIsExportDialogOpen(true)}
            onSwitchToAdvancedSearch={() => setActiveTab(1)}
            onPreview={handlePreview}
            onViewVersions={(template) => {
              setSelectedTemplate(template);
              setIsVersionDialogOpen(true);
            }}
            onMenuOpen={handleMenuOpen}
          />
        );
      case 1:
        return <AdvancedSearch onSearch={handleAdvancedSearchWithTab} />;
      case 2:
        return <Dashboard />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight={700} color="primary.main">
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

      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue: number) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { minHeight: 56 },
            '& .Mui-selected': { color: 'primary.main', fontWeight: 600 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
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

      {renderContent()}

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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить шаблон &quot;{selectedTemplate?.name || 'выбранный шаблон'}&quot;?
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

      {selectedTemplate && (
        <FilePreview
          open={isPreviewDialogOpen}
          onClose={() => setIsPreviewDialogOpen(false)}
          template={selectedTemplate}
        />
      )}

      {isFormDialogOpen && (
        <TemplateFormDialog
          open={isFormDialogOpen}
          onClose={() => setIsFormDialogOpen(false)}
          template={selectedTemplate}
        />
      )}

      {isVersionDialogOpen && selectedTemplate && (
        <TemplateVersionHistory
          open={isVersionDialogOpen}
          onClose={() => setIsVersionDialogOpen(false)}
          template={selectedTemplate}
          onTemplateUpdated={setSelectedTemplate}
        />
      )}

      <ExportData
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </Container>
  );
};

export default TemplateManager;
