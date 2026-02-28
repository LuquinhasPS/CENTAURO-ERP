import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getProposals, createProposal, updateProposal, convertProposalToProject,
  getClients, getCollaborators
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
import ProposalModal from '../components/commercial/ProposalModal';

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
  const [convertFormData, setConvertFormData] = useState({});
  const [pendingLossProposalId, setPendingLossProposalId] = useState(null);
  const [lossReason, setLossReason] = useState('');
  // Tasks (Tarefas de Follow-up) - MOVED TO MODAL
  // const [tasks, setTasks] = useState([]);
  // const [activeTab, setActiveTab] = useState('info'); 
  // const [newTaskTitle, setNewTaskTitle] = useState('');
  // const [newTaskDate, setNewTaskDate] = useState('');
  // const [newTaskRecurrence, setNewTaskRecurrence] = useState(false);
  // const [newTaskRecurrenceDays, setNewTaskRecurrenceDays] = useState(2);


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
    setSelectedProposal(null);
    setShowFormModal(true);
  };

  const handleEditProposal = async (prop) => {
    setSelectedProposal(prop);
    setShowFormModal(true);
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
      <ProposalModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        proposal={selectedProposal}
        onSuccess={loadData}
        initialClients={clients}
      />



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
