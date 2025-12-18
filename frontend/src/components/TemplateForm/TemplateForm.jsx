import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './TemplateForm.css';

// Утилита для чтения файлов
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      reader.readAsBinaryString(file);
      resolve('[PDF document - content preview not available in this version]');
    } else if (file.type.includes('application/vnd.openxmlformats') || 
               file.name.endsWith('.docx') || 
               file.name.endsWith('.doc')) {
      resolve('[Word document - content preview not available in this version]');
    } else if (file.type.includes('text/rtf') || file.name.endsWith('.rtf')) {
      resolve('[RTF document - content preview not available in this version]');
    } else {
      resolve('[Binary file - content preview not available]');
    }
  });
};

function TemplateForm({ template, onSave, onCancel, isEdit = false }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    department: '',
    tags: [],
    file: null,
    content: '', // Добавляем поле для контента
    previousContent: '' // Для отслеживания предыдущего контента при редактировании
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [touched, setTouched] = useState({});
  const [filePreview, setFilePreview] = useState(''); // Для предпросмотра содержимого файла
  
  const categories = [
    { value: '', label: 'Выберите категорию' },
    { value: 'legal', label: 'Юридические документы' },
    { value: 'hr', label: 'Кадровые документы' },
    { value: 'finance', label: 'Финансовые документы' },
    { value: 'technical', label: 'Техническая документация' },
    { value: 'marketing', label: 'Маркетинговые материалы' },
    { value: 'other', label: 'Другое' }
  ];

  const departments = [
    { value: '', label: 'Выберите отдел' },
    { value: 'legal', label: 'Юридический отдел' },
    { value: 'hr', label: 'Отдел кадров' },
    { value: 'finance', label: 'Финансовый отдел' },
    { value: 'it', label: 'IT отдел' },
    { value: 'marketing', label: 'Отдел маркетинга' },
    { value: 'sales', label: 'Отдел продаж' },
    { value: 'management', label: 'Руководство' }
  ];

  useEffect(() => {
    if (template && isEdit) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || '',
        department: template.department || '',
        tags: template.tags || [],
        file: null,
        content: template.content || '', // Загружаем существующий контент
        previousContent: template.content || '' // Сохраняем для сравнения
      });
      
      // Если есть контент, показываем его в предпросмотре
      if (template.content && template.content !== '[Binary file - content preview not available]') {
        setFilePreview(template.content.substring(0, 500));
      }
    }
  }, [template, isEdit]);

  // Обновленная функция обработки файла
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFormData(prev => ({
      ...prev,
      file: file
    }));
    
    // Сбрасываем ошибку файла
    setErrors(prev => ({ ...prev, file: '' }));
    
    try {
      // Читаем содержимое файла
      const content = await readFileContent(file);
      
      setFormData(prev => ({
        ...prev,
        content: content
      }));
      
      // Показываем предпросмотр (ограничиваем длину)
      const preview = content.substring(0, 500);
      setFilePreview(preview);
      
    } catch (error) {
      console.error('Error reading file:', error);
      setErrors(prev => ({ 
        ...prev, 
        file: 'Не удалось прочитать содержимое файла' 
      }));
      setFilePreview('');
    }
  };

  // Валидация
  const validateField = (name, value) => {
    const fieldErrors = {};
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          fieldErrors.name = 'Название обязательно для заполнения';
        } else if (value.trim().length < 3) {
          fieldErrors.name = 'Название должно содержать минимум 3 символа';
        } else if (value.trim().length > 100) {
          fieldErrors.name = 'Название не должно превышать 100 символов';
        }
        break;
        
      case 'category':
        if (!value) {
          fieldErrors.category = 'Выберите категорию';
        }
        break;
        
      case 'department':
        if (!value) {
          fieldErrors.department = 'Выберите отдел';
        }
        break;

      case 'file':
        if (!isEdit && !value) {
          fieldErrors.file = 'Файл обязателен для загрузки';
        } else if (value && value.size > 10 * 1024 * 1024) { 
          fieldErrors.file = 'Файл не должен превышать 10MB';
        }
        break;
        
      default:
        break;
    }
    
    return fieldErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (touched[name]) {
      const fieldErrors = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        ...fieldErrors
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const fieldErrors = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      ...fieldErrors
    }));
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      if (formData.tags.length >= 10) {
        setErrors(prev => ({ 
          ...prev, 
          tags: 'Максимум 10 тегов' 
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
      setErrors(prev => ({ ...prev, tags: '' }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Помечаем все поля как "тронутые" для валидации
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Валидируем все поля
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const fieldErrors = validateField(field, formData[field]);
      Object.assign(newErrors, fieldErrors);
    });
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      // Подготавливаем данные для отправки
      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        department: formData.department,
        tags: formData.tags,
        content: formData.content, // Добавляем контент
        fileInfo: formData.file ? {
          name: formData.file.name,
          size: formData.file.size,
          type: formData.file.type
        } : null
      };
      
      let result;
      if (isEdit && template) {
        // При редактировании сохраняем предыдущий контент для сравнения
        if (template.content !== formData.content) {
          templateData.previousContent = template.content;
        }
        result = await ApiService.updateTemplate(template._id, templateData);
      } else {
        result = await ApiService.createTemplate(templateData);
      }
      
      onSave?.(result);
    } catch (error) {
      console.error('Ошибка сохранения шаблона:', error);
      setErrors({ 
        submit: error.response?.data?.message || 'Ошибка при сохранении шаблона' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-form">
      <div className="template-form-header">
        <h2>{isEdit ? 'Редактирование шаблона' : 'Создание нового шаблона'}</h2>
        <p className="form-subtitle">
          Поля помеченные * обязательны для заполнения
        </p>
      </div>

      <form onSubmit={handleSubmit} className="template-form-content" noValidate>
        {/* Название шаблона */}
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Название шаблона *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`form-input ${errors.name ? 'form-input--error' : ''}`}
            placeholder="Введите название шаблона"
            disabled={loading}
          />
          {errors.name && (
            <span className="error-message"> {errors.name}</span>
          )}
        </div>

        {/* Категория и Отдел */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Категория *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-select ${errors.category ? 'form-select--error' : ''}`}
              disabled={loading}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="error-message"> {errors.category}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="department" className="form-label">
              Отдел *
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-select ${errors.department ? 'form-select--error' : ''}`}
              disabled={loading}
            >
              {departments.map(dept => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
            {errors.department && (
              <span className="error-message"> {errors.department}</span>
            )}
          </div>
        </div>

        {/* Описание */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Описание *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`form-textarea ${errors.description ? 'form-textarea--error' : ''}`}
            placeholder="Опишите назначение шаблона..."
            rows="3"
            disabled={loading}
          />
          {errors.description && (
            <span className="error-message"> {errors.description}</span>
          )}
        </div>

        {/* Загрузка файла */}
        <div className="form-group">
          <label htmlFor="file" className="form-label">
            Файл шаблона {!isEdit && '*'}
          </label>
          <input
            type="file"
            id="file"
            name="file"
            onChange={handleFileChange}
            onBlur={handleBlur}
            className={`form-file ${errors.file ? 'form-file--error' : ''}`}
            disabled={loading}
            accept=".doc,.docx,.pdf,.txt,.rtf"
          />
          
          {/* Информация о файле */}
          {formData.file && (
            <div className="file-info">
              <strong>{formData.file.name}</strong> ({(formData.file.size / 1024).toFixed(2)} KB)
            </div>
          )}
          
          {template?.file && !formData.file && (
            <div className="file-info">
              <strong>Текущий файл:</strong> {template.file.originalName}
            </div>
          )}
          
          {/* Предпросмотр содержимого файла */}
          {filePreview && (
            <div className="file-preview">
              <h4>Предпросмотр содержимого:</h4>
              <div className="preview-content">
                <pre>{filePreview}</pre>
                {formData.content && formData.content.length > 500 && (
                  <div className="preview-truncated">
                    ... (показано {filePreview.length} из {formData.content.length} символов)
                  </div>
                )}
              </div>
              <div className="preview-info">
                {formData.content && formData.content.includes('[Word document') && (
                  <div className="preview-warning">
                    ⓘ Word документы не поддерживают предпросмотр содержимого
                  </div>
                )}
                {formData.content && formData.content.includes('[PDF document') && (
                  <div className="preview-warning">
                    ⓘ PDF документы не поддерживают предпросмотр содержимого
                  </div>
                )}
              </div>
            </div>
          )}
          
          {errors.file && (
            <span className="error-message"> {errors.file}</span>
          )}
          
          <div className="form-hint">
            Поддерживаемые форматы: DOC, DOCX, PDF, TXT, RTF (макс. 10MB)
          </div>
        </div>

        {/* Теги */}
        <div className="form-group">
          <label className="form-label">Теги</label>
          <div className="tags-input-container">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              className="form-input"
              placeholder="Добавьте тег и нажмите Enter"
              disabled={loading || formData.tags.length >= 10}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-add-tag"
              disabled={loading || !newTag.trim() || formData.tags.length >= 10}
            >
              Добавить
            </button>
          </div>
          {errors.tags && (
            <span className="error-message"> {errors.tags}</span>
          )}
          
          {formData.tags.length > 0 && (
            <div className="tags-list">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                    disabled={loading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="form-hint">
            {formData.tags.length}/10 тегов
          </div>
        </div>

        {/* Ошибка отправки */}
        {errors.submit && (
          <div className="error-message error-message--submit">
             {errors.submit}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Сохранение...
              </>
            ) : (
              isEdit ? 'Обновить шаблон' : 'Создать шаблон'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TemplateForm;