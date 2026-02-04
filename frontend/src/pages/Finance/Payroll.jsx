import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Info, DollarSign, PieChart, Calendar } from 'lucide-react';
import { uploadPayroll, getPayrollPeriods, getPayrollDetails } from '../../services/api';

const Payroll = () => {
  // Upload State
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New Upload Date State
  const today = new Date();
  const [uploadDate, setUploadDate] = useState({
    month: today.getMonth() + 1, // 1-12
    year: today.getFullYear()
  });

  // Data Viewing State
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null); // 'YYYY-MM-DD'
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodData(selectedPeriod);
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const response = await getPayrollPeriods();
      setPeriods(response.data);
      if (response.data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(response.data[0]); // Select most recent by default
      }
    } catch (err) {
      console.error('Error loading periods:', err);
    }
  };

  const loadPeriodData = async (dateString) => {
    setLoadingDetails(true);
    try {
      const date = new Date(dateString);
      // Backend expects month and year (integers)
      // Note: dateString from backend is YYYY-MM-DD. 
      // JavaScript new Date(YYYY-MM-DD) interprets as UTC.
      // We should parse carefully or just split string to be safe.
      const [yearStr, monthStr] = dateString.split('-');

      const response = await getPayrollDetails(parseInt(monthStr), parseInt(yearStr));
      setDetails(response.data);
    } catch (err) {
      console.error('Error loading details:', err);
      setError('Erro ao carregar detalhes do período.');
    } finally {
      setLoadingDetails(false);
    }
  };

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
    formData.append('month', uploadDate.month);
    formData.append('year', uploadDate.year);

    setLoading(true);
    setDetails(null);
    setError('');

    try {
      const response = await uploadPayroll(formData);
      // On success, reload periods and select the new one
      await loadPeriods();

      // Construct the date string for the newly uploaded period to select it
      // Format: YYYY-MM-DD
      const newPeriodStr = `${uploadDate.year}-${String(uploadDate.month).padStart(2, '0')}-01`;
      setSelectedPeriod(newPeriodStr);
      setDetails(response.data);
      setFile(null); // Clear file input

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

  const formatMonthYear = (dateString) => {
    if (!dateString) return '';
    // Safely parse split YYYY-MM-DD
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

    // Capitalize first letter (pt-BR returns lowercase)
    const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="payroll-page" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>Financeiro de Pessoal</h1>
        <p style={{ color: '#64748b' }}>Gestão de Folha de Pagamento por Competência</p>
      </header>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>

        {/* Upload Card */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} className="text-blue-600" color="#2563eb" />
            Nova Importação / Atualizar Mês
          </h3>

          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Month Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Mês</label>
              <select
                value={uploadDate.month}
                onChange={(e) => setUploadDate({ ...uploadDate, month: parseInt(e.target.value) })}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', width: '120px' }}
                disabled={loading}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Ano</label>
              <input
                type="number"
                value={uploadDate.year}
                onChange={(e) => setUploadDate({ ...uploadDate, year: parseInt(e.target.value) })}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', width: '100px' }}
                disabled={loading}
              />
            </div>

            {/* File Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Arquivo (.xlsx)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label
                  htmlFor="file-upload"
                  style={{
                    flex: 1,
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
              </div>
            </div>

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
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                height: '42px' // Match input height roughly
              }}
            >
              {loading ? 'Enviando...' : 'Carregar'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: '1rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '1px' }}>
          {periods.map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: '0.75rem 1.5rem',
                background: selectedPeriod === period ? 'white' : 'transparent',
                border: '1px solid',
                borderColor: selectedPeriod === period ? '#e2e8f0' : 'transparent',
                borderBottomColor: selectedPeriod === period ? 'white' : 'transparent',
                borderRadius: '0.5rem 0.5rem 0 0',
                color: selectedPeriod === period ? '#2563eb' : '#64748b',
                fontWeight: selectedPeriod === period ? '600' : '500',
                cursor: 'pointer',
                marginBottom: '-1px', // Connect to content below cleanly
                position: 'relative',
                whiteSpace: 'nowrap'
              }}
            >
              {formatMonthYear(period)}
            </button>
          ))}
          {periods.length === 0 && (
            <span style={{ padding: '0.75rem', color: '#94a3b8' }}>Nenhum período importado</span>
          )}
        </div>

        {/* Period Content */}
        {loadingDetails ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Carregando dados...</div>
        ) : details ? (
          <div className="results-section">
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.5rem' }}>Total Processado</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1e3a8a' }}>{details.total_processed} Colaboradores</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600', marginBottom: '0.5rem' }}>Custo Alocado (Sucesso)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#14532d' }}>{formatCurrency(details.total_allocated_cost)}</div>
              </div>
              <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', marginBottom: '0.5rem' }}>Não Alocado (Ocioso)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#7f1d1d' }}>{formatCurrency(details.total_unallocated_cost)}</div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Matrícula</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Nome</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Custo Total</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Dias Alocados</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Custo Diário</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Não Alocado</th>
                      <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Distribuição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.details.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#64748b' }}>{item.registration_number || '-'}</td>
                        <td style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', fontWeight: '500', color: '#1e293b' }}>{item.collaborator_name}</td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', color: '#1e293b' }}>{formatCurrency(item.total_cost)}</td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                            background: item.total_days_found > 0 ? '#dcfce7' : '#fee2e2',
                            color: item.total_days_found > 0 ? '#166534' : '#991b1b'
                          }}>
                            {item.total_days_found} dias
                          </span>
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                          {item.total_days_found > 0 ? formatCurrency(item.calculated_daily_rate) : '-'}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: item.unallocated_cost > 0 ? '600' : '400', color: item.unallocated_cost > 0 ? '#ef4444' : '#cbd5e1' }}>
                          {formatCurrency(item.unallocated_cost)}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                          {item.project_costs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              {item.project_costs.map((pc, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', gap: '1rem' }}>
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
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
            <PieChart size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>Selecione um mês ou faça uma importação para visualizar os dados.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Payroll;
