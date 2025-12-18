import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './TemplateList.css';

function TemplateList({ onTemplateSelect, onNewTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({ 
    category: '', 
    search: '' 
  });

  const limit = 10;

  useEffect(() => {
    loadTemplates();
  }, [currentPage, filters]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getTemplates(currentPage, limit, filters);
      setTemplates(data.templates || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setFilters({ ...filters, category: e.target.value });
    setCurrentPage(1);
  };

  const handleTemplateClick = (template) => {
    onTemplateSelect(template);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setFilters({ category: '', search: '' });
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      
      if (currentPage <= 3) {
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxVisiblePages + 1;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading && templates.length === 0) {
    return (
      <div className="template-list-loading">
        Loading templates...
      </div>
    );
  }

  return (
    <div className="template-list">
      <div className="template-list-header">
        <div className="header-left">
          <h2>Document Templates</h2>
          <div className="templates-count">
            {totalCount} template{totalCount !== 1 ? 's' : ''} found
          </div>
        </div>
        <button 
          className="btn-new-template"
          onClick={onNewTemplate}
        >
          New Template
        </button>
      </div>

      <div className="template-list-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search templates..."
            value={filters.search}
            onChange={handleSearchChange}
            className="search-input"
          />
          {filters.search && (
            <button 
              className="clear-search"
              onClick={() => setFilters({...filters, search: ''})}
            >
              X
            </button>
          )}
        </div>

        <div className="filter-container">
          <select
            value={filters.category}
            onChange={handleCategoryChange}
            className="category-select"
          >
            <option value="">All Categories</option>
            <option value="legal">Legal</option>
            <option value="hr">HR</option>
            <option value="finance">Finance</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
          
          {(filters.category || filters.search) && (
            <button 
              className="btn-reset-filters"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : null}

      <div className="template-list-content">
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">No Templates</div>
            <h3>No templates found</h3>
            <p>
              {filters.search || filters.category 
                ? "Try changing your search criteria or clear filters"
                : "Create your first template by clicking the 'New Template' button"
              }
            </p>
            {(filters.search || filters.category) && (
              <button 
                className="btn-clear-all"
                onClick={handleResetFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {templates.map(template => (
              <div
                key={template._id}
                className="template-item"
                onClick={() => handleTemplateClick(template)}
              >
                <div className="template-item-header">
                  <div>
                    <h3 className="template-name">{template.name}</h3>
                    <div className="template-meta">
                      <span className="template-category">{template.category}</span>
                      <span className="template-department">{template.department}</span>
                      <span className={`template-status status-${template.metadata?.status || 'draft'}`}>
                        {template.metadata?.status || 'draft'}
                      </span>
                    </div>
                  </div>
                  <div className="template-version-info">
                    <span className="template-version">v{template.metadata?.version || '1.0'}</span>
                  </div>
                </div>
                <p className="template-description">{template.description}</p>
                
                {template.tags && template.tags.length > 0 && (
                  <div className="template-tags">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="template-tag">#{tag}</span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="template-tag-more">+{template.tags.length - 3}</span>
                    )}
                  </div>
                )}
                
                <div className="template-footer">
                  <div className="template-author">
                    Author: {template.metadata?.author || 'Unknown'}
                  </div>
                  <div className="template-date">
                    {template.metadata?.lastModified 
                      ? new Date(template.metadata.lastModified).toLocaleDateString()
                      : 'No date'
                    }
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {getPageNumbers().map(page => (
              <button
                key={page}
                className={`page-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="page-dots">...</span>
                <button
                  className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <div className="page-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default TemplateList;