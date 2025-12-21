import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Info, DollarSign, PieChart } from 'lucide-react';
import { uploadPayroll } from '../../services/api';

const Payroll = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await uploadPayroll(formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o arquivo. Verifique se o formato está correto (Colunas D=Custo, G=Matrícula).');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="payroll-page" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>Financeiro de Pessoal</h1>
        <p style={{ color: '#64748b' }}>Importação de Folha e Rateio de Custos por Projeto</p>
      </header>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={20} className="text-blue-600" color="#2563eb" />
              Upload da Folha de Pagamento (.xlsx)
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
              O sistema irá ler a <strong>Coluna G (Matrícula)</strong> e <strong>Coluna D (Custo Total)</strong> para distribuir os valores conforme as alocações no Scheduler.
            </p>

            <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label
                htmlFor="file-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  background: 'white',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  maxWidth: '300px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <FileText size={16} />
                {file ? file.name : 'Escolher arquivo...'}
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !file}
                style={{
                  background: (loading || !file) ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontWeight: '500',
                  cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                {loading ? 'Processando...' : 'Processar Arquivo'}
              </button>
            </form>
            {error && (
              <div style={{ marginTop: '1rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </div>

          <div style={{ width: '300px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            <strong>Como funciona o cálculo?</strong>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Identifica o colaborador pela matrícula.</li>
              <li>Busca os dias trabalhados em cada obra no período.</li>
              <li>Calcula o custo diário (Custo Total / Dias Totais).</li>
              <li>Distribui o custo proporcionalmente para cada projeto.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="results-section">
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.5rem' }}>Total Processado</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1e3a8a' }}>{result.total_processed} Colaboradores</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600', marginBottom: '0.5rem' }}>Custo Alocado (Sucesso)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#14532d' }}>{formatCurrency(result.total_allocated_cost)}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', marginBottom: '0.5rem' }}>Não Alocado (Ocioso)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#7f1d1d' }}>{formatCurrency(result.total_unallocated_cost)}</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#475569' }}>
              Detalhamento por Colaborador
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Matrícula</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Nome</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Custo Total</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Dias Alocados</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Custo Diário</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Não Alocado</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', color: '#64748b' }}>{item.registration_number || '-'}</td>
                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: '500', color: '#1e293b' }}>{item.collaborator_name}</td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.9rem', color: '#1e293b' }}>{formatCurrency(item.total_cost)}</td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                        background: item.total_days_found > 0 ? '#dcfce7' : '#fee2e2',
                        color: item.total_days_found > 0 ? '#166534' : '#991b1b'
                      }}>
                        {item.total_days_found} dias
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.9rem', color: '#64748b' }}>
                      {item.total_days_found > 0 ? formatCurrency(item.calculated_daily_rate) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: item.unallocated_cost > 0 ? '600' : '400', color: item.unallocated_cost > 0 ? '#ef4444' : '#cbd5e1' }}>
                      {formatCurrency(item.unallocated_cost)}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
                      {item.project_costs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {item.project_costs.map((pc, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                              <span>{pc.project_name}:</span>
                              <span style={{ fontWeight: '500' }}>{pc.days_worked}d ({formatCurrency(pc.cost_value)})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Sem projetos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
