import { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, FileText, Tag, Hash, MoreVertical,
  Filter, Download, Upload, Edit, CheckCircle, AlertCircle, XCircle, RefreshCw, Search
} from 'lucide-react';
import { getAllBillings, updateProjectBilling, getProjects, getClients } from '../services/api';
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
    substitution_due_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

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
      substitution_due_date: ''
    });
  };

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
        substitution_due_date: formData.substitution_due_date || null
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
        <button className="btn btn-secondary" onClick={loadData}>
          <RefreshCw size={16} /> Atualizar
        </button>
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
        <table className="billings-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Vencimento</th>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Vínculo (TAG)</th>
              <th>Valor</th>
              <th>Nº Nota</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center">Carregando...</td></tr>
            ) : filteredBillings.length === 0 ? (
              <tr><td colSpan="8" className="text-center">Nenhum registro encontrado.</td></tr>
            ) : (
              filteredBillings.map(billing => (
                <tr key={billing.id}>
                  <td>{getStatusBadge(billing.status)}</td>
                  <td>{billing.date ? new Date(billing.date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{getClientName(billing.project_id)}</td>
                  <td>{billing.description}</td>
                  <td><Tag size={14} /> {getProjectTag(billing.project_id)}</td>
                  <td>R$ {parseFloat(billing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>{billing.invoice_number || '-'}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(billing)} title="Editar">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBilling(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
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
