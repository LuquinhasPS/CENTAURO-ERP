import React from 'react';
import { Users, Calendar, DollarSign, FileText, Edit } from 'lucide-react';
import { formatDateUTC, formatCurrency } from '../../../utils/formatters';

const ProjectInfoTab = ({ project, clients, purchases, totalInvoiced, onEdit, canEdit }) => {

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'N/A';
  };

  const getStatusColor = (status) => {
    // You might want to move this to a shared util or CSS
    return '#64748b'; // Default gray
  };

  // Cost Breakdown Logic
  const previstoMaterial = Number(project.material_value) || 0;
  const previstoMO = Number(project.service_value) || 0;

  const realizadoMaterial = purchases.reduce((acc, p) => acc + (p.items?.reduce((iAcc, item) => iAcc + (item.total_price || 0), 0) || 0) + (p.shipping_cost || 0), 0);
  const realizadoMO = Number(project.total_labor_cost) || 0;

  const saldoMaterial = previstoMaterial - realizadoMaterial;
  const saldoMO = previstoMO - realizadoMO;
  const saldoTotal = saldoMaterial + saldoMO;

  const getColor = (val) => val >= 0 ? '#16a34a' : '#dc2626';
  const getBgColor = (val) => val >= 0 ? '#f0fdf4' : '#fef2f2';

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>

      {/* Header / Actions - REMOVED (Moved to ProjectModal Header) */}

      {/* Data Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>

        {/* 1. Project & Team Data */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} /> Dados & Equipe
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Cliente</label>
              <span style={{ fontWeight: '500', color: '#334155' }}>{getClientName(project.client_id)}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Coordenador</label>
              <span style={{ fontWeight: '500', color: '#334155' }}>{project.coordinator || 'Não definido'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Tamanho da Equipe</label>
              <span style={{ fontWeight: '500', color: '#334155' }}>
                {project.team_size ? `${project.team_size} pessoas` : '-'}
                {project.estimated_days && (
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>
                    • {project.estimated_days} dias
                  </span>
                )}
              </span>
            </div>
            {project.directory_url && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Diretório</label>
                <a 
                  href={project.directory_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontWeight: '500', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileText size={14} /> Abrir Pasta do Projeto
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 2. Timeline */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Prazos
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Grid for Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>

              {/* Headers */}
              <div></div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700' }}>Início</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700' }}>Fim</div>

              {/* Predicted Row */}
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Previsto</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                {formatDateUTC(project.estimated_start_date)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                {formatDateUTC(project.estimated_end_date)}
              </div>

              {/* Real Row */}
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0f172a' }}>Real</div>
              <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                {formatDateUTC(project.start_date) || '-'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                {formatDateUTC(project.end_date) || '-'}
              </div>

            </div>

            {project.warranty_months && project.end_date && (
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Garantia ({project.warranty_months} m)</label>
                <span style={{
                  fontSize: '0.85rem', fontWeight: '600',
                  color: (() => {
                    const endDate = new Date(project.end_date + 'T12:00:00');
                    const warrantyEnd = new Date(endDate);
                    warrantyEnd.setMonth(warrantyEnd.getMonth() + project.warranty_months);
                    return warrantyEnd < new Date() ? '#ef4444' : '#10b981';
                  })()
                }}>
                  Até {(() => {
                    const endDate = new Date(project.end_date + 'T12:00:00');
                    const warrantyEnd = new Date(endDate);
                    warrantyEnd.setMonth(warrantyEnd.getMonth() + project.warranty_months);
                    return warrantyEnd.toLocaleDateString('pt-BR');
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Contract Financials */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} /> Contrato
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Orçamento Total</label>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>R$ {formatCurrency(project.budget)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Saldo a Faturar</label>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>R$ {formatCurrency((Number(project.budget) || 0) - totalInvoiced)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Já Faturado</label>
              <span style={{ fontWeight: '600', color: '#16a34a' }}>R$ {formatCurrency(totalInvoiced)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Cost Breakdown (Operational) */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>Detalhamento de Custos (Material & Mão de Obra)</h4>
        </div>
        <div style={{ padding: '1rem' }}>
          {/* Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Tipo</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Material</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Mão de Obra</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Total</div>
          </div>

          {/* Previsto Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Previsto</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
              R$ {formatCurrency(project.material_value)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
              R$ {formatCurrency(project.service_value)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', textAlign: 'right', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
              R$ {formatCurrency(previstoMaterial + previstoMO)}
            </div>
          </div>

          {/* Realizado Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Realizado</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
              R$ {formatCurrency(realizadoMaterial)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', textAlign: 'right' }}>
              R$ {formatCurrency(realizadoMO)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', textAlign: 'right', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
              R$ {formatCurrency(realizadoMaterial + realizadoMO)}
            </div>
          </div>

          {/* Separator */}
          <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: '0.75rem' }}></div>

          {/* Saldo Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Economia</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: getColor(saldoMaterial), textAlign: 'right' }}>
              R$ {formatCurrency(saldoMaterial)}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: getColor(saldoMO), textAlign: 'right' }}>
              R$ {formatCurrency(saldoMO)}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: getColor(saldoTotal), textAlign: 'right', background: getBgColor(saldoTotal), padding: '4px', borderRadius: '4px' }}>
              R$ {formatCurrency(saldoTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Scope Section */}
      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>
          <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} /> Escopo do Projeto
        </h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
          {project.scope || 'Nenhum escopo definido para este projeto.'}
        </p>
      </div>

    </div>
  );
};

export default ProjectInfoTab;
