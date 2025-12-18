import React, { useState } from 'react';
import './App.css';
import TemplateList from './components/TemplateList/TemplateList';
import TemplateForm from './components/TemplateForm/TemplateForm';
import VersionHistory from './components/VersionHistory/VersionHistory';
import SearchTemplates from './components/SearchTemplates/SearchTemplates';

function App() {
  const [view, setView] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const renderView = () => {
    switch(view) {
      case 'list':
        return (
          <TemplateList 
            onTemplateSelect={(template) => {
              setSelectedTemplate(template);
              setView('detail');
            }}
            onNewTemplate={() => setView('create')}
          />
        );
      
      case 'search':
        return (
          <SearchTemplates 
            onTemplateSelect={(template) => {
              setSelectedTemplate(template);
              setView('detail');
            }}
          />
        );
      
      case 'create':
        return (
          <TemplateForm 
            onSave={() => {
              setView('list');
              alert('Шаблон создан!');
            }}
            onCancel={() => setView('list')}
          />
        );
      
      case 'detail':
        return selectedTemplate ? (
          <div className="detail-view">
            <div className="detail-header">
              <button onClick={() => setView('list')} className="btn-back">
                ← Назад к списку
              </button>
              <h2>{selectedTemplate.name}</h2>
              <button 
                onClick={() => setView('edit')}
                className="btn-edit"
              >
                 Редактировать
              </button>
            </div>
            
            <div className="template-info">
              <p><strong>Описание:</strong> {selectedTemplate.description}</p>
              <p><strong>Категория:</strong> {selectedTemplate.category}</p>
              <p><strong>Отдел:</strong> {selectedTemplate.department}</p>
              <p><strong>Статус:</strong> {selectedTemplate.metadata.status}</p>
              <p><strong>Версия:</strong> {selectedTemplate.metadata.version}</p>
            </div>
            
            <VersionHistory templateId={selectedTemplate._id} />
          </div>
        ) : null;
      
      case 'edit':
        return selectedTemplate ? (
          <TemplateForm 
            template={selectedTemplate}
            isEdit={true}
            onSave={() => {
              setView('detail');
              alert('Шаблон обновлен!');
            }}
            onCancel={() => setView('detail')}
          />
        ) : null;
      
      default:
        return <TemplateList />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1> Система контроля версий шаблонов</h1>
        <nav className="app-nav">
          <button 
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
             Все шаблоны
          </button>
          <button 
            className={view === 'search' ? 'active' : ''}
            onClick={() => setView('search')}
          >
             Поиск
          </button>
          <button 
            className={view === 'create' ? 'active' : ''}
            onClick={() => setView('create')}
          >
             Новый шаблон
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {renderView()}
      </main>
      
      <footer className="app-footer">
        <p>© 2024 Система контроля версий документов</p>
      </footer>
    </div>
  );
}

export default App;