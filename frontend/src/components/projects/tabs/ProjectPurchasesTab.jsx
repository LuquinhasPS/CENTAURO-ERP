import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { formatDateUTC, formatCurrency } from '../../../utils/formatters';
import RequestDetailsModal from '../../purchases/RequestDetailsModal';

const ProjectPurchasesTab = ({ project, purchases, canEdit, onSelectRequest, onUpdate }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const calculateRequestTotal = (req) => {
    return (req.items || []).reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0) + (parseFloat(req.shipping_cost) || 0);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="tab-content" style={{ padding: '1rem' }}>
      <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Solicitações de Compra</h3>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Nova Solicitação
          </button>
        )}
      </div>

      <div className="project-purchases-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {purchases.length === 0 ? (
          <div className="empty-message" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
            <Package size={32} />
            <p>Nenhuma solicitação de compra neste projeto.</p>
          </div>
        ) : (
          purchases.map(request => (
            <div
              key={request.id}
              className="purchase-item clickable"
              onClick={() => onSelectRequest(request)}
              style={{ cursor: 'pointer' }}
            >
              <div className="purchase-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#0f172a' }}>#{request.id} - {request.description}</strong>
                <span className={`status-badge ${request.status}`} style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#e2e8f0',
                  color: '#475569',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {
                    {
                      'pending': 'Pendente',
                      'approved': 'Aprovado',
                      'rejected': 'Rejeitado',
                      'ordered': 'Comprado',
                      'received': 'Retirado',
                      'cancelled': 'Cancelado'
                    }[request.status] || request.status
                  }
                </span>
              </div>
              <div className="purchase-details" style={{ fontSize: '0.875rem', color: '#64748b' }}>
                <p style={{ margin: '0.25rem 0' }}><strong>Solicitante:</strong> {request.requester || '-'}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Total:</strong> {formatCurrency(calculateRequestTotal(request))}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Data:</strong> {formatDateUTC(request.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <RequestDetailsModal
          request={null} // New Request
          project={project} // Pass project context
          onClose={() => setShowCreateModal(false)}
          onUpdate={handleCreateSuccess}
          context="projects"
        />
      )}
    </div>
  );
};

export default ProjectPurchasesTab;
