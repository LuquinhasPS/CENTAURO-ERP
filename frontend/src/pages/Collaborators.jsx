import { useState, useEffect, useRef } from 'react';
import { Plus, Users, Search, Briefcase } from 'lucide-react';
import api, { getCollaborators, deleteCollaborator } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Teams from './Teams';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import CollaboratorModal from '../components/hr/CollaboratorModal';
import './Clients.css';

const Collaborators = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('collaborators', 'edit');
  const [viewMode, setViewMode] = useState('collaborators'); // 'collaborators' or 'teams'
  const teamsRef = useRef();

  const [collaborators, setCollaborators] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');

  // Delete State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [collabsRes, rolesRes, teamsRes] = await Promise.all([
        getCollaborators(),
        api.get('/roles/roles'),
        api.get('/teams/teams')
      ]);
      setCollaborators(collabsRes.data);
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (row) => {
    setItemToDelete(row.id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteCollaborator(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false);
      setEditingCollaborator(null);
      loadData();
    } catch (error) {
      alert('Erro ao excluir colaborador');
    }
  };

  const handleEdit = (collaborator) => {
    setEditingCollaborator(collaborator);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingCollaborator(null);
    setShowForm(true);
  };

  // Filter Logic
  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collaborator.email && collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collaborator.registration_number && collaborator.registration_number.includes(searchTerm));

    const matchesRole = selectedRoleFilter ? collaborator.role_id === parseInt(selectedRoleFilter) : true;
    const matchesTeam = selectedTeamFilter ? collaborator.teams?.some(t => t.id === parseInt(selectedTeamFilter)) : true;

    return matchesSearch && matchesRole && matchesTeam;
  });

  // Table Columns
  const columns = [
    { header: 'Matrícula', accessor: 'registration_number', render: (row) => <span className="text-gray-500">#{row.registration_number || '-'}</span> },
    {
      header: 'Nome',
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
            {row.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: '600' }}>{row.name}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{row.email}</div>
          </div>
        </div>
      )
    },
    { header: 'Cargo', accessor: 'role', render: (row) => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={14} className="text-gray-400" /> {row.role}</div> },
    {
      header: 'CNH',
      accessor: 'cnh_validity',
      render: (row) => {
        if (!row.cnh_validity) return <span className="text-gray-400 text-xs">-</span>;
        const diff = new Date(row.cnh_validity) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const status = days < 0 ? 'VENCIDO' : days <= 60 ? 'VENCE EM BREVE' : 'VÁLIDO';
        return <StatusBadge status={status} />;
      }
    },
    {
      header: 'Telefone',
      accessor: 'phone',
      render: (row) => <span className="text-sm">{row.phone || '-'}</span>
    }
  ];

  return (
    <div className="clients">
      <header className="clients-header">
        <div className="header-content">
          <div>
            <h1>Gestão de Colaboradores</h1>
            <p>Cadastro e controle de equipe</p>
          </div>

          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center', alignSelf: 'flex-start', marginTop: '1rem' }}>
            <div className="tab-switcher-container">
              <div className={`tab-glider ${viewMode === 'collaborators' ? 'left' : 'right'}`} style={{ transform: viewMode === 'collaborators' ? 'translateX(0)' : 'translateX(100%)' }} />
              <button className={`tab-btn ${viewMode === 'collaborators' ? 'active' : ''}`} onClick={() => setViewMode('collaborators')}>
                <Users size={18} /> Colaboradores
              </button>
              <button className={`tab-btn ${viewMode === 'teams' ? 'active' : ''}`} onClick={() => setViewMode('teams')}>
                <Users size={18} /> Times
              </button>
            </div>

            {canEdit && (
              <button className="btn btn-primary" onClick={() => {
                if (viewMode === 'collaborators') handleCreate();
                else teamsRef.current?.openForm();
              }}>
                <Plus size={20} />
                {viewMode === 'collaborators' ? 'Novo Colaborador' : 'Novo Time'}
              </button>
            )}
          </div>
        </div>

        {viewMode === 'collaborators' && (
          <div className="filters-bar" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-input-container" style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="input"
                placeholder="Buscar por nome, email ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>
            <select className="input" value={selectedRoleFilter} onChange={(e) => setSelectedRoleFilter(e.target.value)}>
              <option value="">Todas as Funções</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="input" value={selectedTeamFilter} onChange={(e) => setSelectedTeamFilter(e.target.value)}>
              <option value="">Todos os Times</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </header>

      {viewMode === 'teams' ? (
        <Teams ref={teamsRef} embedded={true} />
      ) : (
        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          {loading ? (
            <div className="loading">Carregando colaboradores...</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredCollaborators}
              onRowClick={handleEdit}
            />
          )}
        </div>
      )}

      {showForm && (
        <CollaboratorModal
          collaborator={editingCollaborator}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadData(); }}
          roles={roles}
          teams={teams}
          canEdit={canEdit}
          onDelete={() => handleDelete(editingCollaborator)}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este colaborador?"
      />
    </div>
  );
};

export default Collaborators;
