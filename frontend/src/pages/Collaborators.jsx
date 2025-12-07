import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Users, Mail, Phone, Briefcase, FileText, IdCard, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api, {
  getCollaborators, createCollaborator, updateCollaborator, deleteCollaborator,
  getCertifications, createCertification, deleteCertification
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Clients.css';

const Collaborators = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'certifications'

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'collaborator' or 'certification'

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    rg: '',
    email: '',
    phone: '',
    salary: '',
    role_id: '',
    role: '',
    // CNH Data
    cnh_number: '',
    cnh_category: '',
    cnh_validity: '',
  });

  // Certification State
  const [certifications, setCertifications] = useState([]);
  const [certFormData, setCertFormData] = useState({
    name: '',
    type: 'NR', // NR, ASO, TRAINING
    validity: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      const [collabsRes, rolesRes] = await Promise.all([
        getCollaborators(),
        api.get('/roles/roles')
      ]);
      setCollaborators(collabsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCertifications = async (collaboratorId) => {
    try {
      const res = await getCertifications(collaboratorId);
      setCertifications(res.data);
    } catch (error) {
      console.error('Error loading certifications:', error);
    }
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return numbers.replace(/(\d{3})(\d)/, '$1.$2');
    if (numbers.length <= 9) return numbers.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4').slice(0, 14);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return numbers.replace(/(\d{2})(\d)/, '($1) $2');
    if (numbers.length <= 10) return numbers.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const formatRG = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return numbers.replace(/(\d{2})(\d)/, '$1.$2');
    if (numbers.length <= 8) return numbers.replace(/(\d{2})(\d{3})(\d)/, '$1.$2.$3');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4').slice(0, 12);
  };

  const formatMoney = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
        cnh_validity: formData.cnh_validity || null, // Fix: Send null instead of empty string
      };

      if (editingId) {
        await updateCollaborator(editingId, dataToSend);
      } else {
        await createCollaborator(dataToSend);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving collaborator:', error);
      alert('Erro ao salvar colaborador');
    }
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCertification({
        ...certFormData,
        collaborator_id: editingId
      });
      setCertFormData({ name: '', type: 'NR', validity: '' });
      loadCertifications(editingId);
    } catch (error) {
      console.error('Error saving certification:', error);
      alert('Erro ao salvar certificação');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = formatCPF(value);
    else if (name === 'phone') formattedValue = formatPhone(value);
    else if (name === 'rg') formattedValue = formatRG(value);
    else if (name === 'salary') formattedValue = formatMoney(value);
    else if (name === 'role_id') {
      const selectedRole = roles.find(r => r.id === parseInt(value));
      setFormData({
        ...formData,
        role_id: value,
        role: selectedRole ? selectedRole.name : '',
      });
      return;
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const handleDelete = (id, type = 'collaborator') => {
    setItemToDelete(id);
    setDeleteType(type);
    setShowConfirmModal(true);
  };

  const handleEdit = (collaborator) => {
    setFormData({
      name: collaborator.name,
      cpf: collaborator.cpf || '',
      rg: collaborator.rg || '',
      email: collaborator.email || '',
      phone: collaborator.phone || '',
      salary: collaborator.salary || '',
      role_id: collaborator.role_id || '',
      role: collaborator.role || '',
      cnh_number: collaborator.cnh_number || '',
      cnh_category: collaborator.cnh_category || '',
      cnh_validity: collaborator.cnh_validity || '',
    });
    setEditingId(collaborator.id);
    setActiveTab('general');
    loadCertifications(collaborator.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'collaborator') {
        await deleteCollaborator(itemToDelete);
        setShowForm(false); // Close modal if deleting the currently edited item (though usually called from list)
        loadData();
      } else {
        await deleteCertification(itemToDelete);
        loadCertifications(editingId);
      }
      setShowConfirmModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erro ao excluir item');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', cpf: '', rg: '', email: '', phone: '', salary: '', role_id: '', role: '',
      cnh_number: '', cnh_category: '', cnh_validity: '',
    });
    setCertFormData({ name: '', type: 'NR', validity: '' });
    setCertifications([]);
    setActiveTab('general');
  };

  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collaborator.email && collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collaborator.cpf && collaborator.cpf.includes(searchTerm));
    const matchesRole = selectedRoleFilter ? collaborator.role_id === parseInt(selectedRoleFilter) : true;
    return matchesSearch && matchesRole;
  });

  const getValidityStatus = (dateString) => {
    const today = new Date();
    const validity = new Date(dateString);
    const diffTime = validity - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: '#ef4444', text: 'Vencido', icon: AlertTriangle };
    if (diffDays <= 60) return { color: '#f59e0b', text: 'Vence em breve', icon: Clock };
    return { color: '#10b981', text: 'Válido', icon: CheckCircle };
  };

  return (
    <div className="clients">
      <header className="clients-header">
        <div className="header-content">
          <div>
            <h1>Gestão de Colaboradores</h1>
            <p>Cadastro e controle de equipe</p>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            resetForm();
            setShowForm(true);
          }} style={{ marginTop: '1rem' }}>
            <Plus size={20} />
            Novo Colaborador
          </button>
        </div>

        <div className="filters-bar" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-input-container" style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="input"
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
          <div className="filter-role" style={{ minWidth: '200px' }}>
            <select
              className="input"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Todas as Funções</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {showForm && (
        <div className="clients-form-modal">
          <div className="clients-form card" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingId ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {editingId && (
                  <>
                    <div className="tab-switcher" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => setActiveTab('general')}
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
                        onClick={() => setActiveTab('certifications')}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: activeTab === 'certifications' ? 'white' : 'transparent',
                          color: activeTab === 'certifications' ? '#0f172a' : '#64748b',
                          fontWeight: activeTab === 'certifications' ? '600' : '500',
                          boxShadow: activeTab === 'certifications' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Certificações (NR/ASO)
                      </button>
                    </div>
                    <button
                      className="btn-icon-small danger"
                      onClick={() => handleDelete(editingId)}
                      title="Excluir Colaborador"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {activeTab === 'general' ? (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Nome Completo *</label>
                    <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} required placeholder="Nome completo" />
                  </div>
                  <div className="form-group">
                    <label className="label">CPF</label>
                    <input type="text" name="cpf" className="input" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label className="label">RG</label>
                    <input type="text" name="rg" className="input" value={formData.rg} onChange={handleChange} placeholder="00.000.000-0" />
                  </div>
                  <div className="form-group">
                    <label className="label">Cargo *</label>
                    <select name="role_id" className="input" value={formData.role_id} onChange={handleChange} required>
                      <option value="">Selecione um cargo</option>
                      {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input type="email" name="email" className="input" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
                  </div>
                  <div className="form-group">
                    <label className="label">Telefone</label>
                    <input type="tel" name="phone" className="input" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="form-group">
                    <label className="label">Salário</label>
                    <input type="text" name="salary" className="input" value={formData.salary} onChange={handleChange} placeholder="0,00" />
                  </div>
                </div>

                <h4 style={{ margin: '1.5rem 0 1rem', fontSize: '1rem', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Dados da CNH
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Número CNH</label>
                    <input type="text" name="cnh_number" className="input" value={formData.cnh_number} onChange={handleChange} placeholder="Número da CNH" />
                  </div>
                  <div className="form-group">
                    <label className="label">Categoria</label>
                    <input type="text" name="cnh_category" className="input" value={formData.cnh_category} onChange={handleChange} placeholder="Ex: AB" />
                  </div>
                  <div className="form-group">
                    <label className="label">Validade CNH</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="date" name="cnh_validity" className="input" value={formData.cnh_validity} onChange={handleChange} />
                      {formData.cnh_validity && (() => {
                        const status = getValidityStatus(formData.cnh_validity);
                        const Icon = status.icon;
                        return (
                          <div title={status.text} style={{ color: status.color, display: 'flex', alignItems: 'center' }}>
                            <Icon size={20} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            ) : (
              <div className="certifications-tab">
                <form onSubmit={handleCertSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#475569' }}>Adicionar Nova Certificação</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="label">Nome</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ex: NR-10, ASO..."
                        value={certFormData.name}
                        onChange={(e) => setCertFormData({ ...certFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Tipo</label>
                      <select
                        className="input"
                        value={certFormData.type}
                        onChange={(e) => setCertFormData({ ...certFormData, type: e.target.value })}
                      >
                        <option value="NR">NR</option>
                        <option value="ASO">ASO</option>
                        <option value="TRAINING">Treinamento</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Validade</label>
                      <input
                        type="date"
                        className="input"
                        value={certFormData.validity}
                        onChange={(e) => setCertFormData({ ...certFormData, validity: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
                      <Plus size={18} />
                    </button>
                  </div>
                </form>

                <div className="certifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {certifications.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>Nenhuma certificação cadastrada.</p>
                  ) : (
                    [...certifications].sort((a, b) => {
                      // Custom order for types
                      const typeOrder = { 'NR': 1, 'ASO': 2, 'TRAINING': 3 };
                      const typeDiff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);

                      if (typeDiff !== 0) return typeDiff;

                      // Alphabetical order for name
                      return a.name.localeCompare(b.name);
                    }).map(cert => {
                      const status = getValidityStatus(cert.validity);
                      const StatusIcon = status.icon;

                      return (
                        <div key={cert.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '6px',
                              background: cert.type === 'NR' ? '#e0f2fe' : cert.type === 'ASO' ? '#fce7f3' : '#dcfce7',
                              color: cert.type === 'NR' ? '#0369a1' : cert.type === 'ASO' ? '#be185d' : '#15803d',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem'
                            }}>
                              {cert.type}
                            </div>
                            <div>
                              <div style={{ fontWeight: '500', color: '#0f172a' }}>{cert.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Vence em: {new Date(cert.validity).toLocaleDateString('pt-BR')}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: status.color, fontSize: '0.85rem', fontWeight: '500' }}>
                              <StatusIcon size={14} />
                              {status.text}
                            </div>
                            <button
                              className="btn-icon-small danger"
                              onClick={() => handleDelete(cert.id, 'certification')}
                              title="Excluir certificação"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="clients-grid">
        {loading ? (
          <div className="loading">Carregando colaboradores...</div>
        ) : filteredCollaborators.length === 0 ? (
          <div className="empty-state card">
            <Users size={48} color="#94a3b8" />
            <p>{collaborators.length === 0 ? "Nenhum colaborador cadastrado ainda." : "Nenhum colaborador encontrado com os filtros atuais."}</p>
          </div>
        ) : (
          filteredCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="client-card card clickable"
              onClick={() => handleEdit(collaborator)}
              style={{ cursor: 'pointer' }}
            >
              <div className="client-card-header">
                <div className="client-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <Users size={24} />
                </div>
              </div>
              <h3 className="client-name">{collaborator.name}</h3>
              <p className="client-cnpj">
                <Briefcase size={14} style={{ display: 'inline', marginRight: '6px' }} />
                {collaborator.role}
              </p>
              {collaborator.cnh_validity && (
                (() => {
                  const status = getValidityStatus(collaborator.cnh_validity);
                  if (status.text !== 'Válido') {
                    return (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: status.color, fontWeight: '500' }}>
                        <status.icon size={14} />
                        <span>CNH: {status.text}</span>
                      </div>
                    )
                  }
                  return null;
                })()
              )}
              <div className="client-details">
                {collaborator.cpf && (
                  <div className="detail-item">
                    <IdCard size={16} color="#64748b" />
                    <span>{collaborator.cpf}</span>
                  </div>
                )}
                {collaborator.email && (
                  <div className="detail-item">
                    <Mail size={16} color="#64748b" />
                    <span>{collaborator.email}</span>
                  </div>
                )}
                {collaborator.phone && (
                  <div className="detail-item">
                    <Phone size={16} color="#64748b" />
                    <span>{collaborator.phone}</span>
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
        message={`Tem certeza que deseja excluir este ${deleteType === 'collaborator' ? 'colaborador' : 'item'}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default Collaborators;
