import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Upload, Search } from 'lucide-react';
import { getContracts, createContract, updateContract, deleteContract, getClients, getProjects, getAllBillings } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
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
  });

  // State for editing
  const [editingId, setEditingId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm && !showConfirmModal) {
        setShowForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showConfirmModal]);

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
        value: formData.contract_type === 'LPU' && formData.value ? parseFloat(formData.value) : null,
        monthly_value: formData.contract_type === 'RECORRENTE' && formData.monthly_value ? parseFloat(formData.monthly_value) : null,
        due_day: formData.contract_type === 'RECORRENTE' && formData.due_day ? parseInt(formData.due_day) : null,
        readjustment_index: formData.contract_type === 'RECORRENTE' ? formData.readjustment_index : null,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
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
    });
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleEdit = (contract) => {
    setFormData({
      client_id: contract.client_id,
      description: contract.description,
      contract_number: contract.contract_number || '',
      signature_date: contract.signature_date || '',
      end_date: contract.end_date || '',
      value: contract.value || '',
      contract_type: contract.contract_type || 'LPU',
      monthly_value: contract.monthly_value || '',
      due_day: contract.due_day || '',
      readjustment_index: contract.readjustment_index || '',
      company_id: contract.company_id || '',
    });
    setEditingId(contract.id);
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

  const filteredContracts = contracts.filter(contract => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      contract.description.toLowerCase().includes(term) ||
      (contract.contract_number && contract.contract_number.toLowerCase().includes(term));

    const matchesClient = filterClient ? contract.client_id === parseInt(filterClient) : true;
    const matchesType = filterType ? contract.contract_type === filterType : true;

    return matchesSearch && matchesClient && matchesType;
  });


  const columns = [
    { header: 'ID', accessor: 'id', render: row => <span className="text-gray-500 font-mono">#{row.id}</span> },
    {
      header: 'Contrato', accessor: 'description', render: row => (
        <div>
          <div className="font-semibold text-slate-900">{row.description}</div>
          {row.contract_number && <div className="text-xs text-slate-500">{row.contract_number}</div>}
        </div>
      )
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
        // Manually override color for Active to match existing green
        return <StatusBadge status={status} />
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
                placeholder="Buscar por descrição ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="filters-row">
              <div className="filter-group">
                <label className="label">Cliente</label>
                <select
                  className="input"
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                >
                  <option value="">Todos</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
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

      {showForm && (
        <div className="contract-form-modal">
          {/* Preservation of Modal Content Logic */}
          <div className="contract-form card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Contrato' : 'Criar Contrato'}</h3>
              {editingId && canEdit && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Contrato"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Coluna Esquerda */}
                <div className="form-column">
                  <div className="form-group">
                    <label className="label">TAG (Automático)</label>
                    <input
                      type="text"
                      name="contract_number"
                      className="input"
                      value={formData.contract_number || 'Gerado Automaticamente'}
                      readOnly
                      disabled
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed', fontWeight: 'bold' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Cliente *</label>
                    <select
                      name="client_id"
                      className="input"
                      value={formData.client_id}
                      onChange={handleChange}
                      required
                      disabled={!!editingId}
                      style={editingId ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
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
                    <label className="label">Título/Descrição *</label>
                    <input
                      type="text"
                      name="description"
                      className="input"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      placeholder="ex: Contrato Ternium 2024"
                      readOnly={!!editingId}
                      disabled={!!editingId}
                      style={editingId ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
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
                    <label className="label">Anexo do Contrato</label>
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
                      backgroundColor: '#f8fafc'
                    }}>
                      <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                      <span>Clique para fazer upload</span>
                      <span style={{ fontSize: '0.75rem' }}>PDF, DOCX ou Imagens</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
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
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Contracts;
