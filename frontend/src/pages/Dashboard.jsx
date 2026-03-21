import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  DollarSign, Briefcase, FileText, ShoppingCart,
  Users, AlertTriangle, TrendingUp, Wallet, CheckCircle, Clock
} from 'lucide-react';
import PurchaseManagerWidget from '../components/purchases/PurchaseManagerWidget';
import CrmTaskWidget from '../components/dashboard/CrmTaskWidget';
import ProposalModal from '../components/commercial/ProposalModal';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
    <div className="stat-header">
      <div className="stat-info">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color: color }}>
        <Icon size={24} />
      </div>
    </div>
    {subtext && <p className="stat-subtext">{subtext}</p>}
  </div>
);

const CommercialWidget = ({ data }) => {
  if (!data) return null;
  return (
    <div className="dashboard-widget commercial-widget">
      <h4><FileText size={18} /> Comercial</h4>
      <div className="widget-grid">
        <StatCard
          title="Contratos Próx. Vencimento"
          value={data.expiring_contracts}
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Novos Clientes"
          value={data.total_clients}
          icon={Users}
          color="#3b82f6"
          subtext="Total na base"
        />
      </div>
      {data.budget_alerts && data.budget_alerts.length > 0 && (
        <div className="alert-list">
          <h5><AlertTriangle size={14} /> Alerta de Consumo LPU (&gt;90%)</h5>
          <ul>
            {data.budget_alerts.map((alert, idx) => (
              <li key={idx}>
                <span>{alert.contract_number}</span>
                <span className="alert-value">{alert.percentage.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const FinanceWidget = ({ data }) => {
  if (!data) return null;
  return (
    <div className="dashboard-widget finance-widget">
      <h4><DollarSign size={18} /> Financeiro</h4>
      <div className="widget-grid">
        <StatCard
          title="Receita (Mês)"
          value={`R$ ${data.monthly_revenue?.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          color="#10b981"
        />
        <StatCard
          title="Faturamento Pendente"
          value={`R$ ${data.billing_backlog?.toLocaleString('pt-BR')}`}
          icon={Wallet}
          color="#8b5cf6"
          subtext="Medições para Faturar"
        />
        <StatCard
          title="Saídas (Aprovadas)"
          value={`R$ ${data.projected_outflow?.toLocaleString('pt-BR')}`}
          icon={ShoppingCart}
          color="#ef4444"
        />
      </div>
    </div>
  );
};

const OperationsWidget = ({ data }) => {
  if (!data) return null;
  return (
    <div className="dashboard-widget operations-widget">
      <h4><Briefcase size={18} /> Operacional</h4>
      <div className="widget-grid">
        <StatCard
          title="Projetos Ativos"
          value={data.active_projects}
          icon={Briefcase}
          color="#3b82f6"
        />
        <StatCard
          title="Recursos Hoje"
          value={data.allocations_today}
          icon={Users}
          color="#6366f1"
          subtext="Colaboradores/Veículos Alocados"
        />
        <StatCard
          title="Chamados Abertos"
          value={data.open_tickets}
          icon={AlertTriangle}
          color="#f97316"
        />
      </div>
    </div>
  );
};

const HRWidget = ({ data }) => {
  if (!data) return null;
  return (
    <div className="dashboard-widget hr-widget">
      <h4><Users size={18} /> RH & Certificações</h4>
      <div className="widget-content">
        <div className="stat-row">
          <span>Total Colaboradores:</span>
          <strong>{data.total_collaborators}</strong>
        </div>
        {data.expiring_certifications && data.expiring_certifications.length > 0 ? (
          <div className="expiring-list">
            <h5>Vencimentos Próximos (45 dias):</h5>
            <ul>
              {data.expiring_certifications.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.collaborator}</strong> - {item.certification} ({new Date(item.validity).toLocaleDateString('pt-BR')})
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="success-msg"><CheckCircle size={14} /> Nenhuma certificação vencendo.</p>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState({
    commercial: null,
    finance: null,
    operations: null,
    hr: null,
    fleet: null
  });
  const [loading, setLoading] = useState(true);

  // Proposal Modal State
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const handleOpenProposal = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const newData = {};

      try {
        const promises = [];

        // Parallel fetching based on permissions
        if (hasPermission('contracts', 'read') || hasPermission('commercial', 'read')) {
          promises.push(api.get('/dashboard/commercial').then(res => newData.commercial = res.data).catch(err => console.log('Commercial denied')));
        }
        if (hasPermission('payroll', 'read') || hasPermission('accounts_receivable', 'read')) {
          promises.push(api.get('/dashboard/finance').then(res => newData.finance = res.data).catch(err => console.log('Finance denied')));
        }
        if (hasPermission('projects', 'read') || hasPermission('scheduler', 'read')) {
          promises.push(api.get('/dashboard/operations').then(res => newData.operations = res.data).catch(err => console.log('Ops denied')));
        }
        if (hasPermission('collaborators', 'read')) {
          promises.push(api.get('/dashboard/hr').then(res => newData.hr = res.data).catch(err => console.log('HR denied')));
        }
        // Fleet later if needed

        await Promise.all(promises);
        setData(newData);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [hasPermission]);

  if (loading) return <div className="dashboard-loading">Carregando indicadores...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Visão geral de indicadores</p>
      </header>

      <div className="dashboard-grid">
        {data.finance && (hasPermission('payroll', 'read') || hasPermission('accounts_receivable', 'read')) && <FinanceWidget data={data.finance} />}
        {data.commercial && (hasPermission('contracts', 'read') || hasPermission('commercial', 'read')) && <CommercialWidget data={data.commercial} />}

        {/* CRM Tasks Widget - Linked to 'commercial' page permission */}
        {hasPermission('commercial', 'read') && <CrmTaskWidget onOpenProposal={handleOpenProposal} />}

        {data.operations && (hasPermission('projects', 'read') || hasPermission('scheduler', 'read')) && <OperationsWidget data={data.operations} />}
        {data.hr && hasPermission('collaborators', 'read') && <HRWidget data={data.hr} />}

        {/* Purchase Manager Widget - Linked to 'purchases' page permission */}
        {hasPermission('purchases', 'read') && <PurchaseManagerWidget />}

        {!data.finance && !data.commercial && !data.operations && !data.hr && (
          <div className="empty-dashboard">
            <h3>Bem-vindo, {user?.email}</h3>
            <p>Selecione um módulo no menu lateral para começar.</p>
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      <ProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        proposal={selectedProposal}
        onSuccess={() => { }}
      />
    </div>
  );
};

export default Dashboard;
