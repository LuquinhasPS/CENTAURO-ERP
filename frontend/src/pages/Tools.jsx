import { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench, MapPin, User, Edit } from 'lucide-react';
import { getTools, createTool, deleteTool, updateTool } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Tools.css';

const Tools = () => {
  const [tools, setTools] = useState([]);
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
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await getTools();
      setTools(response.data);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
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
          <div className="tools-form card">
            <h3>{editingId ? 'Editar Ferramenta' : 'Cadastrar Ferramenta'}</h3>
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
                  <input
                    type="text"
                    name="current_holder"
                    className="input"
                    value={formData.current_holder}
                    onChange={handleChange}
                    required
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Onde Está (Opcional)</label>
                  <input
                    type="text"
                    name="current_location"
                    className="input"
                    value={formData.current_location}
                    onChange={handleChange}
                    placeholder="Almoxarifado, Obra, etc."
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
            <div key={tool.id} className="tool-card card">
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
              <div className="tool-actions">
                <button className="btn-icon-small" onClick={() => handleEdit(tool)}>
                  <Edit size={16} />
                </button>
                <button className="btn-icon-small danger" onClick={() => handleDelete(tool.id)}>
                  <Trash2 size={16} />
                </button>
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
