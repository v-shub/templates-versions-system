const API_BASE = 'http://localhost:5000/api';

class ApiService {
  // ========== ШАБЛОНЫ ==========
  
  async getTemplates(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const response = await fetch(`${API_BASE}/templates?${params}`);
    return await response.json();
  }

  async getTemplate(id) {
    const response = await fetch(`${API_BASE}/templates/${id}`);
    return await response.json();
  }

  async createTemplate(templateData) {
    const formData = new FormData();
    
    // Добавляем текстовые поля
    formData.append('name', templateData.name);
    formData.append('description', templateData.description);
    formData.append('category', templateData.category);
    formData.append('department', templateData.department);
    templateData.tags.forEach(tag => formData.append('tags', tag));
    
    // Добавляем файл
    if (templateData.file) {
      formData.append('file', templateData.file);
    }

    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      body: formData // Не устанавливаем Content-Type - браузер сделает это сам
    });
    return await response.json();
  }

  async updateTemplate(id, templateData) {
    const formData = new FormData();
    
    Object.keys(templateData).forEach(key => {
      if (key === 'file' && templateData.file) {
        formData.append('file', templateData.file);
      } else if (key === 'tags') {
        templateData.tags.forEach(tag => formData.append('tags', tag));
      } else if (templateData[key] !== undefined) {
        formData.append(key, templateData[key]);
      }
    });

    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      body: formData
    });
    return await response.json();
  }

  // ========== ВЕРСИИ ==========
  
  async getTemplateVersions(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/versions`);
    return await response.json();
  }

  async compareVersions(version1Id, version2Id) {
    const response = await fetch(
      ${API_BASE}/versions/compare/${version1Id}/${version2Id}
    );
    return await response.json();
  }

  // ========== ФАЙЛЫ ==========
  
  async downloadTemplate(templateId) {
    const response = await fetch(`${API_BASE}/templates/${templateId}/download`);
    return await response.blob();
  }

  async getTemplateFileUrl(templateId) {
    return '${API_BASE}/templates/${templateId}/file';
  }
}

export default new ApiService();
