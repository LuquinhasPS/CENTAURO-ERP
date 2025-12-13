import { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Truck, Clock, Package, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPurchases, getProjects } from '../services/api';
import RequestDetailsModal from './RequestDetailsModal';
import './PurchaseManagerWidget.css';

const PurchaseManagerWidget = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('approvals');
  const [purchases, setPurchases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Get user permissions
  const approvalPermissions = user?.permissions?.approvals || {};
  const isSuperuser = user?.is_superuser || false;

  // Get user's name (from collaborator or email)
  const userName = user?.collaborator_name || user?.email?.split('@')[0] || '';

  const canApproveTech = isSuperuser || approvalPermissions.approve_technical || false;
  const canApproveControl = isSuperuser || approvalPermissions.approve_budget || false;
  const canApproveFinance = isSuperuser || approvalPermissions.approve_finance || false;
  const hasAnyApprovalPermission = canApproveTech || canApproveControl || canApproveFinance;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, projectsRes] = await Promise.all([
        getPurchases(),
        getProjects()
      ]);
      setPurchases(purchasesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get project coordinator by project_id
  const getProjectCoordinator = (projectId) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.coordinator || null;
  };

  // Filter pending approvals - only projects where user is coordinator
  const getPendingApprovals = () => {
    return purchases.filter(p => {
      if (p.status === 'rejected' || p.status === 'approved') return false;

      // First check if user is coordinator of this project (unless superuser)
      if (!isSuperuser) {
        const projectCoordinator = getProjectCoordinator(p.project_id);
        if (!projectCoordinator) return false;
        const isCoordinator = projectCoordinator.toLowerCase() === userName.toLowerCase();
        if (!isCoordinator) return false;
      }

      // Check which approval is needed and if user can approve it
      if (!p.tech_approval_at && canApproveTech) return true;
      if (p.tech_approval_at && !p.control_approval_at && canApproveControl) return true;
      if (p.tech_approval_at && p.control_approval_at && !p.finance_approval_at && canApproveFinance) return true;

      return false;
    });
  };

  // Get tracking items - only where user is project coordinator
  const getTrackingItems = () => {
    return purchases.filter(p => {
      if (p.status === 'cancelled') return false;

      // Check if ALL items are delivered (completed) - hide from tracking
      const items = p.items || [];
      if (items.length > 0) {
        const allDelivered = items.every(item => item.status === 'delivered');
        if (allDelivered) return false; // Hide completed purchases
      }

      // Check if user is the coordinator of the project
      const projectCoordinator = getProjectCoordinator(p.project_id);
      if (!projectCoordinator) return false;

      // Compare coordinator name with user name (case insensitive)
      const isCoordinator = projectCoordinator.toLowerCase() === userName.toLowerCase();

      // Superuser sees all
      return isCoordinator || isSuperuser;
    }).slice(0, 10); // Limit to 10 items
  };

  const getApprovalStage = (purchase) => {
    if (purchase.status === 'approved') return { stage: 4, label: 'Aprovado', color: '#22c55e' };
    if (purchase.status === 'rejected') return { stage: 0, label: 'Rejeitado', color: '#ef4444' };
    if (!purchase.tech_approval_at) return { stage: 1, label: 'Aguardando Técnica', color: '#f59e0b' };
    if (!purchase.control_approval_at) return { stage: 2, label: 'Aguardando Controle', color: '#f59e0b' };
    if (!purchase.finance_approval_at) return { stage: 3, label: 'Aguardando Financeiro', color: '#f59e0b' };
    return { stage: 4, label: 'Aprovado', color: '#22c55e' };
  };

  const getItemStatus = (purchase) => {
    const items = purchase.items || [];
    if (items.length === 0) return { status: 'pending', label: 'Sem itens', item: null };

    // Find non-delivered items and sort by expected_date (earliest first)
    const pendingItems = items.filter(item => item.status !== 'delivered');

    // Sort by expected_date (earliest first), items without date go to end
    pendingItems.sort((a, b) => {
      if (!a.expected_date && !b.expected_date) return 0;
      if (!a.expected_date) return 1;
      if (!b.expected_date) return -1;
      return new Date(a.expected_date) - new Date(b.expected_date);
    });

    const targetItem = pendingItems[0] || items[0]; // Fallback to first if all delivered

    const statusMap = {
      'pending': { label: 'Pendente', color: '#94a3b8', icon: Clock },
      'quoted': { label: 'Cotado', color: '#f59e0b', icon: Package },
      'bought': { label: 'Comprado', color: '#3b82f6', icon: ShoppingCart },
      'in_stock': { label: 'Em Estoque', color: '#8b5cf6', icon: Package },
      'delivered': { label: 'Entregue', color: '#22c55e', icon: CheckCircle },
      'cancelled': { label: 'Cancelado', color: '#ef4444', icon: AlertCircle }
    };

    return { ...statusMap[targetItem.status] || statusMap['pending'], item: targetItem };
  };

  const getDeliveryInfo = (purchase) => {
    const items = purchase.items || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find earliest expected date from NON-DELIVERED items only
    let earliestDate = null;
    for (const item of items) {
      // Skip delivered items
      if (item.status === 'delivered') continue;

      if (item.expected_date) {
        // Parse date as local timezone (not UTC)
        const [year, month, day] = item.expected_date.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
        }
      }
    }

    if (!earliestDate) {
      return { text: 'Sem previsão', isLate: false, isSoon: false };
    }

    const diffDays = Math.ceil((earliestDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Atrasado (${earliestDate.toLocaleDateString('pt-BR')})`,
        isLate: true,
        isSoon: false
      };
    } else if (diffDays === 0) {
      return { text: 'Entrega Hoje', isLate: false, isSoon: true };
    } else if (diffDays === 1) {
      return { text: 'Chega Amanhã', isLate: false, isSoon: true };
    } else if (diffDays <= 7) {
      return {
        text: `Em ${diffDays} dias (${earliestDate.toLocaleDateString('pt-BR')})`,
        isLate: false,
        isSoon: true
      };
    }

    return {
      text: earliestDate.toLocaleDateString('pt-BR'),
      isLate: false,
      isSoon: false
    };
  };

  const pendingApprovals = getPendingApprovals();
  const trackingItems = getTrackingItems();

  if (loading) {
    return (
      <div className="dashboard-widget purchase-manager-widget full-width">
        <div className="purchase-header">
          <h4><ShoppingCart size={18} /> Minhas Compras e Aprovações</h4>
        </div>
        <div className="widget-loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-widget purchase-manager-widget full-width">
      <div className="purchase-header">
        <h4><ShoppingCart size={18} /> Minhas Compras e Aprovações</h4>
      </div>

      {/* Tabs */}
      <div className="purchase-tabs">
        {hasAnyApprovalPermission && (
          <button
            className={`tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            Minhas Aprovações
            {pendingApprovals.length > 0 && (
              <span className="tab-badge">{pendingApprovals.length}</span>
            )}
          </button>
        )}
        <button
          className={`tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          Rastreio de Entregas
        </button>
      </div>

      {/* Tab Content */}
      <div className="purchase-tab-content">
        {/* Approvals Tab */}
        {activeTab === 'approvals' && hasAnyApprovalPermission && (
          <div className="approvals-list">
            {pendingApprovals.length === 0 ? (
              <div className="empty-state-inline">
                <CheckCircle size={24} className="success-icon" />
                <span>Nada pendente 🎉</span>
              </div>
            ) : (
              pendingApprovals.map(purchase => {
                const stage = getApprovalStage(purchase);
                return (
                  <div
                    key={purchase.id}
                    className="approval-item"
                    onClick={() => setSelectedRequest(purchase)}
                  >
                    <div className="approval-item-info">
                      <span className="approval-item-name">
                        {purchase.description || `Solicitação #${purchase.id}`}
                      </span>
                      <span className="approval-item-stage" style={{ color: stage.color }}>
                        {stage.label}
                      </span>
                    </div>
                    <ChevronRight size={18} className="chevron" />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="tracking-list">
            {trackingItems.length === 0 ? (
              <div className="empty-state-inline">
                <Package size={24} />
                <span>Nenhuma compra para rastrear</span>
              </div>
            ) : (
              trackingItems.map(purchase => {
                const itemStatus = getItemStatus(purchase);
                const deliveryInfo = getDeliveryInfo(purchase);

                return (
                  <div
                    key={purchase.id}
                    className="approval-item"
                    onClick={() => setSelectedRequest(purchase)}
                  >
                    <div className="approval-item-info">
                      <span className="approval-item-name">
                        {itemStatus.item?.description || purchase.description || `#${purchase.id}`}
                      </span>
                      <span className="approval-item-stage" style={{ color: itemStatus.color }}>
                        {itemStatus.label}
                      </span>
                    </div>
                    <div className={`tracking-item-date ${deliveryInfo.isLate ? 'late' : ''} ${deliveryInfo.isSoon ? 'soon' : ''}`}>
                      {deliveryInfo.isLate && <AlertCircle size={14} />}
                      {deliveryInfo.isSoon && <Truck size={14} />}
                      <span>{deliveryInfo.text}</span>
                    </div>
                    <ChevronRight size={18} className="chevron" />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Request Details Modal - Read Only from Dashboard */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={() => {
            loadData();
            // Refresh the selected request with new data
            getPurchases().then(res => {
              const updated = res.data.find(p => p.id === selectedRequest.id);
              if (updated) setSelectedRequest(updated);
            });
          }}
          context="purchases"
          readOnly={true}
        />
      )}
    </div>
  );
};

export default PurchaseManagerWidget;
