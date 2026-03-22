import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  DollarSign, Briefcase, FileText, ShoppingCart,
  Users, AlertTriangle, TrendingUp, Wallet, CheckCircle, Clock, Calendar
} from 'lucide-react';
import PurchaseManagerWidget from '../components/purchases/PurchaseManagerWidget';
import CrmTaskWidget from '../components/dashboard/CrmTaskWidget';
import ProposalModal from '../components/commercial/ProposalModal';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="stat-card flex flex-col h-full bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0] transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
    <div className="stat-header flex justify-between items-start mb-2">
      <div className="stat-info">
        <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{title}</h3>
        <p className="stat-value text-xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
      <div className="stat-icon w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={20} />
      </div>
    </div>
    {subtext && <p className="stat-subtext text-[11px] text-slate-400 mt-auto pt-2 leading-tight">{subtext}</p>}
  </div>
);

const CommercialWidget = ({ data }) => {
  if (!data) return null;
  return (
    <div className="dashboard-widget bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <h4 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 uppercase tracking-tight">
        <FileText size={20} className="text-blue-500" /> Comercial
      </h4>
      <div className="widget-grid grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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
        <div className="alert-list mt-6 pt-4 border-t border-slate-100">
          <h5 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            <AlertTriangle size={14} className="text-amber-500" /> Alerta de Consumo LPU (&gt;90%)
          </h5>
          <ul className="space-y-1 max-h-[150px] overflow-y-auto scrollbar-thin pr-2">
            {data.budget_alerts.map((alert, idx) => (
              <li key={idx} className="flex justify-between items-center py-2 text-sm border-b border-slate-50 last:border-0">
                <span className="text-slate-600 font-medium truncate pr-4">{alert.contract_number}</span>
                <span className="text-red-500 font-bold tabular-nums">{alert.percentage.toFixed(1)}%</span>
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
    <div className="dashboard-widget bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <h4 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 uppercase tracking-tight">
        <DollarSign size={20} className="text-emerald-500" /> Financeiro
      </h4>
      <div className="widget-grid grid grid-cols-1 gap-4 flex-1">
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
    <div className="dashboard-widget bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <h4 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 uppercase tracking-tight">
        <Briefcase size={20} className="text-indigo-500" /> Operacional
      </h4>
      <div className="widget-grid grid grid-cols-1 gap-4 flex-1">
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
          subtext="Recursos do dia"
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

  const isNearExpiry = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 15;
  };

  return (
    <div className="dashboard-widget bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col max-h-[550px]">
      <div className="flex-shrink-0">
        <h4 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 uppercase tracking-tight">
          <Users size={20} className="text-orange-500" /> RH & Certificações
        </h4>
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Colaboradores</span>
          <strong className="text-2xl font-black text-slate-900">{data.total_collaborators}</strong>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 min-h-0">
        <h5 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 sticky top-0 bg-white py-1">
          <Clock size={14} className="text-slate-400" /> Próximos Vencimentos
        </h5>

        {data.expiring_certifications && data.expiring_certifications.length > 0 ? (
          <ul className="space-y-0">
            {[...data.expiring_certifications]
              .sort((a, b) => new Date(a.validity) - new Date(b.validity))
              .map((item, idx) => (
              <li key={idx} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-sm font-bold text-slate-800 truncate" title={item.collaborator}>
                    {item.collaborator}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Competência atualizada</span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className={`flex items-center gap-1 text-[11px] font-bold tabular-nums mb-1 ${isNearExpiry(item.validity) ? 'text-red-500' : 'text-slate-600'}`}>
                    <Calendar size={10} />
                    {new Date(item.validity).toLocaleDateString('pt-BR')}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isNearExpiry(item.validity) ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {item.certification}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
            <CheckCircle size={16} /> Tudo em dia! Nenhuma certificação vencendo.
          </div>
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

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-medium animate-pulse">Carregando indicadores estratégicos...</div>;

  return (
    <div className="dashboard-container p-6 w-full min-h-screen bg-slate-50/10">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1 uppercase">Painel de Controle</h1>
        <p className="text-slate-500 font-medium italic text-xs">Visão estratégica em tempo real</p>
      </header>

      <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {data.finance && (hasPermission('payroll', 'read') || hasPermission('accounts_receivable', 'read')) && <FinanceWidget data={data.finance} />}
        {data.commercial && (hasPermission('contracts', 'read') || hasPermission('commercial', 'read')) && <CommercialWidget data={data.commercial} />}

        {/* CRM Tasks Widget - Linked to 'commercial' page permission */}
        {hasPermission('commercial', 'read') && <CrmTaskWidget onOpenProposal={handleOpenProposal} />}

        {data.operations && (hasPermission('projects', 'read') || hasPermission('scheduler', 'read')) && <OperationsWidget data={data.operations} />}
        {data.hr && hasPermission('collaborators', 'read') && <HRWidget data={data.hr} />}

        {/* Purchase Manager Widget - Linked to 'purchases' page permission */}
        {hasPermission('purchases', 'read') && <PurchaseManagerWidget />}

        {!data.finance && !data.commercial && !data.operations && !data.hr && (
          <div className="empty-dashboard col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Bem-vindo ao Centauro ERP</h3>
            <p className="text-slate-500">Seu perfil possui permissões limitadas para este dashboard.</p>
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
