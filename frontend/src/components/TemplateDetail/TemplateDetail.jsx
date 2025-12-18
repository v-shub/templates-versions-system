import React from 'react';
import './TemplateDetail.css';
import TemplateContent from '../TemplateContent/TemplateContent';

function TemplateDetail({ template, onEdit, onDelete, onDownload }) {
  return (
    <div className="template-detail">
      <div className="detail-header">
        <h2>{template.name}</h2>
        <div className="detail-actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDownload}>Download</button>
          <button onClick={onDelete} className="btn-delete">Delete</button>
        </div>
      </div>
      
      <div className="detail-content">
        <div className="detail-section">
          <h3>Description</h3>
          <p>{template.description}</p>
        </div>
        
        <div className="detail-grid">
          <div className="detail-item">
            <strong>Category:</strong> {template.category}
          </div>
          <div className="detail-item">
            <strong>Department:</strong> {template.department}
          </div>
          <div className="detail-item">
            <strong>Status:</strong> 
            <span className={`status-badge status-${template.metadata.status}`}>
              {template.metadata.status}
            </span>
          </div>
          <div className="detail-item">
            <strong>Version:</strong> v{template.metadata.version}
          </div>
          <div className="detail-item">
            <strong>Author:</strong> {template.metadata.author}
          </div>
          <div className="detail-item">
            <strong>Last Modified:</strong> 
            {new Date(template.metadata.lastModified).toLocaleDateString()}
          </div>
        </div>
        
        <div className="detail-section">
          <h3>File Information</h3>
          <p><strong>File Name:</strong> {template.file.originalName}</p>
          <p><strong>File Type:</strong> {template.file.mimeType}</p>
          <p><strong>File Size:</strong> {(template.file.size / 1024).toFixed(2)} KB</p>
        </div>
        
        {/* НОВЫЙ БЛОК: Отображение контента документа */}
        <div className="detail-section">
          <h3>Document Content</h3>
          <TemplateContent 
            content={template.content || 'No content available'}
            previousContent={template.previousContent || null}
            fileName={template.file.originalName}
            fileType={template.file.mimeType}
          />
        </div>
        
        {template.tags.length > 0 && (
          <div className="detail-section">
            <h3>Tags</h3>
            <div className="tags-list">
              {template.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplateDetail;