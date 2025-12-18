const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.REACT_APP_USE_MOCK_API === 'true' || !process.env.REACT_APP_API_URL;

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
  },
  {
    _id: '2',
    name: 'Vacation Request',
    description: 'Standard annual vacation request form',
    category: 'hr',
    department: 'hr',
    tags: ['vacation', 'hr', 'request'],
    file: {
      originalName: 'vacation-request.pdf',
      storedName: 'file_12346.pdf',
      mimeType: 'application/pdf',
      size: 15360,
      url: '/files/vacation-request.pdf'
    },
    metadata: {
      author: 'Petrova A.S.',
      version: 2.0,
      status: 'draft',
      lastModified: '2024-01-20T14:30:00Z',
      checksum: 'ghi789jkl012'
    },
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  }
];

// Простой API сервис
const ApiService = {
  delay: (ms = 500) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // ========== TEMPLATES ==========
  async getTemplates(page = 1, limit = 10, filters = {}) {
    await this.delay(300);
    console.log('API: getTemplates', { page, limit, filters });
    
    let filtered = [...mockTemplates];
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    if (filters.department) {
      filtered = filtered.filter(t => t.department === filters.department);
    }
    
    if (filters.status) {
      filtered = filtered.filter(t => t.metadata.status === filters.status);
    }
    
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      templates: filtered.slice(start, end),
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit)
    };
  },
  
  async getTemplate(id) {
    await this.delay(200);
    console.log('API: getTemplate', id);
    
    const template = mockTemplates.find(t => t._id === id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    return template;
  },
  
  async createTemplate(templateData) {
    await this.delay(800);
    console.log('API: createTemplate', templateData);
    
    const newTemplate = {
      _id: Date.now().toString(),
      name: templateData.name || 'New Template',
      description: templateData.description || '',
      category: templateData.category || 'other',
      department: templateData.department || 'management',
      tags: templateData.tags || [],
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
  
  async updateTemplate(id, templateData) {
    await this.delay(700);
    console.log('API: updateTemplate', { id, templateData });
    
    const index = mockTemplates.findIndex(t => t._id === id);
    if (index === -1) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    const updatedTemplate = {
      ...mockTemplates[index],
      ...templateData,
      metadata: {
        ...mockTemplates[index].metadata,
        version: mockTemplates[index].metadata.version + 0.1,
        lastModified: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    
    mockTemplates[index] = updatedTemplate;
    return updatedTemplate;
  },
  
  async deleteTemplate(id) {
    await this.delay(600);
    console.log('API: deleteTemplate', id);
    
    const index = mockTemplates.findIndex(t => t._id === id);
    if (index === -1) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    mockTemplates.splice(index, 1);
    return { success: true, message: 'Template deleted' };
  },
  
  // ========== VERSIONS ==========
  async getTemplateVersions(templateId) {
    await this.delay(300);
    console.log('API: getTemplateVersions', templateId);
    
    // Mock версии
    return [
      {
        _id: 'v1',
        templateId: templateId,
        versionNumber: 1.0,
        changeDescription: 'Initial version',
        createdAt: '2024-01-10T09:00:00Z'
      },
      {
        _id: 'v2',
        templateId: templateId,
        versionNumber: 1.1,
        changeDescription: 'Updated formatting',
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];
  },
  
  
  async compareVersions(version1Id, version2Id) {
    await this.delay(400);
    console.log('API: compareVersions', { version1Id, version2Id });
    
    return {
      version1: { _id: version1Id, versionNumber: 1.0 },
      version2: { _id: version2Id, versionNumber: 1.1 },
      differences: [
        'Changed clause about rental period',
        'Added utility payment terms',
        'Updated contact information'
      ]
    };
  }
};

export default ApiService;