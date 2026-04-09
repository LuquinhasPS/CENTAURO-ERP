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
import { Plus, Search, FileText, CheckCircle, XCircle, ChevronDown, ChevronUp, SlidersHorizontal, AlertCircle } from 'lucide-react';
import './Commercial.css';
import ProposalModal from '../components/commercial/ProposalModal';
import Modal from '../components/shared/Modal';

// --- CONSTANTS - 9 Colunas do Funil ---
const COLUMNS = [
  { id: 'LEAD', title: 'Lead', color: '#8b5cf6' },
  { id: 'VISITA_TECNICA', title: 'Visita Técnica', color: '#06b6d4' },
  { id: 'ELABORACAO', title: 'Elaboração', color: '#64748b' },
  { id: 'APROVACAO_INTERNA', title: 'Aprovação Interna', color: '#f97316' },
  { id: 'ENVIADA', title: 'Enviada', color: '#3b82f6' },
  { id: 'NEGOCIACAO', title: 'Negociação', color: '#f59e0b' },
  { id: 'STAND_BY', title: 'Stand By', color: '#94a3b8' },
  { id: 'GANHA', title: 'Ganha', color: '#16a34a' },
  { id: 'PERDIDA', title: 'Perdida', color: '#ef4444' }
];

const Engineering = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('engineering_crm', 'write');

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

  // Security lock for moving GANHA/PERDIDA
  const [showConfirmMoveModal, setShowConfirmMoveModal] = useState(false);
  const [pendingMoveData, setPendingMoveData] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const countdownInterval = useRef(null);

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
      
      // Engineering CRM Filter
      queryParams.append('department', 'ENGENHARIA');
      queryParams.append('limit', '2000');

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
    if (!canEdit) return;
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
      // SECURITY LOCK: If proposal is already GANHA or PERDIDA, ask for confirmation
      if (proposal.status === 'GANHA' || proposal.status === 'PERDIDA') {
        setPendingMoveData({ 
          activeIdVal, 
          newStatus, 
          oldStatus: proposal.status,
          proposalTitle: proposal.title
        });
        setCountdown(3);
        setShowConfirmMoveModal(true);
        
        // Start countdown
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        countdownInterval.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return; // Stop here, wait for modal
      }

      executeMove(activeIdVal, newStatus, proposal.status);
    }
  };

  const executeMove = async (activeIdVal, newStatus, oldStatus) => {
    const proposal = proposals.find(p => p.id === activeIdVal);
    if (!proposal) return;

      // Optimistic Update
      setProposals(prev => prev.map(p =>
        p.id === activeIdVal ? { ...p, status: newStatus } : p
      ));

      // Special handling for GANHA - show convert modal
      if (newStatus === 'GANHA' && !proposal.converted_project_id) {
        setSelectedProposal(proposal);
        setConvertFormData({
          tag: '',
          start_date: new Date().toISOString().split('T')[0],
          manager_name: '',
          project_scope: proposal.description || proposal.title,
          budget: proposal.value,
          estimated_days: 30,
          directory_url: ''
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
  };

  const confirmMove = () => {
    if (pendingMoveData) {
      executeMove(pendingMoveData.activeIdVal, pendingMoveData.newStatus, pendingMoveData.oldStatus);
      setShowConfirmMoveModal(false);
      setPendingMoveData(null);
    }
  };

  const cancelMove = () => {
    setShowConfirmMoveModal(false);
    setPendingMoveData(null);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    loadData(); // Revert UI
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
        tag: convertFormData.tag, // TAG manual obrigatória
        start_date: convertFormData.start_date,
        coordinator: convertFormData.coordinator,
        company_id: parseInt(convertFormData.company_id),
        client_id: convertFormData.client_id ? parseInt(convertFormData.client_id) : selectedProposal.client_id,
        estimated_days: parseInt(convertFormData.estimated_days),
        budget: parseFloat(convertFormData.budget),
        project_scope: convertFormData.project_scope,
        directory_url: convertFormData.directory_url
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
      alert("Sucesso! O sistema gerou o projeto ou contrato.");
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
      (p.client_name && p.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.responsible && p.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h1>Engenharia & CRM</h1>
          <p>Gestão de propostas de engenharia e funil de vendas</p>
        </div>
        <div className="header-actions">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Buscar (título/id/resp)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="btn flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 transition-colors relative"
              style={{ width: '40px', height: '40px', borderRadius: '6px', padding: 0 }}
              title="Filtros"
            >
              <SlidersHorizontal size={18} className="text-gray-600" />
              {filterStatuses.length > 0 && filterStatuses.length !== COLUMNS.length && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {filterStatuses.length}
                </span>
              )}
            </button>

            {/* Popover de Filtros */}
            {filtersOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-5 w-[400px]">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filtros do Funil</h3>
                  <button onClick={() => setFiltersOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={18} />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</h4>
                <div className="flex flex-wrap gap-2 mb-4">
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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${isActive
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-transparent'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {col.title}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Data Início</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      loadData();
                      setFiltersOpen(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-6 py-2 transition-colors w-full"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {canEdit && (
            <button className="btn btn-primary" onClick={handleNewProposal}>
              <Plus size={18} /> Nova Proposta
            </button>
          )}
        </div>
      </header>

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
                {(() => {
                  const total = filteredProposals
                    .filter(p => p.status === col.id)
                    .reduce((sum, p) => sum + parseFloat(p.value || 0), 0);
                  
                  // Definir cores baseadas no status
                  let bgColor = '#f1f5f9'; // gray-100 padrão
                  let textColor = '#475569'; // gray-600 padrão
                  
                  if (col.id === 'GANHA') {
                    bgColor = '#dcfce7'; 
                    textColor = '#166534';
                  } else if (col.id === 'PERDIDA') {
                    bgColor = '#fee2e2';
                    textColor = '#991b1b';
                  }

                  return total > 0 ? (
                    <div className="text-xs font-semibold text-center py-1 px-2" style={{
                      backgroundColor: bgColor,
                      color: textColor
                    }}>
                      Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-center py-1 px-2" style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      opacity: 0.6
                    }}>
                      Total: R$ 0,00
                    </div>
                  );
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
        defaultCrmDepartment="ENGENHARIA"
        maxWidth="1000px"
      />


      {/* LOSS MODAL */}
      <Modal
        isOpen={showLossModal}
        onClose={cancelLoss}
        title="Registrar Perda"
        maxWidth="450px"
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '10px' }} />
          <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Informe o motivo da perda desta proposta</p>
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Motivo da Perda *</label>
          <textarea
            rows={4}
            value={lossReason}
            onChange={e => setLossReason(e.target.value)}
            placeholder="Ex: Preço acima do concorrente, cliente desistiu do projeto..."
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={cancelLoss}>Cancelar</button>
          <button type="button" className="btn btn-primary" style={{ background: '#ef4444' }} onClick={confirmLoss}>
            Confirmar Perda
          </button>
        </div>
      </Modal>

      {/* CONVERT MODAL */}
      <Modal
        isOpen={showConvertModal}
        onClose={cancelConversion}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={20} color="#16a34a" /> Aprovar Proposta</span>}
        maxWidth="600px"
      >
        <p style={{ color: '#64748b', marginBottom: '20px' }}>Gerar Projeto, Obra ou Contrato Oficial</p>
        <form onSubmit={handleConversion}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* TAG — campo manual obrigatório */}
            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label className="label">TAG do Projeto/Contrato *</label>
              <input
                className="input"
                type="text"
                required
                value={convertFormData.tag || ''}
                onChange={e => setConvertFormData({ ...convertFormData, tag: e.target.value })}
                placeholder="Ex: CEP1_2603_001_01"
                style={{ fontWeight: 'bold' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Empresa (Prefixo TAG)</label>
              <select className="input" value={convertFormData.company_id || ''} onChange={e => setConvertFormData({ ...convertFormData, company_id: e.target.value })}>
                <option value="">Selecione...</option>
                <option value="1">1 - Engenharia</option>
                <option value="2">2 - Telecom</option>
                <option value="3">3 - ES</option>
                <option value="4">4 - MA</option>
                <option value="5">5 - SP</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Data de Início Real *</label>
              <input className="input" type="date" required value={convertFormData.start_date} onChange={e => setConvertFormData({ ...convertFormData, start_date: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Orçamento Aprovado (R$)</label>
              <input className="input" type="number" step="0.01" value={convertFormData.budget} onChange={e => setConvertFormData({ ...convertFormData, budget: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Previsão (Dias)</label>
              <input className="input" type="number" value={convertFormData.estimated_days} onChange={e => setConvertFormData({ ...convertFormData, estimated_days: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label className="label">Escopo do Projeto</label>
              <textarea className="input" value={convertFormData.project_scope} onChange={e => setConvertFormData({ ...convertFormData, project_scope: e.target.value })} rows={4} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label className="label">URL do Diretório do Projeto (Opcional)</label>
              <input className="input" type="url" value={convertFormData.directory_url || ''} onChange={e => setConvertFormData({ ...convertFormData, directory_url: e.target.value })} placeholder="Ex: https://1drv.ms/f/s!..." />
            </div>

            {(!selectedProposal || (!selectedProposal.client_id && !convertFormData.client_id)) && (
              <div className="form-group full-width" style={{ gridColumn: '1 / -1', border: '1px solid #f59e0b', padding: '10px', borderRadius: '4px', background: '#fffbeb' }}>
                <label style={{ color: '#b45309', display: 'block', marginBottom: '8px' }}>Atenção: Vincule um cliente para continuar</label>
                <select className="input" required onChange={e => setConvertFormData({ ...convertFormData, client_id: e.target.value })}>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={cancelConversion}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#16a34a' }}>Confirmar e Gerar</button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM MOVE MODAL (Security Lock) */}
      <Modal
        isOpen={showConfirmMoveModal}
        onClose={cancelMove}
        title="Confirmar Alteração de Status"
        maxWidth="450px"
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '10px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Esta proposta já está finalizada!</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            A proposta <strong>"{pendingMoveData?.proposalTitle}"</strong> já possui o status <strong>{pendingMoveData?.oldStatus}</strong>.
            Tem certeza que deseja movê-la para <strong>{pendingMoveData?.newStatus}</strong>?
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={cancelMove}>Cancelar</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={confirmMove}
            disabled={countdown > 0}
            style={{ minWidth: '120px' }}
          >
            {countdown > 0 ? `Aguarde (${countdown}s)` : 'Sim, mover'}
          </button>
        </div>
      </Modal>
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

export default Engineering;
