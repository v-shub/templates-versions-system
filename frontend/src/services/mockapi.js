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

const mockVersions = [
  {
    _id: 'v1',
    templateId: '1',
    versionNumber: 1.0,
    changeDescription: 'Initial version of agreement',
    file: {
      originalName: 'agreement-v1.docx',
      storedName: 'version_123.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 22528,
      url: '/versions/agreement-v1.docx'
    },
    metadata: {
      author: 'Ivanov I.I.',
      status: 'approved',
      checksum: 'xyz789abc456'
    },
    createdAt: '2024-01-10T09:00:00Z'
  },
  {
    _id: 'v2',
    templateId: '1',
    versionNumber: 1.1,
    changeDescription: 'Added maintenance clauses',
    file: {
      originalName: 'agreement-v1.1.docx',
      storedName: 'version_124.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 23552,
      url: '/versions/agreement-v1.1.docx'
    },
    metadata: {
      author: 'Ivanov I.I.',
      status: 'approved',
      checksum: 'def456ghi789'
    },
    createdAt: '2024-01-12T11:00:00Z'
  }
];

export const mockApi = {
  // Templates
  getTemplates: async (page = 1, limit = 10, filters = {}) => {
    console.log('Mock API: getTemplates', { page, limit, filters });
    
    let filtered = [...mockTemplates];
    
    // Apply filters
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
    
    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      templates: filtered.slice(start, end),
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit)
    };
  },
  
  getTemplate: async (id) => {
    console.log('Mock API: getTemplate', id);
    const template = mockTemplates.find(t => t._id === id);
    return template || null;
  },
  
  createTemplate: async (formData) => {
    console.log('Mock API: createTemplate', formData);
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
  
  // Versions
  getTemplateVersions: async (templateId) => {
    console.log('Mock API: getTemplateVersions', templateId);
    return mockVersions.filter(v => v.templateId === templateId);
  },
  
  compareVersions: async (version1Id, version2Id) => {
    console.log('Mock API: compareVersions', { version1Id, version2Id });
    return {
      version1: mockVersions.find(v => v._id === version1Id),
      version2: mockVersions.find(v => v._id === version2Id),
      differences: [
        'Changed clause 3.1 about rental period',
        'Added clause 5.7 about utility payments',
        'Updated contact details'
      ]
    };
  },
  
  // Delete
  deleteTemplate: async (id) => {
    console.log('Mock API: deleteTemplate', id);
    const index = mockTemplates.findIndex(t => t._id === id);
    if (index > -1) {
      mockTemplates.splice(index, 1);
    }
    return { success: true };
  }
};