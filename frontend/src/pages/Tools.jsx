import { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench, MapPin, User, Edit, LayoutGrid, List, Search, AlertTriangle, Calendar, Send, Check, X, Clock } from 'lucide-react';
import { getTools, createTool, deleteTool, updateTool, getCollaborators, getProjects, getAssetRequests, approveAssetRequest, rejectAssetRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import Modal from '../components/shared/Modal';
import SearchableSelect from '../components/shared/SearchableSelect';
import { isDeactivated, formatDateUTC } from '../utils/formatters';
import './Tools.css';

const Tools = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('tools', 'edit');

  const [tools, setTools] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Search State
  const [viewMode, setViewMode] = useState('grid');
  const [activeView, setActiveView] = useState('tools'); // 'tools' or 'requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Asset Requests State
  const [assetRequests, setAssetRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveToolId, setApproveToolId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [requestFilter, setRequestFilter] = useState('PENDING');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    current_holder: '',
    current_location: '',
    status: 'AVAILABLE',
    category: 'OTHER',
    condition: 'GOOD',
    next_maintenance: '',
    deactivation_date: '',
  });

  const CATEGORIES = [
    { value: 'INSTRUMENT', label: 'Instrumentação' },
    { value: 'POWER_TOOL', label: 'Ferramenta Elétrica' },
    { value: 'ACCESS', label: 'Acesso / Corda' },
    { value: 'KIT', label: 'Kit de Ferramentas' },
    { value: 'OTHER', label: 'Outros' },
  ];

  const CONDITIONS = [
    { value: 'NEW', label: 'Novo' },
    { value: 'GOOD', label: 'Bom' },
    { value: 'FAIR', label: 'Regular' },
    { value: 'POOR', label: 'Ruim' },
    { value: 'BROKEN', label: 'Quebrado' },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm && !showConfirmModal) {
        setShowForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showConfirmModal]);

  useEffect(() => {
    loadData();
  }, []);

  // Load asset requests when tab is active
  useEffect(() => {
    if (activeView === 'requests') {
      loadAssetRequests();
    }
  }, [activeView, requestFilter]);

  const loadAssetRequests = async () => {
    setRequestsLoading(true);
    try {
      const params = { asset_type: 'TOOL' };
      if (requestFilter !== 'ALL') params.status = requestFilter;
      const res = await getAssetRequests(params);
      setAssetRequests(res.data);
    } catch (e) { console.error('Error loading asset requests:', e); }
    finally { setRequestsLoading(false); }
  };

  const handleApproveToolRequest = async () => {
    if (!approveToolId) { alert('Selecione uma ferramenta para alocar.'); return; }
    setProcessingRequest(true);
    try {
      await approveAssetRequest(selectedRequest.id, { assigned_tool_id: parseInt(approveToolId) });
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setApproveToolId('');
      loadAssetRequests();
    } catch (e) {
      alert('Erro ao aprovar solicitação: ' + (e.response?.data?.detail || e.message));
    } finally { setProcessingRequest(false); }
  };

  const handleRejectToolRequest = async () => {
    if (!rejectReason.trim()) { alert('Informe o motivo da rejeição.'); return; }
    setProcessingRequest(true);
    try {
      await rejectAssetRequest(selectedRequest.id, { rejection_reason: rejectReason });
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadAssetRequests();
    } catch (e) {
      alert('Erro ao rejeitar solicitação: ' + (e.response?.data?.detail || e.message));
    } finally { setProcessingRequest(false); }
  };

  const getRequestStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
      APPROVED: { bg: '#d1fae5', color: '#065f46', label: 'Aprovada' },
      REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Rejeitada' },
    };
    const s = styles[status] || styles.PENDING;
    return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>{s.label}</span>;
  };

  const pendingRequestCount = assetRequests.filter(r => r.status === 'PENDING').length;

  // Sync Location if Holder is Almoxarifado
  useEffect(() => {
    if (formData.current_holder === 'Almoxarifado') {
      setFormData(prev => {
        if (prev.current_location !== 'Almoxarifado') {
          return { ...prev, current_location: 'Almoxarifado' };
        }
        return prev;
      });
    }
  }, [formData.current_holder]);

  const loadData = async () => {
    try {
      const [toolsRes, collabsRes, projectsRes] = await Promise.all([
        getTools(),
        getCollaborators(),
        getProjects()
      ]);
      setTools(toolsRes.data);
      setCollaborators(collabsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const response = await getTools();
      setTools(response.data);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare payload with null checks
      const payload = {
        ...formData,
        next_maintenance: formData.next_maintenance || null,
        deactivation_date: formData.deactivation_date || null
      };

      if (editingId) {
        await updateTool(editingId, payload);
      } else {
        await createTool(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        serial_number: '',
        current_holder: '',
        current_location: '',
        status: 'AVAILABLE',
        category: 'OTHER',
        condition: 'GOOD',
        next_maintenance: '',
        deactivation_date: '',
      });
      loadTools();
    } catch (error) {
      console.error('Error saving tool:', error);
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar ferramenta';
      alert(errorMsg);
    }
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleEdit = (tool) => {
    setFormData({
      name: tool.name,
      serial_number: tool.serial_number,
      current_holder: tool.current_holder,
      current_location: tool.current_location || '',
      status: tool.status,
      category: tool.category || 'OTHER',
      condition: tool.condition || 'GOOD',
      next_maintenance: tool.next_maintenance || '',
      deactivation_date: tool.deactivation_date || '',
    });
    setEditingId(tool.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTool(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false);
      loadTools();
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert('Erro ao excluir ferramenta');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: { bg: '#10b98115', color: '#10b981' },
      IN_USE: { bg: '#3b82f615', color: '#3b82f6' },
      MAINTENANCE: { bg: '#f59e0b15', color: '#f59e0b' },
    };
    return colors[status] || colors.AVAILABLE;
  };

  const getStatusLabel = (status) => {
    const labels = {
      AVAILABLE: 'Disponível',
      IN_USE: 'Em Uso',
      MAINTENANCE: 'Manutenção',
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const getMaintenanceAlert = (dateString, category) => {
    if (!dateString || (category !== 'INSTRUMENT' && category !== 'POWER_TOOL')) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maintenanceDate = new Date(dateString);
    maintenanceDate.setHours(0, 0, 0, 0);

    const diffTime = maintenanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: '#ef4444', icon: true, title: 'Calibração Vencida!' };
    if (diffDays <= 30) return { color: '#f59e0b', icon: true, title: `Vence em ${diffDays} dias` };
    return null;
  };

  const holderOptions = [
    { value: 'Almoxarifado', label: 'Almoxarifado' },
    ...collaborators.map(c => ({ value: c.name, label: c.name }))
  ];

  const locationOptions = [
    { value: 'Almoxarifado', label: 'Almoxarifado' },
    { value: 'Escritório', label: 'Escritório' },
    ...projects.map(p => ({ value: p.name, label: p.name }))
  ];

  // Filtering Logic
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || tool.category === filterCategory;

    let matchesStatus = true;
    if (filterStatus === 'ACTIVE') matchesStatus = !isDeactivated(tool.deactivation_date);
    if (filterStatus === 'INACTIVE') matchesStatus = isDeactivated(tool.deactivation_date);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="tools">
      <header className="tools-header">
        <div>
          <h1>Gestão de Ferramentas</h1>
          <p>Rastreamento de ferramentas e equipamentos</p>
        </div>

        <div className="tools-header-actions">

          {/* Category Filter */}
          <select
            className="input"
            style={{ width: '180px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">Todas Categorias</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Status Filter */}
          <select
            className="input"
            style={{ width: '150px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todas Status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="INACTIVE">Inativas</option>
          </select>

          {/* Search Box */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nome ou patrimônio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="view-toggle">
            <button
              className={activeView === 'tools' && viewMode === 'grid' ? 'active' : ''}
              onClick={() => { setActiveView('tools'); setViewMode('grid'); }}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              className={activeView === 'tools' && viewMode === 'list' ? 'active' : ''}
              onClick={() => { setActiveView('tools'); setViewMode('list'); }}
              title="Visualização em Lista"
            >
              <List size={20} />
            </button>
            <button
              className={activeView === 'requests' ? 'active' : ''}
              onClick={() => setActiveView('requests')}
              title="Solicitações de Ferramentas"
              style={{ position: 'relative' }}
            >
              <Send size={20} />
              {pendingRequestCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 'bold',
                }}>
                  {pendingRequestCount}
                </span>
              )}
            </button>
          </div>

          {canEdit && activeView === 'tools' && (
            <button className="btn btn-primary" onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                serial_number: '',
                current_holder: '',
                current_location: '',
                status: 'AVAILABLE',
                category: 'OTHER',
                condition: 'GOOD',
                next_maintenance: '',
                deactivation_date: '',
              });
              setShowForm(true);
            }}>
              <Plus size={20} />
              Nova Ferramenta
            </button>
          )}
        </div>
      </header>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Ferramenta' : 'Cadastrar Ferramenta'}
        maxWidth="1000px"
        headerActions={
          editingId && canEdit && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDelete(editingId)}
              title="Excluir Ferramenta"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Nome *</label>
              <input
                type="text"
                name="name"
                className="input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ex: Máquina de Fusão"
              />
            </div>

            <div className="form-group">
              <label className="label">Categoria *</label>
              <select
                name="category"
                className="input"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Patrimônio *</label>
              <input
                type="text"
                name="serial_number"
                className="input"
                value={formData.serial_number}
                onChange={handleChange}
                required
                placeholder="SN123456"
              />
            </div>

            <div className="form-group">
              <label className="label">Condição *</label>
              <select
                name="condition"
                className="input"
                value={formData.condition}
                onChange={handleChange}
                required
              >
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Status *</label>
              <select
                name="status"
                className="input"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="AVAILABLE">Disponível</option>
                <option value="IN_USE">Em Uso</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Com Quem Está *</label>
              <SearchableSelect
                name="current_holder"
                value={formData.current_holder}
                onChange={handleChange}
                options={holderOptions}
                placeholder="Selecione ou digite..."
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Onde Está (Opcional)</label>
              <SearchableSelect
                name="current_location"
                value={formData.current_location}
                onChange={handleChange}
                options={locationOptions}
                placeholder="Selecione ou digite..."
              />
            </div>

            {(formData.category === 'INSTRUMENT' || formData.category === 'POWER_TOOL') && (
              <div className="form-group">
                <label className="label">Próxima Calibração/Manutenção</label>
                <input
                  type="date"
                  name="next_maintenance"
                  className="input"
                  value={formData.next_maintenance}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-group full-width">
              <label className="label">Data de Baixa (Desativação)</label>
              <input
                type="date"
                name="deactivation_date"
                className="input"
                value={formData.deactivation_date}
                onChange={handleChange}
              />
              <small style={{ color: '#64748b' }}>Preencha se a ferramenta foi furtada, quebrada definitivamente ou descartada.</small>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            {canEdit && (
              <button type="submit" className="btn btn-primary">
                Salvar Ferramenta
              </button>
            )}
          </div>
        </form>
      </Modal>

      {activeView === 'tools' && (
        <>
          {loading ? (
            <div className="loading">Carregando ferramentas...</div>
          ) : filteredTools.length === 0 ? (
            <div className="empty-state card">
              {searchTerm || filterCategory !== 'ALL' ? (
                <>
                  <Search size={48} color="#94a3b8" />
                  <p>Nenhum resultado encontrado.</p>
                </>
              ) : (
                <>
                  <Wrench size={48} color="#94a3b8" />
                  <p>Nenhuma ferramenta cadastrada ainda.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="tools-grid">
                  {filteredTools.map((tool) => {
                    const maintenanceAlert = getMaintenanceAlert(tool.next_maintenance, tool.category);
                    return (
                      <div
                        key={tool.id}
                        className="tool-card card clickable"
                        onClick={() => handleEdit(tool)}
                        style={{ cursor: 'pointer', ...(isDeactivated(tool.deactivation_date) ? { filter: 'grayscale(100%)', opacity: 0.6 } : {}) }}
                      >
                        <div className="tool-card-header">
                          <div className="tool-icon">
                            <Wrench size={24} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span
                              className="status-badge"
                              style={isDeactivated(tool.deactivation_date) ? { bg: '#fee2e2', color: '#991b1b', backgroundColor: '#fee2e2' } : getStatusColor(tool.status)}
                            >
                              {isDeactivated(tool.deactivation_date) ? 'INATIVO' : getStatusLabel(tool.status)}
                            </span>
                            {maintenanceAlert && (
                              <span title={maintenanceAlert.title} style={{ color: maintenanceAlert.color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                <AlertTriangle size={14} />
                                {maintenanceAlert.title === 'Calibração Vencida!' ? 'Vencida' : 'Vence em breve'}
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="tool-name">
                          {tool.name}
                        </h3>
                        <p className="tool-serial">
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            marginRight: '8px',
                            fontSize: '0.75rem'
                          }}>
                            {getCategoryLabel(tool.category || 'OTHER')}
                          </span>
                          {tool.serial_number}
                        </p>
                        <div className="tool-details">
                          <div className="detail-item">
                            <User size={16} color="#64748b" />
                            <div>
                              <span className="detail-label">Com quem:</span>
                              <span className="detail-value">{tool.current_holder}</span>
                            </div>
                          </div>
                          {tool.current_location && (
                            <div className="detail-item">
                              <MapPin size={16} color="#64748b" />
                              <div>
                                <span className="detail-label">Onde:</span>
                                <span className="detail-value">{tool.current_location}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LIST VIEW */}
              {viewMode === 'list' && (
                <div className="tools-list">
                  <table className="tools-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Categoria</th>
                        <th>Nome</th>
                        <th>Patrimônio</th>
                        <th>Com Quem</th>
                        <th>Calibração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTools.map(tool => {
                        const maintenanceAlert = getMaintenanceAlert(tool.next_maintenance, tool.category);
                        return (
                          <tr key={tool.id} onClick={() => handleEdit(tool)} style={isDeactivated(tool.deactivation_date) ? { filter: 'grayscale(100%)', opacity: 0.6 } : {}}>
                            <td>
                              <span className="status-badge" style={isDeactivated(tool.deactivation_date) ? { bg: '#fee2e2', color: '#991b1b', backgroundColor: '#fee2e2' } : getStatusColor(tool.status)}>
                                {isDeactivated(tool.deactivation_date) ? 'INATIVO' : getStatusLabel(tool.status)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                                {getCategoryLabel(tool.category || 'OTHER')}
                              </span>
                            </td>
                            <td>
                              <strong>{tool.name}</strong>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{tool.serial_number}</td>
                            <td>{tool.current_holder}</td>
                            <td>
                              {maintenanceAlert ? (
                                <span style={{ color: maintenanceAlert.color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                  <AlertTriangle size={14} />
                                  {new Date(tool.next_maintenance).toLocaleDateString()}
                                </span>
                              ) : (
                                tool.next_maintenance ? new Date(tool.next_maintenance).toLocaleDateString() : '-'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* REQUESTS VIEW */}
      {activeView === 'requests' && (
        <div>
          {/* Request filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
              <button
                key={s}
                onClick={() => setRequestFilter(s)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: requestFilter === s ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: requestFilter === s ? '#e0f2fe' : '#fff',
                  color: requestFilter === s ? '#0284c7' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                {{ PENDING: 'Pendentes', APPROVED: 'Aprovadas', REJECTED: 'Rejeitadas', ALL: 'Todas' }[s]}
              </button>
            ))}
          </div>

          {requestsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando solicitações...</div>
          ) : assetRequests.length === 0 ? (
            <div className="empty-state card">
              <Send size={48} color="#94a3b8" />
              <p>Nenhuma solicitação de ferramenta encontrada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {assetRequests.map(req => (
                <div key={req.id} className="card" style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ padding: '6px', background: '#fef3c7', borderRadius: '6px' }}>
                        <Wrench size={18} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>
                          {req.project_tag || 'Projeto'}
                          <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '6px', fontSize: '0.8rem' }}>
                            {req.project_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Solicitado por: <strong>{req.requester_name || 'Usuário'}</strong>
                          <span style={{ marginLeft: '8px' }}>
                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getRequestStatusBadge(req.status)}
                  </div>

                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem',
                    fontSize: '0.85rem', color: '#334155',
                  }}>
                    <div style={{ fontWeight: '500', color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>Necessidade:</div>
                    {req.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      {formatDateUTC(req.start_date)} — {formatDateUTC(req.end_date)}
                    </span>
                    {req.include_weekends && <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px' }}>Inclui fins de semana</span>}
                  </div>

                  {req.assigned_asset_label && (
                    <div style={{ fontSize: '0.8rem', color: '#065f46', background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem', display: 'inline-block' }}>
                      Ferramenta alocada: <strong>{req.assigned_asset_label}</strong>
                    </div>
                  )}

                  {req.rejection_reason && (
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                      Motivo: {req.rejection_reason}
                    </div>
                  )}

                  {req.status === 'PENDING' && canEdit && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedRequest(req); setRejectReason(''); setRejectModalOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}
                      >
                        <X size={14} /> Rejeitar
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSelectedRequest(req); setApproveToolId(''); setApproveModalOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                      >
                        <Check size={14} /> Aprovar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve Tool Request Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Aprovar Solicitação de Ferramenta"
        maxWidth="500px"
      >
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                <strong>{selectedRequest.project_tag}</strong> — {selectedRequest.project_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedRequest.description}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Período: {formatDateUTC(selectedRequest.start_date)} — {formatDateUTC(selectedRequest.end_date)}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Selecione a Ferramenta a Alocar *</label>
              <select className="input" value={approveToolId} onChange={e => setApproveToolId(e.target.value)} required>
                <option value="">Selecione uma ferramenta...</option>
                {tools.filter(t => !isDeactivated(t.deactivation_date)).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.serial_number})</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setApproveModalOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveToolRequest}
                disabled={processingRequest || !approveToolId}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                {processingRequest ? 'Processando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Tool Request Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Rejeitar Solicitação"
        maxWidth="500px"
      >
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                <strong>{selectedRequest.project_tag}</strong> — {selectedRequest.description}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Motivo da Rejeição *</label>
              <textarea className="input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: Ferramenta indisponível neste período..." style={{ minHeight: '80px' }} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRejectToolRequest}
                disabled={processingRequest || !rejectReason.trim()}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {processingRequest ? 'Processando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta ferramenta? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Tools;
