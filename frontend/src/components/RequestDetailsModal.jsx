import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { updatePurchase, deletePurchase } from '../services/api';
import ApprovalTimeline from './ApprovalTimeline';
import './RequestDetailsModal.css';

const RequestDetailsModal = ({ request, onClose, onUpdate, context = 'projects', readOnly = false }) => {
  // context: 'projects' = pode editar descrição, solicitante, itens básicos
  // context: 'purchases' = só gerencia preço, fornecedor, pagamento, prazo, status
  // readOnly: quando true, desabilita todas edições e esconde botão salvar
  const isProjectsContext = context === 'projects';
  const [formData, setFormData] = useState({
    description: '',
    requester: '',
    status: 'pending',
    shipping_cost: 0,
    items: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        description: request.description,
        requester: request.requester || '',
        status: request.status || 'pending',
        shipping_cost: request.shipping_cost || 0,
        items: request.items || []
      });
    }
  }, [request]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta solicitação?')) {
      setLoading(true);
      try {
        await deletePurchase(request.id);
        onUpdate();
        onClose();
      } catch (error) {
        console.error('Error deleting request:', error);
        alert('Erro ao excluir solicitação');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;

    // Status Cascade Logic
    if (name === 'status') {
      if (window.confirm(`Deseja atualizar o status de todos os itens para "${value}"?`)) {

        // Map header status to item status
        let itemStatus = value;
        if (value === 'ordered') itemStatus = 'bought';
        if (value === 'received') itemStatus = 'delivered';

        setFormData(prev => ({
          ...prev,
          [name]: value,
          items: prev.items.map(item => {
            // Do not update status if item is already cancelled
            if (item.status === 'cancelled') return item;
            return { ...item, status: itemStatus };
          })
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total_price = qty * price;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          manufacturer: '',
          model: '',
          quantity: 1,
          unit: 'un',
          unit_price: 0,
          total_price: 0,
          supplier: '',
          payment_method: '',
          expected_date: '',
          status: 'pending'
        }
      ]
    }));
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare data for backend
      const dataToSend = {
        ...request, // Keep project_id and other fields
        description: formData.description,
        requester: formData.requester,
        status: formData.status,
        shipping_cost: parseFloat(formData.shipping_cost),
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          expected_date: item.expected_date || null
        }))
      };

      await updatePurchase(request.id, dataToSend);
      onUpdate(); // Refresh parent list
      onClose();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Erro ao salvar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      if (item.status === 'cancelled') return sum;
      return sum + (parseFloat(item.total_price) || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(formData.shipping_cost) || 0;
    return subtotal + shipping;
  };

  return (
    <div className="request-modal-overlay">
      <div className="request-modal" onClick={e => e.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <h3>Solicitação #{request.id}</h3>
            <span className={`status-badge ${formData.status}`}>
              {
                {
                  'pending': 'Pendente',
                  'approved': 'Aprovado',
                  'rejected': 'Rejeitado',
                  'ordered': 'Comprado',
                  'received': 'Retirado',
                  'cancelled': 'Cancelado'
                }[formData.status] || formData.status
              }
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="request-modal-content">
          {/* Header Fields */}
          <div className="request-header-form">
            <div className="form-group">
              <label>Descrição do Pacote</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleHeaderChange}
                className="input"
                disabled={!isProjectsContext || readOnly}
              />
            </div>
            <div className="form-group">
              <label>Solicitante</label>
              <input
                type="text"
                name="requester"
                value={formData.requester}
                onChange={handleHeaderChange}
                className="input"
                disabled={!isProjectsContext || readOnly}
              />
            </div>
            <div className="form-group">
              <label>Status Geral</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleHeaderChange}
                className="input"
                disabled={!isProjectsContext || readOnly}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
                <option value="ordered">Comprado</option>
                <option value="received">Retirado</option>
              </select>
            </div>
          </div>

          {/* Approval Timeline - Only in Purchases context */}
          {!isProjectsContext && (
            <ApprovalTimeline request={request} onUpdate={onUpdate} />
          )}

          {/* Items Table */}
          <div className="items-section">
            <div className="items-header">
              <h4>Itens da Solicitação</h4>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div className="shipping-input-container">
                  <label style={{ fontSize: '0.85rem', marginRight: '8px', color: '#666' }}>Valor do Frete (R$):</label>
                  <input
                    type="number"
                    name="shipping_cost"
                    value={formData.shipping_cost}
                    onChange={handleHeaderChange}
                    className="input"
                    style={{ width: '100px', padding: '4px 8px' }}
                    disabled={isProjectsContext || readOnly}
                    step="0.01"
                    min="0"
                  />
                </div>
                {isProjectsContext && !readOnly && (
                  <button className="btn btn-sm btn-secondary" onClick={addItem}>
                    <Plus size={16} /> Adicionar Item
                  </button>
                )}
              </div>
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Item / Material</th>
                    <th style={{ width: '13%' }}>Fabricante / Modelo</th>
                    <th style={{ width: '10%' }}>Qtd | Un</th>
                    <th style={{ width: '8%' }}>Preço Unit.</th>
                    <th style={{ width: '8%' }}>Total</th>
                    <th style={{ width: '12%' }}>Fornecedor</th>
                    <th style={{ width: '10%' }}>Pagamento</th>
                    <th style={{ width: '10%' }}>Prazo</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '3%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className={item.status === 'cancelled' ? 'item-row cancelled' : 'item-row'}>
                      <td>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Descrição do item"
                          className="input-cell"
                          disabled={!isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <div className="double-input">
                          <input
                            type="text"
                            value={item.manufacturer || ''}
                            onChange={(e) => handleItemChange(index, 'manufacturer', e.target.value)}
                            placeholder="Fabricante"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                          <input
                            type="text"
                            value={item.model || ''}
                            onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                            placeholder="Modelo"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="double-input">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            className="input-cell"
                            disabled={!isProjectsContext || readOnly}
                          />
                          <input
                            type="text"
                            value={item.unit || 'un'}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="Un"
                            className="input-cell"
                            style={{ width: '40px' }}
                            disabled={!isProjectsContext || readOnly}
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          step="0.01"
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <div className="read-only-value">
                          R$ {(parseFloat(item.total_price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.supplier || ''}
                          onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                          placeholder="Fornecedor"
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <select
                          value={item.payment_method || ''}
                          onChange={(e) => handleItemChange(index, 'payment_method', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        >
                          <option value="">-</option>
                          <option value="boleto">Boleto</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão</option>
                          <option value="transferencia">Transf.</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="faturado">Faturado</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={item.expected_date || ''}
                          onChange={(e) => handleItemChange(index, 'expected_date', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        />
                      </td>
                      <td>
                        <select
                          value={item.status}
                          onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                          className="input-cell"
                          disabled={isProjectsContext || readOnly}
                        >
                          <option value="pending">Pendente</option>
                          <option value="quoted">Cotado</option>
                          <option value="bought">Comprado</option>
                          <option value="in_stock">Em estoque</option>
                          <option value="delivered">Retirado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td>
                        {isProjectsContext && !readOnly ? (
                          <button
                            className="btn-icon-danger"
                            onClick={() => removeItem(index)}
                            title="Excluir item"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="request-modal-footer">
          {isProjectsContext && !readOnly && (
            <button className="btn btn-danger" onClick={handleDelete} disabled={loading} style={{ marginRight: 'auto' }}>
              <Trash2 size={18} />
              Excluir
            </button>
          )}
          {(!isProjectsContext || readOnly) && <div style={{ marginRight: 'auto' }}></div>}
          <div className="total-summary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Subtotal: R$ {calculateSubtotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Frete: R$ {(parseFloat(formData.shipping_cost) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.1rem' }}>Total Final: </span>
              <strong style={{ fontSize: '1.1rem' }}>R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
          {!readOnly && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
