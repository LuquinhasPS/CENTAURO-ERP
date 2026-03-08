import { useState, useEffect, useRef } from 'react';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, autoFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? selectedOption.label : '');
    }
  }, [value, isOpen, selectedOption]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : '')}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          if (e.target.value === '') {
            onChange('');
          }
        }}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: disabled ? 'not-allowed' : 'text', outline: 'none' }}
        onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)'}
        onBlur={(e) => e.target.style.boxShadow = 'none'}
      />
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <div
                key={index}
                onClick={() => {
                  onChange(opt.value);
                  setSearchTerm(opt.label);
                  setIsOpen(false);
                }}
                style={{ padding: '8px 10px', cursor: 'pointer', backgroundColor: value === opt.value ? '#f1f5f9' : 'transparent', color: '#334155' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? '#f1f5f9' : 'transparent'}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div style={{ padding: '8px 10px', color: '#94a3b8' }}>Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  );
};
import {
  X, Check, Plus, Trash2, StopCircle, RotateCcw,
  Calendar, RefreshCw, XCircle, FileText
} from 'lucide-react';
import {
  createProposal, updateProposal, deleteProposal,
  getProposalTasks, createProposalTask, deleteProposalTask,
  completeProposalTask, stopTaskRecurrence,
  getClients, getCollaborators
} from '../../services/api'; // Adjust path based on location
import ConfirmModal from '../shared/ConfirmModal';

