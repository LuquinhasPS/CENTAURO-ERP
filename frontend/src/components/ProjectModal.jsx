import { useState, useEffect } from 'react';
import {
  X, Users, Wrench, Truck, Plus, Trash2, Calendar, Edit,
  DollarSign, ShoppingCart, Package, FileText
} from 'lucide-react';
import {
  getCollaborators, getTools, getFleet, getClients, getProject,
  addProjectCollaborator, removeProjectCollaborator,
  addProjectTool, removeProjectTool,
  addProjectVehicle, removeProjectVehicle,
  createProjectBilling, deleteProjectBilling,
  getPurchases, createPurchase,
  getProjectCollaborators, getProjectTools, getProjectVehicles
} from '../services/api';
import RequestDetailsModal from './RequestDetailsModal';
import ConfirmModal from './ConfirmModal';
import './ProjectModal.css';

const ProjectModal = ({ project, onClose, onEdit, onDelete }) => {
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
    start_date: '',
    end_date: ''
  });

  const [toolFormData, setToolFormData] = useState({
    tool_id: '',
    quantity: 1,
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
        setPurchases(res.data);
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
        collaborator_id: parseInt(collabFormData.collaborator_id)
      });
      setShowCollabForm(false);
      setCollabFormData({ collaborator_id: '', role: '', start_date: '', end_date: '' });
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
        ...toolFormData,
        project_id: project.id,
        tool_id: parseInt(toolFormData.tool_id),
        quantity: parseInt(toolFormData.quantity)
      });
      setShowToolForm(false);
      setToolFormData({ tool_id: '', quantity: 1, start_date: '', end_date: '' });
      loadAllData();
    } catch (error) {
      console.error('Error adding tool:', error);
      alert('Erro ao adicionar ferramenta');
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
        ...vehicleFormData,
        project_id: project.id,
        vehicle_id: parseInt(vehicleFormData.vehicle_id)
      });
      setShowVehicleForm(false);
      setVehicleFormData({ vehicle_id: '', start_date: '', end_date: '' });
      loadAllData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Erro ao adicionar veículo');
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
      // Open the newly created request
      setSelectedRequest(response.data);
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
        </div>
        <div className="project-modal-content">
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="tab-content">
              <div className="tab-header">
                <h3>Informações do Projeto</h3>
                <button className="btn btn-primary btn-sm" onClick={() => onEdit(project)}>
                  <Edit size={16} /> Editar
                </button>
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
                  <span>{project.estimated_start_date ? new Date(project.estimated_start_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Fim Estimado:</label>
                  <span>{project.estimated_end_date ? new Date(project.estimated_end_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>A Faturar:</label>
                  <span>R$ {((projectDetails.budget || 0) - totalFaturadoPago)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="info-item">
                  <label>Início Real:</label>
                  <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Fim Real:</label>
                  <span>{project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <label>Escopo:</label>
                  <span className="scope-text">{project.scope || 'N/A'}</span>
                </div>
              </div>
            </div>
          )
          }

          {
            activeTab === 'team' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Colaboradores Alocados</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCollabForm(!showCollabForm)}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>

                {showCollabForm && (
                  <form className="resource-form" onSubmit={handleAddCollaborator}>
                    <select
                      value={collabFormData.collaborator_id}
                      onChange={(e) => setCollabFormData({ ...collabFormData, collaborator_id: e.target.value })}
                      required
                    >
                      <option value="">Selecione um colaborador</option>
                      {availableCollaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.role}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Função no projeto"
                      value={collabFormData.role}
                      onChange={(e) => setCollabFormData({ ...collabFormData, role: e.target.value })}
                    />
                    <input
                      type="date"
                      value={collabFormData.start_date}
                      onChange={(e) => setCollabFormData({ ...collabFormData, start_date: e.target.value })}
                    />
                    <input
                      type="date"
                      value={collabFormData.end_date}
                      onChange={(e) => setCollabFormData({ ...collabFormData, end_date: e.target.value })}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCollabForm(false)}>Cancelar</button>
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
                              {new Date(pc.start_date).toLocaleDateString('pt-BR')}
                              {pc.end_date && ` - ${new Date(pc.end_date).toLocaleDateString('pt-BR')}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <button className="btn-icon-small danger" onClick={() => handleRemoveCollaborator(pc.id)}>
                        <Trash2 size={16} />
                      </button>
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
                    <button className="btn btn-primary btn-sm" onClick={() => setShowToolForm(!showToolForm)}>
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>

                  {showToolForm && (
                    <form className="resource-form" onSubmit={handleAddTool}>
                      <select
                        value={toolFormData.tool_id}
                        onChange={(e) => setToolFormData({ ...toolFormData, tool_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione uma ferramenta</option>
                        {availableTools.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Quantidade"
                        min="1"
                        value={toolFormData.quantity}
                        onChange={(e) => setToolFormData({ ...toolFormData, quantity: e.target.value })}
                        required
                      />
                      <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowToolForm(false)}>Cancelar</button>
                    </form>
                  )}

                  <div className="resource-list">
                    {projectTools.map(pt => (
                      <div key={pt.id} className="resource-item">
                        <div className="resource-info">
                          <Wrench size={20} />
                          <div>
                            <strong>{getToolName(pt.tool_id)}</strong>
                            <p className="resource-role">Qtd: {pt.quantity}</p>
                          </div>
                        </div>
                        <button className="btn-icon-small danger" onClick={() => handleRemoveTool(pt.id)}>
                          <Trash2 size={16} />
                        </button>
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
                    <button className="btn btn-primary btn-sm" onClick={() => setShowVehicleForm(!showVehicleForm)}>
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>

                  {showVehicleForm && (
                    <form className="resource-form" onSubmit={handleAddVehicle}>
                      <select
                        value={vehicleFormData.vehicle_id}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione um veículo</option>
                        {availableVehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.model} - {v.license_plate}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVehicleForm(false)}>Cancelar</button>
                    </form>
                  )}

                  <div className="resource-list">
                    {projectVehicles.map(pv => (
                      <div key={pv.id} className="resource-item">
                        <div className="resource-info">
                          <Truck size={20} />
                          <div>
                            <strong>{getVehicleName(pv.vehicle_id)}</strong>
                          </div>
                        </div>
                        <button className="btn-icon-small danger" onClick={() => handleRemoveVehicle(pv.id)}>
                          <Trash2 size={16} />
                        </button>
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
                  <button className="btn btn-primary btn-sm" onClick={handleCreateRequest}>
                    <Plus size={16} /> Nova Solicitação
                  </button>
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
                        onClick={() => setSelectedRequest(request)}
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
                  <button className="btn btn-primary btn-sm" onClick={() => setShowBillingForm(!showBillingForm)}>
                    <Plus size={16} /> Novo Faturamento
                  </button>
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
                            {billing.date ? new Date(billing.date).toLocaleDateString('pt-BR') : 'Data não definida'}
                            {billing.invoice_number && ` - NF ${billing.invoice_number}`}
                            {billing.description && ` - ${billing.description}`}
                          </p>
                        </div>
                      </div>
                      {billing.status === 'PREVISTO' && (
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
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={loadAllData}
        />
      )}

      {/* Confirm Modal for Billing Deletion */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDeleteBilling}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este faturamento? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default ProjectModal;
