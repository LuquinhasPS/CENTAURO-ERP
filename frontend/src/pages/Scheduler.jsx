import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Edit } from 'lucide-react';
import { getAllocations, getCollaborators, getFleet, getTools, getProjects, getClients, createAllocation, updateAllocation, deleteAllocation } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import './Scheduler.css';

const Scheduler = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('scheduler', 'edit');
  const [allocations, setAllocations] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [tools, setTools] = useState([]);
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
    end_date: '',
    include_weekends: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allocRes, collabRes, fleetRes, toolsRes, projRes, clientsRes] = await Promise.all([
        getAllocations(),
        getCollaborators(),
        getFleet(),
        getTools(),
        getProjects(),
        getClients()
      ]);
      setAllocations(allocRes.data);
      setCollaborators(collabRes.data);
      setFleet(fleetRes.data);
      setTools(toolsRes.data);
      setProjects(projRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Combine resources
  const resources = [
    ...collaborators.map(c => ({ id: `person-${c.id}`, type: 'PERSON', name: c.name, originalId: c.id })),
    ...fleet.map(f => ({ id: `car-${f.id}`, type: 'CAR', name: `${f.license_plate} (${f.model})`, originalId: f.id })),
    ...tools.map(t => ({ id: `tool-${t.id}`, type: 'TOOL', name: t.name, originalId: t.id }))
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
      // Month view - full month weeks
      start.setDate(1); // First day
      start.setDate(start.getDate() - start.getDay()); // Start on Sunday

      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const endOfCalendar = new Date(endOfMonth);
      endOfCalendar.setDate(endOfCalendar.getDate() + (6 - endOfCalendar.getDay())); // End on Saturday

      let current = new Date(start);
      while (current <= endOfCalendar) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
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
    // Use local date for default value to avoid timezone shifts
    const today = new Date();
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    setFormData({
      resource_id: '',
      resource_type: 'PERSON',
      project_id: '',
      start_date: localDateStr,
      end_date: localDateStr,
      include_weekends: false
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
      end_date: allocation.date,
      include_weekends: true // Default to true when editing to show existing allocation even if weekend
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
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
  };

  // Get allocations for a specific resource and day
  const getAllocationsForCell = (resourceId, resourceType, day) => {
    // Use local date string comparison to avoid UTC shifts
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

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
          {canEdit && (
            <button className="btn btn-primary" onClick={handleAddAllocation}>
              <Plus size={20} />
              Nova Alocação
            </button>
          )}
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
        <div className="scheduler-grid" style={{ gridTemplateColumns: viewMode === 'week' ? `200px repeat(7, 1fr)` : `200px repeat(${days.length}, 60px)` }}>
          {/* Header */}
          <div className="grid-header">
            <div className="resource-header">Recurso</div>
            {days.map((day, index) => (
              <div key={index} className={`day-header ${day.getDay() === 0 || day.getDay() === 6 ? 'weekend-header' : ''}`}>
                {viewMode === 'week' ? (
                  <>
                    <div className="day-name">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                    <div className="day-date">{day.getDate()}</div>
                  </>
                ) : (
                  <>
                    <div className="day-weekday-letter">{day.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}</div>
                    <div className="day-date-small">{day.getDate()}</div>
                  </>
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
                    {resource.type === 'PERSON' ? '👤' : (resource.type === 'CAR' ? '🚗' : '🔧')}
                  </span>
                  <span className="resource-name">{resource.name}</span>
                </div>
                {days.map((day, dayIndex) => {
                  const cellAllocations = getAllocationsForCell(resource.originalId, resource.type, day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={dayIndex} className={`allocation-cell ${isWeekend ? 'weekend' : ''}`}>
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
                  <option value="TOOL">Ferramenta</option>
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
                  ) : formData.resource_type === 'CAR' ? (
                    fleet.map(f => (
                      <option key={f.id} value={f.id}>{f.model} - {f.license_plate}</option>
                    ))
                  ) : (
                    tools.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
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

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  name="include_weekends"
                  id="include_weekends"
                  checked={formData.include_weekends}
                  onChange={(e) => setFormData({ ...formData, include_weekends: e.target.checked })}
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="include_weekends" className="label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                  Incluir Finais de Semana e Feriados
                </label>
              </div>

              <div className="form-actions">
                {editingId && canEdit && (
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
                {canEdit && (
                  <button type="submit" className="btn btn-primary">
                    Salvar
                  </button>
                )}
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
