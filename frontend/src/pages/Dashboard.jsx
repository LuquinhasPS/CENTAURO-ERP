import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Briefcase, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getProjects, getTickets } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, ticketsRes] = await Promise.all([
        getProjects(),
        getTickets()
      ]);
      setProjects(projectsRes.data);
      setTickets(ticketsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from real projects
  const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
  const totalInvoiced = projects.reduce((sum, p) => sum + (parseFloat(p.invoiced) || 0), 0);
  const activeProjects = projects.filter(p => p.end_date === null || new Date(p.end_date) > new Date()).length;
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate monthly data from projects
  const getMonthlyData = () => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const monthlyData = [];

    for (let month = 0; month < 6; month++) {
      const monthProjects = projects.filter(p => {
        if (!p.start_date) return false;
        const startDate = new Date(p.start_date);
        return startDate.getMonth() === month && startDate.getFullYear() === currentYear;
      });

      const orcado = monthProjects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
      const realizado = monthProjects.reduce((sum, p) => sum + (parseFloat(p.invoiced) || 0), 0);

      monthlyData.push({
        month: monthNames[month],
        orcado,
        realizado
      });
    }

    // If no real data, add a placeholder
    if (monthlyData.every(d => d.orcado === 0 && d.realizado === 0)) {
      return [
        { month: 'Jan', orcado: 0, realizado: 0 },
        { month: 'Fev', orcado: 0, realizado: 0 },
        { month: 'Mar', orcado: 0, realizado: 0 },
        { month: 'Abr', orcado: 0, realizado: 0 },
        { month: 'Mai', orcado: 0, realizado: 0 },
        { month: 'Jun', orcado: 0, realizado: 0 },
      ];
    }

    return monthlyData;
  };

  const financialData = getMonthlyData();

  const stats = [
    { label: 'Total Orçado', value: formatCurrency(totalBudget), icon: DollarSign, color: '#3b82f6' },
    { label: 'Total Realizado', value: formatCurrency(totalInvoiced), icon: TrendingUp, color: '#10b981' },
    { label: 'Projetos Ativos', value: activeProjects.toString(), icon: Briefcase, color: '#f59e0b' },
    { label: 'Tickets Abertos', value: openTickets.toString(), icon: AlertCircle, color: '#ef4444' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Visão Geral de Projetos e Financeiro</p>
      </header>

      {loading ? (
        <div className="loading">Carregando dados...</div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                <div className="stat-icon" style={{ background: `${stat.color}15` }}>
                  <stat.icon size={24} color={stat.color} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">{stat.label}</p>
                  <h3 className="stat-value">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Orçado vs Realizado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="orcado" fill="#3b82f6" name="Orçado" />
                  <Bar dataKey="realizado" fill="#10b981" name="Realizado" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Tendência Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="orcado" stroke="#3b82f6" name="Orçado" strokeWidth={2} />
                  <Line type="monotone" dataKey="realizado" stroke="#10b981" name="Realizado" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {projects.length === 0 && (
            <div className="empty-state">
              <Briefcase size={48} color="#94a3b8" />
              <p>Nenhum projeto cadastrado ainda. Comece criando um projeto!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
