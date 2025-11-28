import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './TemplateList.css'


function TemplateList({ onTemplateSelect, onNewTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ 
    category: '', 
    search: '' 
  });

  useEffect(() => {
    loadTemplates();
  }, [currentPage, filters]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getTemplates(currentPage, 10, filters);
      setTemplates(data.templates);
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleTemplateClick = (template) => {
    onTemplateSelect(template);
  };

  if (loading) {
    return (
      <div className="template-list-loading">
        Загрузка шаблонов...
      </div>
    );
  }

  return (
    <div className="template-list">
      <div className="template-list-header">
        <h2>Шаблоны документов</h2>
        <button 
          className="btn-new-template"
          onClick={onNewTemplate}
        >
          + Новый шаблон
        </button>
      </div>

      <div className="template-list-search">
        <input
          type="text"
          placeholder="Поиск шаблонов..."
          value={filters.search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="template-list-content">
        {templates.map(template => (
          <div
            key={template.id}
            className="template-item"
            onClick={() => handleTemplateClick(template)}
          >
            <div className="template-item-header">
              <h3 className="template-name">{template.name}</h3>
              <span className="template-version">v{template.currentVersion}</span>
            </div>
            <p className="template-description">{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemplateList;