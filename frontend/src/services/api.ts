import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Базовый клиент для обычных запросов
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Специальный клиент для multipart/form-data (загрузка файлов)
const multipartClient = axios.create({
  baseURL: API_BASE_URL,
});

// Интерфейсы
export interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  department: string;
  tags: string[];
  file: {
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  metadata: {
    author: string;
    version: number;
    status: 'draft' | 'approved' | 'deprecated';
    lastModified: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  success: boolean;
  data: Template[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  took: number;
}

export interface TemplateVersion {
  _id: string;
  templateId: string;
  version: number;
  changes: string;
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  metadata: {
    author: string;
    status: string;
    created: Date;
  };
}

export interface TemplatesResponse {
  templates: Template[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  department?: string;
  status?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  type: string;
}

// Вспомогательная функция для логирования FormData (без итераторов)
const logFormData = (formData: FormData, action: string) => {
  console.log(`API: ${action} with FormData`);
  
  // Альтернативный способ без итераторов
  if (formData instanceof FormData) {
    // Проверяем наличие стандартных полей
    const name = formData.get('name');
    const description = formData.get('description');
    const category = formData.get('category');
    const department = formData.get('department');
    const author = formData.get('author');
    const status = formData.get('status');
    const tags = formData.get('tags');
    const file = formData.get('file');
    
    if (name) console.log(`name: ${name}`);
    if (description) console.log(`description: ${description}`);
    if (category) console.log(`category: ${category}`);
    if (department) console.log(`department: ${department}`);
    if (author) console.log(`author: ${author}`);
    if (status) console.log(`status: ${status}`);
    if (tags) console.log(`tags: ${tags}`);
    
    if (file instanceof File) {
      console.log(`file: File - ${file.name}, ${file.size} bytes, ${file.type}`);
    } else if (file) {
      console.log(`file: ${file}`);
    }
  }
};

// API методы
export const templateApi = {
  // Получение списка шаблонов
  getTemplates: async (params: SearchParams = {}) => {
    const response = await apiClient.get('/templates', {
      params: {
        page: params.page || 1,
        limit: params.limit || 12,
        category: params.category,
        department: params.department,
        status: params.status,
        q: params.search,
      },
    });
    return response.data;
  },

  // Поиск шаблонов
  searchTemplates: async (query: string, filters?: any) => {
  const response = await apiClient.get('/templates/search', {
    params: {
      q: query,  // Это правильно
      category: filters?.category,
      department: filters?.department,
      status: filters?.status,
      page: filters?.page,
      limit: filters?.limit
    },
  });
  return response.data;
},

  // Расширенный поиск
  searchTemplatesEnhanced: async (query: string, options?: any) => {
    const response = await apiClient.get('/templates/search/enhanced', {
      params: {
        q: query,
        ...options,
      },
    });
    return response.data;
  },

  // Получение одного шаблона
  getTemplate: async (id: string) => {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  // Создание шаблона - ИСПРАВЛЕННАЯ ВЕРСИЯ
  createTemplate: async (formData: FormData) => {
    logFormData(formData, 'Creating template');
    
    const response = await multipartClient.post('/templates', formData, {
      // Не указываем headers - браузер сам установит правильные
    });
    return response.data;
  },

  // Обновление шаблона - ИСПРАВЛЕННАЯ ВЕРСИЯ
  updateTemplate: async (id: string, formData: FormData) => {
    logFormData(formData, `Updating template ${id}`);
    
    const response = await multipartClient.put(`/templates/${id}`, formData);
    return response.data;
  },

  // Удаление шаблона
  deleteTemplate: async (id: string) => {
    const response = await apiClient.delete(`/templates/${id}`);
    return response.data;
  },

  // Получение версий
  getTemplateVersions: async (templateId: string, page?: number, limit?: number) => {
    const response = await apiClient.get(`/templates/${templateId}/versions`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Восстановление версии
  restoreVersion: async (templateId: string, versionId: string) => {
    const response = await apiClient.post(`/templates/${templateId}/versions/${versionId}/restore`);
    return response.data;
  },

  // Получение метаданных
  getTemplateMetadata: async (id: string) => {
    const response = await apiClient.get(`/templates/${id}/metadata`);
    return response.data;
  },

  // Обновление статуса
  updateTemplateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/templates/${id}/status`, { status });
    return response.data;
  },

  // Получение категорий
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  // Получение отделов
  getDepartments: async () => {
    const response = await apiClient.get('/departments');
    return response.data;
  },

  // Получение популярных тегов
  getPopularTags: async (limit?: number) => {
    const response = await apiClient.get('/tags', { params: { limit } });
    return response.data;
  },

  // Получение статистики
  getStats: async () => {
    const response = await apiClient.get('/templates/stats');
    return response.data;
  },

  // Скачивание файла
  downloadTemplate: (id: string) => {
    return `${API_BASE_URL}/templates/${id}/download`;
  },

  // Предпросмотр файла
  previewTemplate: (id: string) => {
    return `${API_BASE_URL}/templates/${id}/preview`;
  },

  // Загрузка новой версии
  uploadNewVersion: async (templateId: string, formData: FormData) => {
    logFormData(formData, `Uploading new version for template ${templateId}`);
    
    const response = await multipartClient.post(`/templates/${templateId}/versions`, formData);
    return response.data;
  },

  // Автодополнение
  autocomplete: async (query: string, field: string) => {
    const response = await apiClient.get('/templates/autocomplete', {
      params: { q: query, field },
    });
    return response.data;
  },
};

export default apiClient;