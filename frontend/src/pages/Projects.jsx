import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { getProjects, createProject, updateProject, deleteProject, getContracts, getClients } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import ProjectModal from '../components/ProjectModal';
import './Projects.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
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
  });

  useEffect(() => {
    loadProjects();
    loadContracts();
    loadClients();
  }, []);

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
      };

      if (editingId) {
        await updateProject(editingId, dataToSend);
      } else {
        await createProject(dataToSend);
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadProjects();
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
      project_number: project.project_number,
      invoiced: project.invoiced,
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
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto-calculate budget
    if (name === 'service_value' || name === 'material_value') {
      const service = parseFloat(name === 'service_value' ? value : formData.service_value) || 0;
      const material = parseFloat(name === 'material_value' ? value : formData.material_value) || 0;
      newFormData.budget = (service + material).toFixed(2);
    }

    setFormData(newFormData);
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="projects">
      <header className="projects-header">
        <div>
          <h1>Gestão de Projetos</h1>
          <p>Controle de projetos e informações financeiras</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          Novo Projeto
        </button>
      </header>

      {showForm && (
        <div className="project-form-modal">
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
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Nº Projeto {editingId ? '' : '(Manual/Opcional)'}</label>
                  <input
                    type="number"
                    name="project_number"
                    className="input"
                    value={formData.project_number || ''}
                    onChange={handleChange}
                    readOnly={!!editingId}
                    disabled={!!editingId}
                    placeholder={!editingId ? "Automático se vazio" : ""}
                  />
                </div>
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
                  >
                    <option value="">Sem contrato</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.description}
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
                  <label className="label">Coordenador</label>
                  <input
                    type="text"
                    name="coordinator"
                    className="input"
                    value={formData.coordinator}
                    onChange={handleChange}
                  />
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
                  <label className="label">Valor Venda Serviço</label>
                  <input
                    type="number"
                    name="service_value"
                    className="input"
                    value={formData.service_value}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Valor Venda Material</label>
                  <input
                    type="number"
                    name="material_value"
                    className="input"
                    value={formData.material_value}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Orçamento Total</label>
                  <input
                    type="number"
                    name="budget"
                    className="input"
                    value={formData.budget}
                    readOnly
                    disabled
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="projects-table card">
        {loading ? (
          <div className="loading">Carregando projetos...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum projeto cadastrado ainda.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Tag</th>
                <th>Nome</th>
                <th>Coordenador</th>
                <th>Orçamento</th>
                <th>Faturado</th>
                <th>A Faturar</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.project_number || '-'}</td>
                  <td><code>{project.tag}</code></td>
                  <td>{project.name}</td>
                  <td>{project.coordinator || '-'}</td>
                  <td>{formatCurrency(project.budget)}</td>
                  <td>{formatCurrency(project.invoiced)}</td>
                  <td>{formatCurrency((project.budget || 0) - (project.invoiced || 0))}</td>
                  <td>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon-small" onClick={() => {
                        setSelectedProject(project);
                        setShowProjectModal(true);
                      }}>
                        <Eye size={16} />
                      </button>
                      <button className="btn-icon-small" onClick={() => handleEdit(project)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn-icon-small danger" onClick={() => handleDelete(project.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
      />

      {showProjectModal && selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
};

export default Projects;
