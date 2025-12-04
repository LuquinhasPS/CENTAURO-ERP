import { Link, useLocation } from 'react-router-dom';
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
  Settings
} from 'lucide-react';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
    { path: '/kanban', icon: KanbanSquare, label: 'Kanban' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/collaborators', icon: UserCircle, label: 'Colaboradores' },
    { path: '/contracts', icon: FileText, label: 'Contratos' },
    { path: '/projects', icon: Briefcase, label: 'Projetos' },
    { path: '/purchases', icon: ShoppingCart, label: 'Compras' },
    { path: '/fleet', icon: Car, label: 'Frota' },
    { path: '/tools', icon: Wrench, label: 'Ferramentas' },
    { path: '/accounts-receivable', icon: DollarSign, label: 'Contas a Receber' },
    { path: '/tickets', icon: Ticket, label: 'Chamados' },
    { path: '/roles', icon: Settings, label: 'Cargos' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Centauro ERP</h1>
          <p className="logo-subtitle">Engenharia & Telecom</p>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
