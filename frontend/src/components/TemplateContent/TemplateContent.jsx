import React, { useState, useEffect } from 'react';
import './TemplateContent.css';

function TemplateContent({ 
  content, 
  previousContent, 
  fileName,
  fileType 
}) {
  const [viewMode, setViewMode] = useState('current'); // 'current', 'previous', 'compare'
  const [diffResult, setDiffResult] = useState(null);
  
  useEffect(() => {
    if (viewMode === 'compare' && content && previousContent) {
      const diff = compareContent(content, previousContent);
      setDiffResult(diff);
    } else {
      setDiffResult(null);
    }
  }, [viewMode, content, previousContent]);
  
  const compareContent = (newContent, oldContent) => {
    if (!oldContent) return { added: [], removed: [], same: [] };
    
    const newLines = newContent.split('\n');
    const oldLines = oldContent.split('\n');
    const result = {
      added: [],
      removed: [],
      same: []
    };
    
   
    for (let i = 0; i < Math.max(newLines.length, oldLines.length); i++) {
      const newLine = newLines[i] || '';
      const oldLine = oldLines[i] || '';
      
      if (newLine === oldLine) {
        result.same.push({ 
          line: i + 1, 
          text: newLine,
          type: 'same' 
        });
      } else if (newLine && !oldLine) {
        result.added.push({ 
          line: i + 1, 
          text: newLine,
          type: 'added' 
        });
      } else if (!newLine && oldLine) {
        result.removed.push({ 
          line: i + 1, 
          text: oldLine,
          type: 'removed' 
        });
      } else {
        result.added.push({ 
          line: i + 1, 
          text: newLine,
          type: 'added' 
        });
        result.removed.push({ 
          line: i + 1, 
          text: oldLine,
          type: 'removed' 
        });
      }
    }
    
    return result;
  };
  
  const renderContent = () => {
    switch(viewMode) {
      case 'current':
        return (
          <div className="content-view current-content">
            <div className="content-header">
              <h4>Current Version</h4>
              <div className="file-info">
                <span className="file-name">{fileName}</span>
                <span className="file-type">{fileType}</span>
              </div>
            </div>
            <pre className="content-text">{content || 'No content available'}</pre>
          </div>
        );
        
      case 'previous':
        return (
          <div className="content-view previous-content">
            <div className="content-header">
              <h4>Previous Version</h4>
              <div className="file-info">
                <span className="file-name">{fileName}</span>
                <span className="file-type">{fileType} (previous)</span>
              </div>
            </div>
            <pre className="content-text">{previousContent || 'No previous version available'}</pre>
          </div>
        );
        
      case 'compare':
        if (!diffResult) {
          return (
            <div className="content-view compare-content">
              <p>Loading comparison...</p>
            </div>
          );
        }
        
        return (
          <div className="content-view compare-content">
            <div className="content-header">
              <h4>Comparison</h4>
              <div className="diff-stats">
                <span className="stat added">+{diffResult.added.length} added</span>
                <span className="stat removed">-{diffResult.removed.length} removed</span>
                <span className="stat same">{diffResult.same.length} unchanged</span>
              </div>
            </div>
            
            <div className="diff-content">
              {diffResult.added.map((item, index) => (
                <div key={`added-${index}`} className="diff-line line-added">
                  <span className="line-number">{item.line}</span>
                  <span className="line-content">{item.text}</span>
                </div>
              ))}
              
              {diffResult.removed.map((item, index) => (
                <div key={`removed-${index}`} className="diff-line line-removed">
                  <span className="line-number">{item.line}</span>
                  <span className="line-content">{item.text}</span>
                </div>
              ))}
              
              {diffResult.same.map((item, index) => (
                <div key={`same-${index}`} className="diff-line line-same">
                  <span className="line-number">{item.line}</span>
                  <span className="line-content">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  const hasPreviousContent = !!previousContent;
  
  return (
    <div className="template-content">
      <div className="content-controls">
        <div className="view-mode-selector">
          <button
            className={`view-mode-btn ${viewMode === 'current' ? 'active' : ''}`}
            onClick={() => setViewMode('current')}
          >
            Current
          </button>
          
          {hasPreviousContent && (
            <>
              <button
                className={`view-mode-btn ${viewMode === 'previous' ? 'active' : ''}`}
                onClick={() => setViewMode('previous')}
              >
                Previous
              </button>
              
              <button
                className={`view-mode-btn ${viewMode === 'compare' ? 'active' : ''}`}
                onClick={() => setViewMode('compare')}
              >
                Compare
              </button>
            </>
          )}
        </div>
        
        <div className="content-actions">
          <button className="btn-download" onClick={() => {
            // Функция для скачивания
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'template.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}>
            Download
          </button>
          
          <button className="btn-copy" onClick={() => {
            navigator.clipboard.writeText(content);
            alert('Content copied to clipboard!');
          }}>
            Copy
          </button>
        </div>
      </div>
      
      <div className="content-display">
        {renderContent()}
      </div>
    </div>
  );
}

export default TemplateContent;