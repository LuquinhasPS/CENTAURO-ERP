import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Filter, Package } from 'lucide-react';
import { getPurchases, createPurchase, getProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RequestDetailsModal from '../components/purchases/RequestDetailsModal';
import DataTable from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import './Purchases.css';

const Purchases = () => {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('purchases', 'edit');
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const [searchTerm, setSearchTerm] = useState('');

  // Get requester name from logged user
  const getRequesterName = () => {
    return user?.collaborator_name || user?.email?.split('@')[0] || '';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refreshSelectedId = null) => {
    try {
      const [requestsRes, projectsRes] = await Promise.all([
        getPurchases(),
        getProjects()
      ]);
      setRequests(requestsRes.data);
      setProjects(projectsRes.data);

      // If we have a selected request, update it with fresh data
      const idToRefresh = refreshSelectedId || selectedRequest?.id;
      if (idToRefresh) {
        const updatedRequest = requestsRes.data.find(r => r.id === idToRefresh);
        if (updatedRequest) {
          setSelectedRequest(updatedRequest);
        }
      }
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
        requester: getRequesterName(), // Auto-fill requester with logged user
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

  const calculateTotal = (request) => {
    const itemsTotal = (request.items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
    return itemsTotal + (request.shipping_cost || 0);
  };

  return (
    <div className="purchases">
      <header className="purchases-header">
        <div>
          <h1>Compras & Solicitações</h1>
          <p>Gestão de compras e pedidos de material</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleCreateRequest}>
            <Plus size={20} />
            Nova Solicitação
          </button>
        )}
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

      <div style={{ paddingBottom: '2rem' }}>
        <DataTable
          columns={[
            { header: 'ID', accessor: 'id', render: row => <span style={{ color: '#64748b' }}>#{row.id}</span> },
            { header: 'Descrição / Pacote', accessor: 'description', render: row => <strong>{row.description}</strong> },
            { header: 'Solicitante', accessor: 'requester', render: row => row.requester || '-' },
            { header: 'Projeto', accessor: 'project_id', render: row => getProjectName(row.project_id) },
            { header: 'Data', accessor: 'created_at', render: row => new Date(row.created_at).toLocaleDateString('pt-BR') },
            {
              header: 'Total Estimado', accessor: 'total', render: row => (
                <span style={{ textAlign: 'right', display: 'block' }}>
                  R$ {calculateTotal(row).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )
            },
            {
              header: 'Status', accessor: 'status', render: row => {
                const statusLabels = {
                  'pending': 'Pendente',
                  'approved': 'Aprovado',
                  'rejected': 'Rejeitado',
                  'ordered': 'Comprado',
                  'received': 'Retirado',
                  'cancelled': 'Cancelado'
                };
                return <StatusBadge status={statusLabels[row.status] || row.status} />;
              }
            }
          ]}
          data={filteredRequests}
          actions={false}
          onRowClick={(request) => setSelectedRequest(request)}
        />
      </div>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={() => loadData(selectedRequest.id)}
          readOnly={!canEdit}
          context="purchases"
        />
      )}
    </div>
  );
};

export default Purchases;
