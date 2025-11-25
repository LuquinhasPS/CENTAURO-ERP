import { useState, useEffect } from 'react';
import { X, Users, Wrench, Truck, ShoppingCart, Plus, Trash2, Calendar } from 'lucide-react';
import {
  getProjectCollaborators, addProjectCollaborator, removeProjectCollaborator,
  getProjectTools, addProjectTool, removeProjectTool,
  getProjectVehicles, addProjectVehicle, removeProjectVehicle,
  getPurchases, createPurchase, updatePurchase, deletePurchase,
  getCollaborators, getTools, getFleet
} from '../services/api';
import './ProjectModal.css';

const ProjectModal = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

  // Resources
  const [projectCollaborators, setProjectCollaborators] = useState([]);
  const [projectTools, setProjectTools] = useState([]);
  const [projectVehicles, setProjectVehicles] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Available resources for selection
  const [availableCollaborators, setAvailableCollaborators] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  // Forms
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [showToolForm, setShowToolForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);

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

  const [purchaseFormData, setPurchaseFormData] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    supplier: '',
    status: 'pending',
    expected_date: '',
    requester: '',
    notes: ''
  });

  useEffect(() => {
    if (project) {
      loadAllData();
    }
  }, [project, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load available resources
      const [collabsRes, toolsRes, vehiclesRes] = await Promise.all([
        getCollaborators(),
        getTools(),
        getFleet()
      ]);
      setAvailableCollaborators(collabsRes.data);
      setAvailableTools(toolsRes.data);
      setAvailableVehicles(vehiclesRes.data);

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

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...purchaseFormData,
        project_id: project.id,
        quantity: parseInt(purchaseFormData.quantity),
        unit_price: parseFloat(purchaseFormData.unit_price),
        total_price: parseFloat(purchaseFormData.total_price)
      };

      if (editingPurchaseId) {
        await updatePurchase(editingPurchaseId, dataToSend);
      } else {
        await createPurchase(dataToSend);
      }
      setShowPurchaseForm(false);
      setEditingPurchaseId(null);
      setPurchaseFormData({
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        supplier: '',
        status: 'pending',
        expected_date: '',
        requester: '',
        notes: ''
      });
      loadAllData();
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('Erro ao salvar solicitação');
    }
  };

  const handleDeletePurchase = async (id) => {
    if (window.confirm('Excluir esta solicitação de compra?')) {
      try {
        await deletePurchase(id);
        loadAllData();
      } catch (error) {
        console.error('Error deleting purchase:', error);
      }
    }
  };

  const handleEditPurchase = (purchase) => {
    setPurchaseFormData({
      description: purchase.description,
      quantity: purchase.quantity,
      unit_price: purchase.unit_price,
      total_price: purchase.total_price,
      supplier: purchase.supplier || '',
      status: purchase.status,
      expected_date: purchase.expected_date || '',
      requester: purchase.requester || '',
      notes: purchase.notes || ''
    });
    setEditingPurchaseId(purchase.id);
    setShowPurchaseForm(true);
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

  const statusColors = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    rejected: '#ef4444',
    ordered: '#8b5cf6',
    received: '#10b981'
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    ordered: 'Pedido',
    received: 'Recebido'
  };

  return (
    <div className="project-modal-overlay" onClick={onClose}>
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
        </div>

        <div className="project-modal-content">
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="tab-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Cliente:</label>
                  <span>{project.client || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Tipo:</label>
                  <span>{project.type || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Localização:</label>
                  <span>{project.location || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Data Início:</label>
                  <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Data Fim:</label>
                  <span>{project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Orçamento:</label>
                  <span>R$ {project.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${project.status}`}>{project.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEAM */}
          {activeTab === 'team' && (
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
          )}

          {/* TAB: RESOURCES */}
          {activeTab === 'resources' && (
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
          )}

          {/* TAB: PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="tab-content">
              <div className="tab-header">
                <h3>Solicitações de Compra</h3>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setEditingPurchaseId(null);
                  setPurchaseFormData({
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    total_price: 0,
                    supplier: '',
                    status: 'pending',
                    expected_date: '',
                    requester: '',
                    notes: ''
                  });
                  setShowPurchaseForm(!showPurchaseForm);
                }}>
                  <Plus size={16} /> Nova Solicitação
                </button>
              </div>

              {showPurchaseForm && (
                <form className="purchase-form" onSubmit={handleSavePurchase}>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Descrição *"
                      value={purchaseFormData.description}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="number"
                      placeholder="Quantidade"
                      min="1"
                      value={purchaseFormData.quantity}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value);
                        setPurchaseFormData({
                          ...purchaseFormData,
                          quantity: qty,
                          total_price: qty * purchaseFormData.unit_price
                        });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Preço Unitário"
                      step="0.01"
                      min="0"
                      value={purchaseFormData.unit_price}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value);
                        setPurchaseFormData({
                          ...purchaseFormData,
                          unit_price: price,
                          total_price: purchaseFormData.quantity * price
                        });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Total"
                      step="0.01"
                      value={purchaseFormData.total_price}
                      readOnly
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Fornecedor"
                      value={purchaseFormData.supplier}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplier: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Solicitante"
                      value={purchaseFormData.requester}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, requester: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <select
                      value={purchaseFormData.status}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, status: e.target.value })}
                    >
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovado</option>
                      <option value="rejected">Rejeitado</option>
                      <option value="ordered">Pedido</option>
                      <option value="received">Recebido</option>
                    </select>
                    <input
                      type="date"
                      placeholder="Data Esperada"
                      value={purchaseFormData.expected_date}
                      onChange={(e) => setPurchaseFormData({ ...purchaseFormData, expected_date: e.target.value })}
                    />
                  </div>
                  <textarea
                    placeholder="Observações"
                    rows="3"
                    value={purchaseFormData.notes}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, notes: e.target.value })}
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Salvar</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPurchaseForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              <div className="purchases-list">
                {purchases.map(purchase => (
                  <div key={purchase.id} className="purchase-item">
                    <div className="purchase-header">
                      <strong>{purchase.description}</strong>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: `${statusColors[purchase.status]}20`, color: statusColors[purchase.status] }}
                      >
                        {statusLabels[purchase.status]}
                      </span>
                    </div>
                    <div className="purchase-details">
                      <p>Qtd: {purchase.quantity} | Preço Unit: R$ {purchase.unit_price.toFixed(2)} | Total: R$ {purchase.total_price.toFixed(2)}</p>
                      {purchase.supplier && <p>Fornecedor: {purchase.supplier}</p>}
                      {purchase.requester && <p>Solicitante: {purchase.requester}</p>}
                      {purchase.expected_date && <p>Data Esperada: {new Date(purchase.expected_date).toLocaleDateString('pt-BR')}</p>}
                    </div>
                    <div className="purchase-actions">
                      <button className="btn-icon-small" onClick={() => handleEditPurchase(purchase)}>Editar</button>
                      <button className="btn-icon-small danger" onClick={() => handleDeletePurchase(purchase.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {purchases.length === 0 && !showPurchaseForm && (
                  <p className="empty-message">Nenhuma solicitação de compra para este projeto.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
