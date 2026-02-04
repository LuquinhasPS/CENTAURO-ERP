import { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench, MapPin, User, Edit, LayoutGrid, List, Search, AlertTriangle, Calendar } from 'lucide-react';
import { getTools, createTool, deleteTool, updateTool, getCollaborators, getProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import SearchableSelect from '../components/shared/SearchableSelect';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

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
        next_maintenance: formData.next_maintenance || null
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
      });
      loadTools();
    } catch (error) {
      console.error('Error saving tool:', error);
      alert('Erro ao salvar ferramenta: ' + error.response?.data?.detail);
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
    return matchesSearch && matchesCategory;
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
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="Visualização em Lista"
            >
              <List size={20} />
            </button>
          </div>

          {canEdit && (
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
              });
              setShowForm(true);
            }}>
              <Plus size={20} />
              Nova Ferramenta
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <div className="tools-form-modal">
          <div className="tools-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Ferramenta' : 'Cadastrar Ferramenta'}</h3>
              {editingId && canEdit && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Ferramenta"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
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
                <div className="form-group">
                  <label className="label">Onde Está (Opcional)</label>
                  <SearchableSelect
                    name="current_location"
                    value={formData.current_location}
                    onChange={handleChange}
                    options={locationOptions}
                    placeholder="Selecione ou digite..."
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
              </div>
              <div className="form-actions">
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
          </div>
        </div>
      )}

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
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tool-card-header">
                      <div className="tool-icon">
                        <Wrench size={24} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          className="status-badge"
                          style={getStatusColor(tool.status)}
                        >
                          {getStatusLabel(tool.status)}
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
                      <tr key={tool.id} onClick={() => handleEdit(tool)}>
                        <td>
                          <span className="status-badge" style={getStatusColor(tool.status)}>
                            {getStatusLabel(tool.status)}
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
