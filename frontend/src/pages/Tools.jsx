import { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench, MapPin, User, Edit } from 'lucide-react';
import { getTools, createTool, deleteTool, updateTool, getCollaborators, getProjects } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import SearchableSelect from '../components/SearchableSelect';
import './Tools.css';

const Tools = () => {
  const [tools, setTools] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
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
  });

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
      if (editingId) {
        await updateTool(editingId, formData);
      } else {
        await createTool(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        serial_number: '',
        current_holder: '',
        current_location: '',
        status: 'AVAILABLE',
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
    });
    setEditingId(tool.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTool(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false); // Close edit modal
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

  const holderOptions = [
    { value: 'Almoxarifado', label: 'Almoxarifado' },
    ...collaborators.map(c => ({ value: c.name, label: c.name }))
  ];

  const locationOptions = [
    { value: 'Almoxarifado', label: 'Almoxarifado' },
    { value: 'Escritório', label: 'Escritório' },
    ...projects.map(p => ({ value: p.name, label: p.name }))
  ];

  return (
    <div className="tools">
      <header className="tools-header">
        <div>
          <h1>Gestão de Ferramentas</h1>
          <p>Rastreamento de ferramentas e equipamentos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          Nova Ferramenta
        </button>
      </header>

      {showForm && (
        <div className="tools-form-modal">
          <div className="tools-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Ferramenta' : 'Cadastrar Ferramenta'}</h3>
              {editingId && (
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
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Alicate de Crimpagem"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Número de Série *</label>
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
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Ferramenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tools-grid">
        {loading ? (
          <div className="loading">Carregando ferramentas...</div>
        ) : tools.length === 0 ? (
          <div className="empty-state card">
            <Wrench size={48} color="#94a3b8" />
            <p>Nenhuma ferramenta cadastrada ainda.</p>
          </div>
        ) : (
          tools.map((tool) => (
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
                <span
                  className="status-badge"
                  style={getStatusColor(tool.status)}
                >
                  {getStatusLabel(tool.status)}
                </span>
              </div>
              <h3 className="tool-name">{tool.name}</h3>
              <p className="tool-serial">SN: {tool.serial_number}</p>
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
          ))
        )}
      </div>

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
