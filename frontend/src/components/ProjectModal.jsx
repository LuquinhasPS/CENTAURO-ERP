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
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);

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
    value: '',
    date: '',
    invoice_number: '',
    description: ''
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
      } else if (activeTab === 'purchases') {
        const res = await getPurchases(project.id);
        const enrichedPurchases = res.data.map(p => ({
          ...p,
          project_tag: project.tag,
          project_name: project.name,
          client_name: getClientName(project.client_id)
        }));
        setPurchases(enrichedPurchases);
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

  const calculateRequestTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleAddBilling = async (e) => {
    e.preventDefault();

    // Validation: Check if billing would exceed budget
    const billingValue = parseFloat(billingFormData.value);

    // Calculate total invoiced (only PAGO status)
    const currentInvoiced = billings.reduce((sum, b) => {
      if (b.status === 'PAGO') {
        return sum + parseFloat(b.value);
      }
      return sum;
    }, 0);

    const budget = parseFloat(projectDetails.budget) || 0;
    // Note: Remaining budget calculation might need adjustment if we only count PAGO as invoiced.
    // Usually, "Remaining to Bill" should consider everything billed (even if not paid), 
    // but the user specifically asked for "Total Faturado" to be PAGO only.
    // I will keep the budget check against ALL billings to prevent over-billing, 
    // but display "Total Faturado" as PAGO only.

    const totalBilled = billings.reduce((sum, b) => sum + parseFloat(b.value), 0);
    const remaining = budget - totalBilled;

    if (billingValue > remaining) {
      alert(`Valor excede o orçamento disponível!\nRestante: R$ ${remaining.toFixed(2)}\nValor digitado: R$ ${billingValue.toFixed(2)}`);
      return;
    }

    try {
      await createProjectBilling(project.id, {
        ...billingFormData,
        value: billingValue,
        project_id: project.id
      });
      setShowBillingForm(false);
      setBillingFormData({ value: '', date: '', invoice_number: '', description: '' });
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
      return acc + Number(curr.value);
    }
    return acc;
  }, 0);

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
            <div className="tab-content">
              <div className="tab-header">
                <h3>Informações do Projeto</h3>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" onClick={() => onEdit(project)}>
                    <Edit size={16} /> Editar
                  </button>
                )}
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>Nº Projeto:</label>
                  <span>{project.project_number || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Tag:</label>
                  <span>{project.tag || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Cliente:</label>
                  <span>{getClientName(project.client_id)}</span>
                </div>
                <div className="info-item">
                  <label>Orçamento:</label>
                  <span>R$ {projectDetails.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>

                {/* Cost Breakdown */}
                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>Detalhamento de Custos (Realizado)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block' }}>bricks Materiais/Serviços</label>
                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#334155' }}>
                        R$ {(purchases.reduce((acc, p) => acc + (p.total_price || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block' }}>hard_hat Mão de Obra</label>
                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#334155' }}>
                        R$ {(projectDetails.total_labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block' }}>moneybag Total Geral</label>
                      <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                        R$ {((purchases.reduce((acc, p) => acc + (p.total_price || 0), 0)) + (Number(projectDetails.total_labor_cost) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="info-item">
                  <label>Coordenador:</label>
                  <span>{project.coordinator || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Tamanho Equipe:</label>
                  <span>{project.team_size || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Faturado:</label>
                  <span>R$ {totalFaturadoPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="info-item">
                  <label>Início Estimado:</label>
                  <span>{formatDateUTC(project.estimated_start_date)}</span>
                </div>
                <div className="info-item">
                  <label>Fim Estimado:</label>
                  <span>{formatDateUTC(project.estimated_end_date)}</span>
                </div>
                <div className="info-item">
                  <label>A Faturar:</label>
                  <span>R$ {((projectDetails.budget || 0) - totalFaturadoPago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="info-item">
                  <label>Início Real:</label>
                  <span>{formatDateUTC(project.start_date)}</span>
                </div>
                <div className="info-item">
                  <label>Fim Real:</label>
                  <span>{formatDateUTC(project.end_date)}</span>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <label>Escopo:</label>
                  <span className="scope-text">{project.scope || 'N/A'}</span>
                </div>
              </div>
            </div>
          )
          }

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
                          <p><strong>Total:</strong> R$ {calculateRequestTotal(request.items).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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

                <div className="billing-summary card">
                  <div className="summary-item">
                    <label>Total Orçado</label>
                    <span>R$ {projectDetails.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                  </div>
                  <div className="summary-item">
                    <label>Total Faturado</label>
                    <span className="text-success">R$ {totalFaturadoPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-item">
                    <label>Restante</label>
                    <span className="text-warning">R$ {((projectDetails.budget || 0) - totalFaturadoPago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {showBillingForm && (
                  <form className="resource-form" onSubmit={handleAddBilling}>
                    <input
                      type="number"
                      placeholder="Valor (R$)"
                      step="0.01"
                      value={billingFormData.value}
                      onChange={(e) => setBillingFormData({ ...billingFormData, value: e.target.value })}
                      required
                    />
                    {/* Date removed as per simplified workflow */}
                    <input
                      type="text"
                      placeholder="Descrição (ex: 1ª Medição)"
                      value={billingFormData.description}
                      onChange={(e) => setBillingFormData({ ...billingFormData, description: e.target.value })}
                      required
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBillingForm(false)}>Cancelar</button>
                  </form>
                )}

                <div className="resource-list">
                  {billings.map(billing => (
                    <div key={billing.id} className="resource-item">
                      <div className="resource-info">
                        <DollarSign size={20} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>R$ {parseFloat(billing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
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
