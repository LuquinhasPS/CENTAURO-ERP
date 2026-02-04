import React, { useState } from 'react';
import { Users, Plus, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { addProjectCollaborator, removeProjectCollaborator } from '../../../services/api';
// Note: api.js redirects to operational.js which exports these.
import { formatDateUTC } from '../../../utils/formatters';
import ConfirmModal from '../../shared/ConfirmModal';

const ProjectTeamTab = ({ project, projectCollaborators, availableCollaborators, canEdit, onUpdate }) => {
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [collabFormData, setCollabFormData] = useState({
    collaborator_id: '',
    role: '',
    start_date: '',
    end_date: '',
    include_weekends: false
  });


  const [expanded, setExpanded] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState(null);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCollaboratorName = (id) => {
    const c = availableCollaborators.find(col => col.id === id);
    return c ? (c.name || c.user?.name || c.email) : 'Desconhecido';
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    try {
      await addProjectCollaborator(project.id, { ...collabFormData, project_id: project.id });
      setShowCollabForm(false);
      setCollabFormData({
        collaborator_id: '',
        role: '',
        start_date: '',
        end_date: '',
        include_weekends: false
      });
      onUpdate();
    } catch (error) {
      alert('Erro ao adicionar colaborador: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRemoveCollaborator = (id) => {
    setCollaboratorToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!collaboratorToDelete) return;
    try {
      await removeProjectCollaborator(collaboratorToDelete);
      onUpdate();
      setShowConfirmModal(false);
      setCollaboratorToDelete(null);
    } catch (error) {
      alert('Erro ao remover: ' + error.message);
    }
  };

  return (
    <div className="tab-content" style={{ padding: '1rem' }}>
      <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Colaboradores Alocados</h3>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCollabForm(!showCollabForm)}>
            <Plus size={16} /> Adicionar
          </button>
        )}
      </div>

      {showCollabForm && (
        <form className="resource-form" onSubmit={handleAddCollaborator} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Colaborador</label>
            <select
              value={collabFormData.collaborator_id}
              onChange={(e) => setCollabFormData({ ...collabFormData, collaborator_id: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Selecione...</option>
              {availableCollaborators.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.role}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Função</label>
            <input
              type="text"
              placeholder="Ex: Motorista"
              value={collabFormData.role}
              onChange={(e) => setCollabFormData({ ...collabFormData, role: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Início</label>
              <input
                type="date"
                value={collabFormData.start_date}
                onChange={(e) => setCollabFormData({ ...collabFormData, start_date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Fim</label>
              <input
                type="date"
                value={collabFormData.end_date}
                onChange={(e) => setCollabFormData({ ...collabFormData, end_date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="collab-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>Incluir Finais de Semana e Feriados</label>
            <input
              type="checkbox"
              checked={collabFormData.include_weekends}
              onChange={(e) => setCollabFormData({ ...collabFormData, include_weekends: e.target.checked })}
              id="collab-weekends"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCollabForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="resource-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projectCollaborators.map(pc => {
          const isExpanded = expanded[pc.collaborator_id];
          const hasPeriods = pc.periods && pc.periods.length > 0;

          return (
            <div key={pc.id} className="resource-item-container" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                className="resource-item-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}
                onClick={() => toggleExpand(pc.collaborator_id)}
              >
                <div className="resource-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Users size={20} color="#64748b" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ display: 'block', color: '#334155' }}>{getCollaboratorName(pc.collaborator_id)}</strong>
                      {pc.days_count !== undefined && pc.days_count > 0 && (
                        <span style={{
                          background: '#eff6ff',
                          color: '#3b82f6',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {pc.days_count} {pc.days_count === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                    </div>

                    {pc.role && <span className="resource-role" style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>{pc.role}</span>}

                    {/* Overall Range (collapsed) */}
                    {!isExpanded && (pc.real_start_date || pc.start_date) && (
                      <div className="resource-dates" style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Calendar size={12} />
                        {formatDateUTC(pc.real_start_date || pc.start_date)}
                        {(pc.real_end_date || pc.end_date) && ` - ${formatDateUTC(pc.real_end_date || pc.end_date)}`}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Accordion Body: Periods & Safe Delete */}
              {isExpanded && (
                <div className="resource-periods" style={{ padding: '0.5rem 0.75rem 0.75rem 3.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>

                  {hasPeriods ? (
                    <>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Períodos de Alocação:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {pc.periods.map((period, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                            <Calendar size={12} color="#94a3b8" />
                            <span>
                              {formatDateUTC(period.start)} até {formatDateUTC(period.end)}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              ({period.days} {period.days === 1 ? 'dia' : 'dias'})
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
                      Nenhuma alocação ativa neste período.
                    </div>
                  )}

                  {/* Footer: Safe Delete Area */}
                  {canEdit && (
                    <div className="resource-item-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleRemoveCollaborator(pc.id); }}
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#e11d48',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}
                      >
                        <Trash2 size={14} />
                        Desvincular Colaborador
                      </button>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
                        Esta ação removerá todas as alocações deste colaborador neste projeto.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {projectCollaborators.length === 0 && !showCollabForm && (
          <p className="empty-message" style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>Nenhum colaborador alocado neste projeto.</p>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setCollaboratorToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Desvincular Colaborador"
        message="Tem certeza que deseja desvincular este colaborador? Todas as alocações dele neste projeto serão removidas permanentemente."
      />
    </div>
  );
};

export default ProjectTeamTab;
