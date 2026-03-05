import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Plus, Search, FileText, CheckCircle, XCircle, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
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

  // Drag-to-scroll state
  const boardRef = useRef(null);
  const dragRef = useRef({ startX: 0, scrollLeft: 0 });
  const [isDragScrolling, setIsDragScrolling] = useState(false);

  // Filter Status and Date Range
  const initialStatuses = COLUMNS.map(c => c.id);
  const [filterStatuses, setFilterStatuses] = useState(initialStatuses);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Search local
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []); // Run once on mount

  // --- DRAG TO SCROLL HANDLERS ---
  const handleMouseDown = (e) => {
    // Only drag the board if clicking DIRECTLY on the board container or column headers/background, not on cards
    if (e.target.closest('.proposal-card')) return;

    dragRef.current.startX = e.clientX;
    dragRef.current.scrollLeft = boardRef.current.scrollLeft;
    setIsDragScrolling(true);
  };

  // Modern horizontal scrolling via mouse wheel
  const handleWheel = (e) => {
    if (boardRef.current && e.deltaY !== 0) {
      if (e.shiftKey) return;
      // If mouse is over a column with cards, let it scroll vertically normally
      if (e.target.closest('.column-droppable')) return;
      e.preventDefault();
      boardRef.current.scrollLeft += e.deltaY;
    }
  };

  // Global event listeners for active drag scroll
  useEffect(() => {
    if (!isDragScrolling) return;

    const handleGlobalMouseMove = (e) => {
      if (!boardRef.current) return;
      e.preventDefault();
      const x = e.clientX;
      const walk = (x - dragRef.current.startX) * 1.5;
      boardRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
    };

    const handleGlobalMouseUp = () => {
      setIsDragScrolling(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseleave', handleGlobalMouseUp); // if mouse leaves window

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragScrolling]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Constrói a query string via URLSearchParams para FastAPI ler como List[str]
      const queryParams = new URLSearchParams();
      filterStatuses.forEach(status => queryParams.append('status', status));
      if (filterStartDate) queryParams.append('start_date', filterStartDate);
      if (filterEndDate) queryParams.append('end_date', filterEndDate);

      const [propRes, cliRes, colRes] = await Promise.all([
        getProposals(queryParams),
        getClients(),
        getCollaborators()
      ]);

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

  // Filtered locally (by search text)
  const filteredProposals = useMemo(() => {
    return proposals.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.internal_id && p.internal_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="header-actions">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Buscar histórico (título/id)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleNewProposal}>
            <Plus size={18} /> Nova Proposta
          </button>
        </div>
      </header>

      {/* PAINEL DE FILTROS RECOLHÍVEL */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 mt-4 shrink-0 w-full overflow-hidden">

        {/* Header clicável */}
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros</span>
            {!filtersOpen && filterStatuses.length > 0 && (
              <span className="text-xs text-blue-600 font-medium ml-1">
                ({filterStatuses.length} status selecionados)
              </span>
            )}
          </div>
          {filtersOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {/* Conteúdo colapsável */}
        {filtersOpen && (
          <div className="px-6 pb-5 pt-2 flex flex-col xl:flex-row gap-6 justify-between items-start border-t border-gray-100">

            {/* Lado Esquerdo: Status do Funil */}
            <div className="flex-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Status do Funil</h3>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.map(col => {
                  const isActive = filterStatuses.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setFilterStatuses(filterStatuses.filter(s => s !== col.id));
                        } else {
                          setFilterStatuses([...filterStatuses, col.id]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-transparent'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {col.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lado Direito: Filtros de Data e Botão */}
            <div className="flex flex-wrap items-end gap-4 min-w-[320px]">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">De</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full sm:w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Até</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full sm:w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={loadData}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-2 transition-colors"
              >
                Aplicar
              </button>
            </div>

          </div>
        )}

      </div>

      {isDragScrolling && <div className="global-drag-overlay" />}

      <div
        className={`kanban-scroll-window ${isDragScrolling ? 'drag-scrolling' : ''}`}
        ref={boardRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
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
                {(col.id === 'GANHA' || col.id === 'PERDIDA') && (() => {
                  const total = filteredProposals
                    .filter(p => p.status === col.id)
                    .reduce((sum, p) => sum + parseFloat(p.value || 0), 0);
                  return total > 0 ? (
                    <div className="text-xs font-semibold text-center py-1 px-2" style={{
                      backgroundColor: col.id === 'GANHA' ? '#dcfce7' : '#fee2e2',
                      color: col.id === 'GANHA' ? '#166534' : '#991b1b'
                    }}>
                      Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  ) : null;
                })()}

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
      </div>

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
        <span className="client" style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{proposal.client_name || 'Prospect'}</span>
        <span className="value">R$ {parseFloat(proposal.value || 0).toLocaleString('pt-BR')}</span>
      </div>
      <h4>{proposal.title}</h4>
      <div className="card-details">
        {proposal.responsible && <span className="client" style={{ fontStyle: 'italic' }}>Resp: {proposal.responsible}</span>}
        {proposal.converted_project_id && <span className="badge-converted">Gerou Obra</span>}
      </div>
    </div>
  );
};

export default Commercial;
