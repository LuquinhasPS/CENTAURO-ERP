import { useState, useEffect } from 'react';
import { Plus, Trash2, Ticket as TicketIcon, AlertCircle, Edit } from 'lucide-react';
import { getTickets, createTicket, deleteTicket, updateTicket, getContracts } from '../services/api';
import ConfirmModal from '../components/shared/ConfirmModal';
import Modal from '../components/shared/Modal';
import './Tickets.css';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    contract_id: '',
    title: '',
    status: 'OPEN',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    loadTickets();
    loadContracts();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await getTickets();
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        contract_id: parseInt(formData.contract_id),
      };

      if (editingId) {
        await updateTicket(editingId, dataToSend);
      } else {
        await createTicket(dataToSend);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        contract_id: '',
        title: '',
        status: 'OPEN',
        priority: 'MEDIUM',
      });
      loadTickets();
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Erro ao salvar ticket: ' + error.response?.data?.detail);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleEdit = (ticket) => {
    setFormData({
      contract_id: ticket.contract_id.toString(),
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
    });
    setEditingId(ticket.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTicket(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false); // Close edit modal
      loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Erro ao excluir ticket');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: { bg: '#3b82f615', color: '#3b82f6' },
      IN_PROGRESS: { bg: '#f59e0b15', color: '#f59e0b' },
      RESOLVED: { bg: '#10b98115', color: '#10b981' },
      CLOSED: { bg: '#64748b15', color: '#64748b' },
    };
    return colors[status] || colors.OPEN;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: { bg: '#10b98115', color: '#10b981' },
      MEDIUM: { bg: '#f59e0b15', color: '#f59e0b' },
      HIGH: { bg: '#ef444415', color: '#ef4444' },
      CRITICAL: { bg: '#dc262615', color: '#dc2626' },
    };
    return colors[priority] || colors.MEDIUM;
  };

  const getStatusLabel = (status) => {
    const labels = {
      OPEN: 'Aberto',
      IN_PROGRESS: 'Em Andamento',
      RESOLVED: 'Resolvido',
      CLOSED: 'Fechado',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };
    return labels[priority] || priority;
  };

  return (
    <div className="tickets">
      <header className="tickets-header">
        <div>
          <h1>Gestão de Tickets</h1>
          <p>Chamados de manutenção e suporte</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          Novo Ticket
        </button>
      </header>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Ticket' : 'Criar Ticket'}
        maxWidth="1000px"
        headerActions={
          editingId && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDelete(editingId)}
              title="Excluir Ticket"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="label">Título *</label>
              <input
                type="text"
                name="title"
                className="input"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Descreva o problema"
              />
            </div>
            <div className="form-group full-width">
              <label className="label">Contrato *</label>
              <select
                name="contract_id"
                className="input"
                value={formData.contract_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Prioridade *</label>
              <select
                name="priority"
                className="input"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Status *</label>
              <select
                name="status"
                className="input"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
              </select>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Salvar Ticket' : 'Criar Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="tickets-grid">
        {loading ? (
          <div className="loading">Carregando tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="empty-state card">
            <AlertCircle size={48} color="#94a3b8" />
            <p>Nenhum ticket cadastrado ainda.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-card card clickable"
              onClick={() => handleEdit(ticket)}
              style={{ cursor: 'pointer' }}
            >
              <div className="ticket-header">
                <div className="ticket-icon">
                  <TicketIcon size={20} />
                </div>
                <div className="ticket-badges">
                  <span
                    className="badge"
                    style={getPriorityColor(ticket.priority)}
                  >
                    {getPriorityLabel(ticket.priority)}
                  </span>
                  <span
                    className="badge"
                    style={getStatusColor(ticket.status)}
                  >
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
              </div>
              <h3 className="ticket-title">{ticket.title}</h3>
              <p className="ticket-id">#{ticket.id}</p>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Tickets;
