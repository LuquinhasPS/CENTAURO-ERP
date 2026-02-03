import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  actions = true,
  searchable = false, // If handled externally, usually false here or implement internal search
  rowKey = 'id',
  onRowClick
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting
  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle nulls
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} />;
    return <ArrowDown size={14} />;
  };

  if (data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        Nenhum dado encontrado.
      </div>
    );
  }

  return (
    <div className="datatable-container" style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map((col, index) => (
                <th
                  key={index}
                  style={{
                    padding: '0.35rem 0.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: col.accessor ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem'
                  }}
                  onClick={() => col.accessor && requestSort(col.accessor)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {col.header}
                    {col.accessor && getSortIcon(col.accessor)}
                  </div>
                </th>
              ))}
              {actions && <th style={{ padding: '0.35rem 0.5rem', width: '100px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIndex) => (
              <tr
                key={row[rowKey] || rowIndex}
                style={{
                  borderBottom: rowIndex === currentData.length - 1 ? 'none' : '1px solid #f1f5f9',
                  transition: 'background 0.1s',
                  cursor: onRowClick ? 'pointer' : 'default',
                  fontSize: '0.75rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} style={{ padding: '0.35rem 0.5rem', color: '#334155', whiteSpace: 'nowrap' }}>
                    {col.render ? col.render(row) : (col.accessor ? row[col.accessor] : '')}
                  </td>
                ))}
                {actions && (
                  <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="btn-icon-small"
                          title="Editar"
                          style={{ color: '#3b82f6', background: '#eff6ff', padding: '2px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="btn-icon-small danger"
                          title="Excluir"
                          style={{ color: '#ef4444', background: '#fef2f2', padding: '2px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedData.length)} de {sortedData.length} registros
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px',
                borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(currentPage - p) <= 1)
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && <span style={{ padding: '0 4px', alignSelf: 'center' }}>...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '6px',
                      border: currentPage === page ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                      background: currentPage === page ? '#eff6ff' : 'white',
                      color: currentPage === page ? '#3b82f6' : '#64748b',
                      fontWeight: currentPage === page ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px',
                borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
