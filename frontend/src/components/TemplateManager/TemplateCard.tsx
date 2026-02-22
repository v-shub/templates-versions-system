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
        minHeight: '22rem',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'grid',
          gridTemplateRows: '3.5rem 4.5rem auto auto auto',
          gridTemplateColumns: '1fr',
          gap: '0.75rem 0',
          alignContent: 'start',
        }}
      >
        <Box
          sx={{
            gridRow: 1,
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {getFileIcon(templateFile?.mimeType)} {templateName}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => onMenuOpen(e, template)}
            sx={{ flexShrink: 0 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            gridRow: 2,
            height: '4.5rem',
            mb: 2,
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {templateDescription}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ mb: 2, gridRow: 3 }}>
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
          <Box sx={{ mb: 2, gridRow: 4 }}>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridRow: 5 }}>
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
