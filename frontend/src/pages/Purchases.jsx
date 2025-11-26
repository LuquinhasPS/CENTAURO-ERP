import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Edit, Trash2, Filter } from 'lucide-react';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, getProjects } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Purchases.css';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const [formData, setFormData] = useState({
    project_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    supplier: '',
    status: 'pending',
    expected_date: '',
    requester: '',
    notes: ''
  });

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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, projectsRes] = await Promise.all([
        getPurchases(),
        getProjects()
      ]);
      setPurchases(purchasesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        total_price: parseFloat(formData.total_price)
      };

      if (editingId) {
        await updatePurchase(editingId, dataToSend);
      } else {
        await createPurchase(dataToSend);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('Erro ao salvar solicitação');
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      supplier: '',
      status: 'pending',
      expected_date: '',
      requester: '',
      notes: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto-calculate total price
    if (name === 'quantity' || name === 'unit_price') {
      const qty = name === 'quantity' ? parseInt(value) : formData.quantity;
      const price = name === 'unit_price' ? parseFloat(value) : formData.unit_price;
      newFormData.total_price = qty * price;
    }

    setFormData(newFormData);
  };

  const handleEdit = (purchase) => {
    setFormData({
      project_id: purchase.project_id || '',
      description: purchase.description,
      quantity: purchase.quantity,
      unit_price: purchase.unit_price,
      total_price: purchase.total_price,
      supplier: purchase.supplier || '',
      status: purchase.status,
      expected_date: purchase.expected_date || '',
      requester: purchase.requester || '',
      notes: purchase.notes || ''
    });
    setEditingId(purchase.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deletePurchase(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false); // Close edit modal
      loadData();
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  const getProjectName = (id) => {
    const project = projects.find(p => p.id === id);
    return project ? project.name : 'Sem projeto';
  };

  const filteredPurchases = purchases.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterProject !== 'all' && p.project_id !== parseInt(filterProject)) return false;
    return true;
  });

  const statusColors = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    rejected: '#ef4444',
    ordered: '#8b5cf6',
    received: '#10b981'
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    ordered: 'Pedido',
    received: 'Recebido'
  };

  return (
    <div className="purchases">
      <header className="purchases-header">
        <div>
          <h1>Compras & Solicitações</h1>
          <p>Gestão de solicitações de compra</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          resetForm();
          setEditingId(null);
          setShowForm(true);
        }}>
          <Plus size={20} />
          Nova Solicitação
        </button>
      </header>

      <div className="purchases-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="ordered">Pedido</option>
            <option value="received">Recebido</option>
          </select>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="all">Todos os Projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="purchases-form-modal" onClick={() => setShowForm(false)}>
          <div className="purchases-form card" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h3>{editingId ? 'Editar Solicitação' : 'Nova Solicitação'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {editingId && (
                  <button
                    className="btn-icon-small danger"
                    onClick={() => handleDelete(editingId)}
                    title="Excluir Solicitação"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Projeto</label>
                <select
                  name="project_id"
                  className="input"
                  value={formData.project_id}
                  onChange={handleChange}
                >
                  <option value="">Sem Projeto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Descrição *</label>
                <input
                  type="text"
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Cabos elétricos 10mm"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Quantidade *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="input"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Preço Unitário *</label>
                  <input
                    type="number"
                    name="unit_price"
                    className="input"
                    value={formData.unit_price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Total</label>
                  <input
                    type="number"
                    name="total_price"
                    className="input"
                    value={formData.total_price}
                    readOnly
                    style={{ background: '#f1f5f9' }}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Fornecedor</label>
                  <input
                    type="text"
                    name="supplier"
                    className="input"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Solicitante</label>
                  <input
                    type="text"
                    name="requester"
                    className="input"
                    value={formData.requester}
                    onChange={handleChange}
                    placeholder="Quem está solicitando"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Status</label>
                  <select
                    name="status"
                    className="input"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                    <option value="ordered">Pedido</option>
                    <option value="received">Recebido</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Data Esperada</label>
                  <input
                    type="date"
                    name="expected_date"
                    className="input"
                    value={formData.expected_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Observações</label>
                <textarea
                  name="notes"
                  className="input"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Detalhes adicionais..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="purchases-grid">
        {loading ? (
          <div className="loading">Carregando solicitações...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="empty-state card">
            <ShoppingCart size={48} color="#94a3b8" />
            <p>Nenhuma solicitação de compra encontrada.</p>
          </div>
        ) : (
          filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="purchase-card card clickable"
              onClick={() => handleEdit(purchase)}
              style={{ cursor: 'pointer' }}
            >
              <div className="purchase-card-header">
                <div>
                  <h3>{purchase.description}</h3>
                  {purchase.project_id && (
                    <p className="purchase-project">{getProjectName(purchase.project_id)}</p>
                  )}
                </div>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${statusColors[purchase.status]}20`,
                    color: statusColors[purchase.status]
                  }}
                >
                  {statusLabels[purchase.status]}
                </span>
              </div>
              <div className="purchase-card-body">
                <div className="purchase-info">
                  <div className="info-row">
                    <strong>Quantidade:</strong> {purchase.quantity}
                  </div>
                  <div className="info-row">
                    <strong>Preço Unit:</strong> R$ {purchase.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="info-row">
                    <strong>Total:</strong> R$ {purchase.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {purchase.supplier && (
                    <div className="info-row">
                      <strong>Fornecedor:</strong> {purchase.supplier}
                    </div>
                  )}
                  {purchase.requester && (
                    <div className="info-row">
                      <strong>Solicitante:</strong> {purchase.requester}
                    </div>
                  )}
                  {purchase.expected_date && (
                    <div className="info-row">
                      <strong>Data Esperada:</strong> {new Date(purchase.expected_date).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                {purchase.notes && (
                  <div className="purchase-notes">
                    <strong>Observações:</strong>
                    <p>{purchase.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta solicitação de compra?"
      />
    </div>
  );
};

export default Purchases;
