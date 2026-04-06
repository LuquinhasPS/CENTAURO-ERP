import { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, Users } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/shared/ConfirmModal';
import Modal from '../components/shared/Modal';
import './Roles.css';

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
    permissions: {}
  });

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
      setFormData({ name: '', description: '', permissions: {} });
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

  const handlePermissionChange = (module, action, isChecked) => {
    setFormData(prev => {
      const currentPerms = prev.permissions[module] || [];
      let newPerms;

      if (isChecked) {
        newPerms = [...currentPerms, action];
        // If enabling 'write', auto-enable 'read' ? Maybe not mandatory but common UX.
        if (action === 'write' && !currentPerms.includes('read')) {
          newPerms.push('read');
        }
      } else {
        newPerms = currentPerms.filter(p => p !== action);
        // If disabling 'read', disable 'write' too?
        if (action === 'read') {
          newPerms = newPerms.filter(p => p !== 'write');
        }
      }

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newPerms
        }
      };
    });
  };

  const handleEdit = (role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || {}
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
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              permissions: {}
            });
            setShowForm(true);
          }}>
            <Plus size={20} />
            Novo Cargo
          </button>
        </div>
      </header>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Cargo' : 'Cadastrar Cargo'}
        maxWidth="800px"
        headerActions={
          editingId && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDelete(editingId)}
              title="Excluir Cargo"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
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

          <div className="permissions-section">
            <h4 style={{ margin: '1.5rem 0 1rem', fontSize: '1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Permissões de Acesso</h4>
            <div className="permissions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'scheduler', label: 'Scheduler' },
                { key: 'kanban', label: 'Kanban' },
                { key: 'commercial', label: 'Comercial / CRM' },
                { key: 'engineering_crm', label: 'Engenharia / CRM' },
                { key: 'clients', label: 'Clientes' },
                { key: 'collaborators', label: 'Colaboradores' },
                { key: 'contracts', label: 'Contratos' },
                { key: 'projects', label: 'Projetos' },
                { key: 'purchases', label: 'Compras' },
                { key: 'fleet', label: 'Frota' },
                { key: 'tools', label: 'Ferramentas' },
                { key: 'accounts_receivable', label: 'Contas a Receber' },
                { key: 'payroll', label: 'Folha de Pag.' },
                { key: 'tickets', label: 'Chamados' },
                { key: 'roles', label: 'Cargos' },
              ].map((module) => (
                <div key={module.key} className="permission-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <span className="module-label" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{module.label}</span>
                  <div className="toggles" style={{ display: 'flex', gap: '1rem' }}>
                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions?.[module.key]?.includes('read') || false}
                        onChange={(e) => handlePermissionChange(module.key, 'read', e.target.checked)}
                      />
                      Ver
                    </label>
                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions?.[module.key]?.includes('write') || false}
                        onChange={(e) => handlePermissionChange(module.key, 'write', e.target.checked)}
                      />
                      Edit
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Permissions Section */}
          <div className="permissions-section approvals-section">
            <h4 style={{ margin: '1.5rem 0 0.5rem', fontSize: '1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Aprovações / Alçadas</h4>
            <p className="section-description" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Permissões para aprovar solicitações de compra</p>
            <div className="approvals-grid">
              {[
                { key: 'approve_technical', label: 'Validação Técnica', desc: 'Engenharia' },
                { key: 'approve_budget', label: 'Coordenação de Projetos', desc: 'Orçamento' },
                { key: 'approve_finance', label: 'Liberação Financeira', desc: 'Pagamento' }
              ].map(appr => (
                <label key={appr.key} className="approval-item">
                  <div className="approval-info">
                    <span className="approval-label">{appr.label}</span>
                    <span className="approval-description">{appr.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.permissions?.approvals?.[appr.key] || false}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          approvals: {
                            ...(prev.permissions?.approvals || {}),
                            [appr.key]: e.target.checked
                          }
                        }
                      }));
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar Cargo
            </button>
          </div>
        </form>
      </Modal>

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
