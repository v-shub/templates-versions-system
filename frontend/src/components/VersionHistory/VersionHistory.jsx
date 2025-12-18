import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './VersionHistory.css';

function VersionHistory({ templateId }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    if (templateId) {
      loadVersions();
    }
  }, [templateId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getTemplateVersions(templateId);
      setVersions(data);
    } catch (error) {
      console.error('Ошибка загрузки версий:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (versionId) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      }
      return prev;
    });
  };
  const compareContentVersions = (version1Content, version2Content) => {
    // Реализация сравнения контента
    return {
      differences: [
        'Изменена дата договора',
        'Увеличен размер арендной платы',
        'Добавлены пункты о штрафах'
      ]
    };
  };
  
  const compareVersions = async () => {
    if (selectedVersions.length === 2) {
      try {
        const data = await ApiService.compareVersions(
          selectedVersions[0],
          selectedVersions[1]
        );
        setComparison(data);
      } catch (error) {
        console.error('Ошибка сравнения:', error);
      }
    }
  };

  const clearComparison = () => {
    setComparison(null);
    setSelectedVersions([]);
  };

  if (loading) {
    return (
      <div className="version-history-loading">
        Загрузка истории версий...
      </div>
    );
  }

  return (
    <div className="version-history">
      <h2>История версий</h2>
      
      <div className="versions-list">
        {versions.map(version => (
          <div
            key={version.id}
            className={`version-item ${
              selectedVersions.includes(version.id) ? 'version-item--selected' : ''
            }`}
            onClick={() => handleVersionSelect(version.id)}
          >
            <div className="version-header">
              <h3 className="version-title">
                Версия {version.versionNumber}
              </h3>
              <span className="version-date">
                {new Date(version.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <p className="version-description">
              {version.changeDescription}
            </p>
            
            {selectedVersions.includes(version.id) && (
              <div className="version-selected-indicator">
                ✓ Выбрано для сравнения
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedVersions.length === 2 && (
        <div className="comparison-actions">
          <button 
            className="btn-compare"
            onClick={compareVersions}
          >
            Сравнить версии
          </button>
        </div>
      )}

      {comparison && (
        <div className="comparison-result">
          <div className="comparison-header">
            <h3>Результат сравнения</h3>
            <button 
              className="btn-close-comparison"
              onClick={clearComparison}
            >
              ×
            </button>
          </div>
          {/* Здесь можно отобразить детали сравнения */}
          <pre>{JSON.stringify(comparison, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default VersionHistory;