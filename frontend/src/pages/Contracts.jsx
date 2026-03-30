import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Upload, Search, DollarSign, LayoutDashboard, Link as LinkIcon } from 'lucide-react';
import { getContracts, createContract, updateContract, deleteContract, getClients, getProjects, getAllBillings, createProjectBilling, deleteProjectBilling } from '../services/api';
import { formatDateUTC, formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import Modal from '../components/shared/Modal';
import StatusBadge from '../components/shared/StatusBadge';
import SearchableSelect from '../components/shared/SearchableSelect';
import Input from '../components/shared/Input';
import Select from '../components/shared/Select';
import Button from '../components/shared/Button';
import './Contracts.css';

const Contracts = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('contracts', 'edit');
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    contract_number: '',
    signature_date: '',
    end_date: '',
    value: '',
    contract_type: 'LPU',
    monthly_value: '',
    due_day: '',
    readjustment_index: '',
    company_id: '',
    directory_url: '',
  });

  // State for editing
  const [editingId, setEditingId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [activeTab, setActiveTab] = useState('geral');

  // Financial tab state
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [billingFormData, setBillingFormData] = useState({
    category: 'SERVICE',
    gross_value: '',
    description: ''
  });

  useEffect(() => {
    loadContracts();
    loadClients();
    loadProjects();
    loadBillings();
  }, []);

  const loadContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadBillings = async () => {
    try {
      const response = await getAllBillings();
      setBillings(response.data);
    } catch (error) {
      console.error('Error loading billings:', error);
    }
  };

  // Helper: Get project count for a contract
  const getProjectCount = (contractId) => {
    return projects.filter(p => p.contract_id === contractId).length;
  };

  // Helper: Get total billed value for a contract (from all child projects)
  const getTotalBilled = (contractId) => {
    const contractProjectIds = projects
      .filter(p => p.contract_id === contractId)
      .map(p => p.id);

    return billings
      .filter(b => contractProjectIds.includes(b.project_id)
        && !['CANCELADA', 'SUBSTITUIDA'].includes(b.status))
      .reduce((sum, b) => sum + parseFloat(b.value || 0), 0);
  };

  // Helper: Get Realized Value (PAGO)
  const getRealizedValue = (contractId) => {
    const contractProjectIds = projects
      .filter(p => p.contract_id === contractId)
      .map(p => p.id);

    return billings
      .filter(b => contractProjectIds.includes(b.project_id) && b.status === 'PAGO')
      .reduce((sum, b) => sum + parseFloat(b.gross_value || b.value || 0), 0);
  };

  // Helper: Get Pending Value (PREVISTO + EMITIDA + VENCIDA)
  const getPendingValue = (contractId) => {
    const contractProjectIds = projects
      .filter(p => p.contract_id === contractId)
      .map(p => p.id);

    return billings
      .filter(b => contractProjectIds.includes(b.project_id) && ['PREVISTO', 'EMITIDA'].includes(b.status))
      .reduce((sum, b) => sum + parseFloat(b.gross_value || b.value || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        client_id: parseInt(formData.client_id),
        signature_date: formData.signature_date || null,
        end_date: formData.end_date || null,
        value: formData.contract_type === 'LPU' && formData.value ? parseFloat(formData.value) : null,
        monthly_value: formData.contract_type === 'RECORRENTE' && formData.monthly_value ? parseFloat(formData.monthly_value) : null,
        due_day: formData.contract_type === 'RECORRENTE' && formData.due_day ? parseInt(formData.due_day) : null,
        readjustment_index: formData.contract_type === 'RECORRENTE' ? formData.readjustment_index || null : null,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
        directory_url: formData.directory_url || null,
      };

      if (editingId) {
        await updateContract(editingId, payload);
      } else {
        await createContract(payload);
      }
      setShowForm(false);
      resetForm();
      setEditingId(null);
      loadContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Erro ao criar contrato: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      title: '',
      description: '',
      contract_number: '',
      signature_date: '',
      end_date: '',
      value: '',
      contract_type: 'LPU',
      monthly_value: '',
      due_day: '',
      readjustment_index: '',
      company_id: '',
      directory_url: '',
    });
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleEdit = (contract) => {
    setFormData({
      client_id: contract.client_id,
      title: contract.title || '',
      description: contract.description || '',
      contract_number: contract.contract_number || '',
      signature_date: contract.signature_date || '',
      end_date: contract.end_date || '',
      value: contract.value || '',
      contract_type: contract.contract_type || 'LPU',
      monthly_value: contract.monthly_value || '',
      due_day: contract.due_day || '',
      readjustment_index: contract.readjustment_index || '',
      company_id: contract.company_id || '',
      directory_url: contract.directory_url || '',
    });
    setEditingId(contract.id);
    setActiveTab('geral');
    setShowBillingForm(false);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteContract(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false);
      loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Erro ao excluir contrato');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const formatMoney = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value);
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, '');
    const floatValue = cleanValue ? parseFloat(cleanValue) / 100 : '';
    setFormData({
      ...formData,
      [name]: floatValue
    });
  };

  // ---- Financial Tab Helpers (for RECORRENTE contracts) ----
  const getContractBillings = (contractId) => {
    const contractProjectIds = projects
      .filter(p => p.contract_id === contractId)
      .map(p => p.id);
    return billings.filter(b => contractProjectIds.includes(b.project_id));
  };

  const handleAddBilling = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const contractProjects = projects.filter(p => p.contract_id === editingId);
    if (contractProjects.length === 0) {
      alert('Este contrato não possui projetos vinculados. Crie um projeto primeiro para lançar faturamentos.');
      return;
    }
    try {
      const val = parseFloat(billingFormData.gross_value);
      await createProjectBilling(contractProjects[0].id, {
        ...billingFormData,
        gross_value: val,
        value: val,
        project_id: contractProjects[0].id
      });
      setShowBillingForm(false);
      setBillingFormData({ category: 'SERVICE', gross_value: '', description: '' });
      loadBillings();
    } catch (error) {
      alert('Erro ao criar faturamento: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteBilling = async (billingId) => {
    if (!confirm('Tem certeza que deseja excluir este faturamento?')) return;
    try {
      await deleteProjectBilling(billingId);
      loadBillings();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const term = searchTerm.toLowerCase();
    
    // Find client name for search
    const client = clients.find(c => c.id === contract.client_id);
    const clientName = client ? client.name.toLowerCase() : '';

    const matchesSearch =
      (contract.title && contract.title.toLowerCase().includes(term)) ||
      (contract.description && contract.description.toLowerCase().includes(term)) ||
      (contract.contract_number && contract.contract_number.toLowerCase().includes(term)) ||
      clientName.includes(term);

    const matchesClient = filterClient ? contract.client_id === parseInt(filterClient) : true;
    const matchesType = filterType ? contract.contract_type === filterType : true;

    return matchesSearch && matchesClient && matchesType;
  });


  const columns = [
    { header: 'ID', accessor: 'id', render: row => <span className="text-gray-500 font-mono">#{row.id}</span> },
    {
      header: 'Tag',
      accessor: 'contract_number',
      render: row => row.directory_url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="font-mono text-slate-700">{row.contract_number}</span>
          <a
            href={row.directory_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              padding: '2px',
            }}
            title="Abrir diretório ou anexo do contrato"
          >
            <LinkIcon size={14} />
          </a>
        </div>
      ) : (
        <span className="font-mono text-slate-700">{row.contract_number}</span>
      )
    },
    {
      header: 'Título',
      accessor: 'title',
      render: row => (
        <div className="font-semibold text-slate-900">
          {row.title || row.description}
          {row.title && row.description && (
            <div className="text-[10px] text-slate-400 font-normal truncate" style={{ maxWidth: '200px' }}>
              {row.description}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Cliente',
      accessor: 'client_id',
      render: row => {
        const client = clients.find(c => c.id === row.client_id);
        return <span className="text-slate-600">{client ? client.name : 'Não informado'}</span>;
      }
    },
    {
      header: 'Tipo', accessor: 'contract_type', render: row => {
        const type = row.contract_type || 'LPU';
        const isLPU = type === 'LPU';
        return (
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: isLPU ? '#e0f2fe' : '#f3e8ff',
            color: isLPU ? '#0369a1' : '#7e22ce',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            {type}
          </span>
        );
      }
    },
    {
      header: 'Status', accessor: 'status', render: row => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = row.end_date ? new Date(row.end_date + 'T12:00:00') : null;
        const isExpired = endDate && endDate < today;
        const status = isExpired ? 'Vencido' : 'Ativo';
        return <StatusBadge status={status} />;
      }
    },
    {
      header: 'Projetos', accessor: 'projects', render: row => {
        const count = getProjectCount(row.id);
        return count > 0 ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#64748b' }}>
            📂 {count}
          </span>
        ) : '-';
      }
    },
  ];

  return (
    <div className="contracts">
      <header className="contracts-header">
        <div>
          <h1>Gestão de Contratos</h1>
          <p>Contratos guarda-chuva vinculados a clientes</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            resetForm();
            setShowForm(true);
          }}>
            <Plus size={20} />
            Novo Contrato
          </button>
        )}
      </header>

      {/* Search and Filters Card */}
      <div style={{ padding: '0 2rem' }}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="search-filters">
            <div className="search-bar">
              <input
                type="text"
                className="input"
                placeholder="Buscar por título, tag ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="filters-row">
              <div className="filter-group">
                <label className="label">Cliente</label>
                <SearchableSelect
                  name="filterClient"
                  placeholder="Todos os clientes"
                  options={clients.map(c => ({ value: c.id, label: c.name }))}
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="LPU">LPU</option>
                  <option value="RECORRENTE">Recorrente</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setActiveTab('geral'); }}
        title={editingId ? 'Editar Contrato' : 'Criar Contrato'}
        maxWidth="900px"
        headerActions={
          editingId && canEdit && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDelete(editingId)}
              title="Excluir Contrato"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
        {/* Tab Navigation - only show tabs for RECORRENTE in edit mode */}
        {editingId && formData.contract_type === 'RECORRENTE' && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', gap: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('geral')}
              style={{
                padding: '0.6rem 0.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: activeTab === 'geral' ? '#3b82f6' : '#64748b',
                borderBottom: activeTab === 'geral' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <LayoutDashboard size={16} />
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              style={{
                padding: '0.6rem 0.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: activeTab === 'financial' ? '#3b82f6' : '#64748b',
                borderBottom: activeTab === 'financial' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <DollarSign size={16} />
              Financeiro
            </button>
          </div>
        )}

        {/* GERAL TAB */}
        {activeTab === 'geral' && (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '0.5rem' }}>
            {/* Coluna Esquerda */}
            <div className="form-column">
              <div className="form-group">
                {/* TAG — campo manual obrigatório na criação, readOnly na edição */}
                <label className="label">TAG do Contrato *</label>
                <input
                  type="text"
                  name="contract_number"
                  className="input"
                  value={formData.contract_number}
                  onChange={handleChange}
                  required
                  readOnly={!!editingId}
                  disabled={!!editingId}
                  placeholder={editingId ? '' : 'Ex: CEC1_2603_001_01'}
                  style={editingId
                    ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed', fontWeight: 'bold' }
                    : { fontWeight: 'bold' }
                  }
                />
              </div>

              <div className="form-group">
                <label className="label">Cliente *</label>
                <SearchableSelect
                  name="client_id"
                  placeholder="Selecione um cliente"
                  options={clients.map(c => ({ value: c.id, label: c.name }))}
                  value={formData.client_id}
                  onChange={handleChange}
                  required
                  disabled={!!editingId}
                />
              </div>

              <div className="form-group">
                <label className="label">CNPJ (Empresa)</label>
                <select
                  name="company_id"
                  className="input"
                  value={formData.company_id}
                  onChange={handleChange}
                  disabled={!!editingId} // Disable editing CNPJ once created, as it affects TAG
                  style={editingId ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Selecione</option>
                  <option value="1">1 - Engenharia</option>
                  <option value="2">2 - Telecom</option>
                  <option value="3">3 - ES</option>
                  <option value="4">4 - MA</option>
                  <option value="5">5 - SP</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Título do Contrato *</label>
                <input
                  type="text"
                  name="title"
                  className="input"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="ex: Contrato Ternium 2024"
                />
              </div>

              <div className="form-group">
                <label className="label">Descrição / Observações</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detalhes adicionais do contrato..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="label">Tipo de Contrato *</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: editingId ? 'not-allowed' : 'pointer', opacity: editingId ? 0.6 : 1 }}>
                    <input
                      type="radio"
                      name="contract_type"
                      value="LPU"
                      checked={formData.contract_type === 'LPU'}
                      onChange={handleChange}
                      disabled={!!editingId}
                    />
                    LPU / Guarda-Chuva
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: editingId ? 'not-allowed' : 'pointer', opacity: editingId ? 0.6 : 1 }}>
                    <input
                      type="radio"
                      name="contract_type"
                      value="RECORRENTE"
                      checked={formData.contract_type === 'RECORRENTE'}
                      onChange={handleChange}
                      disabled={!!editingId}
                    />
                    Recorrente
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Status</label>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endDate = formData.end_date ? new Date(formData.end_date + 'T12:00:00') : null;
                  const isExpired = endDate && endDate < today;

                  return (
                    <div
                      className={`status-badge ${isExpired ? 'expired' : 'active'}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        backgroundColor: isExpired ? '#fee2e2' : '#dcfce7',
                        color: isExpired ? '#991b1b' : '#166534',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      {isExpired ? 'Vencido' : 'Ativo'}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="form-column">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Data de Assinatura</label>
                  <input
                    type="date"
                    name="signature_date"
                    className="input"
                    value={formData.signature_date}
                    onChange={handleChange}
                    readOnly={!!editingId}
                    disabled={!!editingId}
                    style={editingId ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Data de Término</label>
                  <input
                    type="date"
                    name="end_date"
                    className="input"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Campos Financeiros Condicionais */}
              {formData.contract_type === 'LPU' ? (
                <>
                  <div className="form-group">
                    <label className="label">Valor Global (Teto/Cap) (R$)</label>
                    <input
                      type="text"
                      name="value"
                      className="input"
                      value={formatMoney(formData.value)}
                      onChange={handleMoneyChange}
                      placeholder="0,00"
                    />
                  </div>
                  {editingId && (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.8rem' }}>Já Faturado (Pago)</label>
                        <div style={{
                          padding: '0.5rem',
                          backgroundColor: '#dcfce7',
                          borderRadius: '0.5rem',
                          border: '1px solid #bbf7d0',
                          color: '#166534',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          R$ {getRealizedValue(editingId).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.8rem' }}>A Faturar (Previsto/Emitido)</label>
                        <div style={{
                          padding: '0.5rem',
                          backgroundColor: '#fff7ed',
                          borderRadius: '0.5rem',
                          border: '1px solid #fed7aa',
                          color: '#c2410c',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          R$ {getPendingValue(editingId).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                   <div className="form-group">
                    <label className="label">Valor Mensal (R$)</label>
                    <input
                      type="text"
                      name="monthly_value"
                      className="input"
                      value={formatMoney(formData.monthly_value)}
                      onChange={handleMoneyChange}
                      placeholder="0,00"
                    />
                  </div>

                  {editingId && (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.8rem' }}>Já Faturado (Pago)</label>
                        <div style={{
                          padding: '0.5rem',
                          backgroundColor: '#dcfce7',
                          borderRadius: '0.5rem',
                          border: '1px solid #bbf7d0',
                          color: '#166534',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          R$ {getRealizedValue(editingId).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.8rem' }}>A Faturar (Previsto/Emitido)</label>
                        <div style={{
                          padding: '0.5rem',
                          backgroundColor: '#fff7ed',
                          borderRadius: '0.5rem',
                          border: '1px solid #fed7aa',
                          color: '#c2410c',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          R$ {getPendingValue(editingId).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="label">Dia de Vencimento</label>
                      <input
                        type="number"
                        name="due_day"
                        className="input"
                        value={formData.due_day}
                        onChange={handleChange}
                        min="1"
                        max="31"
                        placeholder="ex: 5"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Índice de Reajuste</label>
                      <input
                        type="text"
                        name="readjustment_index"
                        className="input"
                        value={formData.readjustment_index}
                        onChange={handleChange}
                        placeholder="ex: IPCA"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="label">Anexo do Contrato (Upload)</label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                  marginBottom: '1rem'
                }}>
                  <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                  <span>Clique para fazer upload</span>
                  <span style={{ fontSize: '0.75rem' }}>PDF, DOCX ou Imagens</span>
                </div>
              </div>

              <div className="form-group">
                <label className="label">URL da Pasta do Contrato (Google Drive)</label>
                <input
                  type="url"
                  name="directory_url"
                  className="input"
                  value={formData.directory_url}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            {canEdit && (
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Salvar Alterações' : 'Salvar Contrato'}
              </button>
            )}
          </div>
        </form>
        )}

        {/* FINANCIAL TAB - only for RECORRENTE */}
        {activeTab === 'financial' && editingId && formData.contract_type === 'RECORRENTE' && (() => {
          const contractBills = getContractBillings(editingId);
          const totalFaturadoPago = contractBills
            .filter(b => b.status === 'PAGO')
            .reduce((acc, b) => acc + (Number(b.gross_value || b.value) || 0), 0);
          const totalImpostos = contractBills.reduce((acc, b) => acc + (Number(b.tax_value) || 0), 0);
          const liquidoReal = totalFaturadoPago - totalImpostos;

          return (
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Histórico de Faturamento</h3>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowBillingForm(!showBillingForm)}>
                    <Plus size={16} /> Novo Faturamento
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ padding: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Valor Mensal</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>
                    R$ {formatCurrency(formData.monthly_value)}
                  </span>
                </div>
                <div className="card" style={{ padding: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Faturado (Bruto)</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3b82f6' }}>
                    R$ {formatCurrency(totalFaturadoPago)}
                  </span>
                </div>
                <div className="card" style={{ padding: '0.75rem', borderLeft: '3px solid #f87171' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0 0 0.25rem 0' }}>Impostos</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
                    R$ {formatCurrency(totalImpostos)}
                  </span>
                </div>
                <div className="card" style={{ padding: '0.75rem', borderLeft: '3px solid #22c55e', backgroundColor: '#f0fdf4' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#15803d', margin: '0 0 0.25rem 0' }}>Receita Líquida</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#166534' }}>
                    R$ {formatCurrency(liquidoReal)}
                  </span>
                </div>
              </div>

              {showBillingForm && (
                <form onSubmit={handleAddBilling} style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '10px' }}>
                    <Select
                      value={billingFormData.category}
                      onChange={(e) => setBillingFormData({ ...billingFormData, category: e.target.value })}
                      required
                      options={[
                        { value: 'SERVICE', label: 'Serviço' },
                        { value: 'MATERIAL', label: 'Material' }
                      ]}
                    />
                    <Input
                      type="number"
                      placeholder="Valor Bruto (R$)"
                      step="0.01"
                      value={billingFormData.gross_value}
                      onChange={(e) => setBillingFormData({ ...billingFormData, gross_value: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', width: '100%' }}>
                    <Input
                      type="text"
                      placeholder="Descrição (ex: Mensalidade Jan/2025)"
                      value={billingFormData.description}
                      onChange={(e) => setBillingFormData({ ...billingFormData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <Button variant="secondary" size="sm" type="button" onClick={() => setShowBillingForm(false)}>Cancelar</Button>
                    <Button variant="primary" size="sm" type="submit">Salvar</Button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contractBills.map(billing => (
                  <div key={billing.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: '#f0f9ff', padding: '0.4rem', borderRadius: '50%', color: '#0369a1' }}>
                        <DollarSign size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>R$ {formatCurrency(billing.gross_value || billing.value)}</strong>
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: {
                              'PREVISTO': '#f1f5f9', 'EMITIDA': '#dbeafe',
                              'PAGO': '#dcfce7', 'VENCIDA': '#fee2e2',
                              'CANCELADA': '#f1f5f9', 'SUBSTITUIDA': '#fff7ed'
                            }[billing.status] || '#f1f5f9',
                            color: {
                              'PREVISTO': '#475569', 'EMITIDA': '#1d4ed8',
                              'PAGO': '#166534', 'VENCIDA': '#dc2626',
                              'CANCELADA': '#64748b', 'SUBSTITUIDA': '#c2410c'
                            }[billing.status] || '#475569',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {billing.status}
                          </span>
                        </div>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          {formatDateUTC(billing.date)}
                          {billing.invoice_number && ` - NF ${billing.invoice_number}`}
                          {billing.description && ` - ${billing.description}`}
                        </p>
                      </div>
                    </div>
                    {billing.status === 'PREVISTO' && canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBilling(billing.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {contractBills.length === 0 && !showBillingForm && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Nenhum faturamento lançado para este contrato.</p>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <div style={{ padding: '0 2rem 2rem' }}>
        <DataTable
          columns={columns}
          data={filteredContracts}
          actions={false}
          onRowClick={(contract) => handleEdit(contract)}
        />
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita."
      />
    </div >
  );
};

export default Contracts;
