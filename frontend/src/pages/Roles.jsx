import { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, Users } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';
import './Roles.css';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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

  const loadData = async () => {
    try {
      const [rolesRes, collaboratorsRes] = await Promise.all([
        api.get('/roles/roles'),
        api.get('/operational/collaborators')
      ]);
      setRoles(rolesRes.data);
      setCollaborators(collaboratorsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCollaboratorCount = (roleName) => {
    return collaborators.filter(c => c.role === roleName).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/roles/roles/${editingId}`, formData);
      } else {
        await api.post('/roles/roles', formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
      loadData();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Erro ao salvar cargo');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    setEditingId(role.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/roles/roles/${itemToDelete}`);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false); // Close edit modal
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Erro ao excluir cargo');
    }
  };

  return (
    <div className="roles">
      <header className="roles-header">
        <div>
          <h1>Gestão de Cargos</h1>
          <p>Cadastro de funções e cargos</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={20} />
            Novo Cargo
          </button>
        </div>
      </header>

      {showForm && (
        <div className="roles-form-modal" onClick={() => setShowForm(false)}>
          <div className="roles-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Cargo' : 'Cadastrar Cargo'}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Cargo"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Nome do Cargo *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Coordenador"
                />
              </div>
              <div className="form-group">
                <label className="label">Descrição</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Descrição da função..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="roles-grid">
        {loading ? (
          <div className="loading">Carregando cargos...</div>
        ) : roles.length === 0 ? (
          <div className="empty-state card">
            <Briefcase size={48} color="#94a3b8" />
            <p>Nenhum cargo cadastrado ainda.</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="role-card card clickable"
              onClick={() => handleEdit(role)}
              style={{ cursor: 'pointer' }}
            >
              <div className="role-card-header">
                <div className="role-icon">
                  <Briefcase size={24} />
                </div>
              </div>
              <h3 className="role-name">{role.name}</h3>
              {role.description && (
                <p className="role-description">{role.description}</p>
              )}
              <div className="role-stats">
                <span className="collaborator-count">
                  <Users size={16} />
                  {getCollaboratorCount(role.name)} colaborador{getCollaboratorCount(role.name) !== 1 ? 'es' : ''}
                </span>
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
        message="Tem certeza que deseja excluir este cargo?"
      />
    </div>
  );
};

export default Roles;
