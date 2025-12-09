import { useState, useEffect } from 'react';
import { Plus, Trash2, Car, MapPin, User, Calendar, Edit, Shield, Fuel, Palette, AlertCircle, FileText } from 'lucide-react';
import {
  getFleet, createFleet, deleteFleet, updateFleet,
  getInsurances, createInsurance, updateInsurance, deleteInsurance
} from '../services/api';
import MaintenanceTab from '../components/MaintenanceTab';
import ConfirmModal from '../components/ConfirmModal';
import './Fleet.css';

const Fleet = () => {
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' or 'insurance'
  const [fleet, setFleet] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fleet Form State
  const [showFleetForm, setShowFleetForm] = useState(false);
  const [editingFleetId, setEditingFleetId] = useState(null);
  const [fleetFormData, setFleetFormData] = useState({
    license_plate: '',
    model: '',
    brand: '',
    year: '',
    color: '',
    cnpj: '',
    insurance_id: '',
    fuel_type: '',
    status: 'ACTIVE',
    odometer: 0,
  });

  const [modalTab, setModalTab] = useState('details'); // 'details', 'maintenance'

  // Insurance Form State
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsuranceId, setEditingInsuranceId] = useState(null);
  const [insuranceFormData, setInsuranceFormData] = useState({
    insurance_company: '',
    policy_number: '',
    validity: '',
    claims_info: '',
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'fleet' or 'insurance'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showConfirmModal) {
        if (showFleetForm) setShowFleetForm(false);
        if (showInsuranceForm) setShowInsuranceForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFleetForm, showInsuranceForm, showConfirmModal]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fleetRes, insuranceRes] = await Promise.all([
        getFleet(),
        getInsurances()
      ]);
      setFleet(fleetRes.data);
      setInsurances(insuranceRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Fleet Handlers ---

  const resetFleetForm = () => {
    setFleetFormData({
      license_plate: '',
      model: '',
      brand: '',
      year: '',
      color: '',
      cnpj: '',
      insurance_id: '',
      fuel_type: '',
      status: 'ACTIVE',
      odometer: 0,
    });
    setEditingFleetId(null);
    setModalTab('details');
  };

  const handleFleetSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...fleetFormData,
        insurance_id: fleetFormData.insurance_id ? parseInt(fleetFormData.insurance_id) : null
      };

      if (editingFleetId) {
        await updateFleet(editingFleetId, payload);
      } else {
        await createFleet(payload);
      }
      setShowFleetForm(false);
      resetFleetForm();
      loadData();
    } catch (error) {
      console.error('Error saving fleet item:', error);
      alert('Erro ao salvar veículo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleFleetEdit = (vehicle) => {
    setFleetFormData({
      license_plate: vehicle.license_plate,
      model: vehicle.model,
      brand: vehicle.brand,
      year: vehicle.year,
      color: vehicle.color || '',
      cnpj: vehicle.cnpj || '',
      insurance_id: vehicle.insurance_id || '',
      fuel_type: vehicle.fuel_type || '',
      status: vehicle.status,
      odometer: vehicle.odometer || 0,
    });
    setEditingFleetId(vehicle.id);
    setModalTab('details');
    setShowFleetForm(true);
  };

  // --- Insurance Handlers ---

  const resetInsuranceForm = () => {
    setInsuranceFormData({
      insurance_company: '',
      policy_number: '',
      validity: '',
      claims_info: '',
    });
    setEditingInsuranceId(null);
  };

  const handleInsuranceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInsuranceId) {
        await updateInsurance(editingInsuranceId, insuranceFormData);
      } else {
        await createInsurance(insuranceFormData);
      }
      setShowInsuranceForm(false);
      resetInsuranceForm();
      loadData();
    } catch (error) {
      console.error('Error saving insurance:', error);
      alert('Erro ao salvar seguro: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleInsuranceEdit = (insurance) => {
    setInsuranceFormData({
      insurance_company: insurance.insurance_company,
      policy_number: insurance.policy_number,
      validity: insurance.validity,
      claims_info: insurance.claims_info || '',
    });
    setEditingInsuranceId(insurance.id);
    setShowInsuranceForm(true);
  };

  // --- Common Handlers ---

  const handleDelete = (id, type) => {
    setItemToDelete(id);
    setDeleteType(type);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'fleet') {
        await deleteFleet(itemToDelete);
        setShowFleetForm(false); // Close fleet form if open
      } else {
        await deleteInsurance(itemToDelete);
        setShowInsuranceForm(false); // Close insurance form if open
      }
      setShowConfirmModal(false);
      setItemToDelete(null);
      setDeleteType(null);
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erro ao excluir item');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      ACTIVE: { bg: '#10b98115', color: '#10b981' },
      MAINTENANCE: { bg: '#f59e0b15', color: '#f59e0b' },
    };
    return colors[status] || colors.ACTIVE;
  };

  return (
    <div className="fleet">
      <header className="fleet-header">
        <div>
          <h1>Gestão de Frota</h1>
          <p>Controle de veículos e apólices de seguro</p>
        </div>
        <div className="header-actions">
          <div className="tab-switcher-container">
            <div className={`tab-glider ${activeTab}`} />
            <button
              className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
              onClick={() => setActiveTab('fleet')}
            >
              <Car size={18} />
              Veículos
            </button>
            <button
              className={`tab-btn ${activeTab === 'insurance' ? 'active' : ''}`}
              onClick={() => setActiveTab('insurance')}
            >
              <Shield size={18} />
              Seguros
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (activeTab === 'fleet') {
                resetFleetForm();
                setShowFleetForm(true);
              } else {
                resetInsuranceForm();
                setShowInsuranceForm(true);
              }
            }}
          >
            <Plus size={20} />
            {activeTab === 'fleet' ? 'Novo Veículo' : 'Novo Seguro'}
          </button>
        </div>
      </header>

      {/* Fleet Form Modal */}
      {showFleetForm && (
        <div className="fleet-form-modal">
          <div className="fleet-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{editingFleetId ? 'Editar Veículo' : 'Cadastrar Veículo'}</h3>
              {editingFleetId && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingFleetId, 'fleet')}
                  title="Excluir Veículo"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {editingFleetId && (
              <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                <button
                  onClick={() => setModalTab('details')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem 0',
                    borderBottom: modalTab === 'details' ? '2px solid #0284c7' : '2px solid transparent',
                    color: modalTab === 'details' ? '#0284c7' : '#64748b',
                    fontWeight: modalTab === 'details' ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Dados do Veículo
                </button>
                <button
                  onClick={() => setModalTab('maintenance')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem 0',
                    borderBottom: modalTab === 'maintenance' ? '2px solid #0284c7' : '2px solid transparent',
                    color: modalTab === 'maintenance' ? '#0284c7' : '#64748b',
                    fontWeight: modalTab === 'maintenance' ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Manutenções
                </button>
              </div>
            )}

            {modalTab === 'details' ? (
              <form onSubmit={handleFleetSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Placa *</label>
                    <input
                      type="text"
                      className="input"
                      value={fleetFormData.license_plate}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, license_plate: e.target.value })}
                      required
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Modelo *</label>
                    <input
                      type="text"
                      className="input"
                      value={fleetFormData.model}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, model: e.target.value })}
                      required
                      placeholder="Hilux"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Marca *</label>
                    <input
                      type="text"
                      className="input"
                      value={fleetFormData.brand}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, brand: e.target.value })}
                      required
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Ano *</label>
                    <input
                      type="number"
                      className="input"
                      value={fleetFormData.year}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, year: e.target.value })}
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Cor</label>
                    <input
                      type="text"
                      className="input"
                      value={fleetFormData.color}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, color: e.target.value })}
                      placeholder="Prata"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Combustível</label>
                    <select
                      className="input"
                      value={fleetFormData.fuel_type}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, fuel_type: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="Alcool">Álcool</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Flex">Flex</option>
                      <option value="GNV">GNV</option>
                      <option value="GNV + Alcool">GNV + Álcool</option>
                      <option value="GNV + Gasolina">GNV + Gasolina</option>
                      <option value="Diesel">Diesel</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">KM Atual</label>
                    <input
                      type="number"
                      className="input"
                      value={fleetFormData.odometer}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, odometer: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">CNPJ (Matriz/Filial)</label>
                    <input
                      type="text"
                      className="input"
                      value={fleetFormData.cnpj}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Status *</label>
                    <select
                      className="input"
                      value={fleetFormData.status}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, status: e.target.value })}
                      required
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="MAINTENANCE">Manutenção</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Seguro Vinculado</label>
                    <select
                      className="input"
                      value={fleetFormData.insurance_id}
                      onChange={(e) => setFleetFormData({ ...fleetFormData, insurance_id: e.target.value })}
                    >
                      <option value="">Sem seguro</option>
                      {insurances.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.insurance_company} - Apólice: {ins.policy_number} (Vence: {new Date(ins.validity).toLocaleDateString('pt-BR')})
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Cadastre novos seguros na aba "Seguros" para selecioná-los aqui.
                    </small>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowFleetForm(false);
                      resetFleetForm();
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salvar Veículo
                  </button>
                </div>
              </form>
            ) : (
              <>
                <MaintenanceTab
                  vehicle={{ id: editingFleetId, odometer: fleetFormData.odometer }}
                  onUpdate={loadData}
                />
                <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowFleetForm(false);
                      resetFleetForm();
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Insurance Form Modal */}
      {showInsuranceForm && (
        <div className="fleet-form-modal">
          <div className="fleet-form card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingInsuranceId ? 'Editar Seguro' : 'Cadastrar Seguro'}</h3>
              {editingInsuranceId && (
                <button
                  type="button"
                  className="btn-icon-small danger"
                  onClick={() => handleDelete(editingInsuranceId, 'insurance')}
                  title="Excluir Seguro"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleInsuranceSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Seguradora *</label>
                  <input
                    type="text"
                    className="input"
                    value={insuranceFormData.insurance_company}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, insurance_company: e.target.value })}
                    required
                    placeholder="Porto Seguro"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Nº Apólice *</label>
                  <input
                    type="text"
                    className="input"
                    value={insuranceFormData.policy_number}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, policy_number: e.target.value })}
                    required
                    placeholder="123456789"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Vigência *</label>
                  <input
                    type="date"
                    className="input"
                    value={insuranceFormData.validity}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, validity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Como acionar sinistro</label>
                  <textarea
                    className="input"
                    value={insuranceFormData.claims_info}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, claims_info: e.target.value })}
                    placeholder="Instruções, telefones, contatos de emergência..."
                    rows="3"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowInsuranceForm(false);
                    resetInsuranceForm();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Seguro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="fleet-grid">
        {loading ? (
          <div className="loading">Carregando dados...</div>
        ) : activeTab === 'fleet' ? (
          // Fleet List
          fleet.length === 0 ? (
            <div className="empty-state card">
              <Car size={48} color="#94a3b8" />
              <p>Nenhum veículo cadastrado ainda.</p>
            </div>
          ) : (
            fleet.map((vehicle) => (
              <div
                key={vehicle.id}
                className="fleet-card card clickable"
                onClick={() => handleFleetEdit(vehicle)}
                style={{ cursor: 'pointer' }}
              >
                <div className="fleet-card-header">
                  <div className="vehicle-icon">
                    <Car size={24} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span
                      className="status-badge"
                      style={getStatusBadge(vehicle.status)}
                    >
                      {vehicle.status === 'ACTIVE' ? 'Ativo' : 'Manutenção'}
                    </span>
                    {vehicle.status === 'MAINTENANCE' && vehicle.maintenances && (() => {
                      const todayStr = new Date().toLocaleDateString('en-CA');
                      const activeMaint = vehicle.maintenances.find(m => {
                        // Logic: Entry has happened (<= today) AND (not finished OR exit future)
                        // AND exit date exists (to show forecast)
                        const entryStr = m.entry_date;
                        const exitStr = m.exit_date;
                        return entryStr <= todayStr && exitStr && exitStr > todayStr;
                      });

                      if (activeMaint) {
                        return (
                          <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}>
                            Previsão: {new Date(activeMaint.exit_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <h3 className="vehicle-model">{vehicle.model}</h3>
                <p className="vehicle-plate">{vehicle.license_plate}</p>
                <div className="vehicle-details">
                  <div className="detail-item">
                    <User size={16} color="#64748b" />
                    <span>{vehicle.brand} - {vehicle.year}</span>
                  </div>
                  {vehicle.color && (
                    <div className="detail-item">
                      <Palette size={16} color="#64748b" />
                      <span>{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.fuel_type && (
                    <div className="detail-item">
                      <Fuel size={16} color="#64748b" />
                      <span>{vehicle.fuel_type}</span>
                    </div>
                  )}

                  {/* Display Linked Insurance Info */}
                  {vehicle.insurance ? (
                    <>
                      <div className="detail-item">
                        <Shield size={16} color="#10b981" />
                        <span style={{ color: '#10b981', fontWeight: 500 }}>{vehicle.insurance.insurance_company}</span>
                      </div>
                      <div className="detail-item">
                        <FileText size={16} color="#64748b" />
                        <span>Apólice: {vehicle.insurance.policy_number}</span>
                      </div>
                      <div className="detail-item">
                        <Calendar size={16} color="#64748b" />
                        <span>Vence: {new Date(vehicle.insurance.validity).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {vehicle.insurance.claims_info && (
                        <div className="detail-item" style={{ alignItems: 'flex-start' }}>
                          <AlertCircle size={16} color="#64748b" style={{ marginTop: '2px' }} />
                          <span style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{vehicle.insurance.claims_info}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="detail-item">
                      <Shield size={16} color="#94a3b8" />
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem seguro vinculado</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          // Insurance List
          insurances.length === 0 ? (
            <div className="empty-state card">
              <Shield size={48} color="#94a3b8" />
              <p>Nenhum seguro cadastrado ainda.</p>
            </div>
          ) : (
            insurances.map((insurance) => (
              <div
                key={insurance.id}
                className="fleet-card card clickable"
                onClick={() => handleInsuranceEdit(insurance)}
                style={{ cursor: 'pointer' }}
              >
                <div className="fleet-card-header">
                  <div className="vehicle-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                    <Shield size={24} />
                  </div>
                  <span className="status-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                    Apólice
                  </span>
                </div>
                <h3 className="vehicle-model">{insurance.insurance_company}</h3>
                <p className="vehicle-plate">{insurance.policy_number}</p>
                <div className="vehicle-details">
                  <div className="detail-item">
                    <Calendar size={16} color="#64748b" />
                    <span>Validade: {new Date(insurance.validity).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {insurance.claims_info && (
                    <div className="detail-item" style={{ alignItems: 'flex-start' }}>
                      <AlertCircle size={16} color="#64748b" style={{ marginTop: '2px' }} />
                      <span style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{insurance.claims_info}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir este ${deleteType === 'fleet' ? 'veículo' : 'seguro'}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default Fleet;
