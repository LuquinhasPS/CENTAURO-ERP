import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * ProjectPopover - Quick project selection popover for Excel-like allocation
 */
const ProjectPopover = ({
  projects = [],
  clients = [],
  onSelect,
  onClose,
  style = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  // Auto-focus search input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Get client name for a project
  const getClientName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return '';
    const client = clients.find(c => c.id === project.client_id);
    return client?.name || '';
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    const clientName = getClientName(project.id);
    const searchLower = searchTerm.toLowerCase();
    return (
      project.name?.toLowerCase().includes(searchLower) ||
      project.tag?.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  });

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredProjects.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProjects[selectedIndex]) {
        onSelect(filteredProjects[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 100,
        minWidth: '280px',
        maxWidth: '320px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        ...style
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Header */}
      <div style={{
        padding: '8px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Search size={16} style={{ color: '#94a3b8' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar projeto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            padding: '4px 0',
            background: 'transparent'
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            color: '#94a3b8'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Projects List */}
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {filteredProjects.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px'
          }}>
            Nenhum projeto encontrado
          </div>
        ) : (
          filteredProjects.map((project, index) => {
            const clientName = getClientName(project.id);
            const isSelected = index === selectedIndex;

            return (
              <div
                key={project.id}
                onClick={() => onSelect(project)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: isSelected ? '#eef2ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#1e293b',
                  marginBottom: '2px'
                }}>
                  {project.tag || project.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b'
                }}>
                  {clientName} • {project.name}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Hint Footer */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '10px',
        color: '#94a3b8',
        display: 'flex',
        gap: '12px'
      }}>
        <span>↑↓ navegar</span>
        <span>Enter selecionar</span>
        <span>Esc fechar</span>
      </div>
    </div>
  );
};

export default ProjectPopover;
