import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Filter, Package } from 'lucide-react';
import { getPurchases, createPurchase, getProjects } from '../services/api';
import RequestDetailsModal from '../components/RequestDetailsModal';
import './Purchases.css';

const Purchases = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, projectsRes] = await Promise.all([
        getPurchases(),
        getProjects()
      ]);
      setRequests(requestsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      const newRequest = {
        description: 'Nova Solicitação',
        status: 'pending',
        items: []
      };
      const response = await createPurchase(newRequest);
      await loadData();
      // Open the newly created request
      const createdRequest = response.data;
      // We need to fetch it again to ensure we have the full object structure if needed, 
      // but response should be enough.
      setSelectedRequest(createdRequest);
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Erro ao criar solicitação');
    }
  };

  const getProjectName = (id) => {
    if (!id) return '-';
    const project = projects.find(p => p.id === id);
    return project ? project.name : '-';
  };

  const filteredRequests = requests.filter(r => {
    // Status Filter
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;

    // Project Filter
    if (filterProject !== 'all' && r.project_id !== parseInt(filterProject)) return false;

    // Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const description = r.description?.toLowerCase() || '';
      const requester = r.requester?.toLowerCase() || '';
      const projectName = getProjectName(r.project_id).toLowerCase();

      return description.includes(term) || requester.includes(term) || projectName.includes(term);
    }

    return true;
  });

  const calculateTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  return (
    <div className="purchases">
      <header className="purchases-header">
        <div>
          <h1>Compras & Solicitações</h1>
          <p>Gestão de pacotes de solicitação de compra</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateRequest}>
          <Plus size={20} />
          Nova Solicitação
        </button>
      </header>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Buscar por Descrição, Solicitante ou Projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <label className="label">Status</label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
                <option value="ordered">Comprado</option>
                <option value="received">Retirado</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="label">Projeto</label>
              <select
                className="input"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">Todos</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="purchases-list card">
        {loading ? (
          <div className="loading">Carregando solicitações...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <p>Nenhuma solicitação encontrada.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Descrição / Pacote</th>
                <th>Solicitante</th>
                <th>Projeto</th>
                <th>Data</th>
                <th>Total Estimado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="clickable-row"
                >
                  <td>#{request.id}</td>
                  <td><strong>{request.description}</strong></td>
                  <td>{request.requester || '-'}</td>
                  <td>{getProjectName(request.project_id)}</td>
                  <td>{new Date(request.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>R$ {calculateTotal(request.items).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`status-badge ${request.status}`}>
                      {
                        {
                          'pending': 'Pendente',
                          'approved': 'Aprovado',
                          'rejected': 'Rejeitado',
                          'ordered': 'Comprado',
                          'received': 'Retirado',
                          'cancelled': 'Cancelado'
                        }[request.status] || request.status
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={loadData}
          context="purchases"
        />
      )}
    </div>
  );
};

export default Purchases;
