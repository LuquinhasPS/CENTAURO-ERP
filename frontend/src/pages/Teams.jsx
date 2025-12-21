import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Users, Plus, Edit, Trash2, Crown } from 'lucide-react';
import api, { getCollaborators } from '../services/api'; // Ensure getCollaborators is exported
import ConfirmModal from '../components/ConfirmModal';
import './Teams.css';

const Teams = forwardRef(({ embedded = false }, ref) => {
  const [teams, setTeams] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leader_id: ''
  });

  useImperativeHandle(ref, () => ({
    openForm: () => {
      setEditingId(null);
      resetForm();
      setShowForm(true);
    }
  }));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm && !showConfirmModal) {
        setShowForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showConfirmModal]);

  const loadData = async () => {
    try {
      // Parallel fetch for teams and collaborators (for leader selection)
      const [teamsRes, collaboratorsRes] = await Promise.all([
        api.get('/teams/teams'),
        getCollaborators()
      ]);
      setTeams(teamsRes.data);
      setCollaborators(collaboratorsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        leader_id: formData.leader_id ? parseInt(formData.leader_id) : null
      };

      if (editingId) {
        await api.put(`/teams/teams/${editingId}`, payload);
      } else {
        await api.post('/teams/teams', payload);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erro ao salvar time');
    }
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/teams/teams/${itemToDelete}`);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir time');
    }
  };

  const handleEdit = (team) => {
    setFormData({
      name: team.name,
      description: team.description || '',
      leader_id: team.leader_id || ''
    });
    setEditingId(team.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', leader_id: '' });
  };

  return (
    <div className="teams">
      {!embedded && (
        <header className="teams-header">
          <div>
            <h1>Gestão de Times</h1>
            <p>Organize seus colaboradores em departamentos</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => {
              setEditingId(null);
              resetForm();
              setShowForm(true);
            }}>
              <Plus size={20} />
              Novo Time
            </button>
          </div>
        </header>
      )}

      {showForm && (
        <div className="teams-form-modal">
          <div className="teams-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Time' : 'Novo Time'}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Time"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Nome do Time *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Infraestrutura"
                />
              </div>
              <div className="form-group">
                <label className="label">Descrição</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição das atividades..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="label">Líder / Gestor</label>
                <select
                  name="leader_id"
                  className="input"
                  value={formData.leader_id}
                  onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                >
                  <option value="">Sem líder definido</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Membros do Time */}
              {editingId && (
                <div className="form-group">
                  <label className="label" style={{ marginBottom: '0.75rem' }}>Membros do Time</label>
                  {(() => {
                    const teamMembers = collaborators.filter(c => c.teams?.some(t => t.id === editingId));
                    if (teamMembers.length === 0) {
                      return (
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          Nenhum membro vinculado a este time.
                        </p>
                      );
                    }
                    return (
                      <div className="team-members-grid">
                        {teamMembers.map(member => (
                          <div key={member.id} className="team-member-card">
                            <div className="team-member-avatar">
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="team-member-info">
                              <div className="team-member-name">
                                {member.name}
                                {member.id === parseInt(formData.leader_id) && (
                                  <Crown size={12} color="#f59e0b" />
                                )}
                              </div>
                              <div className="team-member-role">
                                {member.role || 'Sem cargo definido'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

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

      <div className="teams-grid">
        {loading ? (
          <div className="loading">Carregando times...</div>
        ) : teams.length === 0 ? (
          <div className="empty-state card">
            <Users size={48} color="#94a3b8" />
            <p>Nenhum time cadastrado ainda.</p>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="team-card card clickable"
              onClick={() => handleEdit(team)}
              style={{ cursor: 'pointer' }}
            >
              <div className="team-card-header">
                <div className="team-icon">
                  <Users size={24} />
                </div>
              </div>
              <h3 className="team-name">{team.name}</h3>

              <div className="team-leader">
                <Crown size={14} color="#f59e0b" />
                {team.leader_name ? (
                  <span className="leader-badge">{team.leader_name.split(' ')[0]}</span>
                ) : (
                  <span style={{ fontStyle: 'italic' }}>Sem líder</span>
                )}
              </div>

              {team.description && (
                <p className="team-description">{team.description}</p>
              )}

              <div className="team-stats">
                <span className="member-count">
                  <Users size={16} />
                  {team.member_count} membros
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
        message="Tem certeza que deseja excluir este time?"
      />
    </div>
  );
});

export default Teams;
