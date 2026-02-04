import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Users, MapPin, Phone, Mail, Search, UserPlus, Building2 } from 'lucide-react';
import api, { getClients, createClient, deleteClient, updateClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import Input from '../components/shared/Input';
import Select from '../components/shared/Select';
import Button from '../components/shared/Button';
import './Clients.css';

// Department colors
const DEPARTMENT_COLORS = {
  'Comercial': { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
  'Engenharia': { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  'Financeiro': { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
  'RH': { bg: '#f3e8ff', color: '#9333ea', border: '#d8b4fe' },
  'Suporte': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  'Diretoria': { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  'Geral': { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

const DEPARTMENTS = ['Comercial', 'Engenharia', 'Financeiro', 'RH', 'Suporte', 'Diretoria', 'Geral'];

const Clients = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('clients', 'edit');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    client_number: '',
    cnpj: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  // Contacts State
  const [contacts, setContacts] = useState([]);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Geral',
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

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
      setEditingClient(null);
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
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return numbers.replace(/(\d{2})(\d)/, '$1.$2');
    if (numbers.length <= 8) return numbers.replace(/(\d{2})(\d{3})(\d)/, '$1.$2.$3');
    if (numbers.length <= 12) return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return numbers.replace(/(\d{2})(\d)/, '($1) $2');
    if (numbers.length <= 10) return numbers.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const handleDelete = (id, type = 'client') => {
    setItemToDelete(id);
    setDeleteType(type);
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
    setEditingClient(client);
    setContacts(client.contacts || []);
    setActiveTab('general');
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'contact') {
        await api.delete(`/commercial/clients/contacts/${itemToDelete}`);
        setContacts(contacts.filter(c => c.id !== itemToDelete));
        loadClients();
      } else {
        await deleteClient(itemToDelete);
        setShowForm(false);
        loadClients();
      }
      setShowConfirmModal(false);
      setItemToDelete(null);
      setDeleteType(null);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Erro ao excluir');
    }
  };

  // Contact CRUD
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContactId) {
        await api.put(`/commercial/clients/contacts/${editingContactId}`, contactFormData);
      } else {
        await api.post(`/commercial/clients/${editingId}/contacts`, contactFormData);
      }
      // Reload client to get updated contacts
      const res = await getClients();
      const updatedClient = res.data.find(c => c.id === editingId);
      if (updatedClient) {
        setContacts(updatedClient.contacts || []);
        setEditingClient(updatedClient);
      }
      setContactFormData({ name: '', email: '', phone: '', department: 'Geral' });
      setShowContactForm(false);
      setEditingContactId(null);
      loadClients();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Erro ao salvar contato');
    }
  };

  const handleEditContact = (contact) => {
    setContactFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      department: contact.department || 'Geral',
    });
    setEditingContactId(contact.id);
    setShowContactForm(true);
  };

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      (client.email && client.email.toLowerCase().includes(term)) ||
      (client.phone && client.phone.includes(term)) ||
      (client.cnpj && client.cnpj.includes(term)) ||
      (client.contact_person && client.contact_person.toLowerCase().includes(term))
    );
  });

  const getDeptStyle = (dept) => DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS['Geral'];

  const columns = [
    { header: 'Cod', accessor: 'client_number', render: row => <span className="font-bold">#{row.client_number}</span> },
    { header: 'Nome / Razão Social', accessor: 'name' },
    { header: 'CNPJ', accessor: 'cnpj' },
    { header: 'Email', accessor: 'email', render: row => row.email || '-' },
    { header: 'Telefone', accessor: 'phone', render: row => row.phone || '-' },
    { header: 'Contatos', accessor: 'contacts', render: row => row.contacts?.length || 0 },
  ];

  return (
    <div className="clients">
      <header className="clients-header">
        <div>
          <h1>Gestão de Clientes</h1>
          <p>Cadastro e controle de clientes</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setEditingClient(null);
            setContacts([]);
            setFormData({
              name: '',
              client_number: '',
              cnpj: '',
              contact_person: '',
              email: '',
              phone: '',
              address: '',
            });
            setActiveTab('general');
            setShowForm(true);
          }}>
            <Plus size={20} />
            Novo Cliente
          </button>
        )}
      </header>

      {/* Search and Filters Card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nome, email, telefone ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="clients-form-modal">
          {/* Modal content preserved exactly as is, just wrapped or rendered here. 
                Wait, I can't just comment out the modal content in replace_file_content. 
                I need to keep the modal rendering logic. 
                The user instruction says "Replace with <DataTable />: Define columns, Pass data". 
                I will replace the `.clients-grid` block with `<DataTable />`.
            */}
          <div className="clients-form card" style={{ maxWidth: editingId ? '800px' : '600px' }} onClick={(e) => e.stopPropagation()}>
            {/* ... Modal Content Copied/States as is ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {editingId && (
                  <div className="tab-switcher" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('general');
                        setShowContactForm(false);
                        setEditingContactId(null);
                        setContactFormData({ name: '', email: '', phone: '', department: 'Geral' });
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'general' ? 'white' : 'transparent',
                        color: activeTab === 'general' ? '#0f172a' : '#64748b',
                        fontWeight: activeTab === 'general' ? '600' : '500',
                        boxShadow: activeTab === 'general' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Dados Gerais
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('contacts');
                        setShowContactForm(false);
                        setEditingContactId(null);
                        setContactFormData({ name: '', email: '', phone: '', department: 'Geral' });
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'contacts' ? 'white' : 'transparent',
                        color: activeTab === 'contacts' ? '#0f172a' : '#64748b',
                        fontWeight: activeTab === 'contacts' ? '600' : '500',
                        boxShadow: activeTab === 'contacts' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Contatos ({contacts.length})
                    </button>
                  </div>
                )}
                {editingId && canEdit && (
                  <button
                    type="button"
                    className="btn-icon-small danger"
                    onClick={() => handleDelete(editingId, 'client')}
                    title="Excluir Cliente"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'general' && (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <Input label="Nome / Razão Social *" name="name" value={formData.name} onChange={handleChange} required placeholder="Nome do cliente" />
                  <Input label="Número do Cliente" name="client_number" value={formData.client_number} onChange={handleChange} placeholder="Ex: 01, 02, 03..." />
                  <Input label="CNPJ *" name="cnpj" value={formData.cnpj} onChange={handleChange} required placeholder="00.000.000/0000-00" />
                  <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
                  <Input label="Telefone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                  <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} placeholder="Endereço completo" fullWidth />
                </div>
                <div className="form-actions">
                  <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                  {canEdit && <Button variant="primary" type="submit">Salvar Cliente</Button>}
                </div>
              </form>
            )}

            {activeTab === 'contacts' && editingId && (
              <div>
                {/* Add Contact Button */}
                {canEdit && !showContactForm && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setContactFormData({ name: '', email: '', phone: '', department: 'Geral' });
                      setEditingContactId(null);
                      setShowContactForm(true);
                    }}
                    style={{ marginBottom: '1rem' }}
                  >
                    <UserPlus size={18} />
                    Adicionar Contato
                  </button>
                )}

                {/* Contact Form */}
                {showContactForm && (
                  <form onSubmit={handleContactSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#475569' }}>
                      {editingContactId ? 'Editar Contato' : 'Novo Contato'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <Input label="Nome *" value={contactFormData.name} onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })} required placeholder="Nome do contato" />
                      <Select label="Departamento" value={contactFormData.department} onChange={(e) => setContactFormData({ ...contactFormData, department: e.target.value })}>
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </Select>
                      <Input label="Email" type="email" value={contactFormData.email} onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })} placeholder="email@exemplo.com" />
                      <Input label="Telefone" type="tel" value={contactFormData.phone} onChange={(e) => setContactFormData({ ...contactFormData, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <Button variant="primary" type="submit">{editingContactId ? 'Salvar' : 'Adicionar'}</Button>
                      <Button variant="secondary" type="button" onClick={() => { setShowContactForm(false); setEditingContactId(null); }}>Cancelar</Button>
                    </div>
                  </form>
                )}

                {/* Contacts List */}
                {contacts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    <Users size={48} />
                    <p style={{ marginTop: '1rem' }}>Nenhum contato cadastrado ainda.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {contacts.map(contact => {
                      const deptStyle = getDeptStyle(contact.department);
                      return (
                        <div
                          key={contact.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '50%',
                              background: deptStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Building2 size={20} color={deptStyle.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <strong style={{ color: '#0f172a' }}>{contact.name}</strong>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: deptStyle.bg,
                                  color: deptStyle.color,
                                  border: `1px solid ${deptStyle.border}`,
                                  fontWeight: '500'
                                }}>
                                  {contact.department}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                                {contact.email && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Mail size={14} /> {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={14} /> {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn-icon-small"
                                onClick={() => handleEditContact(contact)}
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon-small danger"
                                onClick={() => handleDelete(contact.id, 'contact')}
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredClients}
        actions={false}
        onRowClick={(client) => handleEdit(client)}
      />


      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir este ${deleteType === 'contact' ? 'contato' : 'cliente'}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default Clients;
