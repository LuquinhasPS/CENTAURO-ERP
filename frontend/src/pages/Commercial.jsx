import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getProposals, createProposal, updateProposal, convertProposalToProject,
  getClients, getCollaborators,
  getProposalTasks, createProposalTask, deleteProposalTask,
  completeProposalTask, stopTaskRecurrence
} from '../services/api';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import {
  Plus, Search, FileText, CheckCircle, XCircle, RefreshCw,
  Calendar, Check, StopCircle, Trash2, RotateCcw
} from 'lucide-react';
import './Commercial.css';

// --- CONSTANTS - 9 Colunas do Funil ---
const COLUMNS = [
  { id: 'LEAD', title: 'Lead', color: '#8b5cf6' },
  { id: 'VISITA_TECNICA', title: 'Visita Técnica', color: '#06b6d4' },
  { id: 'RASCUNHO', title: 'Rascunho', color: '#64748b' },
  { id: 'APROVACAO_INTERNA', title: 'Aprovação Interna', color: '#f97316' },
  { id: 'ENVIADA', title: 'Enviada', color: '#3b82f6' },
  { id: 'NEGOCIACAO', title: 'Negociação', color: '#f59e0b' },
  { id: 'STAND_BY', title: 'Stand By', color: '#94a3b8' },
  { id: 'GANHA', title: 'Ganha', color: '#16a34a' },
  { id: 'PERDIDA', title: 'Perdida', color: '#ef4444' }
];

