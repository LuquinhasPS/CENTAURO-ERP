/**
 * Operational API Module
 * Collaborators, Allocations, Certifications, Education, Reviews, Fleet, Tools, Maintenance
 */
import api from './core';

// Allocations
export const getAllocations = (teamIds = []) => {
  const params = teamIds.length > 0
    ? '?' + teamIds.map(id => `team_ids=${id}`).join('&')
    : '';
  return api.get(`/operational/allocations${params}`);
};
export const createAllocation = (data) => api.post('/operational/allocations', data);
export const updateAllocation = (id, data) => api.put(`/operational/allocations/${id}`, data);
export const deleteAllocation = (id) => api.delete(`/operational/allocations/${id}`);
export const deleteBatchAllocations = (ids) => api.post('/operational/allocations/batch-delete', { ids });

// Collaborators
export const getCollaborators = () => api.get('/operational/collaborators');
export const createCollaborator = (data) => api.post('/operational/collaborators', data);
export const updateCollaborator = (id, data) => api.put(`/operational/collaborators/${id}`, data);
export const deleteCollaborator = (id) => api.delete(`/operational/collaborators/${id}`);

// Certifications
export const getCertifications = (collaboratorId) => api.get(`/operational/certifications/${collaboratorId}`);
export const createCertification = (data) => api.post('/operational/certifications', data);
export const deleteCertification = (id) => api.delete(`/operational/certifications/${id}`);

// Education
export const getCollaboratorEducation = (collaboratorId) => api.get(`/operational/education/${collaboratorId}`);
export const createCollaboratorEducation = (data) => api.post('/operational/education', data);
export const deleteCollaboratorEducation = (id) => api.delete(`/operational/education/${id}`);

// Reviews & Performance
export const getCollaboratorReviews = (collaboratorId) => api.get(`/operational/reviews/${collaboratorId}`);
export const createCollaboratorReview = (data) => api.post('/operational/reviews', data);
export const deleteCollaboratorReview = (id) => api.delete(`/operational/reviews/${id}`);
export const getCollaboratorPerformance = (collaboratorId) => api.get(`/operational/performance/${collaboratorId}`);

// Assets: Fleet
export const getFleet = () => api.get('/assets/fleet');
export const createFleet = (data) => api.post('/assets/fleet', data);
export const updateFleet = (id, data) => api.put(`/assets/fleet/${id}`, data);
export const deleteFleet = (id) => api.delete(`/assets/fleet/${id}`);

// Assets: Insurances
export const getInsurances = () => api.get('/assets/insurances');
export const createInsurance = (data) => api.post('/assets/insurances', data);
export const updateInsurance = (id, data) => api.put(`/assets/insurances/${id}`, data);
export const deleteInsurance = (id) => api.delete(`/assets/insurances/${id}`);

// Assets: Tools
export const getTools = () => api.get('/assets/tools');
export const createTool = (data) => api.post('/assets/tools', data);
export const updateTool = (id, data) => api.put(`/assets/tools/${id}`, data);
export const deleteTool = (id) => api.delete(`/assets/tools/${id}`);

// Maintenance
export const getVehicleMaintenances = (vehicleId) => api.get(`/maintenance/maintenance/vehicle/${vehicleId}`);
export const createMaintenance = (data) => api.post('/maintenance/maintenance', data);
export const updateMaintenance = (id, data) => api.put(`/maintenance/maintenance/${id}`, data);
export const deleteMaintenance = (id) => api.delete(`/maintenance/maintenance/${id}`);

// Project Resources: Collaborators
export const getProjectCollaborators = (projectId) => api.get(`/project-resources/projects/${projectId}/collaborators`);
export const addProjectCollaborator = (projectId, data) => api.post(`/project-resources/projects/${projectId}/collaborators`, data);
export const removeProjectCollaborator = (id) => api.delete(`/project-resources/collaborators/${id}`);

// Project Resources: Tools
export const getProjectTools = (projectId) => api.get(`/project-resources/projects/${projectId}/tools`);
export const addProjectTool = (projectId, data) => api.post(`/project-resources/projects/${projectId}/tools`, data);
export const removeProjectTool = (id) => api.delete(`/project-resources/tools/${id}`);

// Project Resources: Vehicles
export const getProjectVehicles = (projectId) => api.get(`/project-resources/projects/${projectId}/vehicles`);
export const addProjectVehicle = (projectId, data) => api.post(`/project-resources/projects/${projectId}/vehicles`, data);
export const removeProjectVehicle = (id) => api.delete(`/project-resources/vehicles/${id}`);

// Purchases
export const getPurchases = (projectId) => api.get('/purchases/purchases', { params: { project_id: projectId } });
export const getPurchasesWithDetails = (projectId) => api.get('/purchases/purchases', { params: { project_id: projectId } });
export const createPurchase = (data) => api.post('/purchases/purchases', data);
export const updatePurchase = (id, data) => api.put(`/purchases/purchases/${id}`, data);
export const deletePurchase = (id) => api.delete(`/purchases/purchases/${id}`);
export const approvePurchase = (id, approvalType) => api.put(`/purchases/purchases/${id}/approve`, { approval_type: approvalType });
export const rejectPurchase = (id, reason) => api.put(`/purchases/purchases/${id}/reject`, { reason });
export const clearPurchaseRejection = (id) => api.put(`/purchases/purchases/${id}/clear-rejection`);
export const withdrawPurchase = (id, data) => api.post(`/purchases/purchases/${id}/withdraw`, data);
export const getWithdrawals = (id) => api.get(`/purchases/purchases/${id}/withdrawals`);
export const addPurchaseObservation = (id, data) => api.post(`/purchases/purchases/${id}/observations`, data);
export const getFinancialSummary = (projectId, excludeRequestId = null) => 
  api.get('/purchases/financial-summary', { params: { project_id: projectId, exclude_request_id: excludeRequestId } });

// Tickets
export const getTickets = () => api.get('/tickets/tickets');
export const createTicket = (data) => api.post('/tickets/tickets', data);
export const updateTicket = (id, data) => api.put(`/tickets/tickets/${id}`, data);
export const deleteTicket = (id) => api.delete(`/tickets/tickets/${id}`);

// Kanban
export const getTasks = () => api.get('/kanban/tasks');
export const createTask = (data) => api.post('/kanban/tasks', data);
export const updateTask = (id, data) => api.put(`/kanban/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/kanban/tasks/${id}`);

// AI
export const chatAI = (message) => api.post('/api/ai/chat', { message });

// Asset Requests
export const getAssetRequests = (params = {}) => api.get('/asset-requests/asset-requests', { params });
export const createAssetRequest = (data) => api.post('/asset-requests/asset-requests', data);
export const approveAssetRequest = (id, data) => api.patch(`/asset-requests/asset-requests/${id}/approve`, data);
export const rejectAssetRequest = (id, data) => api.patch(`/asset-requests/asset-requests/${id}/reject`, data);

