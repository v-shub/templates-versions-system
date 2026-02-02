/**
 * Custom hook for template list: list/search queries, filters, sort, pagination, and handlers.
 * Subscribes to WebSocket template-changed events for real-time updates.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { onTemplateChanged } from '../../realtime/socket';
import { templateApi, Template, SearchParams, triggerBlobDownload } from '../../services/api';
import type { ApiSearchParams } from './AdvancedSearch';

export interface SearchResults {
  success: boolean;
  data: Template[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  took: number;
}

export interface ListResults {
  templates: Template[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const LIST_LIMIT = 12;

export function useTemplateList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTriggered, setSearchTriggered] = useState(false);

  const queryClient = useQueryClient();

  // Real-time: subscribe to template-changed events and invalidate queries
  useEffect(() => {
    const unsubscribe = onTemplateChanged((payload) => {
      queryClient.invalidateQueries('templates');
      queryClient.invalidateQueries('search');
      queryClient.invalidateQueries('categories');
      queryClient.invalidateQueries('departments');
      queryClient.invalidateQueries('templateStats');
      if (payload.templateId) {
        queryClient.invalidateQueries(['templateVersions', payload.templateId]);
        queryClient.invalidateQueries(['template', payload.templateId]);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const listParams: SearchParams = {
    page,
    limit: LIST_LIMIT,
    category: selectedCategory,
    department: selectedDepartment,
    status: selectedStatus,
    sortBy,
    sortOrder,
  };

  const shouldUseSearch = searchTerm.trim().length > 0 && searchTriggered;

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
  } = useQuery<ListResults>(
    ['templates', page, selectedCategory, selectedDepartment, selectedStatus, sortBy, sortOrder],
    () => templateApi.getTemplates(listParams),
    {
      enabled: !shouldUseSearch,
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
      },
    }
  );

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery<SearchResults>(
    ['search', searchTerm, page, selectedCategory, selectedDepartment, selectedStatus],
    () =>
      templateApi.searchTemplates(searchTerm, {
        category: selectedCategory,
        department: selectedDepartment,
        status: selectedStatus,
        page,
        limit: LIST_LIMIT,
      }),
    {
      enabled: shouldUseSearch,
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

  const templates = shouldUseSearch
    ? (searchData?.data || [])
    : (listData?.templates || []);
  const total = shouldUseSearch
    ? (searchData?.total || 0)
    : (listData?.total || 0);
  const totalPages = shouldUseSearch
    ? (searchData?.totalPages || 1)
    : (listData?.totalPages || 1);
  const isLoading = shouldUseSearch ? isSearchLoading : isListLoading;
  const error = shouldUseSearch ? searchError : listError;

  const { data: categories = [] } = useQuery('categories', templateApi.getCategories, {
    onError: (error) => console.error('Categories query error:', error),
  });
  const { data: departments = [] } = useQuery('departments', templateApi.getDepartments, {
    onError: (error) => console.error('Departments query error:', error),
  });

  const deleteMutation = useMutation(
    (id: string) => templateApi.deleteTemplate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        queryClient.invalidateQueries('search');
      },
      onError: (error) => {
        console.error('Delete mutation error:', error);
      },
    }
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Search input changed:', value);
    setSearchTerm(value);
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
    if (params.query && params.query.trim().length > 0) {
      setSearchTriggered(true);
    } else {
      setSearchTriggered(false);
    }
  };

  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    setPage(1);
    setSearchTriggered(false);
  };

  const handleDepartmentChange = (event: any) => {
    setSelectedDepartment(event.target.value);
    setPage(1);
    setSearchTriggered(false);
  };

  const handleStatusChange = (event: any) => {
    setSelectedStatus(event.target.value);
    setPage(1);
    setSearchTriggered(false);
  };

  const handleDownload = async (id: string) => {
    try {
      const { blob, filename } = await templateApi.fetchDownloadBlob(id);
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return {
    // Data
    templates,
    total,
    totalPages,
    page,
    setPage,
    isLoading,
    error,
    categories,
    departments,
    // Search & filters
    searchTerm,
    selectedCategory,
    selectedDepartment,
    selectedStatus,
    shouldUseSearch,
    sortBy,
    sortOrder,
    // Handlers
    handleSearch,
    handleSearchSubmit,
    handleClearSearch,
    handleKeyPress,
    handleSort,
    handleAdvancedSearch,
    handleCategoryChange,
    handleDepartmentChange,
    handleStatusChange,
    handleDownload,
    deleteMutation,
  };
}
