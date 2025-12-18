import React, { useState } from 'react';
import './App.css';
import TemplateList from './components/TemplateList/TemplateList';
import TemplateForm from './components/TemplateForm/TemplateForm';
import VersionHistory from './components/VersionHistory/VersionHistory';
import SearchTemplates from './components/SearchTemplates/SearchTemplates';
import TemplateDetail from './components/TemplateDetail/TemplateDetail';
import ApiService from './services/api';

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
                ← Back to list
              </button>
            </div>
            
            <TemplateDetail 
              template={selectedTemplate}
              onEdit={() => setView('edit')}
              onDelete={async () => {
                if (window.confirm('Delete this template?')) {
                  try {
                    await ApiService.deleteTemplate(selectedTemplate._id);
                    setView('list');
                    alert('Template deleted');
                  } catch (error) {
                    alert('Error deleting template');
                  }
                }
              }}
              onDownload={async () => {
                try {
                  // Если нужно скачать контент, а не файл
                  const content = selectedTemplate.content || '';
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedTemplate.name}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  alert('Error downloading file');
                }
              }}
            />
            
            <VersionHistory 
              templateId={selectedTemplate._id} 
              currentContent={selectedTemplate.content}
              previousContent={selectedTemplate.previousContent}
            />
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