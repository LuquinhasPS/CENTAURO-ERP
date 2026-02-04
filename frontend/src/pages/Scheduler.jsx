import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Edit, Filter } from 'lucide-react';
import { getAllocations, getCollaborators, getFleet, getTools, getProjects, getClients, createAllocation, updateAllocation, deleteAllocation } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import { ResourceRow } from '../components/Scheduler';
import './Scheduler.css';

// Feriados nacionais brasileiros (fixos)
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Confraternização Universal' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do Trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 12, day: 25, name: 'Natal' },
];

// Feriados móveis (Páscoa, Carnaval, Corpus Christi) - precalculados para alguns anos
const MOBILE_HOLIDAYS = {
  2024: [
    { month: 2, day: 12, name: 'Carnaval' },
    { month: 2, day: 13, name: 'Carnaval' },
    { month: 3, day: 29, name: 'Sexta-feira Santa' },
    { month: 3, day: 31, name: 'Páscoa' },
    { month: 5, day: 30, name: 'Corpus Christi' },
  ],
  2025: [
    { month: 3, day: 3, name: 'Carnaval' },
    { month: 3, day: 4, name: 'Carnaval' },
    { month: 4, day: 18, name: 'Sexta-feira Santa' },
    { month: 4, day: 20, name: 'Páscoa' },
    { month: 6, day: 19, name: 'Corpus Christi' },
  ],
  2026: [
    { month: 2, day: 16, name: 'Carnaval' },
    { month: 2, day: 17, name: 'Carnaval' },
    { month: 4, day: 3, name: 'Sexta-feira Santa' },
    { month: 4, day: 5, name: 'Páscoa' },
    { month: 6, day: 4, name: 'Corpus Christi' },
  ],
};

// Função para verificar se uma data é feriado
const getHolidayInfo = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Verificar feriados fixos
  const fixedHoliday = FIXED_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (fixedHoliday) return fixedHoliday;

  // Verificar feriados móveis
  const mobileHolidays = MOBILE_HOLIDAYS[year] || [];
  const mobileHoliday = mobileHolidays.find(h => h.month === month && h.day === day);
  if (mobileHoliday) return mobileHoliday;

  return null;
};

