import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  KanbanSquare,
  TrendingUp,
  Users,
  UserCircle,
  FileText,
  Briefcase,
  ShoppingCart,
  Car,
  Wrench,
  DollarSign,
  Ticket,
  Settings,
  LogOut,
  Activity
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  const { hasPermission } = useAuth();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', permission: 'dashboard' },
    { name: 'Scheduler', icon: Calendar, path: '/scheduler', permission: 'scheduler' },
    { name: 'Kanban', icon: KanbanSquare, path: '/kanban', permission: 'kanban' },
    { name: 'Comercial/CRM', icon: TrendingUp, path: '/commercial', permission: 'commercial' },
    { name: 'Clientes', icon: Users, path: '/clients', permission: 'clients' },
    { name: 'Colaboradores', icon: UserCircle, path: '/collaborators', permission: 'collaborators' },
    { name: 'Contratos', icon: FileText, path: '/contracts', permission: 'contracts' },
    { name: 'Projetos', icon: Briefcase, path: '/projects', permission: 'projects' },
    { name: 'Compras', icon: ShoppingCart, path: '/purchases', permission: 'purchases' },
    { name: 'Frota', icon: Car, path: '/fleet', permission: 'fleet' },
    { name: 'Ferramentas', icon: Wrench, path: '/tools', permission: 'tools' },
    { name: 'Contas a Receber', icon: DollarSign, path: '/accounts-receivable', permission: 'accounts_receivable' },
    { name: 'Folha de Pag.', icon: DollarSign, path: '/payroll', permission: 'payroll' },
    { name: 'Chamados', icon: Ticket, path: '/tickets', permission: 'tickets' },
    { name: 'Cargos', icon: Settings, path: '/roles', permission: 'roles' },
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <aside className="group flex flex-col h-screen bg-[#13151b] border-r border-[#1f212e] transition-all duration-300 ease-in-out w-16 hover:w-64 overflow-hidden shadow-2xl z-50 fixed left-0 top-0">

      {/* Cabeçalho / Logo */}
      <div className="flex items-center h-20 flex-shrink-0 border-b border-[#1f212e]">
        <div className="w-12 h-12 ml-4 flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Centauro Logo" className="w-10 h-10 object-contain rounded-md" />
        </div>
        <div className="flex flex-col whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pl-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Centauro ERP</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Engenharia</p>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 space-y-2 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center h-12 ml-2 w-12 group-hover:w-[calc(100%-1rem)] rounded-xl overflow-hidden transition-all duration-200 ${isActive
                ? '!text-white bg-[#dc2626] shadow-md shadow-red-900/20'
                : '!text-white hover:bg-[#1f212e] hover:!text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Container do ícone */}
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                {/* Rótulo do menu */}
                <span className="font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pl-1">
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé / Sair */}
      <div className="mb-4 mt-auto border-t border-[#1f212e] pt-4">
        <button
          className="flex items-center h-12 ml-2 w-12 group-hover:w-[calc(100%-1rem)] rounded-xl overflow-hidden !text-white hover:bg-[#1f212e] hover:!text-white transition-all duration-200 cursor-pointer"
          onClick={onLogout}
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <LogOut size={22} />
          </div>
          <span className="font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pl-1">
            Sair
          </span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
