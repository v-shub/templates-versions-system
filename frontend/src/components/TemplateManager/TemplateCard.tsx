/**
 * Single template card: title, description, metadata, tags, actions.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { Template } from '../../services/api';
import { getFileIcon, formatFileSize, getStatusColor } from './templateUtils';

export interface TemplateCardProps {
  template: Template;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, template: Template) => void;
  onDownload: (id: string) => void;
  onPreview: (template: Template) => void;
  onViewVersions: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onMenuOpen,
  onDownload,
  onPreview,
  onViewVersions,
}) => {
  const templateId = template?._id || `template-${Math.random()}`;
  const templateName = template?.name || 'Без названия';
  const templateDescription = template?.description || 'Нет описания';
  const templateCategory = template?.category || 'Не указана';
  const templateDepartment = template?.department || 'Не указан';
  const templateFile = template?.file || {};
  const templateMetadata = template?.metadata || {};
  const templateTags = template?.tags || [];

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getFileIcon(templateFile?.mimeType)} {templateName}
          </Typography>
          <IconButton size="small" onClick={(e) => onMenuOpen(e, template)}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {templateDescription.length > 100
            ? `${templateDescription.substring(0, 100)}...`
            : templateDescription}
        </Typography>

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
            onClick={() => onDownload(templateId)}
            disabled={!templateId}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Предпросмотр">
          <IconButton
            size="small"
            onClick={() => onPreview(template)}
            disabled={!templateFile?.url}
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="История версий">
          <IconButton
            size="small"
            onClick={() => onViewVersions(template)}
          >
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default TemplateCard;
