import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { getContracts, createContract, deleteContract, getClients } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Contracts.css';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    description: '',
  });

  useEffect(() => {
    loadContracts();
    loadClients();
  }, []);

  const loadContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createContract({
        ...formData,
        client_id: parseInt(formData.client_id),
      });
      setShowForm(false);
      setFormData({
        client_id: '',
        description: '',
      });
      loadContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Erro ao criar contrato: ' + error.response?.data?.detail);
    }
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteContract(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Erro ao excluir contrato');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="contracts">
      <header className="contracts-header">
        <div>
          <h1>Gestão de Contratos</h1>
          <p>Contratos guardar chuva vinculados a clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          Novo Contrato
        </button>
      </header>

      {showForm && (
        <div className="contract-form-modal">
          <div className="contract-form card">
            <h3>Criar Contrato</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Cliente *</label>
                  <select
                    name="client_id"
                    className="input"
                    value={formData.client_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Descrição/Título *</label>
                  <input
                    type="text"
                    name="description"
                    className="input"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="ex: Contrato Ternium 2024"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="contracts-grid">
        {loading ? (
          <div className="loading">Carregando contratos...</div>
        ) : contracts.length === 0 ? (
          <div className="empty-state card">
            <FileText size={48} color="#94a3b8" />
            <p>Nenhum contrato cadastrado ainda.</p>
          </div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} className="contract-card card">
              <div className="contract-header">
                <div className="contract-icon">
                  <FileText size={20} />
                </div>
              </div>
              <h3 className="contract-title">{contract.description}</h3>
              <p className="contract-id">ID: {contract.id}</p>
              <div className="contract-actions">
                <button className="btn-icon-small danger" onClick={() => handleDelete(contract.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Contracts;