const Commercial = () => {
  const { hasPermission } = useAuth();
  const canEdit = true; // Temporary bypass for prototype

  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  // --- MODALS ---
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);

  // Edit/Convert/Loss selection
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalFormData, setProposalFormData] = useState({});
  const [convertFormData, setConvertFormData] = useState({});
  const [lossReason, setLossReason] = useState('');
  const [pendingLossProposalId, setPendingLossProposalId] = useState(null);

  // Tasks (Tarefas de Follow-up)
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'tasks'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState(false);
  const [newTaskRecurrenceDays, setNewTaskRecurrenceDays] = useState(2);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [propRes, cliRes, colRes] = await Promise.all([
        getProposals(),
        getClients(),
        getCollaborators()
      ]);
      console.log('Clients loaded:', cliRes.data); // DEBUG
      setProposals(propRes.data);
      setClients(cliRes.data);
      setCollaborators(colRes.data);
    } catch (error) {
      console.error("Error loading commercial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks when a proposal is selected
  const loadTasks = async (proposalId) => {
    try {
      const res = await getProposalTasks(proposalId);
      setTasks(res.data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    }
  };

  // --- DND HANDLERS ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdVal = active.id;
    const overId = over.id;

    const proposal = proposals.find(p => p.id === activeIdVal);
    if (!proposal) return;

    let newStatus = overId;
    const overProposal = proposals.find(p => p.id === overId);
    if (overProposal) {
      newStatus = overProposal.status;
    }

    if (!COLUMNS.some(c => c.id === newStatus)) return;

    if (proposal.status !== newStatus) {
      const oldStatus = proposal.status;

      // Optimistic Update
      setProposals(prev => prev.map(p =>
        p.id === activeIdVal ? { ...p, status: newStatus } : p
      ));

      // Special handling for GANHA - show convert modal
      if (newStatus === 'GANHA' && !proposal.converted_project_id) {
        setSelectedProposal(proposal);
        setConvertFormData({
          start_date: new Date().toISOString().split('T')[0],
          manager_name: '',
          project_scope: proposal.description || proposal.title,
          budget: proposal.value,
          estimated_days: 30
        });
        setShowConvertModal(true);
      }
      // Special handling for PERDIDA - show loss modal
      else if (newStatus === 'PERDIDA') {
        setPendingLossProposalId(activeIdVal);
        setLossReason('');
        setShowLossModal(true);
      }
      // Normal status update
      else {
        try {
          await updateProposal(activeIdVal, { status: newStatus });
        } catch (error) {
          console.error("Error updating status:", error);
          // Revert
          setProposals(prev => prev.map(p =>
            p.id === activeIdVal ? { ...p, status: oldStatus } : p
          ));
        }
      }
    }
  };

  // --- LOSS MODAL HANDLERS ---
  const confirmLoss = async () => {
    if (!lossReason.trim()) {
      alert('Por favor, informe o motivo da perda.');
      return;
    }

    try {
      await updateProposal(pendingLossProposalId, {
        status: 'PERDIDA',
        loss_reason: lossReason
      });
      setShowLossModal(false);
      setPendingLossProposalId(null);
      setLossReason('');
      loadData();
    } catch (error) {
      console.error("Error marking as lost:", error);
      alert("Erro ao marcar como perdida: " + error.message);
      loadData(); // Revert UI
    }
  };

  const cancelLoss = () => {
    setShowLossModal(false);
    setPendingLossProposalId(null);
    setLossReason('');
    loadData(); // Revert status
  };

  // --- CRUD ---
  const handleNewProposal = () => {
    setProposalFormData({
      title: '',
      client_name: '',
      value: '0.00',
      labor_value: '0.00',
      material_value: '0.00',
      proposal_type: '',
      company_id: '',
      description: '',
      status: 'LEAD'
    });
    setSelectedProposal(null);
    setTasks([]);
    setActiveTab('info');
    setShowFormModal(true);
  };

  const handleEditProposal = async (prop) => {
    setProposalFormData({
      ...prop,
      client_name: prop.client_name || (clients.find(c => c.id === prop.client_id)?.name)
    });
    setSelectedProposal(prop);
    setActiveTab('info');
    await loadTasks(prop.id);
    setShowFormModal(true);
  };

  const saveProposal = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...proposalFormData,
        value: parseFloat(proposalFormData.value) || 0,
        labor_value: parseFloat(proposalFormData.labor_value) || 0,
        material_value: parseFloat(proposalFormData.material_value) || 0,
        company_id: proposalFormData.company_id ? parseInt(proposalFormData.company_id) : null,
        proposal_type: proposalFormData.proposal_type || null
      };

      if (selectedProposal) {
        await updateProposal(selectedProposal.id, payload);
      } else {
        await createProposal(payload);
      }
      setShowFormModal(false);
      loadData();
    } catch (error) {
      alert("Erro ao salvar proposta: " + error.message);
    }
  };

  // --- TASK HANDLERS ---
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskDate) {
      alert('Preencha o título e a data da tarefa.');
      return;
    }

    try {
      const taskData = {
        title: newTaskTitle,
        due_date: new Date(newTaskDate).toISOString(),
        recurrence_days: newTaskRecurrence ? parseInt(newTaskRecurrenceDays) : null
      };

      await createProposalTask(selectedProposal.id, taskData);
      await loadTasks(selectedProposal.id);

      // Reset form
      setNewTaskTitle('');
      setNewTaskDate('');
      setNewTaskRecurrence(false);
      setNewTaskRecurrenceDays(2);
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Erro ao criar tarefa: " + error.message);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await completeProposalTask(taskId);
      if (res.data.next_task_created) {
        alert('Tarefa concluída! Uma nova tarefa recorrente foi agendada.');
      }
      await loadTasks(selectedProposal.id);
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Erro ao concluir tarefa: " + error.message);
    }
  };

  const handleStopRecurrence = async (taskId) => {
    try {
      await stopTaskRecurrence(taskId);
      await loadTasks(selectedProposal.id);
    } catch (error) {
      console.error("Error stopping recurrence:", error);
      alert("Erro ao parar recorrência: " + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;

    try {
      await deleteProposalTask(taskId);
      await loadTasks(selectedProposal.id);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Erro ao excluir tarefa: " + error.message);
    }
  };

  // --- CONVERSION HANDLERS ---
  const handleConversion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        start_date: convertFormData.start_date,
        coordinator: convertFormData.coordinator,
        company_id: parseInt(convertFormData.company_id),
        client_id: convertFormData.client_id ? parseInt(convertFormData.client_id) : selectedProposal.client_id,
        estimated_days: parseInt(convertFormData.estimated_days),
        budget: parseFloat(convertFormData.budget),
        project_scope: convertFormData.project_scope
      };

      if (!payload.client_id && !selectedProposal.client_id) {
        alert("É necessário vincular um cliente.");
        return;
      }
      if (!payload.company_id) {
        alert("Selecione a empresa/categoria para gerar a TAG.");
        return;
      }

      await convertProposalToProject(selectedProposal.id, payload);
      alert("Sucesso! Projeto criado.");
      setShowConvertModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Erro na conversão: " + (error.response?.data?.detail || error.message));
      loadData();
    }
  };

  const cancelConversion = () => {
    setShowConvertModal(false);
    loadData();
  };

  // Filtered
  const filteredProposals = useMemo(() => {
    return proposals.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [proposals, searchTerm]);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="commercial-page">
      <header className="page-header">
        <div>
          <h1>Comercial & CRM</h1>
          <p>Gestão de propostas e funil de vendas</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewProposal}>
          <Plus size={18} /> Nova Proposta
        </button>
      </header>

      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            placeholder="Buscar propostas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
              <div className="column-header" style={{ borderTop: `3px solid ${col.color}` }}>
                <span>{col.title}</span>
                <span className="count">
                  {filteredProposals.filter(p => p.status === col.id).length}
                </span>
              </div>

              <SortableContext
                items={filteredProposals.filter(p => p.status === col.id).map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="column-droppable" id={col.id}>
                  <DroppableArea id={col.id}>
                    {filteredProposals.filter(p => p.status === col.id).map(proposal => (
                      <SortableProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onClick={() => handleEditProposal(proposal)}
                      />
                    ))}
                  </DroppableArea>
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="proposal-card overlay">
              <strong>{proposals.find(p => p.id === activeId)?.title}</strong>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* FORM MODAL (Nova/Editar Proposta) */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <h3>{selectedProposal ? 'Editar Proposta' : 'Nova Proposta'}</h3>

            {/* Tabs */}
            {selectedProposal && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <button
                  type="button"
                  className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('info')}
                  style={{ padding: '6px 16px' }}
                >
                  Informações
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('tasks')}
                  style={{ padding: '6px 16px' }}
                >
                  Follow-up ({tasks.length})
                </button>
              </div>
            )}

            {/* Tab: Info */}
            {activeTab === 'info' && (
              <form onSubmit={saveProposal}>
                <div className="form-group">
                  <label>Título *</label>
                  <input required value={proposalFormData.title} onChange={e => setProposalFormData({ ...proposalFormData, title: e.target.value })} placeholder="Ex: Reforma Loja XYZ" />
                </div>
                <div className="form-group">
                  <label>Cliente</label>
                  <select
                    value={proposalFormData.client_id || ''}
                    onChange={e => {
                      const c = clients.find(cl => cl.id === parseInt(e.target.value));
                      setProposalFormData({
                        ...proposalFormData,
                        client_id: e.target.value,
                        client_name: c ? c.name : ''
                      })
                    }}
                  >
                    <option value="">-- Novo / Prospect --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!proposalFormData.client_id && (
                    <input
                      style={{ marginTop: '5px' }}
                      value={proposalFormData.client_name || ''}
                      onChange={e => setProposalFormData({ ...proposalFormData, client_name: e.target.value })}
                      placeholder="Nome do Cliente (Prospect)"
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Tipo de Proposta</label>
                  <select
                    value={proposalFormData.proposal_type || ''}
                    onChange={e => setProposalFormData({ ...proposalFormData, proposal_type: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="RECORRENTE">Contrato Recorrente</option>
                    <option value="LPU">LPU</option>
                    <option value="AVULSA">Proposta Avulsa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>CNPJ / Empresa (Opcional)</label>
                  <select
                    value={proposalFormData.company_id || ''}
                    onChange={e => setProposalFormData({ ...proposalFormData, company_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="1">1 - Engenharia</option>
                    <option value="2">2 - Telecom</option>
                    <option value="3">3 - ES</option>
                    <option value="4">4 - MA</option>
                    <option value="5">5 - SP</option>
                  </select>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Valor Mão de Obra (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalFormData.labor_value}
                      onChange={e => {
                        const lab = parseFloat(e.target.value) || 0;
                        const mat = parseFloat(proposalFormData.material_value) || 0;
                        setProposalFormData({
                          ...proposalFormData,
                          labor_value: e.target.value,
                          value: (lab + mat).toFixed(2)
                        })
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Valor Material (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalFormData.material_value}
                      onChange={e => {
                        const mat = parseFloat(e.target.value) || 0;
                        const lab = parseFloat(proposalFormData.labor_value) || 0;
                        setProposalFormData({
                          ...proposalFormData,
                          material_value: e.target.value,
                          value: (lab + mat).toFixed(2)
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={proposalFormData.value}
                    readOnly
                    style={{ background: '#f8fafc', fontWeight: 'bold' }}
                  />
                </div>

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea value={proposalFormData.description} onChange={e => setProposalFormData({ ...proposalFormData, description: e.target.value })} rows={3} />
                </div>

                {/* Show loss reason if status is PERDIDA */}
                {selectedProposal?.status === 'PERDIDA' && selectedProposal?.loss_reason && (
                  <div className="form-group" style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <label style={{ color: '#dc2626' }}><XCircle size={14} style={{ marginRight: '4px' }} />Motivo da Perda</label>
                    <p style={{ margin: '4px 0 0 0', color: '#7f1d1d' }}>{selectedProposal.loss_reason}</p>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            )}

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && selectedProposal && (
              <div>
                {/* Create Task Form */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>Nova Tarefa de Follow-up</h4>
                  <div className="form-group">
                    <input
                      placeholder="Ex: Cobrar retorno, Ligar para cliente..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label>Data de Vencimento</label>
                      <input
                        type="date"
                        value={newTaskDate}
                        onChange={e => setNewTaskDate(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                      <input
                        type="checkbox"
                        id="recurrence-check"
                        checked={newTaskRecurrence}
                        onChange={e => setNewTaskRecurrence(e.target.checked)}
                        style={{ width: 'auto' }}
                      />
                      <label htmlFor="recurrence-check" style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        <RefreshCw size={14} style={{ marginRight: '4px' }} />
                        Repetir cobrança?
                      </label>
                    </div>
                  </div>

                  {newTaskRecurrence && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>A cada</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={newTaskRecurrenceDays}
                        onChange={e => setNewTaskRecurrenceDays(e.target.value)}
                        style={{ width: '60px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>dias após concluir</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateTask}
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    <Plus size={16} /> Adicionar Tarefa
                  </button>
                </div>

                {/* Task List */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>
                    Tarefas ({tasks.filter(t => !t.is_completed).length} pendentes)
                  </h4>

                  {tasks.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                      Nenhuma tarefa de follow-up cadastrada.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: task.is_completed ? '#f1f5f9' : '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            opacity: task.is_completed ? 0.7 : 1
                          }}
                        >
                          {/* Complete Button */}
                          <button
                            onClick={() => !task.is_completed && handleCompleteTask(task.id)}
                            disabled={task.is_completed}
                            style={{
                              background: task.is_completed ? '#22c55e' : '#f8fafc',
                              border: `1px solid ${task.is_completed ? '#22c55e' : '#cbd5e1'}`,
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: task.is_completed ? 'default' : 'pointer',
                              color: task.is_completed ? '#fff' : '#94a3b8'
                            }}
                          >
                            <Check size={14} />
                          </button>

                          {/* Task Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontWeight: 500,
                                textDecoration: task.is_completed ? 'line-through' : 'none',
                                color: task.is_completed ? '#94a3b8' : '#334155'
                              }}>
                                {task.title}
                              </span>
                              {task.recurrence_days && task.is_active && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '2px 6px',
                                  borderRadius: '10px'
                                }}>
                                  <RotateCcw size={10} /> A cada {task.recurrence_days}d
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                              <Calendar size={12} style={{ marginRight: '4px' }} />
                              {formatDate(task.due_date)}
                              {task.is_completed && task.completed_at && (
                                <span style={{ marginLeft: '8px', color: '#22c55e' }}>
                                  ✓ Concluída em {formatDate(task.completed_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {task.recurrence_days && task.is_active && !task.is_completed && (
                              <button
                                onClick={() => handleStopRecurrence(task.id)}
                                title="Parar Recorrência"
                                style={{
                                  background: '#fef3c7',
                                  border: '1px solid #fcd34d',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.75rem',
                                  color: '#92400e'
                                }}
                              >
                                <StopCircle size={12} /> Parar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              title="Excluir"
                              style={{
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#dc2626'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOSS MODAL */}
      {showLossModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ textAlign: 'center' }}>
              <XCircle size={48} color="#ef4444" style={{ marginBottom: '10px' }} />
              <h3 style={{ margin: 0 }}>Registrar Perda</h3>
              <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Informe o motivo da perda desta proposta</p>
            </div>
            <div className="form-group">
              <label>Motivo da Perda *</label>
              <textarea
                rows={4}
                value={lossReason}
                onChange={e => setLossReason(e.target.value)}
                placeholder="Ex: Preço acima do concorrente, cliente desistiu do projeto, prazo não atendeu..."
                style={{ resize: 'none' }}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelLoss}>Cancelar</button>
              <button type="button" className="btn btn-primary" style={{ background: '#ef4444' }} onClick={confirmLoss}>
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT MODAL */}
      {showConvertModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3><CheckCircle size={20} color="#16a34a" /> Fechamento de Venda</h3>
              <p>Transformar proposta em Projeto Oficial</p>
            </div>
            <form onSubmit={handleConversion}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Empresa (Prefixo TAG) *</label>
                  <select required value={convertFormData.company_id || ''} onChange={e => setConvertFormData({ ...convertFormData, company_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    <option value="1">1 - Engenharia</option>
                    <option value="2">2 - Telecom</option>
                    <option value="3">3 - ES</option>
                    <option value="4">4 - MA</option>
                    <option value="5">5 - SP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data de Início Real *</label>
                  <input type="date" required value={convertFormData.start_date} onChange={e => setConvertFormData({ ...convertFormData, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Orçamento Aprovado (R$)</label>
                  <input type="number" step="0.01" value={convertFormData.budget} onChange={e => setConvertFormData({ ...convertFormData, budget: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Previsão (Dias)</label>
                  <input type="number" value={convertFormData.estimated_days} onChange={e => setConvertFormData({ ...convertFormData, estimated_days: e.target.value })} />
                </div>
                <div className="form-group full-width">
                  <label>Escopo do Projeto</label>
                  <textarea value={convertFormData.project_scope} onChange={e => setConvertFormData({ ...convertFormData, project_scope: e.target.value })} rows={4} />
                </div>

                {(!selectedProposal.client_id && !convertFormData.client_id) && (
                  <div className="form-group full-width" style={{ border: '1px solid #f59e0b', padding: '10px', borderRadius: '4px', background: '#fffbeb' }}>
                    <label style={{ color: '#b45309' }}>Atenção: Vincule um cliente para continuar</label>
                    <select required onChange={e => setConvertFormData({ ...convertFormData, client_id: e.target.value })}>
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cancelConversion}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#16a34a' }}>Confirmar e Gerar Obra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components for DnD
const DroppableArea = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="droppable-area" style={{ minHeight: '100px', height: '100%' }}>
      {children}
    </div>
  );
};

const SortableProposalCard = ({ proposal, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: proposal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="proposal-card"
      onClick={onClick}
    >
      <div className="card-header">
        <span className="internal-id">{proposal.internal_id || 'PROP-???'}</span>
        {proposal.converted_project_id && <span className="badge-converted">Gerou Obra</span>}
      </div>
      <h4>{proposal.title}</h4>
      <div className="card-details">
        <span className="client"><FileText size={12} /> {proposal.client_name || 'Prospect'}</span>
        <span className="value">R$ {parseFloat(proposal.value || 0).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
};

export default Commercial;
