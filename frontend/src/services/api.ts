import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000/api';

/** Извлекает имя файла из заголовка Content-Disposition */
function parseDownloadFilename(contentDisposition: string | undefined): string | null {
  if (!contentDisposition) return null;
  // filename*=UTF-8''encoded — RFC 5987
  const rfc5987 = contentDisposition.match(/filename\*=(?:UTF-8|utf-8)''(.+?)(?:;|$)/i);
  if (rfc5987) return decodeURIComponent(rfc5987[1].trim());
  // filename="..." или filename=...
  const standard = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (standard) return standard[1].replace(/^["']|["']$/g, '').trim() || null;
  return null;
}

/** Запускает скачивание blob с указанным именем файла */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

/** Установить JWT для всех запросов к API */
export const setAuthToken = (token: string | null): void => {
  const value = token ? `Bearer ${token}` : '';
  apiClient.defaults.headers.common['Authorization'] = value;
  multipartClient.defaults.headers.common['Authorization'] = value;
};

// Auth API и типы
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', { email, password, name });
    return response.data;
  },
  me: async (): Promise<{ success: boolean; user: AuthUser }> => {
    const response = await apiClient.get<{ success: boolean; user: AuthUser }>('/auth/me');
    return response.data;
  },
  updateProfile: async (data: { name?: string; email?: string }): Promise<{ success: boolean; user: AuthUser }> => {
    const response = await apiClient.patch<{ success: boolean; user: AuthUser }>('/auth/me', data);
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/auth/me/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  deleteAccount: async (password: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<{ success: boolean; message?: string }>('/auth/me', {
      data: { password },
    });
    return response.data;
  },
};

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
  /** User id who created this version (when created via authenticated request) */
  createdBy?: string;
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
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
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

  // Скачивание файла (URL — для обратной совместимости, не передаёт auth)
  downloadTemplate: (id: string) => {
    return `${API_BASE_URL}/templates/${id}/download`;
  },

  // Загрузка файла шаблона как blob (с учётом JWT)
  fetchDownloadBlob: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(`/templates/${id}/download`, {
      responseType: 'blob',
    });
    const filename = parseDownloadFilename(response.headers['content-disposition']) || 'download';
    return { blob: response.data, filename };
  },

  // Загрузка файла версии как blob (с учётом JWT)
  fetchVersionDownloadBlob: async (
    templateId: string,
    versionId: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(
      `/templates/${templateId}/versions/${versionId}/download`,
      { responseType: 'blob' }
    );
    const filename =
      parseDownloadFilename(response.headers['content-disposition']) || 'download';
    return { blob: response.data, filename };
  },

  // Предпросмотр файла (возвращает URL для использования в iframe/img — требует auth)
  previewTemplate: (id: string) => {
    return `${API_BASE_URL}/templates/${id}/preview`;
  },

  // Загрузка preview как blob + content-type для правильного отображения (PDF/HTML/изображение/текст)
  fetchPreviewBlob: async (id: string): Promise<{ blob: Blob; contentType: string }> => {
    const response = await apiClient.get(`/templates/${id}/preview`, {
      responseType: 'blob',
    });
    const contentType = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    return { blob: response.data, contentType };
  },

  fetchVersionPreviewBlob: async (templateId: string, versionId: string): Promise<{ blob: Blob; contentType: string }> => {
    const response = await apiClient.get(
      `/templates/${templateId}/versions/${versionId}/preview`,
      { responseType: 'blob' }
    );
    const contentType = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    return { blob: response.data, contentType };
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

  // Сравнение версий
  compareVersions: async (templateId: string, version1Id: string, version2Id: string) => {
    const response = await apiClient.get(
      `/templates/${templateId}/versions/compare/${version1Id}/${version2Id}`
    );
    return response.data;
  },
};

export default apiClient;