import React, { useState, useEffect } from 'react';
import { Trash2, MapPin } from 'lucide-react';
import api, { createFleet, updateFleet } from '../../services/api';
import MaintenanceTab from '../assets/MaintenanceTab';

const VehicleModal = ({ vehicle, insurances = [], onClose, onSuccess, canEdit, onDelete }) => {
  const [modalTab, setModalTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    license_plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    color: '',
    fuel_type: '',
    odometer: '',
    cnpj: '',
    status: 'ACTIVE',
    insurance_id: ''
  });

  const [fuelCosts, setFuelCosts] = useState([]);
  const [tollCosts, setTollCosts] = useState([]);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        license_plate: vehicle.license_plate || '',
        model: vehicle.model || '',
        brand: vehicle.brand || '',
        year: vehicle.year || '',
        color: vehicle.color || '',
        fuel_type: vehicle.fuel_type || '',
        odometer: vehicle.odometer || '',
        cnpj: vehicle.cnpj || '',
        status: vehicle.status || 'ACTIVE',
        insurance_id: vehicle.insurance_id || ''
      });
      loadCosts();
    }
  }, [vehicle]);

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

  const loadCosts = async () => {
    if (!vehicle) return;
    try {
      // Assuming these endpoints exist based on usage patterns
      const [fuelRes, tollRes] = await Promise.all([
        api.get(`/assets/fleet/${vehicle.id}/fuel`),
        api.get(`/assets/fleet/${vehicle.id}/tolls`)
      ]);
      setFuelCosts(fuelRes.data);
      setTollCosts(tollRes.data);
    } catch (error) {
      console.error("Error loading vehicle costs", error);
    }
  };

  const loadTollCosts = async () => {
    if (!vehicle) return;
    try {
      const res = await api.get(`/assets/fleet/${vehicle.id}/tolls`);
      setTollCosts(res.data);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (vehicle) {
        await updateFleet(vehicle.id, formData);
      } else {
        await createFleet(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao salvar veículo');
    } finally {
      setLoading(false);
    }
  };

  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  return (
    <div className="fleet-form-modal">
      <div className="fleet-form card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>{vehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</h3>
          {vehicle && canEdit && (
            <button
              type="button"
              className="btn-icon-small danger"
              onClick={onDelete}
              title="Excluir Veículo"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {vehicle && (
          <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
            {['details', 'maintenance', 'fuel', 'tolls'].map(t => (
              <button key={t} onClick={() => setModalTab(t)} style={{
                padding: '0.5rem 0', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: modalTab === t ? '2px solid #0284c7' : '2px solid transparent',
                color: modalTab === t ? '#0284c7' : '#64748b', fontWeight: modalTab === t ? 600 : 500
              }}>
                {{ details: 'Dados', maintenance: 'Manutenções', fuel: 'Combustível', tolls: 'Pedágios' }[t]}
              </button>
            ))}
          </div>
        )}

        {modalTab === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label className="label">Placa *</label><input className="input" value={formData.license_plate} onChange={e => setFormData({ ...formData, license_plate: e.target.value })} required placeholder="ABC-1234" /></div>
              <div className="form-group"><label className="label">Modelo *</label><input className="input" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required /></div>
              <div className="form-group"><label className="label">Marca *</label><input className="input" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} required /></div>
              <div className="form-group"><label className="label">Ano *</label><input type="number" className="input" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} required /></div>
              <div className="form-group"><label className="label">Cor</label><input className="input" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} /></div>
              <div className="form-group"><label className="label">Combustível</label><select className="input" value={formData.fuel_type} onChange={e => setFormData({ ...formData, fuel_type: e.target.value })}><option value="">Selecione...</option><option value="Gasolina">Gasolina</option><option value="Alcool">Álcool</option><option value="Flex">Flex</option><option value="Diesel">Diesel</option></select></div>
              <div className="form-group"><label className="label">KM Atual</label><input type="number" className="input" value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: e.target.value })} /></div>
              <div className="form-group"><label className="label">CNPJ</label><input className="input" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })} maxLength={18} /></div>
              <div className="form-group"><label className="label">Status *</label><select className="input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} required><option value="ACTIVE">Ativo</option><option value="MAINTENANCE">Manutenção</option></select></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Seguro</label>
                <select className="input" value={formData.insurance_id} onChange={e => setFormData({ ...formData, insurance_id: e.target.value })}>
                  <option value="">Sem seguro</option>
                  {insurances.map(i => <option key={i.id} value={i.id}>{i.insurance_company} - {i.policy_number}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              {canEdit && <button type="submit" className="btn btn-primary">Salvar</button>}
            </div>
          </form>
        )}

        {modalTab === 'maintenance' && (
          <div>
            <MaintenanceTab vehicle={{ id: vehicle.id, odometer: formData.odometer }} onUpdate={onSuccess} canEdit={canEdit} />
            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}><button className="btn btn-secondary" onClick={onClose}>Fechar</button></div>
          </div>
        )}

        {modalTab === 'fuel' && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <h3>Histórico de Abastecimento</h3>
            {fuelCosts.length === 0 ? <p className="text-gray-500">Sem registros.</p> : (
              <table style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead><tr><th align="left">Mês</th><th align="right">Valor</th></tr></thead>
                <tbody>{fuelCosts.map((c, i) => <tr key={i}><td style={{ padding: '8px 0' }}>{new Date(c.competence_date).toLocaleDateString()}</td><td align="right">R$ {c.total_cost}</td></tr>)}</tbody>
              </table>
            )}
            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}><button className="btn btn-secondary" onClick={onClose}>Fechar</button></div>
          </div>
        )}

        {modalTab === 'tolls' && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <h3>Histórico de Pedágio</h3>
            {tollCosts.length === 0 ? <p className="text-gray-500">Sem registros.</p> : (
              <table style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead><tr><th align="left">Mês</th><th align="right">Valor</th><th></th></tr></thead>
                <tbody>
                  {tollCosts.map(tc => (
                    <tr key={tc.id}>
                      <td style={{ padding: '8px 0' }}>{new Date(tc.competence_date).toLocaleDateString()}</td>
                      <td align="right">R$ {tc.total_cost}</td>
                      <td align="right">
                        {canEdit && <button onClick={async () => { await api.delete(`/assets/fleet/tolls/${tc.id}`); loadTollCosts(); }} className="btn-icon-small danger"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}><button className="btn btn-secondary" onClick={onClose}>Fechar</button></div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VehicleModal;
