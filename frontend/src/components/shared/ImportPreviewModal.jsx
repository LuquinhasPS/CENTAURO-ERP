import { AlertTriangle, Check, AlertCircle } from 'lucide-react';
import Modal from './Modal';


const ImportPreviewModal = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  type = 'fuel', // 'fuel' or 'tolls'
  loading = false
}) => {
  if (!isOpen || !data) return null;

  const { competence_label, preview = [], errors = [], total_found } = data;

  const totalCost = preview.reduce((acc, item) => acc + (parseFloat(item.total_cost) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Importar ${type === 'fuel' ? 'Combustível' : 'Pedágios'}`}
      maxWidth="800px"
    >
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Referência: {competence_label}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Registros Encontrados</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            {total_found} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#94a3b8' }}>veículos</span>
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Valor Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>Erros Encontrados ({errors.length})</span>
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#b91c1c', fontSize: '0.9rem', maxHeight: '100px', overflowY: 'auto' }}>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f1f5f9', color: '#475569' }}>
            <tr>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Placa</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Veículo</th>
              {type === 'fuel' && <th style={{ padding: '0.75rem', textAlign: 'right' }}>Litros</th>}
              {type === 'fuel' && <th style={{ padding: '0.75rem', textAlign: 'right' }}>KM</th>}
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{row.license_plate}</td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>
                  {row.vehicle_model ? `${row.vehicle_brand} ${row.vehicle_model}` : '-'}
                </td>
                {type === 'fuel' && <td style={{ padding: '0.75rem', textAlign: 'right' }}>{row.liters ? `${row.liters} L` : '-'}</td>}
                {type === 'fuel' && <td style={{ padding: '0.75rem', textAlign: 'right' }}>{row.km_driven || '-'}</td>}
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.total_cost)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  {row.found ? <Check size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={loading || preview.length === 0}>
          {loading ? 'Confirmando...' : 'Confirmar Importação'}
        </button>
      </div>
    </Modal>
  );
};

export default ImportPreviewModal;
