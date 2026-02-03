import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Award, GraduationCap, TrendingUp, Calendar, AlertCircle, Shield, Clock, BookOpen, Star, Plus, User, Wrench } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api, {
  createCollaborator, updateCollaborator,
  getCertifications, createCertification, deleteCertification,
  getCollaboratorEducation, createCollaboratorEducation, deleteCollaboratorEducation,
  getCollaboratorReviews, createCollaboratorReview, deleteCollaboratorReview, getCollaboratorPerformance
} from '../../services/api';

const CollaboratorModal = ({ collaborator, onClose, onSuccess, roles = [], teams = [], canEdit = true, onDelete }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: '',
    team_ids: [],
    phone: '',
    cpf: '',
    rg: '',
    registration_number: '',
    salary: '',
    cnh_number: '',
    cnh_category: '',
    cnh_validity: '',
    admission_date: '',
    birth_date: ''
  });

  // Sub-data states
  const [certifications, setCertifications] = useState([]);
  const [educationList, setEducationList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);

  // Sub-forms
  const [certFormData, setCertFormData] = useState({ name: '', type: 'NR', validity: '' });
  const [eduFormData, setEduFormData] = useState({ course_name: '', institution: '', type: 'ACADEMIC', conclusion_date: '' });
  const [reviewFormData, setReviewFormData] = useState({ date: new Date().toISOString().split('T')[0], score_technical: 5, score_safety: 5, score_punctuality: 5, comments: '' });

  useEffect(() => {
    if (collaborator) {
      setFormData({
        name: collaborator.name || '',
        email: collaborator.email || '',
        role_id: collaborator.role_id || '',
        team_ids: collaborator.team_ids || [],
        phone: collaborator.phone || '',
        cpf: collaborator.cpf || '',
        rg: collaborator.rg || '',
        registration_number: collaborator.registration_number || '',
        salary: collaborator.salary || '',
        cnh_number: collaborator.cnh_number || '',
        cnh_category: collaborator.cnh_category || '',
        cnh_validity: collaborator.cnh_validity ? new Date(collaborator.cnh_validity).toISOString().split('T')[0] : '',
        admission_date: collaborator.admission_date ? new Date(collaborator.admission_date).toISOString().split('T')[0] : '',
        birth_date: collaborator.birth_date ? new Date(collaborator.birth_date).toISOString().split('T')[0] : ''
      });
      loadSubData();
    }
  }, [collaborator]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSubData = async () => {
    if (!collaborator) return;
    try {
      const [certs, edu, reviews, perf] = await Promise.all([
        getCertifications(collaborator.id),
        getCollaboratorEducation(collaborator.id),
        getCollaboratorReviews(collaborator.id),
        getCollaboratorPerformance(collaborator.id)
      ]);
      setCertifications(certs.data);
      setEducationList(edu.data);
      setReviewsList(reviews.data);
      setPerformanceStats(perf.data);
    } catch (error) {
      console.error("Error loading sub-data", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getValidityStatus = (dateString) => {
    if (!dateString) return { color: '#94a3b8', icon: AlertCircle, text: 'Não informado' };
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: '#ef4444', icon: AlertCircle, text: 'Vencido' };
    if (diffDays <= 30) return { color: '#f59e0b', icon: Clock, text: 'Vence em breve' };
    return { color: '#10b981', icon: Check, text: 'Válido' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (collaborator) {
        await updateCollaborator(collaborator.id, formData);
      } else {
        await createCollaborator(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao salvar colaborador');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertification = async (id) => {
    if (!confirm('Excluir certificação?')) return;
    try {
      await deleteCertification(id);
      loadSubData();
      showToast('Certificação excluída!');
    } catch (e) { alert('Erro ao excluir'); }
  };

  const handleDeleteEducation = async (id) => {
    if (!confirm('Excluir formação?')) return;
    try {
      await deleteCollaboratorEducation(id);
      loadSubData();
      showToast('Formação excluída!');
    } catch (e) { alert('Erro ao excluir'); }
  };

  const handleDeleteReview = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;
    try {
      await deleteCollaboratorReview(id);
      loadSubData();
      showToast('Avaliação excluída com sucesso!');
    } catch (e) { alert('Erro ao excluir avaliação'); }
  };

  const handleSubSubmit = async (e, type) => {
    e.preventDefault();
    if (!collaborator) return;
    try {
      if (type === 'certification') {
        await createCertification({ ...certFormData, collaborator_id: collaborator.id });
        setCertFormData({ name: '', type: 'NR', validity: '' });
        showToast('Certificação adicionada!');
        const res = await getCertifications(collaborator.id);
        setCertifications(res.data);
      } else if (type === 'education') {
        await createCollaboratorEducation({ ...eduFormData, collaborator_id: collaborator.id });
        setEduFormData({ course_name: '', institution: '', type: 'ACADEMIC', conclusion_date: '' });
        showToast('Formação adicionada!');
        const res = await getCollaboratorEducation(collaborator.id);
        setEducationList(res.data);
      } else if (type === 'review') {
        await createCollaboratorReview({ ...reviewFormData, collaborator_id: collaborator.id });
        setReviewFormData({ ...reviewFormData, comments: '' });
        showToast('Avaliação registrada!');
        // Reload all performance data
        const reviews = await getCollaboratorReviews(collaborator.id);
        setReviewsList(reviews.data);
        const perf = await getCollaboratorPerformance(collaborator.id);
        setPerformanceStats(perf.data);
      }
    } catch (error) {
      console.error(error);
      alert(`Erro ao salvar ${type}`);
    }
  };

  return (
    <div className="clients-form-modal">
      <div className="clients-form card" style={{ maxWidth: '1100px', position: 'relative' }} onClick={e => e.stopPropagation()}>

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 10,
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontWeight: '500' }}>{toast.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{collaborator ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</h3>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              {['general', 'certifications', 'education', 'performance'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={!collaborator && tab !== 'general'}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: !collaborator && tab !== 'general' ? 'not-allowed' : 'pointer',
                    background: activeTab === tab ? 'white' : 'transparent',
                    color: !collaborator && tab !== 'general' ? '#ccc' : activeTab === tab ? '#0f172a' : '#64748b',
                    fontWeight: activeTab === tab ? '600' : '500',
                    boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {{ general: 'Geral', certifications: 'Certificações', education: 'Formação', performance: 'Desempenho' }[tab]}
                </button>
              ))}
            </div>
            {collaborator && canEdit && onDelete && (
              <button
                type="button"
                className="btn-icon-small danger"
                onClick={onDelete}
                title="Excluir Colaborador"
                style={{ padding: '8px', borderRadius: '8px', color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>

        {activeTab === 'general' && (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Matrícula</label>
                <input name="registration_number" className="input" value={formData.registration_number} onChange={handleChange} placeholder="000000" />
              </div>
              <div className="form-group">
                <label className="label">Nome *</label>
                <input name="name" className="input" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="label">CPF</label>
                <input name="cpf" className="input" value={formData.cpf} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="label">RG</label>
                <input name="rg" className="input" value={formData.rg} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="label">Cargo *</label>
                <select name="role_id" className="input" value={formData.role_id} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Times</label>
                <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {teams.map(team => (
                    <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.team_ids.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFormData(p => ({ ...p, team_ids: [...p.team_ids, team.id] }));
                          else setFormData(p => ({ ...p, team_ids: p.team_ids.filter(id => id !== team.id) }));
                        }}
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input name="email" className="input" value={formData.email} onChange={handleChange} type="email" />
              </div>
              <div className="form-group">
                <label className="label">Telefone</label>
                <input name="phone" className="input" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="label">Salário</label>
                <input name="salary" className="input" value={formData.salary} onChange={handleChange} />
              </div>
            </div>

            <h4 style={{ margin: '1rem 0', borderBottom: '1px solid #eee' }}>Dados CNH</h4>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="form-group"><label className="label">Número</label><input name="cnh_number" className="input" value={formData.cnh_number} onChange={handleChange} /></div>
              <div className="form-group"><label className="label">Categoria</label><input name="cnh_category" className="input" value={formData.cnh_category} onChange={handleChange} /></div>
              <div className="form-group">
                <label className="label">Validade</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="date" className="input" name="cnh_validity" value={formData.cnh_validity} onChange={handleChange} />
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

            <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              {canEdit && <button type="submit" className="btn btn-primary" disabled={loading}>Salvar Alterações</button>}
            </div>
          </form>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div>
            <form onSubmit={e => handleSubSubmit(e, 'certification')} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="label">Nome da Certificação</label>
                  <input className="input" value={certFormData.name} onChange={e => setCertFormData({ ...certFormData, name: e.target.value })} required placeholder="Ex: NR-10" />
                </div>
                <div className="form-group">
                  <label className="label">Tipo</label>
                  <select className="input" value={certFormData.type} onChange={e => setCertFormData({ ...certFormData, type: e.target.value })}>
                    <option value="NR">Norma Regulamentadora (NR)</option>
                    <option value="ASO">ASO / Médico</option>
                    <option value="TRAINING">Treinamento</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Validade</label>
                  <input type="date" className="input" value={certFormData.validity} onChange={e => setCertFormData({ ...certFormData, validity: e.target.value })} required />
                </div>
                {canEdit && <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '42px', padding: 0, display: 'flex', justifyContent: 'center' }}><Plus size={20} /></button>}
              </div>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {certifications.map(cert => (
                <div key={cert.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '0.5rem', background: '#e0f2fe', borderRadius: '8px', color: '#0369a1' }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{cert.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {cert.type} • Vence em: {new Date(cert.validity).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {canEdit && <button className="btn-icon-small danger" onClick={() => handleDeleteCertification(cert.id)} style={{ color: '#ef4444', background: 'none' }}><Trash2 size={18} /></button>}
                </div>
              ))}
              {certifications.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhuma certificação cadastrada</div>}
            </div>
          </div>
        )}

        {/* Education Tab */}
        {activeTab === 'education' && (
          <div>
            <form onSubmit={e => handleSubSubmit(e, 'education')} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr 2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group"><label className="label">Nível</label><select className="input" value={eduFormData.type} onChange={e => setEduFormData({ ...eduFormData, type: e.target.value })}><option value="ACADEMIC">Acadêmico</option><option value="TECHNICAL">Técnico</option><option value="CERTIFICATION">Certificação</option></select></div>
                <div className="form-group"><label className="label">Instituição</label><input className="input" value={eduFormData.institution} onChange={e => setEduFormData({ ...eduFormData, institution: e.target.value })} required /></div>
                <div className="form-group"><label className="label">Curso</label><input className="input" value={eduFormData.course_name} onChange={e => setEduFormData({ ...eduFormData, course_name: e.target.value })} required /></div>
                <div className="form-group"><label className="label">Conclusão</label><input type="date" className="input" value={eduFormData.conclusion_date} onChange={e => setEduFormData({ ...eduFormData, conclusion_date: e.target.value })} required /></div>
                {canEdit && <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '42px', padding: 0, display: 'flex', justifyContent: 'center' }}><Plus size={20} /></button>}
              </div>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {educationList.map(edu => (
                <div key={edu.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px', color: '#15803d' }}>
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#334155' }}>{edu.course_name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{edu.institution} • {new Date(edu.conclusion_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {canEdit && <button className="btn-icon-small danger" onClick={() => handleDeleteEducation(edu.id)} style={{ color: '#ef4444', background: 'none' }}><Trash2 size={18} /></button>}
                </div>
              ))}
              {educationList.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhuma formação cadastrada</div>}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div style={{ maxHeight: 'calc(80vh - 100px)', overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '1rem' }}>
            <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[{ l: 'TÉCNICA', v: performanceStats?.avg_technical, c: '#f59e0b', icon: Wrench }, { l: 'SEGURANÇA', v: performanceStats?.avg_safety, c: '#10b981', icon: Shield }, { l: 'PONTUALIDADE', v: performanceStats?.avg_punctuality, c: '#3b82f6', icon: Clock }, { l: 'GERAL', v: performanceStats?.avg_general, c: '#6366f1', icon: Star }].map((s, i) => (
                <div key={i} style={{ background: 'white', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '2rem', color: s.c, lineHeight: '1' }}>{s.v?.toFixed(1) || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <s.icon size={14} /> {s.l}
                  </div>
                </div>
              ))}
            </div>

            {reviewsList.length > 0 ? (
              <div style={{ height: '320px', marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reviewsList.slice().reverse().map(r => ({ name: new Date(r.date).toLocaleDateString(), t: r.score_technical, s: r.score_safety, p: r.score_punctuality }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickMargin={15} stroke="#cbd5e1" axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} fontSize={11} stroke="#cbd5e1" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    <Line name="Técnica" type="monotone" dataKey="t" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                    <Line name="Segurança" type="monotone" dataKey="s" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                    <Line name="Pontualidade" type="monotone" dataKey="p" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '12px', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
                <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <div>Sem dados suficientes para gerar o gráfico</div>
              </div>
            )}

            <h4 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', color: '#1e293b', fontWeight: '600' }}>Histórico de Avaliações</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {reviewsList.map(review => (
                <div key={review.id} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.05rem' }}>Avaliação em {new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <span style={{ padding: '4px 12px', background: '#fff7ed', color: '#c2410c', borderRadius: '20px', fontWeight: '600', border: '1px solid #ffedd5' }}>Tec: {review.score_technical}</span>
                      <span style={{ padding: '4px 12px', background: '#ecfdf5', color: '#047857', borderRadius: '20px', fontWeight: '600', border: '1px solid #d1fae5' }}>Seg: {review.score_safety}</span>
                      <span style={{ padding: '4px 12px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', fontWeight: '600', border: '1px solid #dbeafe' }}>Pon: {review.score_punctuality}</span>
                    </div>
                  </div>
                  {review.comments && (
                    <div style={{ fontSize: '0.95rem', color: '#475569', background: '#f8fafc', padding: '1rem', borderRadius: '8px', lineHeight: '1.5', border: '1px solid #f1f5f9' }}>
                      "{review.comments}"
                    </div>
                  )}
                  {canEdit && (
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteReview(review.id)} title="Excluir Avaliação" style={{ color: '#ef4444', background: 'none', padding: '8px', borderRadius: '8px', transition: 'background 0.2s', display: 'inline-flex' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1.5rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={18} fill="#fbbf24" color="#fbbf24" /> Nova Avaliação
                </h4>
                <form onSubmit={e => handleSubSubmit(e, 'review')}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="label" style={{ fontWeight: '600', color: '#64748b' }}>Data da Avaliação</label>
                      <input type="date" className="input" value={reviewFormData.date} onChange={e => setReviewFormData({ ...reviewFormData, date: e.target.value })} required style={{ fontWeight: '500' }} />
                    </div>
                    <div className="form-group"><label className="label" style={{ fontWeight: '600', color: '#f59e0b' }}>Técnica (1-5)</label><select className="input" value={reviewFormData.score_technical} onChange={e => setReviewFormData({ ...reviewFormData, score_technical: parseInt(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                    <div className="form-group"><label className="label" style={{ fontWeight: '600', color: '#10b981' }}>Segurança (1-5)</label><select className="input" value={reviewFormData.score_safety} onChange={e => setReviewFormData({ ...reviewFormData, score_safety: parseInt(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                    <div className="form-group"><label className="label" style={{ fontWeight: '600', color: '#3b82f6' }}>Pontualidade (1-5)</label><select className="input" value={reviewFormData.score_punctuality} onChange={e => setReviewFormData({ ...reviewFormData, score_punctuality: parseInt(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label className="label" style={{ fontWeight: '600', color: '#64748b' }}>Observações do Supervisor</label>
                    <textarea className="input" rows="3" placeholder="Descreva os pontos fortes e pontos de melhoria..." value={reviewFormData.comments} onChange={e => setReviewFormData({ ...reviewFormData, comments: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontWeight: '600' }}>Registrar Avaliação</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorModal;
