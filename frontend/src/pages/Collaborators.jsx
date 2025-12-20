import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Users, Mail, Phone, Briefcase, FileText, IdCard, Search, AlertTriangle, CheckCircle, Clock, GraduationCap, Award } from 'lucide-react';
import api, {
  getCollaborators, createCollaborator, updateCollaborator, deleteCollaborator,
  getCertifications, createCertification, deleteCertification,
  getCollaboratorEducation, createCollaboratorEducation, deleteCollaboratorEducation,
  getCollaboratorReviews, createCollaboratorReview, deleteCollaboratorReview, getCollaboratorPerformance
} from '../services/api'; import { Star, UserCheck, Shield, Clock as ClockIcon, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Teams from './Teams';
import ConfirmModal from '../components/ConfirmModal';
import './Clients.css';

const Collaborators = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('collaborators', 'edit');
  const [viewMode, setViewMode] = useState('collaborators'); // 'collaborators' or 'teams'
  const teamsRef = useRef();
  const [collaborators, setCollaborators] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'certifications'

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'collaborator' or 'certification'

  const [formData, setFormData] = useState({
    registration_number: '',
    name: '',
    cpf: '',
    rg: '',
    email: '',
    phone: '',
    salary: '',

    role_id: '',
    role: '',
    team_id: '',
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

  // Education State
  const [educationList, setEducationList] = useState([]);
  const [eduFormData, setEduFormData] = useState({
    type: 'ACADEMIC', // ACADEMIC, TECHNICAL, CERTIFICATION
    institution: '',
    course_name: '',
    conclusion_date: '',
    attachment_url: '',
  });

  // Performance State
  const [reviewsList, setReviewsList] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [reviewFormData, setReviewFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    score_technical: 5,
    score_safety: 5,
    score_punctuality: 5,
    comments: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');

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
      const [collabsRes, rolesRes, teamsRes] = await Promise.all([
        getCollaborators(),
        api.get('/roles/roles'),
        api.get('/teams/teams')
      ]);
      setCollaborators(collabsRes.data);
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEducation = async (collaboratorId) => {
    try {
      const res = await getCollaboratorEducation(collaboratorId);
      setEducationList(res.data);
    } catch (error) {
      console.error('Error loading education:', error);
    }
  };

  const loadReviews = async (collaboratorId) => {
    try {
      const res = await getCollaboratorReviews(collaboratorId);
      setReviewsList(res.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadPerformance = async (collaboratorId) => {
    try {
      const res = await getCollaboratorPerformance(collaboratorId);
      setPerformanceStats(res.data);
    } catch (error) {
      console.error('Error loading performance:', error);
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
        ...formData,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
        team_id: formData.team_id ? parseInt(formData.team_id) : null,
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

  const handleEduSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCollaboratorEducation({
        ...eduFormData,
        collaborator_id: editingId
      });
      setEduFormData({ type: 'ACADEMIC', institution: '', course_name: '', conclusion_date: '', attachment_url: '' });
      loadEducation(editingId);
    } catch (error) {
      console.error('Error saving education:', error);
      alert('Erro ao salvar formação');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCollaboratorReview({
        ...reviewFormData,
        collaborator_id: editingId
      });
      setReviewFormData({
        date: new Date().toISOString().split('T')[0],
        score_technical: 5,
        score_safety: 5,
        score_punctuality: 5,
        comments: ''
      });
      loadReviews(editingId);
      loadPerformance(editingId);
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Erro ao salvar avaliação');
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
      registration_number: collaborator.registration_number || '',
      name: collaborator.name,
      cpf: collaborator.cpf || '',
      rg: collaborator.rg || '',
      email: collaborator.email || '',
      phone: collaborator.phone || '',
      salary: collaborator.salary || '',

      role_id: collaborator.role_id || '',
      role: collaborator.role || '',
      team_id: collaborator.team_id || '',
      cnh_number: collaborator.cnh_number || '',
      cnh_category: collaborator.cnh_category || '',
      cnh_validity: collaborator.cnh_validity || '',
    });
    setEditingId(collaborator.id);
    setActiveTab('general');
    loadCertifications(collaborator.id);
    loadEducation(collaborator.id);
    loadReviews(collaborator.id);
    loadPerformance(collaborator.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'collaborator') {
        await deleteCollaborator(itemToDelete);
        setShowForm(false); // Close modal if deleting the currently edited item (though usually called from list)
        loadData();
      } else if (deleteType === 'certification') {
        await deleteCertification(itemToDelete);
        loadCertifications(editingId);
      } else if (deleteType === 'education') {
        await deleteCollaboratorEducation(itemToDelete);
        loadEducation(editingId);
      } else if (deleteType === 'review') {
        await deleteCollaboratorReview(itemToDelete);
        loadReviews(editingId);
        loadPerformance(editingId);
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
      registration_number: '', name: '', cpf: '', rg: '', email: '', phone: '', salary: '', role_id: '', role: '', team_id: '',
      cnh_number: '', cnh_category: '', cnh_validity: '',
    });
    setCertFormData({ name: '', type: 'NR', validity: '' });
    setCertifications([]);
    setActiveTab('general');
    setEducationList([]);
    setEduFormData({ type: 'ACADEMIC', institution: '', course_name: '', conclusion_date: '', attachment_url: '' });
    setReviewsList([]);
    setPerformanceStats(null);
    setReviewFormData({
      date: new Date().toISOString().split('T')[0],
      score_technical: 5,
      score_safety: 5,
      score_punctuality: 5,
      comments: ''
    });
  };

  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collaborator.email && collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collaborator.cpf && collaborator.cpf.includes(searchTerm)) ||
      (collaborator.registration_number && collaborator.registration_number.includes(searchTerm));
    (collaborator.cpf && collaborator.cpf.includes(searchTerm));
    const matchesRole = selectedRoleFilter ? collaborator.role_id === parseInt(selectedRoleFilter) : true;
    const matchesTeam = selectedTeamFilter ? collaborator.team_id === parseInt(selectedTeamFilter) : true;
    return matchesSearch && matchesRole && matchesTeam;
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

          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center', alignSelf: 'flex-start', marginTop: '1rem' }}>
            <div className="tab-switcher-container">
              <div className={`tab-glider ${viewMode === 'collaborators' ? 'left' : 'right'}`} style={{ transform: viewMode === 'collaborators' ? 'translateX(0)' : 'translateX(100%)' }} />
              <button
                className={`tab-btn ${viewMode === 'collaborators' ? 'active' : ''}`}
                onClick={() => setViewMode('collaborators')}
              >
                <Users size={18} />
                Colaboradores
              </button>
              <button
                className={`tab-btn ${viewMode === 'teams' ? 'active' : ''}`}
                onClick={() => setViewMode('teams')}
              >
                <Users size={18} />
                Times
              </button>
            </div>

            {canEdit && (
              <button className="btn btn-primary" onClick={() => {
                if (viewMode === 'collaborators') {
                  setEditingId(null);
                  resetForm();
                  setShowForm(true);
                } else {
                  teamsRef.current?.openForm();
                }
              }}>
                <Plus size={20} />
                {viewMode === 'collaborators' ? 'Novo Colaborador' : 'Novo Time'}
              </button>
            )}
          </div>
        </div>

        {viewMode === 'collaborators' && (
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
            <div className="filter-team" style={{ minWidth: '200px' }}>
              <select
                className="input"
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Todos os Times</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {showForm && (
        <div className="clients-form-modal">
          <div className="clients-form card" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
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
                      <button
                        onClick={() => setActiveTab('education')}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: activeTab === 'education' ? 'white' : 'transparent',
                          color: activeTab === 'education' ? '#0f172a' : '#64748b',
                          fontWeight: activeTab === 'education' ? '600' : '500',
                          boxShadow: activeTab === 'education' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Formação/Cursos
                      </button>
                      <button
                        onClick={() => setActiveTab('performance')}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: activeTab === 'performance' ? 'white' : 'transparent',
                          color: activeTab === 'performance' ? '#0f172a' : '#64748b',
                          fontWeight: activeTab === 'performance' ? '600' : '500',
                          boxShadow: activeTab === 'performance' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Desempenho
                      </button>
                    </div>
                    {canEdit && (
                      <button
                        className="btn-icon-small danger"
                        onClick={() => handleDelete(editingId)}
                        title="Excluir Colaborador"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {activeTab === 'general' ? (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Matrícula</label>
                    <input type="text" name="registration_number" className="input" value={formData.registration_number} onChange={handleChange} placeholder="000000" />
                  </div>
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
                    <label className="label">Time / Departamento</label>
                    <select name="team_id" className="input" value={formData.team_id} onChange={handleChange}>
                      <option value="">Selecione um time</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
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
                  {canEdit && <button type="submit" className="btn btn-primary">Salvar</button>}
                </div>
              </form>
            ) : activeTab === 'certifications' ? (
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
                    {canEdit && (
                      <div className="form-group">
                        <label className="label">&nbsp;</label>
                        <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '100%' }} title="Adicionar">
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
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
                            {canEdit && (
                              <button
                                className="btn-icon-small danger"
                                onClick={() => handleDelete(cert.id, 'certification')}
                                title="Excluir certificação"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
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
            ) : activeTab === 'education' ? (
              <div className="education-tab">
                <form onSubmit={handleEduSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#475569' }}>Adicionar Formação ou Curso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="label">Tipo</label>
                      <select
                        className="input"
                        value={eduFormData.type}
                        onChange={(e) => setEduFormData({ ...eduFormData, type: e.target.value })}
                      >
                        <option value="ACADEMIC">Escolaridade/Acadêmico</option>
                        <option value="TECHNICAL">Curso Técnico</option>
                        <option value="CERTIFICATION">Certificação (Ex: CCURE)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Instituição</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ex: USP, SENAI..."
                        value={eduFormData.institution}
                        onChange={(e) => setEduFormData({ ...eduFormData, institution: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Curso</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ex: Engenharia..."
                        value={eduFormData.course_name}
                        onChange={(e) => setEduFormData({ ...eduFormData, course_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Conclusão</label>
                      <input
                        type="date"
                        className="input"
                        value={eduFormData.conclusion_date}
                        onChange={(e) => setEduFormData({ ...eduFormData, conclusion_date: e.target.value })}
                        required
                      />
                    </div>
                    {canEdit && (
                      <div className="form-group">
                        <label className="label">&nbsp;</label>
                        <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '100%' }} title="Adicionar">
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="label">Link do Certificado (Opcional)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Cole a URL do documento..."
                      value={eduFormData.attachment_url}
                      onChange={(e) => setEduFormData({ ...eduFormData, attachment_url: e.target.value })}
                    />
                  </div>
                </form>

                <div className="education-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {educationList.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>Nenhuma formação cadastrada.</p>
                  ) : (
                    [...educationList].sort((a, b) => new Date(b.conclusion_date) - new Date(a.conclusion_date))
                      .map(edu => (
                        <div key={edu.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '8px',
                              background: edu.type === 'ACADEMIC' ? '#eff6ff' : '#f0fdf4',
                              color: edu.type === 'ACADEMIC' ? '#2563eb' : '#16a34a',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {edu.type === 'ACADEMIC' ? <GraduationCap size={20} /> : <Award size={20} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{edu.course_name}</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {edu.institution} • Concluído em {new Date(edu.conclusion_date).getFullYear()}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {edu.attachment_url && (
                              <a href={edu.attachment_url} target="_blank" rel="noopener noreferrer"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500'
                                }}>
                                <FileText size={14} />
                                Ver Certificado
                              </a>
                            )}
                            {canEdit && (
                              <button
                                className="btn-icon-small danger"
                                onClick={() => handleDelete(edu.id, 'education')}
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Fechar</button>
                </div>
              </div>
            ) : (
              <div className="performance-tab">
                {/* 1. Dashboard (Stats) */}
                <div className="stats-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Média Técnica', value: performanceStats?.avg_technical, icon: Star },
                    { label: 'Segurança/EPI', value: performanceStats?.avg_safety, icon: Shield },
                    { label: 'Pontualidade', value: performanceStats?.avg_punctuality, icon: ClockIcon },
                    { label: 'Média Geral', value: performanceStats?.avg_general, icon: TrendingUp }
                  ].map((stat, index) => {
                    const val = stat.value || 0;
                    let color = '#64748b'; // default
                    let bg = '#f1f5f9';
                    if (val >= 4) { color = '#10b981'; bg = '#ecfdf5'; } // Green
                    else if (val >= 2.5) { color = '#f59e0b'; bg = '#fffbeb'; } // Yellow
                    else if (val > 0) { color = '#ef4444'; bg = '#fef2f2'; } // Red

                    return (
                      <div key={index} style={{ background: bg, padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${color}30` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, marginBottom: '0.5rem' }}>
                          <stat.icon size={18} />
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{stat.label}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                          {val > 0 ? val.toFixed(1) : '-'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Últimos 12 meses</div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Add Review Form */}
                {canEdit && (
                  <form onSubmit={handleReviewSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>Nova Avaliação Mensal</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="label">Data Competência</label>
                        <input
                          type="date"
                          className="input"
                          value={reviewFormData.date}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Qualidade Técnica (1-5)</label>
                        <select
                          className="input"
                          value={reviewFormData.score_technical}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, score_technical: parseInt(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="label">Segurança/EPI (1-5)</label>
                        <select
                          className="input"
                          value={reviewFormData.score_safety}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, score_safety: parseInt(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="label">Assiduidade (1-5)</label>
                        <select
                          className="input"
                          value={reviewFormData.score_punctuality}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, score_punctuality: parseInt(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="label">Observações / Feedback</label>
                      <textarea
                        className="input"
                        rows="2"
                        placeholder="Descreva pontos positivos, negativos ou advertências..."
                        value={reviewFormData.comments}
                        onChange={(e) => setReviewFormData({ ...reviewFormData, comments: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button type="submit" className="btn btn-primary">
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        Adicionar Avaliação
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. Timeline List */}
                <div className="reviews-timeline">
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>Histórico de Avaliações</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviewsList.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', background: '#f8fafc', borderRadius: '0.5rem' }}>Nenhuma avaliação registrada.</p>
                    ) : (
                      reviewsList.map(review => (
                        <div key={review.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>
                                Competência: {new Date(review.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                <UserCheck size={14} />
                                Avaliado por: <span style={{ fontWeight: '500' }}>{review.reviewer_name}</span>
                              </div>
                            </div>
                            {canEdit && (
                              <button
                                className="btn-icon-small danger"
                                onClick={() => handleDelete(review.id, 'review')}
                                title="Excluir Avaliação"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.5rem', color: '#475569', fontSize: '0.85rem' }}>
                            <div title="Qualidade Técnica">
                              <strong>Técnica:</strong> {review.score_technical}/5 <Star size={12} fill="#f59e0b" color="#f59e0b" style={{ display: 'inline', marginLeft: '2px' }} />
                            </div>
                            <div title="Segurança e EPI">
                              <strong>Segurança:</strong> {review.score_safety}/5 <Shield size={12} fill="#10b981" color="#10b981" style={{ display: 'inline', marginLeft: '2px' }} />
                            </div>
                            <div title="Assiduidade e Pontualidade">
                              <strong>Assiduidade:</strong> {review.score_punctuality}/5 <ClockIcon size={12} fill="#3b82f6" color="#3b82f6" style={{ display: 'inline', marginLeft: '2px' }} />
                            </div>
                          </div>

                          {review.comments && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>
                              "{review.comments}"
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'teams' ? (
        <Teams ref={teamsRef} embedded={true} />
      ) : (
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
                  {collaborator.registration_number && (
                    <div className="detail-item">
                      <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem', marginRight: '4px' }}>#</span>
                      <span>{collaborator.registration_number}</span>
                    </div>
                  )}
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
      )
      }

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir este ${deleteType === 'collaborator' ? 'colaborador' : 'item'}? Esta ação não pode ser desfeita.`}
      />
    </div >
  );
};

export default Collaborators;
