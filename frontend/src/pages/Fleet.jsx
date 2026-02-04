import { useState, useEffect, useRef } from 'react';
import { Plus, Car, Shield, Upload, MapPin, Search } from 'lucide-react';
import api, { getFleet, deleteFleet, getInsurances, deleteInsurance, updateInsurance, createInsurance } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import VehicleModal from '../components/fleet/VehicleModal';
import ImportPreviewModal from '../components/shared/ImportPreviewModal';
import './Fleet.css';

const Fleet = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('fleet', 'edit');
  const [activeTab, setActiveTab] = useState('fleet');

  const [fleet, setFleet] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const [importType, setImportType] = useState('fuel'); // 'fuel' or 'tolls'

  // Confirm Delete
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'fleet' or 'insurance'

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, i] = await Promise.all([getFleet(), getInsurances()]);
      setFleet(f.data);
      setInsurances(i.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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

  // --- Upload Handlers (simplified for brevity, main logic in backend) ---
  // --- Upload Handlers ---
  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset inputs
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
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setUploading(true);
    try {
      const endpoint = importType === 'fuel' ? '/assets/fleet/fuel/confirm' : '/assets/fleet/tolls/confirm';
      // Pass proper payload structure based on previewData
      const payload = {
        competence_date: previewData.competence_date,
        rows: previewData.preview // Backend expects "rows" with vehicle_id from the preview
      };

      await api.post(endpoint, payload);
      alert('Importação realizada com sucesso!');
      setShowPreview(false);
      setPreviewData(null);
      loadData(); // Reload fleet to update costs/km if needed
    } catch (error) {
      alert('Erro ao confirmar importação: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Columns
  const fleetColumns = [
    { header: 'Placa', accessor: 'license_plate', render: r => <span className="font-bold">{r.license_plate}</span> },
    { header: 'Modelo', accessor: 'model' },
    { header: 'Marca', accessor: 'brand' },
    { header: 'Ano', accessor: 'year' },
    { header: 'Status', accessor: 'status', render: r => <StatusBadge status={r.status} /> },
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

  const filteredFleet = fleet.filter(f =>
    f.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                else { setEditingInsurance(null); setInsuranceFormData({ insurance_company: '', policy_number: '', validity: '', claims_info: '' }); setShowInsuranceForm(true); }
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
              <label className="label">Visualizar</label>
              <div className="tab-switcher-container">
                <div className={`tab-glider ${activeTab}`} />
                <button className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`} onClick={() => setActiveTab('fleet')}><Car size={16} /> Veículos</button>
                <button className={`tab-btn ${activeTab === 'insurance' ? 'active' : ''}`} onClick={() => setActiveTab('insurance')}><Shield size={16} /> Seguros</button>
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
        ) : (
          <DataTable
            columns={insuranceColumns}
            data={insurances}
            actions={false}
            onEdit={(row) => { setEditingInsurance(row); setInsuranceFormData(row); setShowInsuranceForm(true); }}
            onDelete={(row) => handleDelete(row.id, 'insurance')}
            onRowClick={(row) => { setEditingInsurance(row); setInsuranceFormData(row); setShowInsuranceForm(true); }}
          />
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

      {showInsuranceForm && (
        <div className="fleet-form-modal">
          <div className="fleet-form card" onClick={e => e.stopPropagation()}>
            <h3>{editingInsurance ? 'Editar Seguro' : 'Novo Seguro'}</h3>
            <form onSubmit={handleInsuranceSubmit}>
              <div className="form-grid">
                <div className="form-group"><label className="label">Seguradora</label><input className="input" value={insuranceFormData.insurance_company} onChange={e => setInsuranceFormData({ ...insuranceFormData, insurance_company: e.target.value })} required /></div>
                <div className="form-group"><label className="label">Apólice</label><input className="input" value={insuranceFormData.policy_number} onChange={e => setInsuranceFormData({ ...insuranceFormData, policy_number: e.target.value })} required /></div>
                <div className="form-group"><label className="label">Validade</label><input type="date" className="input" value={insuranceFormData.validity} onChange={e => setInsuranceFormData({ ...insuranceFormData, validity: e.target.value })} required /></div>
                <div className="form-group"><label className="label">Sinistros</label><textarea className="input" value={insuranceFormData.claims_info} onChange={e => setInsuranceFormData({ ...insuranceFormData, claims_info: e.target.value })} /></div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInsuranceForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
