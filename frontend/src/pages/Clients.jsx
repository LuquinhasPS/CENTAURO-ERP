import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Users, MapPin, Phone, Mail } from 'lucide-react';
import { getClients, createClient, deleteClient, updateClient } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Clients.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client_number: '',
    cnpj: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForm && !showConfirmModal) {
        setShowForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showConfirmModal]);

  const loadClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateClient(editingId, formData);
      } else {
        await createClient(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        client_number: '',
        cnpj: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente: ' + error.response?.data?.detail);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply formatting masks
    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }

    setFormData({
      ...formData,
      [name]: formattedValue,
    });
  };

  const formatCNPJ = (value) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');

    // Aplica a máscara: 00.000.000/0000-00
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return numbers.replace(/(\d{2})(\d)/, '$1.$2');
    if (numbers.length <= 8) return numbers.replace(/(\d{2})(\d{3})(\d)/, '$1.$2.$3');
    if (numbers.length <= 12) return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const formatPhone = (value) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');

    // Aplica a máscara: (00) 00000-0000 ou (00) 0000-0000
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return numbers.replace(/(\d{2})(\d)/, '($1) $2');
    if (numbers.length <= 10) return numbers.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      client_number: client.client_number || '',
      cnpj: client.cnpj || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteClient(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      setShowForm(false); // Close edit modal if open
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente');
    }
  };

  return (
    <div className="clients">
      <header className="clients-header">
        <div>
          <h1>Gestão de Clientes</h1>
          <p>Cadastro e controle de clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({
            name: '',
            client_number: '',
            cnpj: '',
            contact_person: '',
            email: '',
            phone: '',
            address: '',
          });
          setShowForm(true);
        }}>
          <Plus size={20} />
          Novo Cliente
        </button>
      </header>

      {showForm && (
        <div className="clients-form-modal" onClick={() => setShowForm(false)}>
          <div className="clients-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Cliente"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Nome / Razão Social *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Número do Cliente</label>
                  <input
                    type="text"
                    name="client_number"
                    className="input"
                    value={formData.client_number}
                    onChange={handleChange}
                    placeholder="Ex: 01, 02, 03..."
                  />
                </div>
                <div className="form-group">
                  <label className="label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    className="input"
                    value={formData.cnpj}
                    onChange={handleChange}
                    required
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Pessoa de Contato</label>
                  <input
                    type="text"
                    name="contact_person"
                    className="input"
                    value={formData.contact_person}
                    onChange={handleChange}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Telefone</label>
                  <input
                    type="tel"
                    name="phone"
                    className="input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Endereço</label>
                  <input
                    type="text"
                    name="address"
                    className="input"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Endereço completo"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="clients-grid">
        {loading ? (
          <div className="loading">Carregando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="empty-state card">
            <Users size={48} color="#94a3b8" />
            <p>Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="client-card card clickable"
              onClick={() => handleEdit(client)}
              style={{ cursor: 'pointer' }}
            >
              <div className="client-card-header">
                <div className="client-icon">
                  <Users size={24} />
                </div>
                {client.client_number && (
                  <span className="client-number-badge">#{client.client_number}</span>
                )}
              </div>
              <h3 className="client-name">{client.name}</h3>
              <p className="client-cnpj">{client.cnpj}</p>
              <div className="client-details">
                {client.contact_person && (
                  <div className="detail-item">
                    <Users size={16} color="#64748b" />
                    <span>{client.contact_person}</span>
                  </div>
                )}
                {client.email && (
                  <div className="detail-item">
                    <Mail size={16} color="#64748b" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="detail-item">
                    <Phone size={16} color="#64748b" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="detail-item">
                    <MapPin size={16} color="#64748b" />
                    <span>{client.address}</span>
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
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Clients;
