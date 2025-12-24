import { useState, useEffect } from 'react';
import {
  X, Users, Wrench, Truck, Plus, Trash2, Calendar, Edit,
  DollarSign, ShoppingCart, Package, FileText, MessageSquare, Send
} from 'lucide-react';
import {
  getCollaborators, getTools, getFleet, getClients, getProject,
  addProjectCollaborator, removeProjectCollaborator,
  addProjectTool, removeProjectTool,
  addProjectVehicle, removeProjectVehicle,
  createProjectBilling, deleteProjectBilling,
  getPurchases, createPurchase,
  getProjectCollaborators, getProjectTools, getProjectVehicles,
  getProjectFeedbacks, createProjectFeedback, deleteProjectFeedback
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import RequestDetailsModal from './RequestDetailsModal';
import ConfirmModal from './ConfirmModal';
import './ProjectModal.css';

// Helper to format YYYY-MM-DD strings without timezone shift
// Appends T12:00:00 to force noon local time, preventing day shift due to timezone
const formatDateUTC = (dateString) => {
  if (!dateString) return 'N/A';
  if (dateString.includes('T')) return new Date(dateString).toLocaleDateString('pt-BR');
  return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR');
};

const ProjectModal = ({ project, onClose, onEdit, onDelete, canEdit = true }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);

  // Get requester name from logged user
  const getRequesterName = () => {
    return user?.collaborator_name || user?.email?.split('@')[0] || '';
  };

  // Resources
  const [projectCollaborators, setProjectCollaborators] = useState([]);
  const [projectTools, setProjectTools] = useState([]);
  const [projectVehicles, setProjectVehicles] = useState([]);
  const [purchases, setPurchases] = useState([]); // This will now hold Requests
  const [billings, setBillings] = useState([]);
  const [projectDetails, setProjectDetails] = useState(project);

  // Available resources for selection
  const [availableCollaborators, setAvailableCollaborators] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);

  // Forms
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [showToolForm, setShowToolForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);

  // Request Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Billing Deletion Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [billingToDelete, setBillingToDelete] = useState(null);

  const [collabFormData, setCollabFormData] = useState({
    collaborator_id: '',
    role: '',
    role: '',
    start_date: '',
    end_date: '',
    include_weekends: false
  });

  const [toolFormData, setToolFormData] = useState({
    tool_id: '',
    start_date: '',
    end_date: ''
  });

  const [vehicleFormData, setVehicleFormData] = useState({
    vehicle_id: '',
    start_date: '',
    end_date: ''
  });

  const [billingFormData, setBillingFormData] = useState({
    gross_value: '',
    date: '', // Previsão de recebimento
    invoice_number: '',
    description: '',
    category: 'SERVICE'
  });

  // Feedbacks
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackType, setFeedbackType] = useState('INFO');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Only close if no stacked modal is open
        if (!selectedRequest && !showConfirmModal) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedRequest, showConfirmModal]);

  useEffect(() => {
    if (project) {
      setProjectDetails(project);
      loadAllData();
    }
  }, [project, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load available resources
      const [collabsRes, toolsRes, vehiclesRes, clientsRes] = await Promise.all([
        getCollaborators(),
        getTools(),
        getFleet(),
        getClients()
      ]);
      setAvailableCollaborators(collabsRes.data);
      setAvailableTools(toolsRes.data);
      setAvailableVehicles(vehiclesRes.data);
      setAvailableClients(clientsRes.data);

      // Always fetch fresh project details (including billings)
      const projectRes = await getProject(project.id);
      setProjectDetails(projectRes.data);
      setBillings(projectRes.data.billings || []);

      // Always fetch purchases for Cost Summary on Info tab
      const purchasesRes = await getPurchases(project.id);
      const enrichedPurchases = purchasesRes.data.map(p => ({
        ...p,
        project_tag: project.tag,
        project_name: project.name,
        client_name: getClientName(project.client_id)
      }));
      setPurchases(enrichedPurchases);

      // Load project resources based on active tab
      if (activeTab === 'team') {
        const res = await getProjectCollaborators(project.id);
        setProjectCollaborators(res.data);
      } else if (activeTab === 'resources') {
        const [toolsRes, vehiclesRes] = await Promise.all([
          getProjectTools(project.id),
          getProjectVehicles(project.id)
        ]);
        setProjectTools(toolsRes.data);
        setProjectVehicles(vehiclesRes.data);
      } else if (activeTab === 'feedback') {
        const res = await getProjectFeedbacks(project.id);
        setFeedbacks(res.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    try {
      await addProjectCollaborator(project.id, {
        ...collabFormData,
        project_id: project.id,
        collaborator_id: parseInt(collabFormData.collaborator_id),
        include_weekends: collabFormData.include_weekends
      });
      setShowCollabForm(false);
      setCollabFormData({ collaborator_id: '', role: '', start_date: '', end_date: '', include_weekends: false });
      loadAllData();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      alert('Erro ao adicionar colaborador');
    }
  };

  const handleRemoveCollaborator = async (id) => {
    if (window.confirm('Remover este colaborador do projeto?')) {
      try {
        await removeProjectCollaborator(id);
        loadAllData();
      } catch (error) {
        console.error('Error removing collaborator:', error);
      }
    }
  };

  const handleAddTool = async (e) => {
    e.preventDefault();
    try {
      await addProjectTool(project.id, {
        project_id: project.id,
        tool_id: parseInt(toolFormData.tool_id),
        quantity: 1, // Default to 1 as requested (unique tools)
        start_date: toolFormData.start_date || null,
        end_date: toolFormData.end_date || null,
        include_weekends: toolFormData.include_weekends
      });
      setShowToolForm(false);
      setToolFormData({ tool_id: '', start_date: '', end_date: '', include_weekends: false });
      loadAllData();
    } catch (error) {
      console.error('Error adding tool:', error);
      alert('Erro ao adicionar ferramenta: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRemoveTool = async (id) => {
    if (window.confirm('Remover esta ferramenta do projeto?')) {
      try {
        await removeProjectTool(id);
        loadAllData();
      } catch (error) {
        console.error('Error removing tool:', error);
      }
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await addProjectVehicle(project.id, {
        project_id: project.id,
        vehicle_id: parseInt(vehicleFormData.vehicle_id),
        start_date: vehicleFormData.start_date || null,
        end_date: vehicleFormData.end_date || null,
        include_weekends: vehicleFormData.include_weekends
      });
      setShowVehicleForm(false);
      setVehicleFormData({ vehicle_id: '', start_date: '', end_date: '', include_weekends: false });
      loadAllData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Erro ao adicionar veículo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRemoveVehicle = async (id) => {
    if (window.confirm('Remover este veículo do projeto?')) {
      try {
        await removeProjectVehicle(id);
        loadAllData();
      } catch (error) {
        console.error('Error removing vehicle:', error);
      }
    }
  };

  const handleCreateRequest = async () => {
    try {
      const newRequest = {
        project_id: project.id,
        description: 'Nova Solicitação',
        requester: getRequesterName(), // Auto-fill requester with logged user
        status: 'pending',
        items: []
      };
      const response = await createPurchase(newRequest);
      await loadAllData();
      await loadAllData();
      // Open the newly created request
      setSelectedRequest({
        ...response.data,
        project_tag: project.tag,
        project_name: project.name,
        client_name: getClientName(project.client_id)
      });
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Erro ao criar solicitação');
    }
  };

  const calculateRequestTotal = (request) => {
    const itemsTotal = (request.items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
    return itemsTotal + (request.shipping_cost || 0);
  };

  const handleAddBilling = async (e) => {
    e.preventDefault();

    // Validation: Check if billing would exceed budget
    const billingValue = parseFloat(billingFormData.gross_value);

    // Calculate total invoiced (only PAGO status)
    const currentInvoiced = billings.reduce((sum, b) => {
      if (b.status === 'PAGO') {
        return sum + parseFloat(b.gross_value || b.value || 0);
      }
      return sum;
    }, 0);

    const budget = parseFloat(projectDetails.budget) || 0;

    const totalBilled = billings.reduce((sum, b) => sum + parseFloat(b.gross_value || b.value || 0), 0);
    const remaining = budget - totalBilled;

    if (billingValue > remaining) {
      alert(`Valor excede o orçamento disponível!\nRestante: R$ ${remaining.toFixed(2)}\nValor digitado: R$ ${billingValue.toFixed(2)}`);
      return;
    }

    try {
      await createProjectBilling(project.id, {
        ...billingFormData,
        gross_value: billingValue,
        net_value: billingValue, // Default for simplified view
        value: billingValue, // Legacy support
        project_id: project.id
      });
      setShowBillingForm(false);
      setBillingFormData({ gross_value: '', date: '', invoice_number: '', description: '', category: 'SERVICE' });
      loadAllData();
    } catch (error) {
      console.error('Error adding billing:', error);
      alert('Erro ao adicionar faturamento');
    }
  };

  const handleDeleteBilling = (billing) => {
    if (billing.status !== 'PREVISTO') {
      return; // Should be handled by UI hiding the button, but safety check
    }
    setBillingToDelete(billing);
    setShowConfirmModal(true);
  };

  const confirmDeleteBilling = async () => {
    if (!billingToDelete) return;
    try {
      await deleteProjectBilling(billingToDelete.id);
      setShowConfirmModal(false);
      setBillingToDelete(null);
      loadAllData();
    } catch (error) {
      console.error('Error deleting billing:', error);
      alert(error.response?.data?.detail || 'Erro ao excluir faturamento');
    }
  };

  const getCollaboratorName = (id) => {
    const collab = availableCollaborators.find(c => c.id === id);
    return collab ? collab.name : 'N/A';
  };

  const getToolName = (id) => {
    const tool = availableTools.find(t => t.id === id);
    return tool ? tool.name : 'N/A';
  };

  const getVehicleName = (id) => {
    const vehicle = availableVehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.model} - ${vehicle.license_plate}` : 'N/A';
  };

  const getClientName = (id) => {
    const client = availableClients.find(c => c.id === id);
    return client ? client.name : 'N/A';
  };

  // Calculate Total Faturado (PAGO only) for display
  const totalFaturadoPago = billings.reduce((acc, curr) => {
    if (curr.status === 'PAGO') {
      return acc + Number(curr.gross_value || curr.value || 0);
    }
    return acc;
  }, 0);

  // Calculate Real Financials (Tax Breakdown) based on PAID billings
  const financialSummary = billings.reduce((acc, curr) => {
    if (curr.status === 'PAGO') {
      const gross = parseFloat(curr.gross_value || curr.value || 0);

      // Calculate Retained Taxes (Deducted by client)
      // Note: Logic matches the backend/frontend edit modal
      let retentions = 0;
      if (curr.category === 'SERVICE') {
        retentions = (
          (parseFloat(curr.retention_iss) || 0) +
          (parseFloat(curr.retention_inss) || 0) +
          (parseFloat(curr.retention_irrf) || 0) +
          (parseFloat(curr.retention_pis) || 0) +
          (parseFloat(curr.retention_cofins) || 0) +
          (parseFloat(curr.retention_csll) || 0)
        );
      }

      // Calculate Taxes to Pay (Paid by company later)
      const taxesToPay = (
        (parseFloat(curr.tax_iss) || 0) +
        (parseFloat(curr.tax_pis) || 0) +
        (parseFloat(curr.tax_cofins) || 0) +
        (parseFloat(curr.tax_irpj) || 0) +
        (parseFloat(curr.tax_icms) || 0) +
        (parseFloat(curr.tax_ipi) || 0) +
        (parseFloat(curr.value_st) || 0)
      );

      acc.retained += retentions;
      acc.taxes_to_pay += taxesToPay;
    }
    return acc;
  }, { retained: 0, taxes_to_pay: 0 });

  const totalImpostos = financialSummary.retained + financialSummary.taxes_to_pay;
  const liquidoReal = totalFaturadoPago - totalImpostos;

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;

    try {
      await createProjectFeedback(project.id, {
        message: feedbackInput,
        type: feedbackType
      });
      setFeedbackInput('');
      setFeedbackType('INFO');

      // Refresh list
      const res = await getProjectFeedbacks(project.id);
      setFeedbacks(res.data);
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Erro ao enviar mensagem');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta anotação?')) {
      try {
        await deleteProjectFeedback(id);
        const res = await getProjectFeedbacks(project.id);
        setFeedbacks(res.data);
      } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Erro ao excluir anotação');
      }
    }
  };


  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours} horas`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `há ${diffInDays} dias`;

    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="project-modal-overlay">
      <div className="project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-modal-header">
          <h2>{project.name}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>


        <div className="project-modal-tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <MessageSquare size={16} /> Diário
          </button>
          <button
            className={`tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} /> Equipe
          </button>
          <button
            className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <Wrench size={16} /> Recursos
          </button>
          <button
            className={`tab ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <ShoppingCart size={16} /> Compras
          </button>
          <button
            className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <DollarSign size={16} /> Faturamento
          </button>

          {canEdit && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <button
                className={`btn-icon-small ${deleteUnlocked ? 'danger' : ''}`}
                onClick={() => {
                  if (deleteUnlocked) {
                    onDelete(project.id);
                    setDeleteUnlocked(false);
                  } else {
                    setDeleteUnlocked(true);
                  }
                }}
                title={deleteUnlocked ? "Clique para excluir" : "Clique para desbloquear exclusão"}
                style={{
                  backgroundColor: deleteUnlocked ? 'var(--danger)' : 'var(--bg-tertiary)',
                  color: deleteUnlocked ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.3s'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="project-modal-content">
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>

              {/* Header / Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Visão Geral</h3>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>#{project.project_number} • {project.tag || 'Sem Tag'}</span>
                </div>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" onClick={() => onEdit(project)}>
                    <Edit size={16} /> Editar Dados
                  </button>
                )}
              </div>

              {/* Data Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>

                {/* 1. Project & Team Data */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} /> Dados & Equipe
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Cliente</label>
                      <span style={{ fontWeight: '500', color: '#334155' }}>{getClientName(project.client_id)}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Coordenador</label>
                      <span style={{ fontWeight: '500', color: '#334155' }}>{project.coordinator || 'Não definido'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Tamanho da Equipe</label>
                      <span style={{ fontWeight: '500', color: '#334155' }}>
                        {project.team_size ? `${project.team_size} pessoas` : '-'}
                        {(projectDetails.estimated_days || project.estimated_days) && (
                          <span style={{ color: '#64748b', marginLeft: '6px' }}>
                            • {(projectDetails.estimated_days || project.estimated_days)} dias
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Timeline */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> Prazos
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    {/* Grid for Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>

                      {/* Headers */}
                      <div></div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700' }}>Início</div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700' }}>Fim</div>

                      {/* Predicted Row */}
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Previsto</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                        {formatDateUTC(project.estimated_start_date)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                        {formatDateUTC(project.estimated_end_date)}
                      </div>

                      {/* Real Row */}
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0f172a' }}>Real</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                        {formatDateUTC(project.start_date) || '-'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                        {formatDateUTC(project.end_date) || '-'}
                      </div>

                    </div>

                    {project.warranty_months && project.end_date && (
                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Garantia ({project.warranty_months} m)</label>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: '600',
                          color: (() => {
                            const endDate = new Date(project.end_date + 'T12:00:00');
                            const warrantyEnd = new Date(endDate);
                            warrantyEnd.setMonth(warrantyEnd.getMonth() + project.warranty_months);
                            return warrantyEnd < new Date() ? '#ef4444' : '#10b981';
                          })()
                        }}>
                          Até {(() => {
                            const endDate = new Date(project.end_date + 'T12:00:00');
                            const warrantyEnd = new Date(endDate);
                            warrantyEnd.setMonth(warrantyEnd.getMonth() + project.warranty_months);
                            return warrantyEnd.toLocaleDateString('pt-BR');
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Contract Financials */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} /> Contrato
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Orçamento Total</label>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>R$ {Number(projectDetails.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Já Faturado</label>
                      <span style={{ fontWeight: '600', color: '#16a34a' }}>R$ {totalFaturadoPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Saldo a Faturar</label>
                      <span style={{ fontWeight: '600', color: '#f59e0b' }}>R$ {((Number(projectDetails.budget) || 0) - totalFaturadoPago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Cost Breakdown (Operational) */}
              <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>Detalhamento de Custos (Material & Mão de Obra)</h4>
                </div>
                <div style={{ padding: '1rem' }}>
                  {/* Header Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Tipo</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Material</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Mão de Obra</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Total</div>
                  </div>

                  {/* Previsto Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Previsto</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
                      R$ {(Number(projectDetails.material_value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
                      R$ {(Number(projectDetails.service_value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', textAlign: 'right', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                      R$ {((Number(projectDetails.material_value) || 0) + (Number(projectDetails.service_value) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Realizado Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Realizado</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
                      R$ {(purchases.reduce((acc, p) => acc + (p.items?.reduce((iAcc, item) => iAcc + (item.total_price || 0), 0) || 0) + (p.shipping_cost || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
                      R$ {(Number(projectDetails.total_labor_cost) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', textAlign: 'right', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                      R$ {((purchases.reduce((acc, p) => acc + (p.items?.reduce((iAcc, item) => iAcc + (item.total_price || 0), 0) || 0) + (p.shipping_cost || 0), 0)) + (Number(projectDetails.total_labor_cost) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Separator */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: '0.75rem' }}></div>

                  {/* Saldo Row */}
                  {(() => {
                    const previstoMaterial = Number(projectDetails.material_value) || 0;
                    const previstoMO = Number(projectDetails.service_value) || 0;
                    const realizadoMaterial = purchases.reduce((acc, p) => acc + (p.items?.reduce((iAcc, item) => iAcc + (item.total_price || 0), 0) || 0) + (p.shipping_cost || 0), 0);
                    const realizadoMO = Number(projectDetails.total_labor_cost) || 0;
                    const saldoMaterial = previstoMaterial - realizadoMaterial;
                    const saldoMO = previstoMO - realizadoMO;
                    const saldoTotal = saldoMaterial + saldoMO;
                    const getColor = (val) => val >= 0 ? '#16a34a' : '#dc2626';
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Economia</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: getColor(saldoMaterial), textAlign: 'right' }}>
                          R$ {saldoMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: getColor(saldoMO), textAlign: 'right' }}>
                          R$ {saldoMO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: getColor(saldoTotal), textAlign: 'right', background: val => val >= 0 ? '#f0fdf4' : '#fef2f2', padding: '4px', borderRadius: '4px' }}>
                          R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Scope Section */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>
                  <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} /> Escopo do Projeto
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  {project.scope || 'Nenhum escopo definido para este projeto.'}
                </p>
              </div>

            </div>
          )}

          {/* TAB: FEEDBACK (DIARY) */}
          {activeTab === 'feedback' && (
            <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
              <div className="feedback-timeline">
                {feedbacks.length === 0 ? (
                  <div className="empty-message">
                    <MessageSquare size={32} />
                    <p>Nenhum registro no diário deste projeto.</p>
                  </div>
                ) : (
                  feedbacks.map(fb => (
                    <div key={fb.id} className={`feedback-item ${fb.type.toLowerCase()}`}>
                      {canEdit && (
                        <button
                          className="delete-feedback-btn"
                          onClick={() => handleDeleteFeedback(fb.id)}
                          title="Excluir anotação"
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.2s, color 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="feedback-header" style={{ paddingRight: '24px' }}>
                        <div className="feedback-avatar">
                          {(fb.author_name || 'U').charAt(0)}
                        </div>
                        <span className="feedback-author">{fb.author_name || 'Usuário'}</span>
                        <span className="feedback-time">• {formatTimeAgo(fb.created_at)}</span>

                        {(fb.type === 'ALERTA' || fb.type === 'BLOQUEIO') && (
                          <span className={`type-badge ${fb.type.toLowerCase()}`}>
                            {fb.type}
                          </span>
                        )}
                      </div>
                      <div className="feedback-body">
                        {fb.message}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canEdit && (
                <form onSubmit={handleFeedbackSubmit} className="feedback-input-area">
                  <select
                    className="feedback-type-select"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                  >
                    <option value="INFO">Info</option>
                    <option value="ALERTA">Alerta</option>
                    <option value="BLOQUEIO">Bloqueio</option>
                  </select>
                  <textarea
                    className="feedback-input"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Digite uma atualização sobre o projeto..."
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFeedbackSubmit(e);
                      }
                    }}
                  />
                  <button type="submit" className="feedback-send-btn" disabled={!feedbackInput.trim()} title="Enviar">
                    <Send size={20} />
                  </button>
                </form>
              )}
            </div>
          )}

          {
            activeTab === 'team' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Colaboradores Alocados</h3>
                  {canEdit && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCollabForm(!showCollabForm)}>
                      <Plus size={16} /> Adicionar
                    </button>
                  )}
                </div>

                {showCollabForm && (
                  <form className="resource-form" onSubmit={handleAddCollaborator}>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Colaborador</label>
                      <select
                        value={collabFormData.collaborator_id}
                        onChange={(e) => setCollabFormData({ ...collabFormData, collaborator_id: e.target.value })}
                        required
                        style={{ width: '100%' }}
                      >
                        <option value="">Selecione...</option>
                        {availableCollaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - {c.role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Função</label>
                      <input
                        type="text"
                        placeholder="Ex: Motorista"
                        value={collabFormData.role}
                        onChange={(e) => setCollabFormData({ ...collabFormData, role: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Início</label>
                        <input
                          type="date"
                          value={collabFormData.start_date}
                          onChange={(e) => setCollabFormData({ ...collabFormData, start_date: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Fim</label>
                        <input
                          type="date"
                          value={collabFormData.end_date}
                          onChange={(e) => setCollabFormData({ ...collabFormData, end_date: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', flex: '1 1 100%' }}>
                      <label htmlFor="collab-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem', width: 'auto', flexGrow: 0, whiteSpace: 'nowrap' }}>Incluir Finais de Semana e Feriados</label>
                      <input
                        type="checkbox"
                        checked={collabFormData.include_weekends}
                        onChange={(e) => setCollabFormData({ ...collabFormData, include_weekends: e.target.checked })}
                        id="collab-weekends"
                        style={{ width: 'auto', margin: 0, flexShrink: 0 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>Salvar</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCollabForm(false)} style={{ height: '38px' }}>Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="resource-list">
                  {projectCollaborators.map(pc => (
                    <div key={pc.id} className="resource-item">
                      <div className="resource-info">
                        <Users size={20} />
                        <div>
                          <strong>{getCollaboratorName(pc.collaborator_id)}</strong>
                          {pc.role && <p className="resource-role">{pc.role}</p>}
                          {pc.start_date && (
                            <p className="resource-dates">
                              <Calendar size={14} />
                              {formatDateUTC(pc.start_date)}
                              {pc.end_date && ` - ${formatDateUTC(pc.end_date)}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <button className="btn-icon-small danger" onClick={() => handleRemoveCollaborator(pc.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {projectCollaborators.length === 0 && !showCollabForm && (
                    <p className="empty-message">Nenhum colaborador alocado neste projeto.</p>
                  )}
                </div>
              </div>
            )
          }

          {/* TAB: RESOURCES */}
          {
            activeTab === 'resources' && (
              <div className="tab-content">
                {/* Tools */}
                <div className="resource-section">
                  <div className="tab-header">
                    <h3><Wrench size={20} /> Ferramentas</h3>
                    {canEdit && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowToolForm(!showToolForm)}>
                        <Plus size={16} /> Adicionar
                      </button>
                    )}
                  </div>

                  {showToolForm && (
                    <form className="resource-form" onSubmit={handleAddTool}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Ferramenta</label>
                        <select
                          value={toolFormData.tool_id}
                          onChange={(e) => setToolFormData({ ...toolFormData, tool_id: e.target.value })}
                          required
                          style={{ width: '100%' }}
                        >
                          <option value="">Selecione...</option>
                          {availableTools.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-row" style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Início</label>
                          <input
                            type="date"
                            value={toolFormData.start_date}
                            onChange={(e) => setToolFormData({ ...toolFormData, start_date: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Fim</label>
                          <input
                            type="date"
                            value={toolFormData.end_date}
                            onChange={(e) => setToolFormData({ ...toolFormData, end_date: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', flex: '1 1 100%' }}>
                        <label htmlFor="tool-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem', width: 'auto', flexGrow: 0, whiteSpace: 'nowrap' }}>Incluir Finais de Semana e Feriados</label>
                        <input
                          type="checkbox"
                          checked={toolFormData.include_weekends}
                          onChange={(e) => setToolFormData({ ...toolFormData, include_weekends: e.target.checked })}
                          id="tool-weekends"
                          style={{ width: 'auto', margin: 0, flexShrink: 0 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>Salvar</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowToolForm(false)} style={{ height: '38px' }}>Cancelar</button>
                      </div>
                    </form>
                  )}

                  <div className="resource-list">
                    {projectTools.map(pt => (
                      <div key={pt.id} className="resource-item">
                        <div className="resource-info">
                          <Wrench size={20} />
                          <div>
                            <strong>{getToolName(pt.tool_id)}</strong>
                            {pt.start_date && (
                              <p className="resource-dates">
                                <Calendar size={14} />
                                {formatDateUTC(pt.start_date)}
                                {pt.end_date && ` - ${formatDateUTC(pt.end_date)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <button className="btn-icon-small danger" onClick={() => handleRemoveTool(pt.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {projectTools.length === 0 && !showToolForm && (
                      <p className="empty-message">Nenhuma ferramenta alocada.</p>
                    )}
                  </div>
                </div>

                {/* Vehicles */}
                <div className="resource-section">
                  <div className="tab-header">
                    <h3><Truck size={20} /> Veículos</h3>
                    {canEdit && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowVehicleForm(!showVehicleForm)}>
                        <Plus size={16} /> Adicionar
                      </button>
                    )}
                  </div>

                  {showVehicleForm && (
                    <form className="resource-form" onSubmit={handleAddVehicle}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Veículo</label>
                        <select
                          value={vehicleFormData.vehicle_id}
                          onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_id: e.target.value })}
                          required
                          style={{ width: '100%' }}
                        >
                          <option value="">Selecione...</option>
                          {availableVehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.model} - {v.license_plate}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Início</label>
                          <input
                            type="date"
                            value={vehicleFormData.start_date}
                            onChange={(e) => setVehicleFormData({ ...vehicleFormData, start_date: e.target.value })}
                            required
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Fim</label>
                          <input
                            type="date"
                            value={vehicleFormData.end_date}
                            onChange={(e) => setVehicleFormData({ ...vehicleFormData, end_date: e.target.value })}
                            required
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', flex: '1 1 100%' }}>
                        <label htmlFor="vehicle-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem', width: 'auto', flexGrow: 0, whiteSpace: 'nowrap' }}>Incluir Finais de Semana e Feriados</label>
                        <input
                          type="checkbox"
                          checked={vehicleFormData.include_weekends}
                          onChange={(e) => setVehicleFormData({ ...vehicleFormData, include_weekends: e.target.checked })}
                          id="vehicle-weekends"
                          style={{ width: 'auto', margin: 0, flexShrink: 0 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>Salvar</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVehicleForm(false)} style={{ height: '38px' }}>Cancelar</button>
                      </div>
                    </form>
                  )}

                  <div className="resource-list">
                    {projectVehicles.map(pv => (
                      <div key={pv.id} className="resource-item">
                        <div className="resource-info">
                          <Truck size={20} />
                          <div>
                            <strong>{getVehicleName(pv.vehicle_id)}</strong>
                            {pv.start_date && (
                              <p className="resource-dates">
                                <Calendar size={14} />
                                {formatDateUTC(pv.start_date)}
                                {pv.end_date && ` - ${formatDateUTC(pv.end_date)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <button className="btn-icon-small danger" onClick={() => handleRemoveVehicle(pv.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {projectVehicles.length === 0 && !showVehicleForm && (
                      <p className="empty-message">Nenhum veículo alocado.</p>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          {/* TAB: PURCHASES */}
          {
            activeTab === 'purchases' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Solicitações de Compra</h3>
                  {canEdit && (
                    <button className="btn btn-primary btn-sm" onClick={handleCreateRequest}>
                      <Plus size={16} /> Nova Solicitação
                    </button>
                  )}
                </div>

                <div className="purchases-list">
                  {purchases.length === 0 ? (
                    <div className="empty-message">
                      <Package size={32} />
                      <p>Nenhuma solicitação de compra neste projeto.</p>
                    </div>
                  ) : (
                    purchases.map(request => (
                      <div
                        key={request.id}
                        className="purchase-item clickable"
                        onClick={() => setSelectedRequest({
                          ...request,
                          project_tag: project.tag,
                          project_name: project.name,
                          client_name: getClientName(project.client_id)
                        })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="purchase-header">
                          <strong>#{request.id} - {request.description}</strong>
                          <span className={`status-badge ${request.status}`}>
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
                        <div className="purchase-details">
                          <p><strong>Solicitante:</strong> {request.requester || '-'}</p>
                          <p><strong>Total:</strong> R$ {calculateRequestTotal(request).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p><strong>Data:</strong> {new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          }

          {/* TAB: BILLING */}
          {
            activeTab === 'billing' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Histórico de Faturamento</h3>
                  {canEdit && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowBillingForm(!showBillingForm)}>
                      <Plus size={16} /> Novo Faturamento
                    </button>
                  )}
                </div>

                <div className="billing-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Card 1: Orçamento */}
                  <div className="card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>Orçamento Total</h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a' }}>
                      R$ {projectDetails.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      A Faturar: R$ {((projectDetails.budget || 0) - totalFaturadoPago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Card 2: Faturado Bruto */}
                  <div className="card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>Faturado (Bruto)</h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#3b82f6' }}>
                      R$ {totalFaturadoPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {((totalFaturadoPago / (projectDetails.budget || 1)) * 100).toFixed(1)}% do total
                    </div>
                  </div>

                  {/* Card 3: Impostos */}
                  <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f87171' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#ef4444', margin: '0 0 0.5rem 0' }}>Impostos Totais</h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626' }}>
                      R$ {totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                      {totalFaturadoPago > 0 ? ((totalImpostos / totalFaturadoPago) * 100).toFixed(1) : 0}% da receita
                    </div>
                  </div>

                  {/* Card 4: Líquido Real */}
                  <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #22c55e', backgroundColor: '#f0fdf4' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 0.5rem 0' }}>Receita Líquida Real</h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534' }}>
                      R$ {liquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                      Entra no caixa da empresa
                    </div>
                  </div>
                </div>

                {showBillingForm && (
                  <form className="resource-form" onSubmit={handleAddBilling}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '10px' }}>
                      <select
                        className="input"
                        value={billingFormData.category}
                        onChange={(e) => setBillingFormData({ ...billingFormData, category: e.target.value })}
                        required
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="SERVICE">Serviço</option>
                        <option value="MATERIAL">Material</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Valor Bruto (R$)"
                        step="0.01"
                        value={billingFormData.gross_value}
                        onChange={(e) => setBillingFormData({ ...billingFormData, gross_value: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Descrição (ex: 1ª Medição)"
                        value={billingFormData.description}
                        onChange={(e) => setBillingFormData({ ...billingFormData, description: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBillingForm(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    </div>
                  </form>
                )}

                <div className="resource-list">
                  {billings.map(billing => (
                    <div key={billing.id} className="resource-item">
                      <div className="resource-info">
                        <DollarSign size={20} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>R$ {parseFloat(billing.gross_value || billing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <span className={`status-badge ${{
                              'PREVISTO': 'badge-gray',
                              'EMITIDA': 'badge-blue',
                              'PAGO': 'badge-green',
                              'VENCIDA': 'badge-red',
                              'CANCELADA': 'badge-black',
                              'SUBSTITUIDA': 'badge-orange'
                            }[billing.status] || 'badge-gray'
                              }`}>
                              {billing.status}
                            </span>
                          </div>
                          <p className="resource-role">
                            {billing.date ? formatDateUTC(billing.date) : 'Data não definida'}
                            {billing.invoice_number && ` - NF ${billing.invoice_number}`}
                            {billing.description && ` - ${billing.description}`}
                          </p>
                        </div>
                      </div>
                      {billing.status === 'PREVISTO' && canEdit && (
                        <button className="btn-icon-small danger" onClick={() => handleDeleteBilling(billing)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {billings.length === 0 && !showBillingForm && (
                    <p className="empty-message">Nenhum faturamento lançado.</p>
                  )}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Stacked Modal for Request Details */}
      {
        selectedRequest && (
          <RequestDetailsModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onUpdate={loadAllData}
            context="projects"
            readOnly={!canEdit}
          />
        )
      }

      {/* Confirm Modal for Billing Deletion */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDeleteBilling}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este faturamento? Esta ação não pode ser desfeita."
      />
    </div >
  );
};

export default ProjectModal;
