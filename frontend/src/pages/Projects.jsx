import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { getProjects, createProject, updateProject, deleteProject, getContracts, getClients, getCollaborators } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import ProjectModal from '../components/projects/ProjectModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import { PROJECT_STATUS, PROJECT_STATUS_OPTIONS } from '../utils/constants';
import './Projects.css';

const Projects = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('projects', 'edit');
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterCoordinator, setFilterCoordinator] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    tag: '',
    name: '',
    scope: '',
    coordinator: '',
    contract_id: '',
    client_id: '',
    team_size: '',
    service_value: '',
    material_value: '',
    budget: '',
    start_date: '',
    end_date: '',
    estimated_start_date: '',
    estimated_end_date: '',
    warranty_months: '',
    company_id: '',
    estimated_days: '',
  });

  useEffect(() => {
    loadProjects();
    loadContracts();
    loadClients();
    loadCollaborators();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm) {
        handleCancelForm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, editingId]); // Add dependencies needed for handleCancelForm logic

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCollaborators = async () => {
    try {
      const response = await getCollaborators();
      setCollaborators(response.data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        contract_id: formData.contract_id ? parseInt(formData.contract_id) : null,
        service_value: formData.service_value ? parseFloat(formData.service_value) : 0,
        material_value: formData.material_value ? parseFloat(formData.material_value) : 0,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        team_size: formData.team_size ? parseInt(formData.team_size) : null,
        project_number: formData.project_number ? parseInt(formData.project_number) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
        warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
        estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : null,
      };

      if (editingId) {
        await updateProject(editingId, dataToSend);
        // If we were editing, reload projects and reopen the modal with updated data
        const response = await getProjects();
        setProjects(response.data);
        const updatedProject = response.data.find(p => p.id === editingId);
        if (updatedProject) {
          setSelectedProject(updatedProject);
          setShowProjectModal(true);
        }
      } else {
        await createProject(dataToSend);
        loadProjects();
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Erro ao salvar projeto: ' + error.response?.data?.detail);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      tag: project.tag,
      name: project.name,
      scope: project.scope || '',
      coordinator: project.coordinator || '',
      contract_id: project.contract_id || '',
      client_id: project.client_id || '',
      team_size: project.team_size || '',
      service_value: project.service_value || '',
      material_value: project.material_value || '',
      budget: project.budget || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      estimated_start_date: project.estimated_start_date || '',
      estimated_end_date: project.estimated_end_date || '',
      warranty_months: project.warranty_months || '',
      project_number: project.project_number,
      invoiced: project.invoiced,
      status: project.status,
      company_id: project.company_id || '',
      estimated_days: project.estimated_days || '',
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteProject(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Erro ao excluir projeto');
    }
  };

  const handleCancelForm = () => {
    if (editingId) {
      // If cancelling edit, reopen the modal for the project being edited
      const project = projects.find(p => p.id === editingId);
      if (project) {
        setSelectedProject(project);
        setShowProjectModal(true);
      }
    }
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tag: '',
      name: '',
      scope: '',
      coordinator: '',
      contract_id: '',
      client_id: '',
      team_size: '',
      service_value: '',
      material_value: '',
      budget: '',
      start_date: '',
      end_date: '',
      estimated_start_date: '',
      estimated_end_date: '',
      warranty_months: '',
      company_id: '',
      estimated_days: '',
      status: PROJECT_STATUS.EM_ANDAMENTO,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // If client changes, reset contract if it doesn't belong to the new client
    if (name === 'client_id') {
      const selectedContract = contracts.find(c => c.id === parseInt(formData.contract_id));
      if (selectedContract && selectedContract.client_id !== parseInt(value)) {
        newFormData.contract_id = ''; // Reset to "Sem contrato"
      }
    }

    // Auto-calculate budget
    if (name === 'service_value' || name === 'material_value') {
      const service = parseFloat(name === 'service_value' ? value : formData.service_value) || 0;
      const material = parseFloat(name === 'material_value' ? value : formData.material_value) || 0;
      newFormData.budget = (service + material).toFixed(2);
    }

    setFormData(newFormData);
  };

  // Get unique coordinators for filter
  const uniqueCoordinators = [...new Set(projects.map(p => p.coordinator).filter(Boolean))];

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    // Search filter
    const matchesSearch = !searchTerm ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Client filter
    const matchesClient = !filterClient || project.client_id === parseInt(filterClient);

    // Coordinator filter
    const matchesCoordinator = !filterCoordinator || project.coordinator === filterCoordinator;

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'em_andamento') {
      matchesStatus = !project.end_date || new Date(project.end_date) > new Date();
    } else if (filterStatus === 'concluido') {
      matchesStatus = project.end_date && new Date(project.end_date) <= new Date();
    }

    return matchesSearch && matchesClient && matchesCoordinator && matchesStatus;
  });

  // Filter contracts based on selected client in form
  const filteredContracts = formData.client_id
    ? contracts.filter(contract => contract.client_id === parseInt(formData.client_id))
    : [];

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const columns = [
    { header: 'Nº', accessor: 'project_number', render: row => row.project_number || '-' },
    { header: 'Tag', accessor: 'tag', render: row => <code>{row.tag}</code> },
    { header: 'Nome', accessor: 'name' },
    { header: 'Cliente', accessor: 'client_name', render: row => row.client_name || '-' },
    { header: 'Coordenador', accessor: 'coordinator', render: row => row.coordinator || '-' },
    { header: 'Orçamento', accessor: 'budget', render: row => formatCurrency(row.budget) },
    { header: 'Faturado', accessor: 'invoiced', render: row => formatCurrency(row.invoiced) },
    { header: 'A Faturar', accessor: 'pending', render: row => formatCurrency((row.budget || 0) - (row.invoiced || 0)) },
    { header: 'Início', accessor: 'start_date', render: row => row.start_date ? new Date(row.start_date).toLocaleDateString('pt-BR') : '-' },
    { header: 'Fim', accessor: 'end_date', render: row => row.end_date ? new Date(row.end_date).toLocaleDateString('pt-BR') : '-' },
    {
      header: 'Status', accessor: 'status', render: row => (
        <StatusBadge status={row.status || PROJECT_STATUS.EM_ANDAMENTO} />
      )
    },
  ];

  return (
    <div className="projects" >
      <header className="projects-header">
        <div>
          <h1>Gestão de Projetos</h1>
          <p>Controle de projetos e informações financeiras</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={20} />
            Novo Projeto
          </button>
        )}
      </header>

      {showForm && (
        <div className="project-form-modal">
          {/* Form Content Preserved */}
          <div className="project-form card">
            <h3>{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Cliente *</label>
                  <select
                    name="client_id"
                    className="input"
                    value={formData.client_id}
                    onChange={handleChange}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!editingId && (
                  <div className="form-group">
                    <label className="label">Nº Projeto (Manual/Opcional)</label>
                    <input
                      type="number"
                      name="project_number"
                      className="input"
                      value={formData.project_number || ''}
                      onChange={handleChange}
                      placeholder="Automático se vazio"
                    />
                  </div>
                )}
                {editingId && (
                  <div className="form-group">
                    <label className="label">Tag</label>
                    <input
                      type="text"
                      name="tag"
                      className="input"
                      value={formData.tag}
                      readOnly
                      disabled
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Contrato (Opcional)</label>
                  <select
                    name="contract_id"
                    className="input"
                    value={formData.contract_id}
                    onChange={handleChange}
                    disabled={!!editingId}
                  >
                    <option value="">Sem contrato</option>
                    {filteredContracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">CNPJ (Empresa)</label>
                  <select
                    name="company_id"
                    className="input"
                    value={formData.company_id}
                    onChange={handleChange}
                  >
                    <option value="">Selecione</option>
                    <option value="1">1 - Engenharia</option>
                    <option value="2">2 - Telecom</option>
                    <option value="3">3 - ES</option>
                    <option value="4">4 - MA</option>
                    <option value="5">5 - SP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Coordenador</label>
                  <select
                    name="coordinator"
                    className="input"
                    value={formData.coordinator}
                    onChange={handleChange}
                  >
                    <option value="">Selecione um coordenador</option>
                    {collaborators.map((collab) => (
                      <option key={collab.id} value={collab.name}>
                        {collab.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="label">Escopo</label>
                  <textarea
                    name="scope"
                    className="input textarea"
                    value={formData.scope}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Status</label>
                  <select
                    name="status"
                    className="input"
                    value={formData.status || PROJECT_STATUS.EM_ANDAMENTO}
                    onChange={handleChange}
                  >
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Tamanho da Equipe</label>
                  <input
                    type="number"
                    name="team_size"
                    className="input"
                    value={formData.team_size}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Dias Estimados</label>
                  <input
                    type="number"
                    name="estimated_days"
                    className="input"
                    value={formData.estimated_days}
                    onChange={handleChange}
                    placeholder="Ex: 30"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Valor Venda Serviço</label>
                  <input
                    type="text"
                    name="service_value"
                    className="input"
                    value={formData.service_value ? `R$ ${Number(formData.service_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    onChange={(e) => {
                      // Remove tudo exceto números
                      const onlyNumbers = e.target.value.replace(/\D/g, '');
                      // Converte para centavos e depois para reais
                      const valueInCents = parseInt(onlyNumbers || '0', 10);
                      const valueInReais = (valueInCents / 100).toFixed(2);
                      handleChange({ target: { name: 'service_value', value: valueInReais } });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Valor Venda Material</label>
                  <input
                    type="text"
                    name="material_value"
                    className="input"
                    value={formData.material_value ? `R$ ${Number(formData.material_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, '');
                      const valueInCents = parseInt(onlyNumbers || '0', 10);
                      const valueInReais = (valueInCents / 100).toFixed(2);
                      handleChange({ target: { name: 'material_value', value: valueInReais } });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Orçamento Total</label>
                  <input
                    type="text"
                    name="budget"
                    className="input"
                    value={formData.budget ? `R$ ${Number(formData.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
                  />
                </div>
                {editingId && (
                  <>
                    <div className="form-group">
                      <label className="label">Total Faturado</label>
                      <input
                        type="text"
                        className="input"
                        value={formatCurrency(formData.invoiced)}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">A Faturar</label>
                      <input
                        type="text"
                        className="input"
                        value={formatCurrency((parseFloat(formData.budget) || 0) - (parseFloat(formData.invoiced) || 0))}
                        readOnly
                        disabled
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="label">Garantia (meses)</label>
                  <input
                    type="number"
                    name="warranty_months"
                    className="input"
                    value={formData.warranty_months}
                    onChange={handleChange}
                    min="0"
                    placeholder="Ex: 12"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Início Estimado</label>
                  <input
                    type="date"
                    name="estimated_start_date"
                    className="input"
                    value={formData.estimated_start_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Fim Estimado</label>
                  <input
                    type="date"
                    name="estimated_end_date"
                    className="input"
                    value={formData.estimated_end_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Início (Real)</label>
                  <input
                    type="date"
                    name="start_date"
                    className="input"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Fim (Real)</label>
                  <input
                    type="date"
                    name="end_date"
                    className="input"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar Alterações' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Pesquisar por nome, tag ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <label className="label">Cliente</label>
              <select
                className="input"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              >
                <option value="">Todos</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="label">Coordenador</label>
              <select
                className="input"
                value={filterCoordinator}
                onChange={(e) => setFilterCoordinator(e.target.value)}
              >
                <option value="">Todos</option>
                {uniqueCoordinators.map((coord) => (
                  <option key={coord} value={coord}>
                    {coord}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="label">Status</label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="em_andamento">{PROJECT_STATUS.EM_ANDAMENTO}</option>
                <option value="concluido">{PROJECT_STATUS.CONCLUIDO}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: '2rem' }}>
        <DataTable
          columns={columns}
          data={filteredProjects}
          actions={false}
          onRowClick={(project) => {
            setSelectedProject(project);
            setShowProjectModal(true);
          }}
        />
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
      />

      {
        showProjectModal && selectedProject && (
          <ProjectModal
            project={selectedProject}
            onClose={() => {
              setShowProjectModal(false);
              setSelectedProject(null);
            }}
            onEdit={(p) => {
              setShowProjectModal(false);
              handleEdit(p);
            }}
            onDelete={(id) => {
              setShowProjectModal(false);
              handleDelete(id);
            }}
            canEdit={canEdit}
          />
        )
      }
    </div >
  );
};

export default Projects;
