/* const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.REACT_APP_USE_MOCK_API === 'true' || !process.env.REACT_APP_API_URL;

// ========== REAL API SERVICE ==========
class RealApiService {
  async getTemplates(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const response = await fetch(`${API_BASE}/templates?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async getTemplate(id) {
    const response = await fetch(`${API_BASE}/templates/${id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async createTemplate(templateData) {
    const formData = new FormData();
    
    formData.append('name', templateData.name);
    formData.append('description', templateData.description);
    formData.append('category', templateData.category);
    formData.append('department', templateData.department);
    
    if (templateData.tags && Array.isArray(templateData.tags)) {
      templateData.tags.forEach(tag => formData.append('tags', tag));
    }
    
    if (templateData.file) {
      formData.append('file', templateData.file);
    }

    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async updateTemplate(id, templateData) {
    const formData = new FormData();
    
    Object.keys(templateData).forEach(key => {
      if (key === 'file' && templateData.file) {
        formData.append('file', templateData.file);
      } else if (key === 'tags' && Array.isArray(templateData.tags)) {
        templateData.tags.forEach(tag => formData.append('tags', tag));
      } else if (templateData[key] !== undefined) {
        formData.append(key, templateData[key]);
      }
    });

    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async deleteTemplate(id) {
    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== VERSIONS ==========
  
  async getTemplateVersions(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/versions`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async compareVersions(version1Id, version2Id) {
    const response = await fetch(
      `${API_BASE}/versions/compare/${version1Id}/${version2Id}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async uploadNewVersion(templateId, file, changeDescription) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('changeDescription', changeDescription);
    
    const response = await fetch(`${API_BASE}/templates/${templateId}/versions`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== FILES ==========
  
  async downloadTemplate(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/download`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  }

  getTemplateFileUrl(templateId) {
    return `${API_BASE}/templates/${templateId}/file`;
  }

  // ========== STATISTICS ==========
  
  async getTemplateStats() {
    const response = await fetch(`${API_BASE}/templates/stats`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== ADDITIONAL METHODS ==========
  
  async updateTemplateStatus(id, status) {
    const response = await fetch(`${API_BASE}/templates/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async searchTemplates(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });
    
    const response = await fetch(`${API_BASE}/templates/search?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
}

// ========== MOCK API ADAPTER ==========
// Adapter to make your existing mockApi.js compatible with our interface
class MockApiAdapter {
  constructor() {
    this.mockApi = null;
    this.loadMockApi();
  }

  async loadMockApi() {
    try {
      const module = await import('./mockApi.js');
      this.mockApi = module.mockApi;
      console.log('Using external mockApi.js');
    } catch (error) {
      console.log('Failed to load mockApi.js, creating fallback');
      this.createFallbackMockApi();
    }
  }

  createFallbackMockApi() {
    // Fallback mock data
    const mockTemplates = [
      {
        _id: '1',
        name: 'Rental Agreement',
        description: 'Standard office rental agreement',
        category: 'legal',
        department: 'legal',
        tags: ['rental', 'legal', 'agreement'],
        file: {
          originalName: 'rental-agreement.docx',
          storedName: 'file_12345.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 24576,
          url: '/files/rental-agreement.docx'
        },
        metadata: {
          author: 'Ivanov I.I.',
          version: 1.2,
          status: 'approved',
          lastModified: '2024-01-15T10:00:00Z',
          checksum: 'abc123def456'
        },
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ];

    this.mockApi = {
      getTemplates: async (page = 1, limit = 10, filters = {}) => {
        await this.delay(300);
        let filtered = [...mockTemplates];
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            t.tags.some(tag => tag.toLowerCase().includes(search))
          );
        }
        
        return {
          templates: filtered,
          totalCount: filtered.length,
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit)
        };
      },
      
      getTemplate: async (id) => {
        await this.delay(200);
        return mockTemplates.find(t => t._id === id) || null;
      },
      
      createTemplate: async (formData) => {
        await this.delay(800);
        const newTemplate = {
          _id: Date.now().toString(),
          name: formData.get('name') || 'New Template',
          description: formData.get('description') || '',
          category: formData.get('category') || 'other',
          department: formData.get('department') || 'management',
          tags: formData.getAll('tags') || [],
          file: {
            originalName: 'new-file.docx',
            storedName: 'file_' + Date.now() + '.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 10240,
            url: '/files/new-file.docx'
          },
          metadata: {
            author: 'Current User',
            version: 1.0,
            status: 'draft',
            lastModified: new Date().toISOString(),
            checksum: 'mock_' + Date.now()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockTemplates.push(newTemplate);
        return newTemplate;
      },
      
      getTemplateVersions: async (templateId) => {
        await this.delay(300);
        return [];
      },
      
      compareVersions: async (version1Id, version2Id) => {
        await this.delay(400);
        return {
          version1: { _id: version1Id, versionNumber: 1.0 },
          version2: { _id: version2Id, versionNumber: 1.1 },
          differences: ['Sample changes for testing']
        };
      },
      
      deleteTemplate: async (id) => {
        await this.delay(600);
        return { success: true };
      }
    };
  }

  delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ensureMockApi() {
    if (!this.mockApi) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.mockApi;
  }

  // ========== TEMPLATES ==========
  async getTemplates(page = 1, limit = 10, filters = {}) {
    const api = await this.ensureMockApi();
    return api.getTemplates(page, limit, filters);
  }

  async getTemplate(id) {
    const api = await this.ensureMockApi();
    return api.getTemplate(id);
  }

  async createTemplate(templateData) {
    const api = await this.ensureMockApi();
    
    if (templateData instanceof FormData) {
      return api.createTemplate(templateData);
    }
    
    const formData = new FormData();
    if (templateData.name) formData.append('name', templateData.name);
    if (templateData.description) formData.append('description', templateData.description);
    if (templateData.category) formData.append('category', templateData.category);
    if (templateData.department) formData.append('department', templateData.department);
    
    if (templateData.tags && Array.isArray(templateData.tags)) {
      templateData.tags.forEach(tag => formData.append('tags', tag));
    }
    
    if (templateData.file) {
      formData.append('file', templateData.file);
    }
    
    return api.createTemplate(formData);
  }

  async updateTemplate(id, templateData) {
    await this.delay(700);
    const api = await this.ensureMockApi();
    
    const existing = await api.getTemplate(id);
    if (!existing) throw new Error(`Template with ID ${id} not found`);
    
    const updated = {
      ...existing,
      name: templateData.name || existing.name,
      description: templateData.description || existing.description,
      category: templateData.category || existing.category,
      department: templateData.department || existing.department,
      tags: templateData.tags || existing.tags,
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 0.1,
        lastModified: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    
    if (templateData.file) {
      updated.file = {
        originalName: templateData.file.name,
        storedName: 'file_' + Date.now() + '.docx',
        mimeType: templateData.file.type,
        size: templateData.file.size,
        url: '/files/' + templateData.file.name
      };
    }
    
    return updated;
  }

  async deleteTemplate(id) {
    const api = await this.ensureMockApi();
    return api.deleteTemplate(id);
  }

  // ========== VERSIONS ==========
  async getTemplateVersions(templateId) {
    const api = await this.ensureMockApi();
    return api.getTemplateVersions(templateId);
  }

  async compareVersions(version1Id, version2Id) {
    const api = await this.ensureMockApi();
    return api.compareVersions(version1Id, version2Id);
  }

  async uploadNewVersion(templateId, file, changeDescription) {
    await this.delay(900);
    
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(templateId);
    if (!template) throw new Error(`Template with ID ${templateId} not found`);
    
    return {
      _id: 'v' + Date.now(),
      templateId,
      versionNumber: template.metadata.version + 0.1,
      changeDescription,
      file: {
        originalName: file.name,
        storedName: 'version_' + Date.now() + '.' + file.name.split('.').pop(),
        mimeType: file.type,
        size: file.size,
        url: '/versions/' + file.name
      },
      metadata: {
        author: 'Current User',
        status: 'draft',
        checksum: 'version_' + Date.now()
      },
      createdAt: new Date().toISOString()
    };
  }

  // ========== FILES ==========
  async downloadTemplate(templateId) {
    await this.delay(500);
    
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(templateId);
    if (!template) throw new Error(`Template with ID ${templateId} not found`);
    
    const content = `Mock file for template: ${template.name}\n\n${template.description}`;
    return new Blob([content], { type: template.file.mimeType });
  }

  getTemplateFileUrl(templateId) {
    return `/files/${templateId}`;
  }

  // ========== STATISTICS ==========
  async getTemplateStats() {
    await this.delay(400);
    const api = await this.ensureMockApi();
    const data = await api.getTemplates(1, 100, {});
    
    const stats = {
      total: data.totalCount,
      byCategory: {},
      byDepartment: {},
      byStatus: {},
      recentActivity: []
    };
    
    if (data.templates && Array.isArray(data.templates)) {
      data.templates.forEach(template => {
        stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
        stats.byDepartment[template.department] = (stats.byDepartment[template.department] || 0) + 1;
        stats.byStatus[template.metadata.status] = (stats.byStatus[template.metadata.status] || 0) + 1;
        
        stats.recentActivity.push({
          templateId: template._id,
          templateName: template.name,
          action: 'updated',
          timestamp: template.metadata.lastModified,
          user: template.metadata.author
        });
      });
      
      stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      stats.recentActivity = stats.recentActivity.slice(0, 5);
    }
    
    return stats;
  }

  // ========== ADDITIONAL METHODS ==========
  async updateTemplateStatus(id, status) {
    await this.delay(300);
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(id);
    
    if (!template) throw new Error(`Template with ID ${id} not found`);
    
    return {
      ...template,
      metadata: {
        ...template.metadata,
        status: status,
        lastModified: new Date().toISOString()
      }
    };
  }

  async searchTemplates(query, filters = {}) {
    return this.getTemplates(1, 10, { search: query, ...filters });
  }
}

// ========== CREATE API INSTANCE ==========
let apiInstance;

if (USE_MOCK) {
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.REACT_APP_USE_MOCK_API === 'true' || !process.env.REACT_APP_API_URL;

// ========== REAL API SERVICE ==========
class RealApiService {
  async getTemplates(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const response = await fetch(`${API_BASE}/templates?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async getTemplate(id) {
    const response = await fetch(`${API_BASE}/templates/${id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async createTemplate(templateData) {
    const formData = new FormData();
    
    formData.append('name', templateData.name);
    formData.append('description', templateData.description);
    formData.append('category', templateData.category);
    formData.append('department', templateData.department);
    
    if (templateData.tags && Array.isArray(templateData.tags)) {
      templateData.tags.forEach(tag => formData.append('tags', tag));
    }
    
    if (templateData.file) {
      formData.append('file', templateData.file);
    }

    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async updateTemplate(id, templateData) {
    const formData = new FormData();
    
    Object.keys(templateData).forEach(key => {
      if (key === 'file' && templateData.file) {
        formData.append('file', templateData.file);
      } else if (key === 'tags' && Array.isArray(templateData.tags)) {
        templateData.tags.forEach(tag => formData.append('tags', tag));
      } else if (templateData[key] !== undefined) {
        formData.append(key, templateData[key]);
      }
    });

    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async deleteTemplate(id) {
    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== VERSIONS ==========
  
  async getTemplateVersions(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/versions`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async compareVersions(version1Id, version2Id) {
    const response = await fetch(
      `${API_BASE}/versions/compare/${version1Id}/${version2Id}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async uploadNewVersion(templateId, file, changeDescription) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('changeDescription', changeDescription);
    
    const response = await fetch(`${API_BASE}/templates/${templateId}/versions`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== FILES ==========
  
  async downloadTemplate(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/download`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  }

  getTemplateFileUrl(templateId) {
    return `${API_BASE}/templates/${templateId}/file`;
  }

  // ========== STATISTICS ==========
  
  async getTemplateStats() {
    const response = await fetch(`${API_BASE}/templates/stats`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  // ========== ADDITIONAL METHODS ==========
  
  async updateTemplateStatus(id, status) {
    const response = await fetch(`${API_BASE}/templates/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async searchTemplates(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });
    
    const response = await fetch(`${API_BASE}/templates/search?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
}

// ========== MOCK API ADAPTER ==========
// Adapter to make your existing mockApi.js compatible with our interface
class MockApiAdapter {
  constructor() {
    this.mockApi = null;
    this.loadMockApi();
  }

  async loadMockApi() {
    try {
      const module = await import('./mockApi.js');
      this.mockApi = module.mockApi;
      console.log('Using external mockApi.js');
    } catch (error) {
      console.log('Failed to load mockApi.js, creating fallback');
      this.createFallbackMockApi();
    }
  }

  createFallbackMockApi() {
    // Fallback mock data
    const mockTemplates = [
      {
        _id: '1',
        name: 'Rental Agreement',
        description: 'Standard office rental agreement',
        category: 'legal',
        department: 'legal',
        tags: ['rental', 'legal', 'agreement'],
        file: {
          originalName: 'rental-agreement.docx',
          storedName: 'file_12345.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 24576,
          url: '/files/rental-agreement.docx'
        },
        metadata: {
          author: 'Ivanov I.I.',
          version: 1.2,
          status: 'approved',
          lastModified: '2024-01-15T10:00:00Z',
          checksum: 'abc123def456'
        },
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ];

    this.mockApi = {
      getTemplates: async (page = 1, limit = 10, filters = {}) => {
        await this.delay(300);
        let filtered = [...mockTemplates];
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            t.tags.some(tag => tag.toLowerCase().includes(search))
          );
        }
        
        return {
          templates: filtered,
          totalCount: filtered.length,
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit)
        };
      },
      
      getTemplate: async (id) => {
        await this.delay(200);
        return mockTemplates.find(t => t._id === id) || null;
      },
      
      createTemplate: async (formData) => {
        await this.delay(800);
        const newTemplate = {
          _id: Date.now().toString(),
          name: formData.get('name') || 'New Template',
          description: formData.get('description') || '',
          category: formData.get('category') || 'other',
          department: formData.get('department') || 'management',
          tags: formData.getAll('tags') || [],
          file: {
            originalName: 'new-file.docx',
            storedName: 'file_' + Date.now() + '.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 10240,
            url: '/files/new-file.docx'
          },
          metadata: {
            author: 'Current User',
            version: 1.0,
            status: 'draft',
            lastModified: new Date().toISOString(),
            checksum: 'mock_' + Date.now()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockTemplates.push(newTemplate);
        return newTemplate;
      },
      
      getTemplateVersions: async (templateId) => {
        await this.delay(300);
        return [];
      },
      
      compareVersions: async (version1Id, version2Id) => {
        await this.delay(400);
        return {
          version1: { _id: version1Id, versionNumber: 1.0 },
          version2: { _id: version2Id, versionNumber: 1.1 },
          differences: ['Sample changes for testing']
        };
      },
      
      deleteTemplate: async (id) => {
        await this.delay(600);
        return { success: true };
      }
    };
  }

  delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ensureMockApi() {
    if (!this.mockApi) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.mockApi;
  }

  // ========== TEMPLATES ==========
  async getTemplates(page = 1, limit = 10, filters = {}) {
    const api = await this.ensureMockApi();
    return api.getTemplates(page, limit, filters);
  }

  async getTemplate(id) {
    const api = await this.ensureMockApi();
    return api.getTemplate(id);
  }

  async createTemplate(templateData) {
    const api = await this.ensureMockApi();
    
    if (templateData instanceof FormData) {
      return api.createTemplate(templateData);
    }
    
    const formData = new FormData();
    if (templateData.name) formData.append('name', templateData.name);
    if (templateData.description) formData.append('description', templateData.description);
    if (templateData.category) formData.append('category', templateData.category);
    if (templateData.department) formData.append('department', templateData.department);
    
    if (templateData.tags && Array.isArray(templateData.tags)) {
      templateData.tags.forEach(tag => formData.append('tags', tag));
    }
    
    if (templateData.file) {
      formData.append('file', templateData.file);
    }
    
    return api.createTemplate(formData);
  }

  async updateTemplate(id, templateData) {
    await this.delay(700);
    const api = await this.ensureMockApi();
    
    const existing = await api.getTemplate(id);
    if (!existing) throw new Error(`Template with ID ${id} not found`);
    
    const updated = {
      ...existing,
      name: templateData.name || existing.name,
      description: templateData.description || existing.description,
      category: templateData.category || existing.category,
      department: templateData.department || existing.department,
      tags: templateData.tags || existing.tags,
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 0.1,
        lastModified: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    
    if (templateData.file) {
      updated.file = {
        originalName: templateData.file.name,
        storedName: 'file_' + Date.now() + '.docx',
        mimeType: templateData.file.type,
        size: templateData.file.size,
        url: '/files/' + templateData.file.name
      };
    }
    
    return updated;
  }

  async deleteTemplate(id) {
    const api = await this.ensureMockApi();
    return api.deleteTemplate(id);
  }

  // ========== VERSIONS ==========
  async getTemplateVersions(templateId) {
    const api = await this.ensureMockApi();
    return api.getTemplateVersions(templateId);
  }

  async compareVersions(version1Id, version2Id) {
    const api = await this.ensureMockApi();
    return api.compareVersions(version1Id, version2Id);
  }

  async uploadNewVersion(templateId, file, changeDescription) {
    await this.delay(900);
    
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(templateId);
    if (!template) throw new Error(`Template with ID ${templateId} not found`);
    
    return {
      _id: 'v' + Date.now(),
      templateId,
      versionNumber: template.metadata.version + 0.1,
      changeDescription,
      file: {
        originalName: file.name,
        storedName: 'version_' + Date.now() + '.' + file.name.split('.').pop(),
        mimeType: file.type,
        size: file.size,
        url: '/versions/' + file.name
      },
      metadata: {
        author: 'Current User',
        status: 'draft',
        checksum: 'version_' + Date.now()
      },
      createdAt: new Date().toISOString()
    };
  }

  // ========== FILES ==========
  async downloadTemplate(templateId) {
    await this.delay(500);
    
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(templateId);
    if (!template) throw new Error(`Template with ID ${templateId} not found`);
    
    const content = `Mock file for template: ${template.name}\n\n${template.description}`;
    return new Blob([content], { type: template.file.mimeType });
  }

  getTemplateFileUrl(templateId) {
    return `/files/${templateId}`;
  }

  // ========== STATISTICS ==========
  async getTemplateStats() {
    await this.delay(400);
    const api = await this.ensureMockApi();
    const data = await api.getTemplates(1, 100, {});
    
    const stats = {
      total: data.totalCount,
      byCategory: {},
      byDepartment: {},
      byStatus: {},
      recentActivity: []
    };
    
    if (data.templates && Array.isArray(data.templates)) {
      data.templates.forEach(template => {
        stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
        stats.byDepartment[template.department] = (stats.byDepartment[template.department] || 0) + 1;
        stats.byStatus[template.metadata.status] = (stats.byStatus[template.metadata.status] || 0) + 1;
        
        stats.recentActivity.push({
          templateId: template._id,
          templateName: template.name,
          action: 'updated',
          timestamp: template.metadata.lastModified,
          user: template.metadata.author
        });
      });
      
      stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      stats.recentActivity = stats.recentActivity.slice(0, 5);
    }
    
    return stats;
  }

  // ========== ADDITIONAL METHODS ==========
  async updateTemplateStatus(id, status) {
    await this.delay(300);
    const api = await this.ensureMockApi();
    const template = await api.getTemplate(id);
    
    if (!template) throw new Error(`Template with ID ${id} not found`);
    
    return {
      ...template,
      metadata: {
        ...template.metadata,
        status: status,
        lastModified: new Date().toISOString()
      }
    };
  }

  async searchTemplates(query, filters = {}) {
    return this.getTemplates(1, 10, { search: query, ...filters });
  }
}

// ========== CREATE API INSTANCE ==========
let apiInstance;

if (USE_MOCK) {
  apiInstance = new MockApiAdapter();
  console.log('API Mode: MOCK');
} else {
  apiInstance = new RealApiService();
  console.log('API Mode: REAL - Using:', API_BASE);
}


export default apiInstance;


if (process.env.NODE_ENV === 'development') {
  window.apiService = apiInstance;
} = new MockApiAdapter();
  console.log('API Mode: MOCK');
} else {
  apiInstance = new RealApiService();
  console.log('API Mode: REAL - Using:', API_BASE);
}


export default apiInstance;


if (process.env.NODE_ENV === 'development') {
  window.apiService = apiInstance;
}
  */