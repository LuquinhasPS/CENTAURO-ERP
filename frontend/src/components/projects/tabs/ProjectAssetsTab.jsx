import React, { useState } from 'react';
import { Wrench, Truck, Plus, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { addProjectTool, removeProjectTool, addProjectVehicle, removeProjectVehicle } from '../../../services/api';
import { formatDateUTC } from '../../../utils/formatters';
import ConfirmModal from '../../shared/ConfirmModal';

const ProjectAssetsTab = ({ project, projectTools, projectVehicles, availableTools, availableVehicles, canEdit, onUpdate }) => {
  // Tools State
  const [showToolForm, setShowToolForm] = useState(false);
  const [toolFormData, setToolFormData] = useState({ tool_id: '', start_date: '', end_date: '', include_weekends: false });

  // Vehicles State
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({ vehicle_id: '', start_date: '', end_date: '', include_weekends: false });

  // UI State
  const [activeSubTab, setActiveSubTab] = useState('tools');
  const [expandedTools, setExpandedTools] = useState({});
  const [expandedVehicles, setExpandedVehicles] = useState({});

  // Delete Confirmation State
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, type: null });

  const toggleToolExpand = (id) => setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleVehicleExpand = (id) => setExpandedVehicles(prev => ({ ...prev, [id]: !prev[id] }));

  const getToolName = (id) => availableTools.find(t => t.id === id)?.name || 'Desconhecido';
  const getVehicleName = (id) => {
    const v = availableVehicles.find(v => v.id === id);
    return v ? `${v.model} - ${v.license_plate}` : 'Desconhecido';
  };

  const handleAddTool = async (e) => {
    e.preventDefault();
    try {
      await addProjectTool(project.id, { ...toolFormData, project_id: project.id });
      setShowToolForm(false);
      setToolFormData({ tool_id: '', start_date: '', end_date: '', include_weekends: false });
      onUpdate();
    } catch (err) { alert('Erro ao adicionar ferramenta: ' + err.message); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await addProjectVehicle(project.id, { ...vehicleFormData, project_id: project.id });
      setShowVehicleForm(false);
      setVehicleFormData({ vehicle_id: '', start_date: '', end_date: '', include_weekends: false });
      onUpdate();
    } catch (err) { alert('Erro ao adicionar veículo: ' + err.message); }
  };

  const requestDelete = (id, type) => {
    setConfirmDelete({ open: true, id, type });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      if (confirmDelete.type === 'tool') {
        await removeProjectTool(confirmDelete.id);
      } else {
        await removeProjectVehicle(confirmDelete.id);
      }
      onUpdate();
      setConfirmDelete({ open: false, id: null, type: null });
    } catch (e) {
      alert('Erro ao remover: ' + e.message);
    }
  };

  return (
    <div className="tab-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Sub-tabs Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveSubTab('tools')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: activeSubTab === 'tools' ? '#e0f2fe' : 'transparent',
            color: activeSubTab === 'tools' ? '#0284c7' : '#64748b',
            fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', border: 'none'
          }}
        >
          <Wrench size={18} /> Ferramentas
        </button>
        <button
          onClick={() => setActiveSubTab('vehicles')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: activeSubTab === 'vehicles' ? '#e0f2fe' : 'transparent',
            color: activeSubTab === 'vehicles' ? '#0284c7' : '#64748b',
            fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', border: 'none'
          }}
        >
          <Truck size={18} /> Veículos
        </button>
      </div>

      {/* TOOLS SECTION */}
      {activeSubTab === 'tools' && (
        <div className="resource-section">
          <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>Gerenciar Ferramentas</h3>
            {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowToolForm(!showToolForm)}><Plus size={16} /> Adicionar</button>}
          </div>

          {showToolForm && (
            <form onSubmit={handleAddTool} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem' }}>Ferramenta</label>
                <select value={toolFormData.tool_id} onChange={e => setToolFormData({ ...toolFormData, tool_id: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="">Selecione...</option>
                  {availableTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Início</label>
                  <input type="date" value={toolFormData.start_date} onChange={e => setToolFormData({ ...toolFormData, start_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Fim</label>
                  <input type="date" value={toolFormData.end_date} onChange={e => setToolFormData({ ...toolFormData, end_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
                <label htmlFor="tool-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>Incluir Finais de Semana</label>
                <input type="checkbox" checked={toolFormData.include_weekends} onChange={e => setToolFormData({ ...toolFormData, include_weekends: e.target.checked })} id="tool-weekends" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowToolForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
              </div>
            </form>
          )}

          <div className="resource-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {projectTools.map(pt => {
              const isExpanded = expandedTools[pt.tool_id];
              const hasPeriods = pt.periods && pt.periods.length > 0;

              return (
                <div key={pt.id} className="resource-item-container" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div className="resource-item-header"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}
                    onClick={() => toggleToolExpand(pt.tool_id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Wrench size={20} color="#64748b" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ display: 'block', color: '#334155' }}>{getToolName(pt.tool_id)}</strong>
                          {pt.days_count > 0 && (
                            <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {pt.days_count} {pt.days_count === 1 ? 'dia' : 'dias'}
                            </span>
                          )}
                        </div>
                        {!isExpanded && (pt.real_start_date || pt.start_date) && (
                          <div className="resource-dates" style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Calendar size={12} />
                            {formatDateUTC(pt.real_start_date || pt.start_date)}
                            {(pt.real_end_date || pt.end_date) && ` - ${formatDateUTC(pt.real_end_date || pt.end_date)}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="resource-periods" style={{ padding: '0.5rem 0.75rem 0.75rem 3.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      {hasPeriods ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Períodos:</div>
                          {pt.periods.map((period, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                              <Calendar size={12} color="#94a3b8" />
                              <span>{formatDateUTC(period.start)} até {formatDateUTC(period.end)}</span>
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({period.days} dias)</span>
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma alocação ativa.</div>}

                      {canEdit && (
                        <div className="resource-item-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); requestDelete(pt.id, 'tool'); }}
                            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                            <Trash2 size={14} /> Desvincular Ferramenta
                          </button>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>Esta ação removerá todas as alocações desta ferramenta neste projeto.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {projectTools.length === 0 && !showToolForm && <p className="empty-message" style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhuma ferramenta alocada.</p>}
          </div>
        </div>
      )}

      {/* VEHICLES SECTION */}
      {activeSubTab === 'vehicles' && (
        <div className="resource-section">
          <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>Gerenciar Veículos</h3>
            {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowVehicleForm(!showVehicleForm)}><Plus size={16} /> Adicionar</button>}
          </div>

          {showVehicleForm && (
            <form onSubmit={handleAddVehicle} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem' }}>Veículo</label>
                <select value={vehicleFormData.vehicle_id} onChange={e => setVehicleFormData({ ...vehicleFormData, vehicle_id: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="">Selecione...</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.model} - {v.license_plate}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Início</label>
                  <input type="date" value={vehicleFormData.start_date} onChange={e => setVehicleFormData({ ...vehicleFormData, start_date: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Data Fim</label>
                  <input type="date" value={vehicleFormData.end_date} onChange={e => setVehicleFormData({ ...vehicleFormData, end_date: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
                <label htmlFor="vehicle-weekends" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>Incluir Finais de Semana</label>
                <input type="checkbox" checked={vehicleFormData.include_weekends} onChange={e => setVehicleFormData({ ...vehicleFormData, include_weekends: e.target.checked })} id="vehicle-weekends" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVehicleForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
              </div>
            </form>
          )}

          <div className="resource-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {projectVehicles.map(pv => {
              const isExpanded = expandedVehicles[pv.vehicle_id];
              const hasPeriods = pv.periods && pv.periods.length > 0;

              return (
                <div key={pv.id} className="resource-item-container" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div className="resource-item-header"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}
                    onClick={() => toggleVehicleExpand(pv.vehicle_id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Truck size={20} color="#64748b" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ display: 'block', color: '#334155' }}>{getVehicleName(pv.vehicle_id)}</strong>
                          {pv.days_count > 0 && (
                            <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {pv.days_count} {pv.days_count === 1 ? 'dia' : 'dias'}
                            </span>
                          )}
                        </div>
                        {!isExpanded && (pv.real_start_date || pv.start_date) && (
                          <div className="resource-dates" style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Calendar size={12} />
                            {formatDateUTC(pv.real_start_date || pv.start_date)}
                            {(pv.real_end_date || pv.end_date) && ` - ${formatDateUTC(pv.real_end_date || pv.end_date)}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="resource-periods" style={{ padding: '0.5rem 0.75rem 0.75rem 3.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      {hasPeriods ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Períodos:</div>
                          {pv.periods.map((period, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                              <Calendar size={12} color="#94a3b8" />
                              <span>{formatDateUTC(period.start)} até {formatDateUTC(period.end)}</span>
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({period.days} dias)</span>
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma alocação ativa.</div>}

                      {canEdit && (
                        <div className="resource-item-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); requestDelete(pv.id, 'vehicle'); }}
                            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                            <Trash2 size={14} /> Desvincular Veículo
                          </button>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>Esta ação removerá todas as alocações deste veículo neste projeto.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {projectVehicles.length === 0 && !showVehicleForm && <p className="empty-message" style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhum veículo alocado.</p>}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null, type: null })}
        onConfirm={executeDelete}
        title={`Desvincular ${confirmDelete.type === 'tool' ? 'Ferramenta' : 'Veículo'}`}
        message={`Tem certeza que deseja desvincular este ${confirmDelete.type === 'tool' ? 'ferramenta' : 'veículo'}? Todas as alocações serão removidas permanentemente.`}
      />
    </div>
  );
};

export default ProjectAssetsTab;
