import { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, FileText, Tag, Hash, MoreVertical,
  Filter, Download, Upload, Edit, CheckCircle, AlertCircle, XCircle, RefreshCw, Search
} from 'lucide-react';
import { getAllBillings, updateProjectBilling, getProjects, getClients, previewTaxesImport, confirmTaxesImport } from '../services/api';
import DataTable from '../components/shared/DataTable';
import './AccountsReceivable.css';

const AccountsReceivable = () => {
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Import Preview State
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Edit Modal State
  const [editingBilling, setEditingBilling] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
    date: '', // Due Date
    issue_date: '',
    payment_date: '',
    invoice_number: '',
    replaced_by_id: '',
    // Substitution fields
    substitution_invoice_number: '',
    substitution_issue_date: '',
    substitution_due_date: '',
    substitution_reason: '',

    // Financial Fields
    category: 'SERVICE',
    gross_value: '',
    net_value: '',
    taxes_verified: false,

    // Retentions (Service) - Impostos retidos pelo cliente
    retention_iss: '',
    retention_inss: '',
    retention_irrf: '',
    retention_pis: '',
    retention_cofins: '',
    retention_csll: '',

    // Non-Retained Taxes (Service) - Impostos a pagar pela empresa
    tax_iss: '',
    tax_pis: '',
    tax_cofins: '',
    tax_irpj: '',

    // Taxes (Material)
    tax_icms: '',
    tax_ipi: '',
    value_st: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editingBilling) {
        setEditingBilling(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingBilling]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billingsRes, projectsRes, clientsRes] = await Promise.all([
        getAllBillings(),
        getProjects(),
        getClients()
      ]);
      setBillings(billingsRes.data);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'PREVISTO': 'badge-gray',
      'EMITIDA': 'badge-blue',
      'PAGO': 'badge-green',
      'VENCIDA': 'badge-red',
      'CANCELADA': 'badge-black',
      'SUBSTITUIDA': 'badge-orange'
    };
    return <span className={`status-badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
  };

  const handleEdit = (billing) => {
    setEditingBilling(billing);
    setFormData({
      status: billing.status,
      value: billing.value, // Required by backend
      description: billing.description, // Good practice to preserve
      date: billing.date || '',
      issue_date: billing.issue_date || '',
      payment_date: billing.payment_date || '',
      invoice_number: billing.invoice_number || '',
      replaced_by_id: billing.replaced_by_id || '',
      substitution_invoice_number: '',
      substitution_issue_date: '',
      substitution_due_date: '',
      substitution_reason: '',

      // Load Financials
      category: billing.category || 'SERVICE',
      gross_value: billing.gross_value || billing.value,
      net_value: billing.net_value || billing.value, // Default to gross if net missing
      taxes_verified: billing.taxes_verified || false,

      retention_iss: billing.retention_iss || 0,
      retention_inss: billing.retention_inss || 0,
      retention_irrf: billing.retention_irrf || 0,
      retention_pis: billing.retention_pis || 0,
      retention_cofins: billing.retention_cofins || 0,
      retention_csll: billing.retention_csll || 0,

      // Non-retained service taxes
      tax_iss: billing.tax_iss || 0,
      tax_pis: billing.tax_pis || 0,
      tax_cofins: billing.tax_cofins || 0,
      tax_irpj: billing.tax_irpj || 0,

      // Material taxes
      tax_icms: billing.tax_icms || 0,
      tax_ipi: billing.tax_ipi || 0,
      value_st: billing.value_st || 0
    });
  };

  // Tax Calculation Logic
  useEffect(() => {
    if (!editingBilling) return;

    const gross = parseFloat(formData.gross_value) || 0;

    let retentions = 0;

    if (formData.category === 'SERVICE') {
      retentions = (
        (parseFloat(formData.retention_iss) || 0) +
        (parseFloat(formData.retention_inss) || 0) +
        (parseFloat(formData.retention_irrf) || 0) +
        (parseFloat(formData.retention_pis) || 0) +
        (parseFloat(formData.retention_cofins) || 0) +
        (parseFloat(formData.retention_csll) || 0)
      );
    }
    const net = gross - retentions;
    // avoid infinite loop if value hasn't changed
    if (Math.abs(net - (parseFloat(formData.net_value) || 0)) > 0.01) {
      setFormData(prev => ({ ...prev, net_value: net.toFixed(2) }));
    }
    // For MATERIAL, usually Net = Gross + ST or just Gross (taxes are inside). 
    // Keeping simple: if Material, user edits Net manually or we assume Net = Gross for now unless specified.
  }, [
    editingBilling,
    formData.gross_value,
    formData.category,
    formData.retention_iss,
    formData.retention_inss,
    formData.retention_irrf,
    formData.retention_pis,
    formData.retention_cofins,
    formData.retention_csll
  ]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Sanitize data: Convert empty strings to null for optional fields
      const payload = {
        ...formData,
        date: formData.date || null,
        issue_date: formData.issue_date || null,
        payment_date: formData.payment_date || null,
        invoice_number: formData.invoice_number || null,
        replaced_by_id: formData.replaced_by_id || null,
        substitution_invoice_number: formData.substitution_invoice_number || null,
        substitution_issue_date: formData.substitution_issue_date || null,
        substitution_due_date: formData.substitution_due_date || null,
        substitution_reason: formData.substitution_reason || null
      };

      await updateProjectBilling(editingBilling.id, payload);
      setEditingBilling(null);
      loadData();
    } catch (error) {
      console.error("Error updating billing:", error);
      alert("Erro ao atualizar faturamento. Verifique se os campos obrigatórios foram preenchidos.");
    }
  };

  const getProjectTag = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.tag : 'N/A';
  };

  const getClientName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 'N/A';
    const client = clients.find(c => c.id === project.client_id);
    return client ? client.name : 'N/A';
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await previewTaxesImport(formData);
      setPreviewData(response.data);
      setShowPreviewModal(true);
    } catch (error) {
      console.error("Error importing:", error);
      alert('Erro na importação: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    try {
      setLoading(true);
      const payload = {
        items: previewData.items
      };
      await confirmTaxesImport(payload);
      alert('Importação confirmada com sucesso!');
      setShowPreviewModal(false);
      setPreviewData(null);
      loadData();
    } catch (error) {
      console.error("Error confirming import:", error);
      alert('Erro ao confirmar importação: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredBillings = billings.filter(billing => {
    // Status Filter
    if (statusFilter && billing.status !== statusFilter) return false;

    // Client Filter
    const project = projects.find(p => p.id === billing.project_id);
    if (clientFilter && project?.client_id !== parseInt(clientFilter)) return false;

    // Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const tag = project?.tag?.toLowerCase() || '';
      const clientName = getClientName(billing.project_id).toLowerCase();
      const invoice = billing.invoice_number?.toLowerCase() || '';
      const desc = billing.description?.toLowerCase() || '';

      return tag.includes(term) || clientName.includes(term) || invoice.includes(term) || desc.includes(term);
    }

    return true;
  });

  return (
    <div className="accounts-receivable-container">
      <div className="page-header">
        <h1>Contas a Receber</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Importar Retenções (XLSX)
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Buscar por Cliente, TAG, Nota ou Descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <label className="label">Status</label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PREVISTO">PREVISTO</option>
                <option value="EMITIDA">EMITIDA</option>
                <option value="PAGO">PAGO</option>
                <option value="VENCIDA">VENCIDA</option>
                <option value="CANCELADA">CANCELADA</option>
                <option value="SUBSTITUIDA">SUBSTITUIDA</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="label">Cliente</label>
              <select
                className="input"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="billings-table-container">
        <DataTable
          columns={[
            { header: 'Vencimento', accessor: 'date', render: row => row.date ? new Date(row.date).toLocaleDateString('pt-BR') : '-' },
            { header: 'Cliente', accessor: 'client_name', render: row => getClientName(row.project_id) },
            { header: 'Descrição', accessor: 'description' },
            { header: 'Vínculo (TAG)', accessor: 'tag', render: row => <><Tag size={14} /> {getProjectTag(row.project_id)}</> },
            {
              header: 'Valor',
              accessor: 'value',
              render: billing => (
                <div style={{ textAlign: 'right', fontWeight: 500 }}>
                  <div>
                    R$ {parseFloat(billing.gross_value || billing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75em', color: '#64748b' }}>
                    Caixa: R$ {parseFloat(billing.net_value || billing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {(() => {
                    const net = parseFloat(billing.net_value || billing.value);
                    const taxToPay = (
                      (parseFloat(billing.tax_iss) || 0) +
                      (parseFloat(billing.tax_pis) || 0) +
                      (parseFloat(billing.tax_cofins) || 0) +
                      (parseFloat(billing.tax_irpj) || 0) +
                      (parseFloat(billing.tax_icms) || 0) +
                      (parseFloat(billing.tax_ipi) || 0) +
                      (parseFloat(billing.value_st) || 0)
                    );
                    const real = net - taxToPay;
                    if (taxToPay > 0) {
                      return (
                        <div style={{ fontSize: '0.75em', color: '#166534', fontWeight: '600' }}>
                          Real: R$ {real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )
            },
            { header: 'Nº Nota', accessor: 'invoice_number', render: row => row.invoice_number || '-' },
            { header: 'Status', accessor: 'status', render: row => getStatusBadge(row.status) }
          ]}
          data={filteredBillings}
          actions={false}
          onRowClick={(billing) => handleEdit(billing)}
        />
      </div>

      {/* Edit Modal */}
      {editingBilling && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Faturamento</h3>
              <button className="close-btn" onClick={() => setEditingBilling(null)}><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Projeto (TAG)</label>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Tag size={16} />
                  {getProjectTag(editingBilling.project_id)}
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="PREVISTO">PREVISTO</option>
                  <option value="EMITIDA">EMITIDA</option>
                  <option value="PAGO">PAGO</option>
                  <option value="CANCELADA">CANCELADA</option>
                  <option value="SUBSTITUIDA">SUBSTITUIDA</option>
                </select>
              </div>

              {/* Conditional Fields based on Status */}
              {formData.status === 'EMITIDA' && (
                <>
                  <div className="form-group">
                    <label>Data de Emissão *</label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data de Vencimento *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nº Nota Fiscal</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formData.status === 'PAGO' && (
                <div className="form-group">
                  <label>Data de Pagamento</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
              )}

              {formData.status === 'SUBSTITUIDA' && (
                <div className="substitution-section">
                  <div className="form-group">
                    <label>Motivo da Substituição *</label>
                    <textarea
                      value={formData.substitution_reason}
                      onChange={(e) => setFormData({ ...formData, substitution_reason: e.target.value })}
                      placeholder="Ex: Erro no valor, dados incorretos, solicitação do cliente..."
                      rows={2}
                      required
                    />
                  </div>
                  <h4>Dados da Nova Nota (Substituta)</h4>
                  <div className="form-group">
                    <label>Número da Nova Nota *</label>
                    <input
                      type="text"
                      value={formData.substitution_invoice_number}
                      onChange={(e) => setFormData({ ...formData, substitution_invoice_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data de Emissão *</label>
                    <input
                      type="date"
                      value={formData.substitution_issue_date}
                      onChange={(e) => setFormData({ ...formData, substitution_issue_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data de Vencimento *</label>
                    <input
                      type="date"
                      value={formData.substitution_due_date}
                      onChange={(e) => setFormData({ ...formData, substitution_due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Financial & Tax Section */}
              <div className="form-section-divider">
                <h4>Dados Fiscais & Financeiros</h4>
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <select value={formData.category} onChange={(e) => {
                  const newCategory = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    category: newCategory,
                    // Shared fields (used in both but with different context) - Reset on any change
                    retention_pis: 0,
                    retention_cofins: 0,

                    // Reset fields based on new category to avoid ghost taxes
                    retention_iss: newCategory === 'MATERIAL' ? 0 : prev.retention_iss,
                    retention_inss: newCategory === 'MATERIAL' ? 0 : prev.retention_inss,
                    retention_irrf: newCategory === 'MATERIAL' ? 0 : prev.retention_irrf,
                    retention_csll: newCategory === 'MATERIAL' ? 0 : prev.retention_csll,
                    // Zerar Impostos Não Retidos (Empresa paga) ao mudar para Material
                    tax_iss: newCategory === 'MATERIAL' ? 0 : prev.tax_iss,
                    tax_irpj: newCategory === 'MATERIAL' ? 0 : prev.tax_irpj,
                    tax_pis: newCategory === 'MATERIAL' ? 0 : prev.tax_pis,
                    tax_cofins: newCategory === 'MATERIAL' ? 0 : prev.tax_cofins,
                    // Reset material specific taxes if switching to Service
                    tax_icms: newCategory === 'SERVICE' ? 0 : prev.tax_icms,
                    tax_ipi: newCategory === 'SERVICE' ? 0 : prev.tax_ipi,
                    value_st: newCategory === 'SERVICE' ? 0 : prev.value_st
                  }));
                }}>
                  <option value="SERVICE">Serviço</option>
                  <option value="MATERIAL">Material</option>
                </select>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Valor Bruto (R$)</label>
                  <div style={{ height: '17px', marginBottom: '4px' }}></div> {/* Spacer to align with helpers */}
                  <input type="number" step="0.01" value={formData.gross_value} onChange={e => setFormData({ ...formData, gross_value: e.target.value })} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Valor a Receber (Caixa)</label>
                  <div style={{ fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Entra no Banco</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.net_value}
                    onChange={e => setFormData({ ...formData, net_value: e.target.value })}
                    readOnly
                    style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed', fontWeight: 'bold' }}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Líquido Real (Pós-Impostos)</label>
                  <div style={{ fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Sobra após pagar guias</div>
                  <input
                    type="text" // Text to allow formatting nicely, strictly read-only
                    value={(
                      (parseFloat(formData.net_value) || 0) -
                      (
                        (parseFloat(formData.tax_iss) || 0) +
                        (parseFloat(formData.tax_pis) || 0) +
                        (parseFloat(formData.tax_cofins) || 0) +
                        (parseFloat(formData.tax_irpj) || 0) +
                        (parseFloat(formData.tax_icms) || 0) +
                        (parseFloat(formData.tax_ipi) || 0) +
                        (parseFloat(formData.value_st) || 0)
                      )
                    ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    readOnly
                    style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', border: '1px solid #bbf7d0' }}
                  />
                </div>
              </div>

              {/* Impostos Retidos pelo Cliente (SERVICE) */}
              {formData.category === 'SERVICE' && (
                <>
                  {/* Impostos Retidos pelo Cliente */}
                  <div className="tax-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '15px' }}>
                    <h5 style={{ gridColumn: '1 / -1', margin: '0 0 10px 0', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>⛔ Retidos (Cliente paga)</h5>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>ISS</label>
                      <input type="number" step="0.01" value={formData.retention_iss} onChange={e => setFormData({ ...formData, retention_iss: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>PIS</label>
                      <input type="number" step="0.01" value={formData.retention_pis} onChange={e => setFormData({ ...formData, retention_pis: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>COFINS</label>
                      <input type="number" step="0.01" value={formData.retention_cofins} onChange={e => setFormData({ ...formData, retention_cofins: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>CSLL</label>
                      <input type="number" step="0.01" value={formData.retention_csll} onChange={e => setFormData({ ...formData, retention_csll: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>INSS</label>
                      <input type="number" step="0.01" value={formData.retention_inss} onChange={e => setFormData({ ...formData, retention_inss: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>IRRF</label>
                      <input type="number" step="0.01" value={formData.retention_irrf} onChange={e => setFormData({ ...formData, retention_irrf: e.target.value })} />
                    </div>
                  </div>

                  {/* Impostos Não Retidos (Empresa Paga) */}
                  <div className="tax-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', background: '#fffbeb', padding: '15px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                    <h5 style={{ gridColumn: '1 / -1', margin: '0 0 10px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>💰 Não Retidos (Empresa paga)</h5>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>ISS</label>
                      <input type="number" step="0.01" value={formData.tax_iss} onChange={e => setFormData({ ...formData, tax_iss: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>PIS</label>
                      <input type="number" step="0.01" value={formData.tax_pis} onChange={e => setFormData({ ...formData, tax_pis: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>COFINS</label>
                      <input type="number" step="0.01" value={formData.tax_cofins} onChange={e => setFormData({ ...formData, tax_cofins: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8em' }}>IRPJ</label>
                      <input type="number" step="0.01" value={formData.tax_irpj} onChange={e => setFormData({ ...formData, tax_irpj: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {formData.category === 'MATERIAL' && (
                <div className="tax-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ gridColumn: '1 / -1', margin: '0 0 10px 0', color: '#64748b' }}>Impostos (Nota)</h5>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8em' }}>ICMS</label>
                    <input type="number" step="0.01" value={formData.tax_icms} onChange={e => setFormData({ ...formData, tax_icms: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8em' }}>PIS</label>
                    <input type="number" step="0.01" value={formData.tax_pis} onChange={e => setFormData({ ...formData, tax_pis: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8em' }}>COFINS</label>
                    <input type="number" step="0.01" value={formData.tax_cofins} onChange={e => setFormData({ ...formData, tax_cofins: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBilling(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
            <div className="modal-header">
              <h3>Prévia da Importação</h3>
              <button className="close-btn" onClick={() => { setShowPreviewModal(false); setPreviewData(null); }}><XCircle size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="summary-banner" style={{ display: 'flex', gap: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', marginBottom: '15px' }}>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#64748b' }}>Notas Encontradas</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{previewData.found_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', color: '#64748b' }}>Valor Total (Bruto)</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#16a34a' }}>
                    R$ {previewData.total_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {previewData.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                  Nenhuma nota válida encontrada para importação. Verifique se o arquivo corresponde ao modelo esperado.
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="billings-table">
                    <thead>
                      <tr>
                        <th>Nota</th>
                        <th>Cliente</th>
                        <th>Projeto</th>
                        <th>Categoria (Detectada)</th>
                        <th>Bruto (Excel)</th>
                        <th>Líquido (Calc)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.invoice_number}</td>
                          <td>{item.client_name}</td>
                          <td><Tag size={12} /> {item.project_tag}</td>
                          <td>
                            <span className={item.category === 'SERVICE' ? 'badge badge-blue' : 'badge badge-gray'}>
                              {item.category === 'SERVICE' ? 'SERVIÇO' : 'MATERIAL'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>R$ {item.gross_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#16a34a' }}>R$ {item.net_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td>
                            {item.updates && item.updates.taxes_verified ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.85em' }}>
                                <CheckCircle size={14} /> Ok
                              </div>
                            ) : (
                              <span style={{ color: '#f59e0b' }}>Pendente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ marginTop: '15px' }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.9em' }}>Ver Logs de Processamento</summary>
                  <pre style={{ background: '#1e293b', color: '#f1f5f9', padding: '10px', borderRadius: '4px', fontSize: '0.8em', maxHeight: '150px', overflow: 'auto', marginTop: '5px' }}>
                    {previewData.logs.join('\n')}
                  </pre>
                </details>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPreviewModal(false); setPreviewData(null); }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmImport}
                  disabled={previewData.items.length === 0 || loading}
                >
                  {loading ? 'Confirmando...' : 'Confirmar Importação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon Component since Users is already imported as UsersIcon in some contexts or to avoid conflict
const UsersIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export default AccountsReceivable;
