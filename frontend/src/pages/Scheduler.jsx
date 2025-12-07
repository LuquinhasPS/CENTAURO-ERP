import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Edit } from 'lucide-react';
import { getAllocations, getCollaborators, getFleet, getProjects, getClients, createAllocation, updateAllocation, deleteAllocation } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Scheduler.css';

const Scheduler = () => {
  const [allocations, setAllocations] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    resource_id: '',
    resource_type: 'PERSON',
    project_id: '', // Default project
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allocRes, collabRes, fleetRes, projRes, clientsRes] = await Promise.all([
        getAllocations(),
        getCollaborators(),
        getFleet(),
        getProjects(),
        getClients()
      ]);
      setAllocations(allocRes.data);
      setCollaborators(collabRes.data);
      setFleet(fleetRes.data);
      setProjects(projRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Combine resources
  const resources = [
    ...collaborators.map(c => ({ id: `person-${c.id}`, type: 'PERSON', name: c.name, originalId: c.id })),
    ...fleet.map(f => ({ id: `car-${f.id}`, type: 'CAR', name: `${f.license_plate} (${f.model})`, originalId: f.id }))
  ];

  // Generate days based on view mode
  const getDays = () => {
    const days = [];
    const start = new Date(currentDate);

    if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay()); // Start on Sunday
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
      }
    } else {
      // Month view - show 4 weeks
      start.setDate(1); // First day of month
      start.setDate(start.getDate() - start.getDay()); // Start on Sunday before
      for (let i = 0; i < 28; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
      }
    }
    return days;
  };

  const days = getDays();

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const handleAddAllocation = () => {
    setFormData({
      resource_id: '',
      resource_type: 'PERSON',
      project_id: '',
      start_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditAllocation = (allocation) => {
    setFormData({
      resource_id: allocation.resource_id.toString(),
      resource_type: allocation.resource_type,
      project_id: allocation.project_id,
      start_date: allocation.date,
      end_date: allocation.date
    });
    setEditingId(allocation.id);
    setShowForm(true);
  };

  const handleDeleteAllocation = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAllocation(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting allocation:', error);
      alert('Erro ao excluir alocação');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        resource_id: parseInt(formData.resource_id),
        project_id: parseInt(formData.project_id),
        type: 'RESERVATION'
      };

      if (editingId) {
        await updateAllocation(editingId, dataToSend);
      } else {
        await createAllocation(dataToSend);
      }
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving allocation:', error);
      alert('Erro ao salvar alocação');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatRange = () => {
    const start = days[0];
    const end = days[days.length - 1];
    if (viewMode === 'week') {
      return `${formatDate(start)} - ${formatDate(end)}`;
    } else {
      return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
  };

  // Get allocations for a specific resource and day
  const getAllocationsForCell = (resourceId, resourceType, day) => {
    const dayStr = day.toISOString().split('T')[0];
    return allocations.filter(alloc => {
      if (!alloc.date) return false;
      return alloc.date === dayStr &&
        alloc.resource_type === resourceType &&
        alloc.resource_id === resourceId;
    });
  };

  return (
    <div className="scheduler">
      <header className="scheduler-header">
        <div>
          <h1>Scheduler - Alocação de Recursos</h1>
          <p>Gerencie a escala de equipe e frota</p>
        </div>
      </header>

      <div className="scheduler-controls">
        <div className="date-navigation">
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </button>
          <span className="current-range">{formatRange()}</span>
          <button className="btn-icon" onClick={() => navigate(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="scheduler-actions">
          <button className="btn btn-primary" onClick={handleAddAllocation}>
            <Plus size={20} />
            Nova Alocação
          </button>
          <div className="view-toggle">
            <button
              className={`btn-toggle ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn-toggle ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      <div className="scheduler-grid-container">
        <div className="scheduler-grid" style={{ gridTemplateColumns: viewMode === 'week' ? `200px repeat(7, 1fr)` : `200px repeat(28, 60px)` }}>
          {/* Header */}
          <div className="grid-header">
            <div className="resource-header">Recurso</div>
            {days.map((day, index) => (
              <div key={index} className="day-header">
                {viewMode === 'week' ? (
                  <>
                    <div className="day-name">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                    <div className="day-date">{day.getDate()}</div>
                  </>
                ) : (
                  <div className="day-date-small">{day.getDate()}</div>
                )}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          {resources.length === 0 ? (
            <div className="empty-resources">
              <p>Nenhum recurso cadastrado. Cadastre colaboradores e veículos primeiro.</p>
            </div>
          ) : (
            resources.map((resource) => (
              <div key={resource.id} className="grid-row">
                <div className="resource-cell">
                  <span className={`resource-badge ${resource.type.toLowerCase()}`}>
                    {resource.type === 'PERSON' ? '👤' : '🚗'}
                  </span>
                  <span className="resource-name">{resource.name}</span>
                </div>
                {days.map((day, dayIndex) => {
                  const cellAllocations = getAllocationsForCell(resource.originalId, resource.type, day);
                  return (
                    <div key={dayIndex} className="allocation-cell">
                      {cellAllocations.map((alloc) => {
                        const left = 0;
                        const width = 100;
                        return (
                          <div
                            key={alloc.id}
                            className="allocation-bar"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: alloc.status === 'CONFIRMED' ? '#3b82f6' : '#f59e0b'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAllocation(alloc);
                            }}
                            title={(() => {
                              const proj = projects.find(p => p.id === alloc.project_id);
                              const client = proj ? clients.find(c => c.id === proj.client_id) : null;
                              return proj ? `${client?.name || 'Cliente'} | ${proj.tag}` : 'Clique para editar';
                            })()}
                          >
                            {(() => {
                              const proj = projects.find(p => p.id === alloc.project_id);
                              if (!proj) return <span className="allocation-tag">Proj #{alloc.project_id}</span>;

                              const client = clients.find(c => c.id === proj.client_id);
                              // Show shorter client name
                              const clientName = client?.name?.split(' ')[0] || '-';

                              return (
                                <>
                                  <span className="allocation-tag">{proj.tag || proj.name}</span>
                                  <span className="allocation-client">{clientName}</span>
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {allocations.length === 0 && resources.length > 0 && (
        <div className="empty-scheduler">
          <p>Nenhuma alocação registrada ainda.</p>
        </div>
      )}

      {showForm && (
        <div className="scheduler-form-modal">
          <div className="scheduler-form card">
            <div className="form-header">
              <h3>{editingId ? 'Editar Alocação' : 'Nova Alocação'}</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Tipo de Recurso</label>
                <select
                  name="resource_type"
                  className="input"
                  value={formData.resource_type}
                  onChange={handleChange}
                >
                  <option value="PERSON">Colaborador</option>
                  <option value="CAR">Veículo</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Recurso *</label>
                <select
                  name="resource_id"
                  className="input"
                  value={formData.resource_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione...</option>
                  {formData.resource_type === 'PERSON' ? (
                    collaborators.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    fleet.map(f => (
                      <option key={f.id} value={f.id}>{f.model} - {f.license_plate}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Projeto *</label>
                <select
                  name="project_id"
                  className="input"
                  value={formData.project_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione...</option>
                  {projects.map(p => {
                    const client = clients.find(c => c.id === p.client_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {client ? `${client.name} - ` : ''}{p.tag} ({p.name})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Data Início *</label>
                  <input
                    type="date"
                    name="start_date"
                    className="input"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data Fim *</label>
                  <input
                    type="date"
                    name="end_date"
                    className="input"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>


              <div className="form-actions">
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-danger-outline"
                    onClick={() => handleDeleteAllocation(editingId)}
                    style={{ marginRight: 'auto' }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                )}
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

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta alocação? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Scheduler;
