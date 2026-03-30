
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, PackageCheck, ChevronDown, ChevronUp, Link as LinkIcon, Maximize, Minimize } from 'lucide-react';
import { updatePurchase, deletePurchase, createPurchase, getWithdrawals, addPurchaseObservation, getFinancialSummary } from '../../services/api';
import ApprovalTimeline from './ApprovalTimeline';
import WithdrawalModal from './WithdrawalModal';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../shared/ConfirmModal';
import './RequestDetailsModal.css';

const RequestDetailsModal = ({ request, project, onClose, onUpdate, context = 'projects', readOnly: propReadOnly = false }) => {
  // context: 'projects' = pode editar descrição, solicitante, itens básicos
  // context: 'purchases' = só gerencia preço, fornecedor, pagamento, prazo, status
  // readOnly: quando true, desabilita todas edições e esconde botão salvar
  const isProjectsContext = context === 'projects';
  const { user } = useAuth();

  // Calculate if the form should be locked (read-only)
  // If in 'projects' context and status is Approved or later OR if Tech approval is already done, lock it.
  const isLockedStatus = (request?.status && ['approved', 'quoted', 'ordered', 'received', 'bought', 'delivered', 'in_stock', 'partially_withdrawn'].includes(request.status)) || !!request?.tech_approval_at;
  const readOnly = propReadOnly || (isProjectsContext && isLockedStatus);

  const [formData, setFormData] = useState({
    description: '',
    requester: '',
    status: 'pending',
    shipping_cost: 0,
    category: 'MATERIAL',
    service_start_date: '',
    service_end_date: '',
    is_indefinite_term: false,
    notes: '',
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [observations, setObservations] = useState(request?.observations || []);
  const [newObs, setNewObs] = useState('');
  const [sendingObs, setSendingObs] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'history' | 'withdrawals'
  const [financialSummary, setFinancialSummary] = useState(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const handleEditLink = (index, item) => {
    if (isProjectsContext) {
      const link = window.prompt("Insira o link do item (Sugestão da Engenharia):", item.link_original || '');
      if (link !== null) {
        handleItemChange(index, 'link_original', link);
      }
    } else {
      const defaultValue = item.link_compras === null ? (item.link_original || '') : (item.link_compras || '');
      const link = window.prompt("Insira o link final (Definido por Suprimentos):", defaultValue);
      if (link !== null) {
        handleItemChange(index, 'link_compras', link);
      }
    }
  };

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      const pid = request?.project_id || project?.id;
      if (!pid) return;
      try {
        const res = await getFinancialSummary(pid, request?.id || '');
        setFinancialSummary(res.data);
      } catch (err) {
        console.error('Error fetching financial summary', err);
      }
    };
    if (formData.category === 'MATERIAL') {
      fetchFinancialSummary();
    }
  }, [request?.id, request?.project_id, project?.id, formData.category]);

  useEffect(() => {
    if (request) {
      setFormData({
        description: request.description,
        requester: request.requester || '',
        status: request.status || 'pending',
        shipping_cost: request.shipping_cost || 0,
        category: request.category || 'MATERIAL',
        service_start_date: request.service_start_date || '',
        service_end_date: request.service_end_date || '',
        is_indefinite_term: request.is_indefinite_term || false,
        arrival_forecast: request.arrival_forecast || '',
        notes: request.notes || '',
        items: request.items || []
      });
      setObservations(request.observations || []);
    } else if ((user?.collaborator_name || user?.email) && !formData.requester) {
      // Auto-fill requester for new requests
      setFormData(prev => ({ ...prev, requester: user.collaborator_name || user.email }));
    }
  }, [request, user]);

  // Load withdrawal history
  useEffect(() => {
    if (request?.id) {
      loadWithdrawals();
    }
  }, [request?.id]);

  const loadWithdrawals = async () => {
    try {
      const res = await getWithdrawals(request.id);
      setWithdrawals(res.data);
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deletePurchase(request.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Erro ao excluir solicitação');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSendObs = async () => {
    if (!newObs.trim() || !request?.id) return;
    setSendingObs(true);
    try {
      const res = await addPurchaseObservation(request.id, { message: newObs.trim() });
      setObservations([...observations, res.data]);
      setNewObs('');
      onUpdate();
    } catch (err) {
      console.error('Error adding observation:', err);
      alert('Erro ao enviar observação.');
    } finally {
      setSendingObs(false);
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;

    // Status Cascade Logic
    if (name === 'status') {
      if (window.confirm(`Deseja atualizar o status de todos os itens para "${value}"?`)) {

        // Map header status to item status
        let itemStatus = value;
        if (value === 'ordered') itemStatus = 'bought';
        if (value === 'received') itemStatus = 'delivered';

        setFormData(prev => ({
          ...prev,
          [name]: value,
          items: prev.items.map(item => {
            // Do not update status if item is already cancelled
            if (item.status === 'cancelled') return item;
            return { ...item, status: itemStatus };
          })
        }));
        return;
      }
    }

    // Indefinite Term Logic
    if (name === 'is_indefinite_term') {
      const isChecked = e.target.checked;
      setFormData(prev => ({
        ...prev,
        is_indefinite_term: isChecked,
        service_end_date: isChecked ? '' : prev.service_end_date
      }));
      return;
    }

    if (name === 'notes') {
      setFormData(prev => ({ ...prev, notes: value }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total_price = qty * price;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          manufacturer: '',
          model: '',
          quantity: 1,
          unit: 'un',
          unit_price: 0,
          total_price: 0,
          supplier: '',
          payment_method: '',
          installment_count: 1,
          expected_date: '',
          status: 'pending',
          link_original: '',
          link_compras: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare data for backend
      const dataToSend = {
        ...request,
        project_id: request?.project_id || project?.id,  // Use project prop for creation
        description: formData.description,
        requester: formData.requester,
        status: formData.status,
        shipping_cost: parseFloat(formData.shipping_cost),
        category: formData.category,
        service_start_date: formData.category === 'SERVICE' ? (formData.service_start_date || null) : null,
        service_end_date: formData.category === 'SERVICE' ? (formData.service_end_date || null) : null,
        is_indefinite_term: formData.category === 'SERVICE' ? formData.is_indefinite_term : false,
        arrival_forecast: formData.category === 'MATERIAL' ? (formData.arrival_forecast || null) : null,
        notes: formData.notes || null,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          installment_count: parseInt(item.installment_count) || 1,
          expected_date: item.expected_date || null,
          link_original: item.link_original || null,
          link_compras: item.link_compras || null
        }))
      };

      if (request && request.id) {
        await updatePurchase(request.id, dataToSend);
      } else {
        await createPurchase(dataToSend);
      }
      onUpdate(); // Refresh parent list
      onClose();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Erro ao salvar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      if (item.status === 'cancelled') return sum;
      return sum + (parseFloat(item.total_price) || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(formData.shipping_cost) || 0;
    return subtotal + shipping;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-[99] ${isTableExpanded ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white shadow-2xl overflow-hidden flex flex-col w-full h-full transition-all duration-300 ${isTableExpanded ? 'rounded-none max-w-none max-h-none' : 'w-[95vw] max-w-[1400px] h-[85vh] max-h-[900px] rounded-xl'}`} onClick={e => e.stopPropagation()}>
        
        {/* COMPACT HEADER */}
        {!isTableExpanded && (
          <div className="flex flex-col border-b border-slate-200 bg-white shrink-0">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 m-0 leading-none">
                {request ? `Solicitação #${request.id}` : 'Nova Solicitação'}
                {(request?.project_tag || request?.project_name) && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                    {request.project_tag} {request.project_name ? `- ${request.project_name}` : ''}
                    {request?.project_directory_url && (
                      <a
                        href={request.project_directory_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#2563eb', display: 'flex', alignItems: 'center', padding: '1px' }}
                        title="Abrir pasta do projeto"
                      >
                        <LinkIcon size={12} />
                      </a>
                    )}
                  </span>
                )}
                {request?.client_name && (
                  <span className="text-xs font-medium text-slate-500">
                    | {request.client_name}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span className={`status-badge ${formData.status} m-0`}>
                {
                  {
                    'pending': 'Pendente',
                    'approved': 'Aprovado',
                    'rejected': 'Rejeitado',
                    'quoted': 'Cotado',
                    'ordered': 'Comprado',
                    'in_stock': 'Em estoque',
                    'partially_withdrawn': 'Retirado Parcial',
                    'received': 'Retirado Total',
                    'cancelled': 'Cancelado'
                  }[formData.status] || formData.status
                }
              </span>
              <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50/50 flex flex-wrap gap-4 items-end text-sm">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleHeaderChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                disabled={!isProjectsContext || readOnly}
              />
            </div>
            <div className="w-[150px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Solicitante</label>
              <input
                type="text"
                name="requester"
                value={formData.requester}
                onChange={handleHeaderChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-slate-100 text-slate-500"
                disabled={true}
              />
            </div>
            {formData.category === 'MATERIAL' && (
              <div className="w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Previsão</label>
                <input
                  type="date"
                  name="arrival_forecast"
                  value={formData.arrival_forecast || ''}
                  onChange={handleHeaderChange}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={!isProjectsContext || readOnly}
                />
              </div>
            )}
            {formData.category === 'SERVICE' && (
              <>
                <div className="w-[130px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Início</label>
                  <input
                    type="date"
                    name="service_start_date"
                    value={formData.service_start_date}
                    onChange={handleHeaderChange}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={!isProjectsContext || readOnly}
                    required
                  />
                </div>
                <div className="w-[130px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Término</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      name="service_end_date"
                      value={formData.service_end_date}
                      onChange={handleHeaderChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={!isProjectsContext || readOnly || formData.is_indefinite_term}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="w-[130px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status Geral</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleHeaderChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-slate-100 text-slate-500"
                disabled={true}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="quoted">Cotado</option>
                <option value="ordered">Comprado</option>
                <option value="in_stock">Em estoque</option>
                <option value="partially_withdrawn">Retirado Par.</option>
                <option value="received">Retirado Total</option>
                <option value="rejected">Rejeitado</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* FINANCIAL SUMMARY CARD */}
        {financialSummary && formData.category === 'MATERIAL' && !isTableExpanded && (
          <div className="bg-slate-50 border-b border-slate-200 shrink-0 shadow-inner">
            <div 
              className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
            >
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 m-0">
                Resumo Financeiro do Projeto (Materiais)
              </h4>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                {isSummaryCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
            
            {!isSummaryCollapsed && (
              <div className="px-6 pb-4 pt-1 grid grid-cols-4 gap-4 animate-in fade-in flex flex-col slide-in-from-top-2 duration-200">
                <div className="bg-white border text-center p-3 rounded-lg border-slate-200 shadow-sm">
                  <span className="block text-xs font-medium text-slate-500 mb-1">Orçamento Previsto</span>
                  <span className="block text-sm font-bold text-slate-800">
                    R$ {financialSummary.orcamento_previsto_material.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white border text-center p-3 rounded-lg border-slate-200 shadow-sm">
                  <span className="block text-xs font-medium text-slate-500 mb-1">Saldo Atual</span>
                  <span className="block text-sm font-bold text-slate-800">
                    R$ {financialSummary.saldo_atual_disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-100 text-center p-3 rounded-lg shadow-sm">
                  <span className="block text-xs font-medium text-blue-600 mb-1">Valor Desta Solicitação</span>
                  <span className="block text-sm font-bold text-blue-700">
                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`border text-center p-3 rounded-lg shadow-sm ${
                  (financialSummary.saldo_atual_disponivel - calculateTotal()) < 0 
                    ? 'bg-rose-50 border-rose-200' 
                    : 'bg-emerald-50 border-emerald-100'
                }`}>
                  <span className={`block text-xs font-semibold mb-1 ${
                    (financialSummary.saldo_atual_disponivel - calculateTotal()) < 0 
                      ? 'text-rose-600' 
                      : 'text-emerald-700'
                  }`}>
                    Saldo Restante
                  </span>
                  <span className={`block text-base font-black ${
                    (financialSummary.saldo_atual_disponivel - calculateTotal()) < 0 
                      ? 'text-rose-600' 
                      : 'text-emerald-600'
                  }`}>
                    R$ {(financialSummary.saldo_atual_disponivel - calculateTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TABS NAVIGATION */}
        {!isTableExpanded && (
          <div className="flex gap-8 px-8 border-b border-slate-200 shrink-0 bg-white">
          <button
            className={`py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
              activeTab === 'items' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('items')}
          >
            Itens do Pedido
          </button>
          <button
            className={`py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
              activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Observações e Histórico
          </button>
          <button
            className={`py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
              activeTab === 'withdrawals' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('withdrawals')}
          >
            Retiradas
          </button>
        </div>
        )}

        {/* TAB CONTENT (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 flex flex-col">
          
          {/* TAB 1: ITENS DO PEDIDO */}
        {activeTab === 'items' && (
          <div className="items-section m-0 shadow-sm border border-slate-200 bg-white rounded-lg p-4 flex-1 flex flex-col">
            <div className="items-header">
              <div className="flex items-center gap-3">
                <h4>Itens da Solicitação</h4>
                <button
                  type="button"
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                  title={isTableExpanded ? "Restaurar tamanho" : "Expandir tabela para Tela Cheia"}
                >
                  {isTableExpanded ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600">
                    {formData.category === 'SERVICE' ? 'Mobilização (R$):' : 'Valor do Frete (R$):'}
                  </span>
                  <input
                    type="number"
                    name="shipping_cost"
                    value={formData.shipping_cost}
                    onChange={handleHeaderChange}
                    className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 w-[120px]"
                    disabled={isProjectsContext || readOnly}
                    step="0.01"
                    min="0"
                  />
                </div>
                {isProjectsContext && !readOnly && (
                  <button className="btn btn-sm btn-secondary" onClick={addItem}>
                    <Plus size={16} /> Adicionar Item
                  </button>
                )}
              </div>
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Item / Material</th>
                    <th style={{ width: '13%' }}>Fabricante / Modelo</th>
                    <th style={{ width: '10%' }}>Qtd | Un</th>
                    <th style={{ width: '8%' }}>Preço Unit.</th>
                    <th style={{ width: '8%' }}>Total</th>
                    <th style={{ width: '12%' }}>Fornecedor</th>
                    <th style={{ width: '10%' }}>Pagamento</th>
                    <th style={{ width: '5%' }}>Parc.</th>
                    <th style={{ width: '10%' }}>Prazo</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '3%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className={item.status === 'cancelled' ? 'item-row cancelled' : 'item-row'}>
                      <td className="relative group">
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Descrição do item"
                            className="input-cell font-medium text-slate-800 pr-10"
                            disabled={!isProjectsContext || readOnly}
                          />
                          <div className="absolute right-1 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                            {(() => {
                              const original = item.link_original?.trim();
                              const compras = item.link_compras?.trim();
                              let targetUrl = compras || original;
                              let showLink = false;
                              let linkColor = 'text-slate-400 hover:text-blue-600';
                              
                              if (item.link_compras === '') {
                                showLink = false;
                              } else if (compras && compras !== original) {
                                showLink = true;
                                linkColor = 'text-orange-500 hover:text-orange-600';
                              } else if (original) {
                                showLink = true;
                                linkColor = 'text-blue-500 hover:text-blue-700';
                              }

                              return (
                                <div className="flex items-center gap-0.5">
                                  {/* ICON TO OPEN LINK */}
                                  {showLink && targetUrl && (
                                    <a 
                                      href={targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      title="Acessar link do item" 
                                      className={`transition-colors p-1 rounded hover:bg-slate-200 ${linkColor}`}
                                    >
                                      <LinkIcon size={14} />
                                    </a>
                                  )}
                                  
                                  {/* ICON TO EDIT LINK (VISIBLE ON HOVER & IF EDITABLE) */}
                                  {!readOnly && (
                                    <button
                                      className={`p-1 rounded hover:bg-slate-200 transition-colors ${showLink ? 'text-slate-300 hover:text-slate-600' : 'text-slate-400 hover:text-blue-600'}`}
                                      onClick={(e) => { e.preventDefault(); handleEditLink(index, item); }}
                                      title={showLink ? "Editar link (abre prompt)" : "Adicionar link ao item"}
                                    >
                                      <LinkIcon size={14} className={showLink ? "opacity-40" : "opacity-100"} />
                                      {!showLink && <Plus size={10} className="absolute -top-1 -right-1" />}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="double-input">
                          <input
                            type="text"
                            value={item.manufacturer || ''}
                            onChange={(e) => handleItemChange(index, 'manufacturer', e.target.value)}
                            placeholder="Fabricante"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                          <input
                            type="text"
                            value={item.model || ''}
                            onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                            placeholder="Modelo"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="double-input">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                          <input
                            type="text"
                            value={item.unit || 'un'}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="Un"
                            className="input-cell"
                            style={{ width: '40px' }}
                            disabled={!isProjectsContext || readOnly}
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          step="0.01"
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <div className="read-only-value">
                          R$ {(parseFloat(item.total_price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.supplier || ''}
                          onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                          placeholder="Fornecedor"
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <select
                          value={item.payment_method || ''}
                          onChange={(e) => handleItemChange(index, 'payment_method', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        >
                          <option value="">-</option>
                          <option value="boleto">Boleto</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão</option>
                          <option value="transferencia">Transf.</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="faturado">Faturado</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.installment_count || 1}
                          onChange={(e) => handleItemChange(index, 'installment_count', e.target.value)}
                          min="1"
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={item.expected_date || ''}
                          onChange={(e) => handleItemChange(index, 'expected_date', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <select
                          value={item.status}
                          onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly || formData.status === 'pending' || item.status === 'delivered'}
                          title={
                            formData.status === 'pending' 
                              ? 'Aguardando aprovação do pedido para editar itens' 
                              : item.status === 'delivered'
                                ? 'Status "Retirado" é bloqueado para edição manual'
                                : undefined
                          }
                        >
                          <option value="pending">Pendente</option>
                          <option value="quoted">Cotado</option>
                          <option value="bought">Comprado</option>
                          <option value="in_stock">Em estoque</option>
                          {/* 'delivered' (Retirado) é atribuído automaticamente pelo fluxo de retirada */}
                          {item.status === 'delivered' && (
                            <option value="delivered">Retirado</option>
                          )}
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td>
                        {isProjectsContext && !readOnly ? (
                          <button
                            className="btn-icon-danger"
                            onClick={() => removeItem(index)}
                            title="Excluir item"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>          </div>
        )}

        {/* TAB 2: HISTORY & OBSERVATIONS */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                Observações do Pedido
              </h4>
              <div className="flex flex-col p-4 border border-slate-100 rounded-lg bg-slate-50 min-h-[150px] max-h-[300px] overflow-y-auto mb-4 gap-3">
                {observations.length === 0 ? (
                  <div className="text-slate-400 text-sm text-center my-auto italic">Nenhuma observação registrada neste pedido.</div>
                ) : (
                  observations.map(obs => (
                    <div key={obs.id} className="bg-white p-3 rounded shadow-sm border border-slate-200 self-start w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-blue-700">{obs.user_name || 'Usuário'}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(obs.created_at).toLocaleDateString()} {new Date(obs.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 m-0 whitespace-pre-wrap">{obs.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[40px] max-h-[100px] resize-y text-sm"
                  placeholder={request?.id ? "Mensagem..." : "Salve a solicitação antes de enviar mensagens."}
                  disabled={!request?.id || sendingObs}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendObs();
                    }
                  }}
                />
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={handleSendObs}
                  disabled={!request?.id || !newObs.trim() || sendingObs}
                >
                  {sendingObs ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>

            {request?.id && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  Histórico e Progresso
                </h4>
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg">
                  <ApprovalTimeline request={request} onUpdate={onUpdate} />
                </div>
                {request?.rejection_reason && (
                  <div className="mt-4 p-4 border border-rose-200 bg-rose-50 rounded-lg text-rose-700 text-sm">
                    <strong>Motivo da Reprovação:</strong> {request.rejection_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[300px]">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h4 className="text-base font-bold text-slate-800 m-0 flex items-center gap-2">
                <PackageCheck size={20} className="text-emerald-600" />
                Log de Retiradas de Material
              </h4>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded">
                Total: {withdrawals.length} registro(s)
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                <PackageCheck size={48} className="mb-3 text-slate-200" />
                <p>Nenhuma retirada registrada para este pedido até o momento.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {withdrawals.map(w => (
                  <div key={w.id} className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{w.user_name || 'Usuário do Sistema'}</span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {new Date(w.created_at).toLocaleDateString('pt-BR')} às {new Date(w.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-white border text-sm border-slate-200 rounded p-3 text-slate-700">
                      <div className="font-semibold text-xs text-slate-500 mb-2 uppercase tracking-wider">Itens Retirados</div>
                      {w.items.map(wi => (
                        <div key={wi.id} className="flex justify-between border-b border-slate-50 py-1.5 last:border-0 items-center">
                          <span className="truncate pr-4">• {wi.item_description}</span>
                          <span className="font-bold text-emerald-600 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded">
                            {wi.quantity_withdrawn} un
                          </span>
                        </div>
                      ))}
                    </div>

                    {w.observation && (
                      <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded text-sm text-amber-800 italic">
                        <strong>Obs:</strong> {w.observation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        </div>

        <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isProjectsContext && !readOnly && (
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 rounded border border-rose-200 hover:bg-rose-100 transition-colors" onClick={handleDelete} disabled={loading}>
                <Trash2 size={16} />
                Excluir
              </button>
            )}
            {/* Withdrawal button */}
            {['approved', 'ordered', 'quoted', 'in_stock', 'partially_withdrawn'].includes(formData.status) && (
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors shadow-sm"
                onClick={() => setShowWithdrawalModal(true)}
              >
                <PackageCheck size={16} />
                Registrar Retirada
              </button>
            )}
            {formData.status === 'received' && (
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <PackageCheck size={16} /> Todos os itens retirados
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end text-sm text-slate-500">
              <span>Subtotal: R$ {calculateSubtotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>{formData.category === 'SERVICE' ? 'Mobilização:' : 'Frete:'} R$ {(parseFloat(formData.shipping_cost) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-right border-l border-slate-200 pl-6">
              <span className="text-sm text-slate-500 block">Total Final</span>
              <strong className="text-lg text-slate-800">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            {!readOnly && (
              <button className="flex items-center gap-2 px-6 py-2.5 ml-4 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm" onClick={handleSubmit} disabled={loading}>
                <Save size={16} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            )}
          </div>
        </div>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Excluir Solicitação"
          message="Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
        />

        {showWithdrawalModal && (
          <WithdrawalModal
            request={request}
            onClose={() => setShowWithdrawalModal(false)}
            onUpdate={() => {
              setShowWithdrawalModal(false);
              onUpdate();
              loadWithdrawals();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RequestDetailsModal;
