import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getProposals, createProposal, updateProposal, convertProposalToProject,
  getClients, getCollaborators
} from '../services/api'; // Ensure getProposals etc are in api.js
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
import {
  Plus, Search, DollarSign, Calendar, TrendingUp, Filter,
  MoreHorizontal, FileText, CheckCircle, XCircle
} from 'lucide-react';
import './Commercial.css';

// --- CONSTANTS ---
const COLUMNS = [
  { id: 'RASCUNHO', title: 'Rascunho', color: '#64748b' },
  { id: 'ENVIADA', title: 'Enviada', color: '#3b82f6' },
  { id: 'NEGOCIACAO', title: 'Negociação', color: '#f59e0b' },
  { id: 'GANHA', title: 'Ganha', color: '#16a34a' },
  { id: 'PERDIDA', title: 'Perdida', color: '#ef4444' }
];

const Commercial = () => {
  const { hasPermission } = useAuth();
  // Assuming 'commercial' permission exists, otherwise use 'projects' or check manually
  // const canEdit = hasPermission('commercial', 'edit'); 
  const canEdit = true; // Temporary bypass for prototype

  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null); // ID of card being dragged

  // --- MODALS ---
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Edit/Convert selection
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalFormData, setProposalFormData] = useState({});
  const [convertFormData, setConvertFormData] = useState({});

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

    const activeId = active.id;
    const overId = over.id;

    // Find the card being moved
    const proposal = proposals.find(p => p.id === activeId);
    if (!proposal) return;

    // Check if dropped on a column or another card
    let newStatus = overId;

    // If overId is a proposal ID, find its status (reordering logic if implemented, or just take column)
    const overProposal = proposals.find(p => p.id === overId);
    if (overProposal) {
      newStatus = overProposal.status;
    }

    // Validate if it is a valid column ID
    if (!COLUMNS.some(c => c.id === newStatus)) return;

    if (proposal.status !== newStatus) {
      // Optimistic Update
      const oldStatus = proposal.status;
      setProposals(prev => prev.map(p =>
        p.id === activeId ? { ...p, status: newStatus } : p
      ));

      // Logic: If moving to GANHA, Show Convert Modal (unless already converted)
      if (newStatus === 'GANHA' && !proposal.converted_project_id) {
        // Revert optimistic update locally because we want the user to confirm in modal
        // Or better: Open modal, and if cancelled, revert status.
        setSelectedProposal(proposal); // Need current proposal details
        setConvertFormData({
          start_date: new Date().toISOString().split('T')[0],
          manager_name: '', // Initial
          project_scope: proposal.description || proposal.title,
          budget: proposal.value,
          estimated_days: 30
        });
        setShowConvertModal(true);
        // We don't save to backend yet. The Modal 'Confirm' will do the save & convert.
        // If modal closed, we revert status.
      } else {
        // Just update status on backend
        try {
          await updateProposal(activeId, { status: newStatus });
        } catch (error) {
          console.error("Error updating status:", error);
          // Revert
          setProposals(prev => prev.map(p =>
            p.id === activeId ? { ...p, status: oldStatus } : p
          ));
        }
      }
    }
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
      status: 'RASCUNHO'
    });
    setSelectedProposal(null);
    setShowFormModal(true);
  };

  const handleEditProposal = (prop) => {
    setProposalFormData({
      ...prop,
      client_name: prop.client_name || (clients.find(c => c.id === prop.client_id)?.name)
    });
    setSelectedProposal(prop);
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

      // If user selected existing client, ensure client_id is set
      // Ideally we have a combobox that sets client_id OR client_name

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

  const handleConversion = async (e) => {
    e.preventDefault();
    try {
      // Prepare payload
      const payload = {
        start_date: convertFormData.start_date,
        coordinator: convertFormData.coordinator,
        company_id: parseInt(convertFormData.company_id),
        client_id: convertFormData.client_id ? parseInt(convertFormData.client_id) : selectedProposal.client_id, // Allow linking client if missing
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
      // Revert status in UI if needed, loadData handles it.
      loadData();
    }
  };

  // Revert DnD if modal is cancelled
  const cancelConversion = () => {
    setShowConvertModal(false);
    loadData(); // Revert status
  };

  // Filtered
  const filteredProposals = useMemo(() => {
    return proposals.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [proposals, searchTerm]);

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
                  {/* Using id as ref for dropping on empty column is tricky in dnd-kit without Droppable component. 
                                        Actually SortableContext acts as container. 
                                        We need a Droppable wrapper if we want to drop into empty lists.
                                    */}
                  <DroppableArea id={col.id}>
                    {filteredProposals.filter(p => p.status === col.id).map(proposal => (
                      <SortableProposalCard key={proposal.id} proposal={proposal} onClick={() => handleEditProposal(proposal)} />
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
              {/* Render a simplistic version for overlay */}
              <strong>{proposals.find(p => p.id === activeId)?.title}</strong>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* MODALS */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{selectedProposal ? 'Editar Proposta' : 'Nova Proposta'}</h3>
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
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
import { useDroppable } from '@dnd-kit/core';

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