const Scheduler = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('scheduler', 'edit');
  const [allocations, setAllocations] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [tools, setTools] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);  // Empty = show all (global view)
  const [showTeamFilter, setShowTeamFilter] = useState(false);
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
      const [allocRes, collabRes, fleetRes, toolsRes, projRes, clientsRes, teamsRes] = await Promise.all([
        getAllocations(selectedTeamIds),
        getCollaborators(),
        getFleet(),
        getTools(),
        getProjects(),
        getClients(),
        api.get('/teams/teams')
      ]);
      setAllocations(allocRes.data);
      setCollaborators(collabRes.data);
      setFleet(fleetRes.data);
      setTools(toolsRes.data);
      setProjects(projRes.data);
      setClients(clientsRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Reload allocations when team filter changes
  useEffect(() => {
    const reloadAllocations = async () => {
      try {
        const res = await getAllocations(selectedTeamIds);
        setAllocations(res.data);
      } catch (error) {
        console.error('Error reloading allocations:', error);
      }
    };
    reloadAllocations();
  }, [selectedTeamIds]);

  // Combine resources - filter collaborators by selected teams
  const filteredCollaborators = selectedTeamIds.length > 0
    ? collaborators.filter(c => c.teams?.some(t => selectedTeamIds.includes(t.id)))
    : collaborators;

  const resources = [
    ...filteredCollaborators.map(c => ({ id: `person-${c.id}`, type: 'PERSON', name: c.name, originalId: c.id })),
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

  // Get allocations for a specific resource and day - kept for backward compatibility
  const getAllocationsForCell = (resourceId, resourceType, day) => {
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return allocations.filter(alloc => {
      if (!alloc.date) return false;
      return alloc.date === dayStr &&
        alloc.resource_type === resourceType &&
        alloc.resource_id === resourceId;
    });
  };

  // Handler for empty cell clicks (fallback when popover not used)
  const handleCellClick = ({ date, resourceId, resourceType }) => {
    if (!canEdit) return;

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    setFormData({
      resource_id: resourceId.toString(),
      resource_type: resourceType,
      project_id: '',
      start_date: dateStr,
      end_date: dateStr,
      include_weekends: true
    });
    setEditingId(null);
    setShowForm(true);
  };

  // Quick Allocation: Create allocation directly from popover selection
  const handleQuickAllocation = async (projectId, date, resourceId, resourceType) => {
    if (!canEdit) return;

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    try {
      await createAllocation({
        resource_id: resourceId,
        resource_type: resourceType,
        project_id: projectId,
        start_date: dateStr,
        end_date: dateStr,
        include_weekends: true,
        type: 'RESERVATION'
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error creating quick allocation:', error);
      alert('Erro ao criar alocação rápida');
    }
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
          {/* Team Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowTeamFilter(!showTeamFilter)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Filter size={18} />
              Filtrar por Times
              {selectedTeamIds.length > 0 && (
                <span style={{
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {selectedTeamIds.length}
                </span>
              )}
            </button>

            {showTeamFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '220px',
                padding: '0.5rem'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Selecionar Times</span>
                    <button
                      onClick={() => setSelectedTeamIds([])}
                      style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Limpar
                    </button>
                  </div>
                  {selectedTeamIds.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Visão Global (todos)</span>
                  )}
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {teams.map(team => (
                    <label
                      key={team.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.375rem',
                        background: selectedTeamIds.includes(team.id) ? '#e0e7ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeamIds([...selectedTeamIds, team.id]);
                          } else {
                            setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                          }
                        }}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <span style={{ fontSize: '0.875rem' }}>{team.name}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setShowTeamFilter(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>

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

          {canEdit && (
            <button className="btn btn-primary" onClick={handleAddAllocation}>
              <Plus size={20} />
              Nova Alocação
            </button>
          )}
        </div>
      </div>

      <div className="scheduler-grid-container">
        <div className="scheduler-grid" style={{ gridTemplateColumns: viewMode === 'week' ? `200px repeat(7, 1fr)` : `200px repeat(${days.length}, 60px)` }}>
          {/* Header */}
          <div className="grid-header">
            <div className="resource-header">Recurso</div>
            {days.map((day, index) => {
              const holidayInfo = getHolidayInfo(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const headerClass = `day-header ${isWeekend ? 'weekend-header' : ''} ${holidayInfo ? 'holiday-header' : ''}`;
              return (
                <div key={index} className={headerClass} title={holidayInfo?.name || ''}>
                  {viewMode === 'week' ? (
                    <>
                      <div className="day-name">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                      <div className="day-date">
                        {day.getDate()}
                        {holidayInfo && <span className="holiday-indicator">🎉</span>}
                      </div>
                      {holidayInfo && <div className="holiday-name">{holidayInfo.name}</div>}
                    </>
                  ) : (
                    <>
                      <div className="day-weekday-letter">{day.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}</div>
                      <div className={`day-date-small ${holidayInfo ? 'holiday-date' : ''}`} title={holidayInfo?.name}>
                        {day.getDate()}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid Body - Using ResourceRow component */}
          {resources.length === 0 ? (
            <div className="empty-resources">
              <p>Nenhum recurso cadastrado. Cadastre colaboradores e veículos primeiro.</p>
            </div>
          ) : (
            resources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                days={days}
                allocations={allocations}
                projects={projects}
                clients={clients}
                getHolidayInfo={getHolidayInfo}
                onCellClick={handleCellClick}
                onAllocationClick={handleEditAllocation}
                onQuickAllocate={handleQuickAllocation}
                canEdit={canEdit}
              />
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
