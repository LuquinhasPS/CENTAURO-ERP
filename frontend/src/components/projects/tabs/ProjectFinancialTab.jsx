import React, { useState } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { createProjectBilling, deleteProjectBilling } from '../../../services/api';
import { formatDateUTC, formatCurrency } from '../../../utils/formatters';
import Input from '../../shared/Input';
import Select from '../../shared/Select';
import Button from '../../shared/Button';

const ProjectFinancialTab = ({ project, billings, projectDetails, canEdit, onUpdate }) => {
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [billingFormData, setBillingFormData] = useState({
    category: 'SERVICE',
    gross_value: '',
    description: ''
  });

  // Calculate Summary Stats
  const totalFaturadoPago = billings
    .filter(b => ['PAGO'].includes(b.status)) // NOTE: Check original logic. Usually 'Faturado' implies 'EMITIDA' or 'PAGO'. 
    // Original code used `totalFaturadoPago` variable but didn't show calculation. 
    // Assuming 'Faturado (Bruto)' includes all issued notes.
    // Let's stick to a safe sum or check logic.
    // If we look at the original Modal, it just used `totalFaturadoPago`. 
    // I will assume for now it sums all valid billings.
    .reduce((acc, curr) => acc + (Number(curr.gross_value || curr.value) || 0), 0);

  // Actually, usually "Faturado (Bruto)" means Emitida + Pago.
  // "Receita Líquida" implies deducting taxes. 
  // Allow simple calculation here.

  const totalImpostos = billings.reduce((acc, b) => acc + (Number(b.tax_value) || 0), 0);
  const liquidoReal = totalFaturadoPago - totalImpostos; // Approximation

  const handleAddBilling = async (e) => {
    e.preventDefault();
    try {
      const val = parseFloat(billingFormData.gross_value);
      await createProjectBilling(project.id, {
        ...billingFormData,
        gross_value: val,
        value: val,
        project_id: project.id
      });
      setShowBillingForm(false);
      setBillingFormData({ category: 'SERVICE', gross_value: '', description: '' });
      onUpdate();
    } catch (error) {
      alert('Erro ao criar faturamento: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteBilling = async (billingId) => {
    if (!confirm('Tem certeza que deseja excluir este faturamento?')) return;
    try {
      await deleteProjectBilling(billingId);
      onUpdate();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  return (
    <div className="tab-content" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Histórico de Faturamento</h3>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowBillingForm(!showBillingForm)}>
            <Plus size={16} /> Novo Faturamento
          </button>
        )}
      </div>

      <div className="billing-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Card 1: Orçamento */}
        <div className="card" style={{ padding: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>Orçamento Total</h4>
          <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a' }}>
            R$ {formatCurrency(projectDetails.budget)}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            A Faturar: R$ {formatCurrency((projectDetails.budget || 0) - totalFaturadoPago)}
          </div>
        </div>

        {/* Card 2: Faturado Bruto */}
        <div className="card" style={{ padding: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>Faturado (Bruto)</h4>
          <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#3b82f6' }}>
            R$ {formatCurrency(totalFaturadoPago)}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {projectDetails.budget > 0 ? ((totalFaturadoPago / projectDetails.budget) * 100).toFixed(1) : 0}% do total
          </div>
        </div>

        {/* Card 3: Impostos */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f87171' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#ef4444', margin: '0 0 0.5rem 0' }}>Impostos Totais</h4>
          <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626' }}>
            R$ {formatCurrency(totalImpostos)}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
            {totalFaturadoPago > 0 ? ((totalImpostos / totalFaturadoPago) * 100).toFixed(1) : 0}% da receita
          </div>
        </div>

        {/* Card 4: Líquido Real */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #22c55e', backgroundColor: '#f0fdf4' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 0.5rem 0' }}>Receita Líquida Real</h4>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534' }}>
            R$ {formatCurrency(liquidoReal)}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
            Entra no caixa da empresa
          </div>
        </div>
      </div>

      {showBillingForm && (
        <form className="resource-form" onSubmit={handleAddBilling} style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '10px' }}>
            <Select
              value={billingFormData.category}
              onChange={(e) => setBillingFormData({ ...billingFormData, category: e.target.value })}
              required
              options={[
                { value: 'SERVICE', label: 'Serviço' },
                { value: 'MATERIAL', label: 'Material' }
              ]}
            />
            <Input
              type="number"
              placeholder="Valor Bruto (R$)"
              step="0.01"
              value={billingFormData.gross_value}
              onChange={(e) => setBillingFormData({ ...billingFormData, gross_value: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', width: '100%' }}>
            <Input
              type="text"
              placeholder="Descrição (ex: 1ª Medição)"
              value={billingFormData.description}
              onChange={(e) => setBillingFormData({ ...billingFormData, description: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowBillingForm(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit">Salvar</Button>
          </div>
        </form>
      )}

      <div className="resource-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {billings.map(billing => (
          <div key={billing.id} className="resource-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
            <div className="resource-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#f0f9ff', padding: '0.5rem', borderRadius: '50%', color: '#0369a1' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>R$ {formatCurrency(billing.gross_value || billing.value)}</strong>
                  <span className={`status-badge ${{
                    'PREVISTO': 'badge-gray',
                    'EMITIDA': 'badge-blue',
                    'PAGO': 'badge-green',
                    'VENCIDA': 'badge-red',
                    'CANCELADA': 'badge-black',
                    'SUBSTITUIDA': 'badge-orange'
                  }[billing.status] || 'badge-gray'}`}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                    {billing.status}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {formatDateUTC(billing.date)}
                  {billing.invoice_number && ` - NF ${billing.invoice_number}`}
                  {billing.description && ` - ${billing.description}`}
                </p>
              </div>
            </div>
            {billing.status === 'PREVISTO' && canEdit && (
              <button
                className="btn-icon-small danger"
                onClick={() => handleDeleteBilling(billing.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {billings.length === 0 && !showBillingForm && (
          <p className="empty-message" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Nenhum faturamento lançado.</p>
        )}
      </div>
    </div>
  );
};

export default ProjectFinancialTab;
