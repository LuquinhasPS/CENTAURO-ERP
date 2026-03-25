import { useState } from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { approvePurchase, rejectPurchase, clearPurchaseRejection } from '../../services/api';
import './ApprovalTimeline.css';

const ApprovalTimeline = ({ request, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null); // Which step is loading
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Auto-collapse if already approved or later
  const isFinalStatus = ['approved', 'quoted', 'ordered', 'received', 'bought', 'in_stock', 'delivered', 'partially_withdrawn'].includes(request.status);
  const [isExpanded, setIsExpanded] = useState(!isFinalStatus);

  // Check user permissions from role-based approvals
  const approvalPermissions = user?.permissions?.approvals || {};
  const isSuperuser = user?.is_superuser || false;

  const canApproveTech = isSuperuser || approvalPermissions.approve_technical || false;
  const canApproveControl = isSuperuser || approvalPermissions.approve_budget || false;
  const canApproveFinance = isSuperuser || approvalPermissions.approve_finance || false;
  const anyApprovalPermission = canApproveTech || canApproveControl || canApproveFinance;

  const steps = [
    {
      key: 'TECH',
      title: 'Validação Técnica',
      subtitle: 'Engenharia',
      approvedAt: request.tech_approval_at,
      approverName: request.tech_approver_name,
      canApprove: canApproveTech
    },
    {
      key: 'CONTROL',
      title: 'Controle de Projetos',
      subtitle: 'Orçamento',
      approvedAt: request.control_approval_at,
      approverName: request.control_approver_name,
      canApprove: canApproveControl
    },
    {
      key: 'FINANCE',
      title: 'Liberação Financeira',
      subtitle: 'Contas a Pagar',
      approvedAt: request.finance_approval_at,
      approverName: request.finance_approver_name,
      canApprove: canApproveFinance
    }
  ];

  const handleApprove = async (approvalType) => {
    setLoading(approvalType);
    try {
      await approvePurchase(request.id, approvalType);
      onUpdate();
    } catch (error) {
      console.error('Error approving:', error);
      alert(error.response?.data?.detail || 'Erro ao aprovar');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Por favor, informe o motivo da rejeição.');
      return;
    }
    setLoading('reject');
    try {
      await rejectPurchase(request.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting:', error);
      alert(error.response?.data?.detail || 'Erro ao rejeitar');
    } finally {
      setLoading(null);
    }
  };

  const handleClearRejection = async () => {
    setLoading('clear');
    try {
      await clearPurchaseRejection(request.id);
      onUpdate();
    } catch (error) {
      console.error('Error clearing rejection:', error);
      alert(error.response?.data?.detail || 'Erro ao limpar rejeição');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isRejected = request.status === 'rejected';

  // Styles for accordion header
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '0.5rem 0',
    marginBottom: isExpanded ? '1rem' : '0'
  };

  return (
    <div className="approval-timeline">
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className="approval-title" style={{ margin: 0 }}>
          Fluxo de Aprovação
          {/* Status summary if collapsed */}
          {!isExpanded && isFinalStatus && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '10px', fontWeight: 'normal' }}>
              ✓ Aprovado
            </span>
          )}
          {!isExpanded && isRejected && (
            <span style={{ fontSize: '0.8rem', color: '#ef4444', marginLeft: '10px', fontWeight: 'normal' }}>
              ✕ Rejeitado
            </span>
          )}
        </h4>
        {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
      </div>

      {isExpanded && (
        <>
          {/* Rejection Banner */}
          {isRejected && (
            <div className="rejection-banner">
              <AlertTriangle size={20} />
              <div className="rejection-info">
                <strong>Solicitação Rejeitada</strong>
                <p>Motivo: {request.rejection_reason}</p>
                <p className="rejection-meta">
                  Por {request.rejected_by_name || 'Desconhecido'} em {formatDate(request.rejected_at)}
                </p>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleClearRejection}
                disabled={loading === 'clear'}
              >
                {loading === 'clear' ? 'Limpando...' : 'Reabrir'}
              </button>
            </div>
          )}

          {/* Timeline Steps */}
          <div className="timeline-steps">
            {steps.map((step, index) => {
              const isApproved = !!step.approvedAt;
              const isPending = !isApproved && !isRejected;
              const isLockedByTech = !request.tech_approval_at && step.key !== 'TECH';

              return (
                <div key={step.key} className={`timeline-step ${isApproved ? 'approved' : ''} ${isRejected ? 'rejected' : ''}`}>
                  <div className="step-connector">
                    {index > 0 && <div className={`connector-line ${isApproved ? 'active' : ''}`} />}
                  </div>

                  <div className="step-icon">
                    {isApproved ? (
                      <CheckCircle size={24} className="icon-approved" />
                    ) : isRejected ? (
                      <XCircle size={24} className="icon-rejected" />
                    ) : (
                      <Clock size={24} className="icon-pending" />
                    )}
                  </div>

                  <div className="step-content">
                    <div className="step-header">
                      <span className="step-title">{step.title}</span>
                      <span className="step-subtitle">{step.subtitle}</span>
                    </div>

                    {isApproved && (
                      <div className="step-approval-info">
                        <span className="approved-by">
                          ✓ {step.approverName || 'Aprovador'}
                        </span>
                        <span className="approved-at">
                          {formatDate(step.approvedAt)}
                        </span>
                      </div>
                    )}

                    {isPending && step.canApprove && (
                      <div className="step-actions">
                        <button
                          className={`btn btn-sm ${isLockedByTech ? 'btn-secondary text-slate-500 opacity-60 cursor-not-allowed' : 'btn-success'}`}
                          onClick={() => !isLockedByTech && handleApprove(step.key)}
                          disabled={loading === step.key || isLockedByTech}
                          title={isLockedByTech ? "Aguardando aprovação da Engenharia" : "Clique para aprovar"}
                        >
                          {loading === step.key ? 'Aprovando...' : (isLockedByTech ? 'Aguardando Eng.' : 'Aprovar')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reject Button - Only show if not rejected and user can approve something */}
      {isExpanded && !isRejected && anyApprovalPermission && (
        <div className="rejection-action">
          <button
            className="btn btn-sm btn-danger-outline"
            onClick={() => setShowRejectModal(true)}
          >
            <XCircle size={16} /> Rejeitar Solicitação
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="reject-modal-overlay">
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Rejeitar Solicitação</h4>
            <p>Informe o motivo da rejeição:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={4}
            />
            <div className="reject-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={loading === 'reject'}
              >
                {loading === 'reject' ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalTimeline;
