import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import Kanban from './pages/Kanban';
import Projects from './pages/Projects';
import Contracts from './pages/Contracts';
import Clients from './pages/Clients';
import Collaborators from './pages/Collaborators';
import Purchases from './pages/Purchases';
import Roles from './pages/Roles';
import Fleet from './pages/Fleet';
import Tools from './pages/Tools';
import Tickets from './pages/Tickets';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/collaborators" element={<Collaborators />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tickets" element={<Tickets />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
