import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  KanbanSquare,
  Car,
  Wrench,
  Briefcase,
  Ticket,
  FileText,
  Users,
  UserCircle,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut
} from 'lucide-react';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const { logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' }, // Added dashboard permission key
    { path: '/scheduler', icon: Calendar, label: 'Scheduler', permission: 'scheduler' },
    { path: '/kanban', icon: KanbanSquare, label: 'Kanban', permission: 'kanban' },
    { path: '/clients', icon: Users, label: 'Clientes', permission: 'clients' },
    { path: '/collaborators', icon: UserCircle, label: 'Colaboradores', permission: 'collaborators' },

    { path: '/contracts', icon: FileText, label: 'Contratos', permission: 'contracts' },
    { path: '/projects', icon: Briefcase, label: 'Projetos', permission: 'projects' },
    { path: '/purchases', icon: ShoppingCart, label: 'Compras', permission: 'purchases' },
    { path: '/fleet', icon: Car, label: 'Frota', permission: 'fleet' },
    { path: '/tools', icon: Wrench, label: 'Ferramentas', permission: 'tools' },
    { path: '/accounts-receivable', icon: DollarSign, label: 'Contas a Receber', permission: 'accounts_receivable' },
    { path: '/payroll', icon: DollarSign, label: 'Folha de Pagamento', permission: 'finance' },
    { path: '/tickets', icon: Ticket, label: 'Chamados', permission: 'tickets' },
    { path: '/roles', icon: Settings, label: 'Cargos', permission: 'roles' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission, 'read');
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Centauro ERP</h1>
          <p className="logo-subtitle">Engenharia & Telecom</p>
        </div>
        <nav className="nav">
          {filteredNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button onClick={handleLogout} className="nav-item logout-button">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
