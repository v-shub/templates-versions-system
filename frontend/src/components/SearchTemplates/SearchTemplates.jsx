import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './SearchTemplates.css';

function SearchTemplates({ onTemplateSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
   const categories = [
    { value: '', label: 'Все категории' },
    { value: 'legal', label: 'Юридические' },
    { value: 'hr', label: 'Кадровые' },
    { value: 'finance', label: 'Финансовые' },
    { value: 'technical', label: 'Технические' },
    { value: 'marketing', label: 'Маркетинг' },
    { value: 'other', label: 'Другое' }
  ];

  const departments = [
    { value: '', label: 'Все отделы' },
    { value: 'legal', label: 'Юридический отдел' },
    { value: 'hr', label: 'Отдел кадров' },
    { value: 'finance', label: 'Финансовый отдел' },
    { value: 'it', label: 'IT отдел' },
    { value: 'marketing', label: 'Отдел маркетинга' },
    { value: 'sales', label: 'Отдел продаж' },
    { value: 'management', label: 'Руководство' }
  ];

  const statuses = [
    { value: '', label: 'Все статусы' },
    { value: 'draft', label: 'Черновик' },
    { value: 'approved', label: 'Утвержден' },
    { value: 'deprecated', label: 'Устаревший' }
  ];

  const performSearch = async () => {
    if (!searchQuery.trim() && 
        !selectedCategory && 
        !selectedDepartment && 
        !selectedStatus && 
        !dateFrom && 
        !dateTo) {
      setError('Введите хотя бы один критерий поиска');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const filters = {
        search: searchQuery.trim(),
        category: selectedCategory,
        department: selectedDepartment,
        status: selectedStatus,
        dateFrom,
        dateTo
      };

      // Удаляем пустые фильтры
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const data = await ApiService.getTemplates(1, 50, filters);
      setSearchResults(data.templates || []);
      
      if (!data.templates || data.templates.length === 0) {
        setError('Ничего не найдено. Попробуйте изменить критерии поиска.');
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setError('Ошибка при выполнении поиска. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDepartment('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setSearchResults([]);
    setError('');
  };

  // Обработка нажатия Enter в поиске
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
        case 'draft': return 'draft';
        case 'approved': return 'good';
        case 'deprecated': return 'trash';
        default: return 'doc';
    }
  };

  return (
    <div className="search-templates">
      <div className="search-header">
        <h2>Поиск шаблонов</h2>
        <p className="search-subtitle">
          Найдите нужный шаблон по названию, содержимому или фильтрам
        </p>
      </div>

      <div className="search-controls">
        {/* Основная строка поиска */}
        <div className="search-main">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по названию, описанию или содержимому..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="btn-search"
              onClick={performSearch}
              disabled={loading}
            >
              {loading ? 'Поиск...' : 'Найти'}
            </button>
          </div>

          <button
            className="btn-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▲ Скрыть фильтры' : '▼ Расширенные фильтры'}
          </button>
        </div>

        {/* Расширенные фильтры */}
        {showAdvanced && (
          <div className="advanced-filters">
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">Категория</label>
                <select
                  className="filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Отдел</label>
                <select
                  className="filter-select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Статус</label>
                <select
                  className="filter-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Дата с</label>
                <input
                  type="date"
                  className="filter-date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Дата по</label>
                <input
                  type="date"
                  className="filter-date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-actions">
              <button
                className="btn btn-secondary"
                onClick={resetFilters}
                disabled={loading}
              >
                Сбросить фильтры
              </button>
              <button
                className="btn btn-primary"
                onClick={performSearch}
                disabled={loading}
              >
                Применить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

            {/* Сообщения об ошибках и состояниях */}
      {error && (
        <div className="search-message error">
            ⚠ {error}
            </div>
      )}

      {/* Результаты поиска */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <h3>Найдено шаблонов: {searchResults.length}</h3>
          </div>

          <div className="results-grid">
            {searchResults.map(template => (
              <div
                key={template._id}
                className="result-card"
                onClick={() => onTemplateSelect && onTemplateSelect(template)}
              >
                <div className="result-header">
                  <div className="result-title-section">
                    <h4 className="result-title">{template.name}</h4>
                    <div className="result-meta">
                      <span className={`result-status result-status--${template.metadata.status}`}>
                        {getStatusIcon(template.metadata.status)} {template.metadata.status}
                      </span>
                      <span className="result-version">v{template.metadata.version}</span>
                    </div>
                  </div>
                  <div className="result-category-badge">
                    {template.category}
                  </div>
                </div>

                <p className="result-description">{template.description}</p>

                <div className="result-details">
                  <div className="result-tags">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="result-tag">#{tag}</span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="result-tag-more">+{template.tags.length - 3}</span>
                    )}
                  </div>

                  <div className="result-file-info">
                    <span className="result-file-type">
                        {template.file.originalName.split('.').pop().toUpperCase()}
                    </span>
                    <span className="result-file-size">
                      {(template.file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>

                <div className="result-footer">
                  <div className="result-department">
                    <span className="department-label">Отдел:</span>
                    <span className="department-value">{template.department}</span>
                  </div>
                  <div className="result-date">
                    {formatDate(template.metadata.lastModified)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Сообщение если ничего не найдено (но не было ошибки) */}
      {!loading && !error && searchResults.length === 0 && searchQuery && (
        <div className="search-message info">
             Введите критерии поиска и нажмите "Найти"
        </div>
        )}
    </div>
  );
}

export default SearchTemplates;