const ProposalModal = ({ isOpen, onClose, proposal, onSuccess, initialClients = [] }) => {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'tasks'
  const [formData, setFormData] = useState({
    title: '',
    client_name: '',
    client_id: '',
    value: '0.00',
    labor_value: '0.00',
    material_value: '0.00',
    proposal_type: '',
    company_id: '',
    description: '',
    status: 'LEAD'
  });

  const [clients, setClients] = useState(initialClients);
  const [collaborators, setCollaborators] = useState([]);
  const [tasks, setTasks] = useState([]);

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState(false);
  const [newTaskRecurrenceDays, setNewTaskRecurrenceDays] = useState(2);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (proposal) {
        setFormData({
          ...proposal,
          client_id: proposal.client_id || '',
          // Ensure values are strings for input
          value: proposal.value ? parseFloat(proposal.value).toFixed(2) : '0.00',
          labor_value: proposal.labor_value ? parseFloat(proposal.labor_value).toFixed(2) : '0.00',
          material_value: proposal.material_value ? parseFloat(proposal.material_value).toFixed(2) : '0.00',
          client_name: proposal.client_name || (proposal.client?.name) || '',
          responsible: proposal.responsible || ''
        });
        loadTasks(proposal.id);
      } else {
        // New Proposal
        setFormData({
          title: '',
          client_name: '',
          client_id: '',
          responsible: '',
          value: '0.00',
          labor_value: '0.00',
          material_value: '0.00',
          proposal_type: '',
          company_id: '',
          description: '',
          status: 'LEAD'
        });
        setTasks([]);
      }
      setActiveTab('info');

      // Fetch clients if needed (and not provided or empty)
      if (clients.length === 0) {
        fetchClients();
      }
      if (collaborators.length === 0) {
        fetchCollaborators();
      }
    }
  }, [isOpen, proposal]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchClients = async () => {
    try {
      const res = await getClients();
      setClients(res.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await getCollaborators();
      setCollaborators(res.data);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    }
  };

  const loadTasks = async (proposalId) => {
    try {
      const res = await getProposalTasks(proposalId);
      setTasks(res.data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    }
  };

  const calculateTotal = (labor, material) => {
    const l = parseFloat(labor) || 0;
    const m = parseFloat(material) || 0;
    return (l + m).toFixed(2);
  };

  // Currency Mask Helpers
  const formatCurrency = (value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return '0,00';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (field, rawValue) => {
    // Remove non-digits
    const numericValue = rawValue.replace(/\D/g, '');
    // Convert to float (cents)
    const floatValue = parseFloat(numericValue) / 100;

    const newFormData = { ...formData, [field]: floatValue.toFixed(2) };

    // Recalculate total if labor or material changes
    if (field === 'labor_value' || field === 'material_value') {
      const lab = field === 'labor_value' ? floatValue : parseFloat(formData.labor_value);
      const mat = field === 'material_value' ? floatValue : parseFloat(formData.material_value);
      newFormData.value = (lab + mat).toFixed(2);
    }

    setFormData(newFormData);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        labor_value: parseFloat(formData.labor_value) || 0,
        material_value: parseFloat(formData.material_value) || 0,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
        proposal_type: formData.proposal_type || null,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        responsible: formData.responsible || null
      };

      if (proposal) {
        await updateProposal(proposal.id, payload);
      } else {
        await createProposal(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao salvar proposta: " + error.message);
    }
  };

  const handleDeleteProposal = () => {
    setShowConfirmModal(true);
  };

  const confirmDeleteProposal = async () => {
    try {
      await deleteProposal(proposal.id);
      setShowConfirmModal(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao excluir proposta: " + error.message);
    }
  };

  // --- Task Handlers ---

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

      await createProposalTask(proposal.id, taskData);
      await loadTasks(proposal.id);

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
      await loadTasks(proposal.id);
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Erro ao concluir tarefa: " + error.message);
    }
  };

  const handleStopRecurrence = async (taskId) => {
    try {
      await stopTaskRecurrence(taskId);
      await loadTasks(proposal.id);
    } catch (error) {
      console.error("Error stopping recurrence:", error);
      alert("Erro ao parar recorrência: " + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;

    try {
      await deleteProposalTask(taskId);
      await loadTasks(proposal.id);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Erro ao excluir tarefa: " + error.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'white', padding: '24px', borderRadius: '12px',
        width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
            {proposal ? 'Editar Proposta' : 'Nova Proposta'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {proposal && (
              <button
                onClick={handleDeleteProposal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Excluir Proposta"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {proposal && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('info')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'info' ? '#3b82f6' : '#f1f5f9', color: activeTab === 'info' ? 'white' : '#475569' }}
            >
              Informações
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('tasks')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'tasks' ? '#3b82f6' : '#f1f5f9', color: activeTab === 'tasks' ? 'white' : '#475569' }}
            >
              Follow-up ({tasks.filter(t => !t.is_completed).length})
            </button>
          </div>
        )}

        {/* Tab: Info */}
        {activeTab === 'info' && (
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Título *</label>
              <input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Reforma Loja XYZ"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Responsável</label>
              <SearchableSelect
                options={collaborators.map(c => ({ value: c.name, label: c.name }))}
                value={formData.responsible || ''}
                onChange={val => setFormData({ ...formData, responsible: val })}
                placeholder="Busque ou selecione..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Cliente</label>
              <div style={{ marginBottom: '8px' }}>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Novo / Prospect --' },
                    ...clients.map(c => ({ value: String(c.id), label: c.name }))
                  ]}
                  value={String(formData.client_id || '')}
                  onChange={val => {
                    const c = clients.find(cl => cl.id === parseInt(val));
                    setFormData({
                      ...formData,
                      client_id: val,
                      client_name: c ? c.name : ''
                    });
                  }}
                  placeholder="Busque ou selecione um cliente..."
                />
              </div>
              {!formData.client_id && (
                <input
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome do Cliente (Prospect)"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Tipo de Proposta</label>
              <select
                value={formData.proposal_type}
                onChange={e => setFormData({ ...formData, proposal_type: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              >
                <option value="">Selecione...</option>
                <option value="RECORRENTE">Contrato Recorrente</option>
                <option value="LPU">LPU</option>
                <option value="AVULSA">Proposta Avulsa</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>CNPJ / Empresa (Opcional)</label>
              <select
                value={formData.company_id}
                onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              >
                <option value="">Selecione...</option>
                <option value="1">1 - Engenharia</option>
                <option value="2">2 - Telecom</option>
                <option value="3">3 - ES</option>
                <option value="4">4 - MA</option>
                <option value="5">5 - SP</option>
              </select>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Valor Mão de Obra (R$)</label>
                <input
                  type="text"
                  value={formatCurrency(formData.labor_value)}
                  onChange={e => handleCurrencyChange('labor_value', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Valor Material (R$)</label>
                <input
                  type="text"
                  value={formatCurrency(formData.material_value)}
                  onChange={e => handleCurrencyChange('material_value', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Valor Total (R$)</label>
              <input
                type="text"
                value={formatCurrency(formData.value)}
                readOnly
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>Descrição</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'vertical' }}
              />
            </div>

            {/* Show loss reason if status is PERDIDA */}
            {proposal?.status === 'PERDIDA' && proposal?.loss_reason && (
              <div className="form-group" style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '16px' }}>
                <label style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <XCircle size={14} /> Motivo da Perda
                </label>
                <p style={{ margin: '4px 0 0 0', color: '#7f1d1d' }}>{proposal.loss_reason}</p>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        {/* Tab: Tasks */}
        {activeTab === 'tasks' && proposal && (
          <div>
            {/* Create Task Form */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>Nova Tarefa de Follow-up</h4>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input
                  placeholder="Ex: Cobrar retorno, Ligar para cliente..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Data de Vencimento</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={e => setNewTaskDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
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
                  <label htmlFor="recurrence-check" style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
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
                    style={{ width: '60px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid #bfdbfe' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>dias após concluir</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateTask}
                style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
                        title={task.is_completed ? "Concluída" : "Concluir Tarefa"}
                        style={{
                          background: task.is_completed ? '#22c55e' : '#f8fafc',
                          border: `1px solid ${task.is_completed ? '#22c55e' : '#cbd5e1'}`,
                          borderRadius: '50%',
                          minWidth: '28px',
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
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
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

            <div className="modal-actions" style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDeleteProposal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta proposta? A proposta e suas tarefas associadas serão permanentemente removidas."
      />
    </div>
  );
};

export default ProposalModal;
