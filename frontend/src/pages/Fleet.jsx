import { useState, useEffect, useRef } from 'react';
import { Plus, Car, Shield, Upload, MapPin, Search, Trash2, Send, Check, X, Clock, FileText } from 'lucide-react';
import api, { getFleet, deleteFleet, getInsurances, deleteInsurance, updateInsurance, createInsurance, getAssetRequests, approveAssetRequest, rejectAssetRequest, checkAssetAvailability } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import VehicleModal from '../components/fleet/VehicleModal';
import ImportPreviewModal from '../components/shared/ImportPreviewModal';
import Modal from '../components/shared/Modal';
import { isDeactivated, formatDateUTC } from '../utils/formatters';
import './Fleet.css';

const Fleet = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('fleet', 'edit');
  const [activeTab, setActiveTab] = useState('fleet');

  const [fleet, setFleet] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Asset Requests State
  const [assetRequests, setAssetRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveVehicleId, setApproveVehicleId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [requestFilter, setRequestFilter] = useState('PENDING');
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Form States
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [insuranceFormData, setInsuranceFormData] = useState({ insurance_company: '', policy_number: '', validity: '', claims_info: '' });

  // Bulk Upload States
  const fuelInputRef = useRef(null);
  const tollInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importType, setImportType] = useState('fuel');

  // Confirm Delete
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => { loadData(); }, []);

  // Close insurance form on Escape
  useEffect(() => {
    if (!showInsuranceForm) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowInsuranceForm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showInsuranceForm]);

  // Load asset requests when tab is active
  useEffect(() => {
    if (activeTab === 'requests') {
      loadAssetRequests();
    }
  }, [activeTab, requestFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, i] = await Promise.all([getFleet(), getInsurances()]);
      setFleet(f.data);
      setInsurances(i.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const checkAvailability = async (vId) => {
    if (!vId || !selectedRequest) {
      setAvailabilityResult(null);
      return;
    }
    setCheckingAvailability(true);
    try {
      const res = await checkAssetAvailability({
        resource_type: 'VEHICLE',
        resource_id: vId,
        start_date: selectedRequest.start_date,
        end_date: selectedRequest.end_date
      });
      setAvailabilityResult(res.data);
    } catch (e) {
      console.error('Error checking availability:', e);
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (approveModalOpen && approveVehicleId) {
      checkAvailability(approveVehicleId);
    } else {
      setAvailabilityResult(null);
    }
  }, [approveVehicleId, approveModalOpen]);

  const loadAssetRequests = async () => {
    setRequestsLoading(true);
    try {
      const params = { asset_type: 'VEHICLE' };
      if (requestFilter !== 'ALL') params.status = requestFilter;
      const res = await getAssetRequests(params);
      setAssetRequests(res.data);
    } catch (e) { console.error('Error loading asset requests:', e); }
    finally { setRequestsLoading(false); }
  };

  // --- Handlers ---
  const handleDelete = (id, type) => {
    setItemToDelete(id);
    setDeleteType(type);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'fleet') await deleteFleet(itemToDelete);
      else await deleteInsurance(itemToDelete);
      loadData();
    } catch (e) { alert('Erro ao excluir'); } finally { setShowConfirm(false); }
  };

  const handleInsuranceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInsurance) await updateInsurance(editingInsurance.id, insuranceFormData);
      else await createInsurance(insuranceFormData);
      setShowInsuranceForm(false);
      loadData();
    } catch (e) { alert('Erro ao salvar seguro'); }
  };

  // --- Upload Handlers ---
  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'fuel') fuelInputRef.current.value = '';
    else tollInputRef.current.value = '';

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = type === 'fuel' ? '/assets/fleet/fuel/preview' : '/assets/fleet/tolls/preview';
      const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreviewData(res.data);
      setImportType(type);
      setShowPreview(true);
    } catch (e) {
      alert('Erro no upload: ' + (e.response?.data?.detail || e.message));
    } finally { setUploading(false); }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setUploading(true);
    try {
      const endpoint = importType === 'fuel' ? '/assets/fleet/fuel/confirm' : '/assets/fleet/tolls/confirm';
      const payload = { competence_date: previewData.competence_date, rows: previewData.preview };
      await api.post(endpoint, payload);
      alert('Importação realizada com sucesso!');
      setShowPreview(false);
      setPreviewData(null);
      loadData();
    } catch (error) {
      alert('Erro ao confirmar importação: ' + (error.response?.data?.detail || error.message));
    } finally { setUploading(false); }
  };

  // --- Asset Request Handlers ---
  const handleApproveRequest = async () => {
    if (!approveVehicleId) {
      alert('Selecione um veículo para alocar.');
      return;
    }
    setProcessingRequest(true);
    try {
      await approveAssetRequest(selectedRequest.id, { assigned_vehicle_id: parseInt(approveVehicleId) });
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setApproveVehicleId('');
      loadAssetRequests();
    } catch (e) {
      alert('Erro ao aprovar solicitação: ' + (e.response?.data?.detail || e.message));
    } finally { setProcessingRequest(false); }
  };

  const handleRejectRequest = async () => {
    if (!rejectReason.trim()) {
      alert('Informe o motivo da rejeição.');
      return;
    }
    setProcessingRequest(true);
    try {
      await rejectAssetRequest(selectedRequest.id, { rejection_reason: rejectReason });
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadAssetRequests();
    } catch (e) {
      alert('Erro ao rejeitar solicitação: ' + (e.response?.data?.detail || e.message));
    } finally { setProcessingRequest(false); }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
      APPROVED: { bg: '#d1fae5', color: '#065f46', label: 'Aprovada' },
      REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Rejeitada' },
    };
    const s = styles[status] || styles.PENDING;
    return (
      <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
        {s.label}
      </span>
    );
  };

  // Count pending requests
  const pendingCount = assetRequests.filter(r => r.status === 'PENDING').length;

  // Columns
  const fleetColumns = [
    { header: 'Placa', accessor: 'license_plate', render: r => <span className="font-bold">{r.license_plate}</span> },
    { header: 'Modelo', accessor: 'model' },
    { header: 'Marca', accessor: 'brand' },
    { header: 'Ano', accessor: 'year' },
    { header: 'Status', accessor: 'status', render: r => <StatusBadge status={isDeactivated(r.deactivation_date) ? 'INATIVO' : r.status} /> },
    {
      header: 'Seguro', render: r => {
        const ins = insurances.find(i => i.id === r.insurance_id);
        return ins ? <span className="text-sm text-gray-600">{ins.insurance_company}</span> : '-';
      }
    }
  ];

  const insuranceColumns = [
    { header: 'Seguradora', accessor: 'insurance_company' },
    { header: 'Apólice', accessor: 'policy_number' },
    { header: 'Validade', accessor: 'validity', render: r => new Date(r.validity).toLocaleDateString() },
    { header: 'Sinistros', accessor: 'claims_info', render: r => r.claims_info || '-' }
  ];

  const filteredFleet = fleet.filter(f => {
    const matchesSearch = f.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.model.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (filterStatus === 'ACTIVE') matchesStatus = !isDeactivated(f.deactivation_date);
    if (filterStatus === 'INACTIVE') matchesStatus = isDeactivated(f.deactivation_date);
    return matchesSearch && matchesStatus;
  });

  // Active vehicles for approval dropdown (exclude deactivated)
  const activeVehicles = fleet.filter(v => !isDeactivated(v.deactivation_date));

  return (
    <div className="fleet">
      <header className="fleet-header">
        <div><h1>Gestão de Frota</h1><p>Controle de veículos e seguros</p></div>
        <div className="header-actions">
          {canEdit && (
            <>
              <input type="file" ref={fuelInputRef} hidden onChange={e => handleUpload(e, 'fuel')} />
              <button className="btn btn-secondary" onClick={() => fuelInputRef.current.click()} disabled={uploading}><Upload size={18} /> Combustível</button>

              <input type="file" ref={tollInputRef} hidden onChange={e => handleUpload(e, 'tolls')} />
              <button className="btn btn-secondary" onClick={() => tollInputRef.current.click()} disabled={uploading}><MapPin size={18} /> Pedágio</button>

              <button className="btn btn-primary" onClick={() => {
                if (activeTab === 'fleet') { setEditingVehicle(null); setShowVehicleModal(true); }
                else if (activeTab === 'insurance') { setEditingInsurance(null); setInsuranceFormData({ insurance_company: '', policy_number: '', validity: '', claims_info: '' }); setShowInsuranceForm(true); }
              }}>
                <Plus size={20} /> Novo
              </button>
            </>
          )}
        </div>
      </header>

      {/* Search and Filters Card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Buscar por placa, modelo ou marca..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <label className="label">Status</label>
              <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', marginRight: '1rem' }}>
                <option value="ALL">Todos os Veículos</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="label">Visualizar</label>
              <div className="tab-switcher-container">
                <div className={`tab-glider ${activeTab}`} />
                <button className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`} onClick={() => setActiveTab('fleet')}><Car size={16} /> Veículos</button>
                <button className={`tab-btn ${activeTab === 'insurance' ? 'active' : ''}`} onClick={() => setActiveTab('insurance')}><Shield size={16} /> Seguros</button>
                <button
                  className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                  style={{ position: 'relative' }}
                >
                  <Send size={16} /> Solicitações
                  {pendingCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: '#ef4444', color: '#fff',
                      borderRadius: '50%', width: '18px', height: '18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 'bold',
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: '2rem' }}>
        {activeTab === 'fleet' ? (
          <DataTable
            columns={fleetColumns}
            data={filteredFleet}
            actions={false}
            onEdit={(row) => { setEditingVehicle(row); setShowVehicleModal(true); }}
            onDelete={(row) => handleDelete(row.id, 'fleet')}
            onRowClick={(row) => { setEditingVehicle(row); setShowVehicleModal(true); }}
          />
        ) : activeTab === 'insurance' ? (
          <DataTable
            columns={insuranceColumns}
            data={insurances}
            actions={false}
            onEdit={(row) => { setEditingInsurance(row); setInsuranceFormData(row); setShowInsuranceForm(true); }}
            onDelete={(row) => handleDelete(row.id, 'insurance')}
            onRowClick={canEdit ? (row) => { setEditingInsurance(row); setInsuranceFormData(row); setShowInsuranceForm(true); } : undefined}
          />
        ) : (
          /* REQUESTS TAB */
          <div>
            {/* Request filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
                <button
                  key={s}
                  onClick={() => setRequestFilter(s)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: requestFilter === s ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: requestFilter === s ? '#e0f2fe' : '#fff',
                    color: requestFilter === s ? '#0284c7' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  {{ PENDING: 'Pendentes', APPROVED: 'Aprovadas', REJECTED: 'Rejeitadas', ALL: 'Todas' }[s]}
                </button>
              ))}
            </div>

            {requestsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando solicitações...</div>
            ) : assetRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Send size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Nenhuma solicitação de veículo encontrada.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {assetRequests.map(req => (
                  <div key={req.id} className="card" style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '6px', background: '#fef3c7', borderRadius: '6px' }}>
                          <Car size={18} color="#d97706" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>
                            {req.project_tag || 'Projeto'}
                            <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '6px', fontSize: '0.8rem' }}>
                              {req.project_name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Solicitado por: <strong>{req.requester_name || 'Usuário'}</strong>
                            <span style={{ marginLeft: '8px' }}>
                              {new Date(req.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem',
                      fontSize: '0.85rem', color: '#334155',
                    }}>
                      <div style={{ fontWeight: '500', color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>Necessidade:</div>
                      {req.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {formatDateUTC(req.start_date)} — {formatDateUTC(req.end_date)}
                      </span>
                      {req.include_weekends && <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px' }}>Inclui fins de semana</span>}
                    </div>

                    {req.assigned_asset_label && (
                      <div style={{ fontSize: '0.8rem', color: '#065f46', background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem', display: 'inline-block' }}>
                        Veículo alocado: <strong>{req.assigned_asset_label}</strong>
                      </div>
                    )}

                    {req.rejection_reason && (
                      <div style={{ fontSize: '0.8rem', color: '#991b1b', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        Motivo: {req.rejection_reason}
                      </div>
                    )}

                    {req.status === 'PENDING' && canEdit && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setSelectedRequest(req); setRejectReason(''); setRejectModalOpen(true); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}
                        >
                          <X size={14} /> Rejeitar
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setSelectedRequest(req); setApproveVehicleId(''); setApproveModalOpen(true); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                        >
                          <Check size={14} /> Aprovar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showVehicleModal && (
        <VehicleModal
          vehicle={editingVehicle}
          insurances={insurances}
          onClose={() => setShowVehicleModal(false)}
          onSuccess={() => { setShowVehicleModal(false); loadData(); }}
          canEdit={canEdit}
          onDelete={() => handleDelete(editingVehicle.id, 'fleet')}
        />
      )}

      <Modal
        isOpen={showInsuranceForm}
        onClose={() => setShowInsuranceForm(false)}
        title={editingInsurance ? 'Editar Seguro' : 'Novo Seguro'}
        maxWidth="1000px"
        headerActions={
          editingInsurance && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDelete(editingInsurance.id, 'insurance')}
              title="Excluir Seguro"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
        <form onSubmit={handleInsuranceSubmit}>
          <div className="form-grid">
            <div className="form-group"><label className="label">Seguradora</label><input className="input" value={insuranceFormData.insurance_company} onChange={e => setInsuranceFormData({ ...insuranceFormData, insurance_company: e.target.value })} required /></div>
            <div className="form-group"><label className="label">Apólice</label><input className="input" value={insuranceFormData.policy_number} onChange={e => setInsuranceFormData({ ...insuranceFormData, policy_number: e.target.value })} required /></div>
            <div className="form-group"><label className="label">Validade</label><input type="date" className="input" value={insuranceFormData.validity} onChange={e => setInsuranceFormData({ ...insuranceFormData, validity: e.target.value })} required /></div>
            <div className="form-group full-width"><label className="label">Sinistros / Observações</label><textarea className="input" value={insuranceFormData.claims_info} onChange={e => setInsuranceFormData({ ...insuranceFormData, claims_info: e.target.value })} style={{ minHeight: '100px' }} placeholder="Informações sobre sinistros, coberturas extras, etc." /></div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowInsuranceForm(false)}>Cancelar</button>
            {canEdit && <button type="submit" className="btn btn-primary">Salvar</button>}
          </div>
        </form>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Aprovar Solicitação de Veículo"
        maxWidth="500px"
      >
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                <strong>{selectedRequest.project_tag}</strong> — {selectedRequest.project_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedRequest.description}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Período: {formatDateUTC(selectedRequest.start_date)} — {formatDateUTC(selectedRequest.end_date)}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Selecione o Veículo a Alocar *</label>
              <select className="input" value={approveVehicleId} onChange={e => setApproveVehicleId(e.target.value)} required>
                <option value="">Selecione um veículo...</option>
                {activeVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.model} - {v.license_plate}</option>
                ))}
              </select>
              {checkingAvailability && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Verificando disponibilidade...</div>}
              {availabilityResult && !availabilityResult.available && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.75rem', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.8rem'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Conflito de Disponibilidade</div>
                  Este veículo já possui alocações no período solicitado. 
                  Arquivos no scheduler: {availabilityResult.conflicts.slice(0, 5).join(', ')}
                  {availabilityResult.conflicts.length > 5 && '...'}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setApproveModalOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveRequest}
                disabled={processingRequest || !approveVehicleId || checkingAvailability || (availabilityResult && !availabilityResult.available)}
                style={{
                  background: (availabilityResult && !availabilityResult.available) ? '#94a3b8' : '#059669',
                  borderColor: (availabilityResult && !availabilityResult.available) ? '#94a3b8' : '#059669'
                }}
              >
                {processingRequest ? 'Processando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Rejeitar Solicitação"
        maxWidth="500px"
      >
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                <strong>{selectedRequest.project_tag}</strong> — {selectedRequest.description}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Motivo da Rejeição *</label>
              <textarea className="input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: Nenhum veículo disponível neste período..." style={{ minHeight: '80px' }} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRejectRequest}
                disabled={processingRequest || !rejectReason.trim()}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {processingRequest ? 'Processando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {showPreview && previewData && (
        <ImportPreviewModal
          isOpen={showPreview}
          onClose={() => { setShowPreview(false); setPreviewData(null); }}
          onConfirm={handleConfirmImport}
          data={previewData}
          type={importType}
          loading={uploading}
        />
      )}

      <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmDelete} title="Confirmar" message="Excluir item?" />
    </div>
  );
};

export default Fleet;
