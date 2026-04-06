import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AICopilotWidget from './components/shared/AICopilotWidget';
import Layout from './components/shared/Layout';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import Kanban from './pages/Kanban';
import Commercial from './pages/Commercial';
import Projects from './pages/Projects';
import Contracts from './pages/Contracts';
import Clients from './pages/Clients';
import Collaborators from './pages/Collaborators';
import Purchases from './pages/Purchases';
import Roles from './pages/Roles';
import Fleet from './pages/Fleet';
import Tools from './pages/Tools';
import Tickets from './pages/Tickets';
import AccountsReceivable from './pages/AccountsReceivable';
import Payroll from './pages/Finance/Payroll';
import Engineering from './pages/Engineering';

import Login from './pages/Login';
import PrivateRoute from './components/shared/PrivateRoute';
import { AuthProvider } from './context/AuthContext';


function App() {
  return (
    <Router>
      <AICopilotWidget />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <PrivateRoute requiredPermission="dashboard">
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />

          {/* Protect all other routes similarly, or Wrap Layout itself in PrivateRoute? 
              Wrapping Layout is cleaner if Layout contains the Sidebar that assumes user is logged in.
          */}

          <Route path="/scheduler" element={<PrivateRoute requiredPermission="scheduler"><Layout><Scheduler /></Layout></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute requiredPermission="kanban"><Layout><Kanban /></Layout></PrivateRoute>} />
          <Route path="/commercial" element={<PrivateRoute requiredPermission="commercial"><Layout><Commercial /></Layout></PrivateRoute>} />
          <Route path="/engineering" element={<PrivateRoute requiredPermission="engineering_crm"><Layout><Engineering /></Layout></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute requiredPermission="clients"><Layout><Clients /></Layout></PrivateRoute>} />
          <Route path="/contracts" element={<PrivateRoute requiredPermission="contracts"><Layout><Contracts /></Layout></PrivateRoute>} />
          <Route path="/collaborators" element={<PrivateRoute requiredPermission="collaborators"><Layout><Collaborators /></Layout></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute requiredPermission="projects"><Layout><Projects /></Layout></PrivateRoute>} />
          <Route path="/purchases" element={<PrivateRoute requiredPermission="purchases"><Layout><Purchases /></Layout></PrivateRoute>} />
          <Route path="/roles" element={<PrivateRoute requiredPermission="roles"><Layout><Roles /></Layout></PrivateRoute>} />

          <Route path="/fleet" element={<PrivateRoute requiredPermission="fleet"><Layout><Fleet /></Layout></PrivateRoute>} />
          <Route path="/tools" element={<PrivateRoute requiredPermission="tools"><Layout><Tools /></Layout></PrivateRoute>} />
          <Route path="/tickets" element={<PrivateRoute requiredPermission="tickets"><Layout><Tickets /></Layout></PrivateRoute>} />
          <Route path="/accounts-receivable" element={<PrivateRoute requiredPermission="accounts_receivable"><Layout><AccountsReceivable /></Layout></PrivateRoute>} />
          <Route path="/payroll" element={<PrivateRoute requiredPermission="payroll"><Layout><Payroll /></Layout></PrivateRoute>} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
