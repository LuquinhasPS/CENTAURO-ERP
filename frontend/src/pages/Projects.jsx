import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { getProjects, createProject, updateProject, deleteProject, getContracts } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import ProjectModal from '../components/ProjectModal';
import './Projects.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
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
    service_value: '',
    material_value: '',
    budget: '',
    invoiced: '',
    start_date: '',
    end_date: '',
    estimated_date: '',
  });

  useEffect(() => {
    loadProjects();
    loadContracts();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        contract_id: formData.contract_id ? parseInt(formData.contract_id) : null,
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
      service_value: project.service_value || '',
      material_value: project.material_value || '',
      budget: project.budget || '',
      invoiced: project.invoiced || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      estimated_date: project.estimated_date || '',
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
      service_value: '',
      material_value: '',
      budget: '',
      invoiced: '',
      start_date: '',
      end_date: '',
      estimated_date: '',
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
                  <label className="label">Tag *</label>
                  <input
                    type="text"
                    name="tag"
                    className="input"
                    value={formData.tag}
                    onChange={handleChange}
                    required
                    placeholder="ex: CE0922924_590"
                  />
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
                <div className="form-group">
                  <label className="label">Escopo</label>
                  <input
                    type="text"
                    name="scope"
                    className="input"
                    value={formData.scope}
                    onChange={handleChange}
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
                  <label className="label">Orçamento</label>
                  <input
                    type="number"
                    name="budget"
                    className="input"
                    value={formData.budget}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Faturado</label>
                  <input
                    type="number"
                    name="invoiced"
                    className="input"
                    value={formData.invoiced}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Início</label>
                  <input
                    type="date"
                    name="start_date"
                    className="input"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Fim</label>
                  <input
                    type="date"
                    name="end_date"
                    className="input"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Estimada</label>
                  <input
                    type="date"
                    name="estimated_date"
                    className="input"
                    value={formData.estimated_date}
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
                <th>Tag</th>
                <th>Nome</th>
                <th>Coordenador</th>
                <th>Orçamento</th>
                <th>Faturado</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td><code>{project.tag}</code></td>
                  <td>{project.name}</td>
                  <td>{project.coordinator || '-'}</td>
                  <td>{formatCurrency(project.budget)}</td>
                  <td>{formatCurrency(project.invoiced)}</td>
                  <td>{project.start_date || '-'}</td>
                  <td>{project.end_date || '-'}</td>
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
