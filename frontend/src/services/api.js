import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Commercial
export const getClients = () => api.get('/commercial/clients');
export const createClient = (data) => api.post('/commercial/clients', data);
export const updateClient = (id, data) => api.put(`/commercial/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/commercial/clients/${id}`);

export const getContracts = () => api.get('/commercial/contracts');
export const createContract = (data) => api.post('/commercial/contracts', data);
export const updateContract = (id, data) => api.put(`/commercial/contracts/${id}`, data);
export const deleteContract = (id) => api.delete(`/commercial/contracts/${id}`);

export const getProjects = () => api.get('/commercial/projects');
export const getProject = (id) => api.get(`/commercial/projects/${id}`);
export const createProject = (data) => api.post('/commercial/projects', data);
export const updateProject = (id, data) => api.put(`/commercial/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/commercial/projects/${id}`);
export const createProjectBilling = (projectId, data) => api.post(`/commercial/projects/${projectId}/billings`, data);
export const deleteProjectBilling = (id) => api.delete(`/commercial/projects/billings/${id}`);
export const getAllBillings = () => api.get('/commercial/billings');
export const updateProjectBilling = (id, data) => api.put(`/commercial/billings/${id}`, data);

// Assets
export const getInsurances = () => api.get('/assets/insurances');
export const createInsurance = (data) => api.post('/assets/insurances', data);
export const updateInsurance = (id, data) => api.put(`/assets/insurances/${id}`, data);
export const deleteInsurance = (id) => api.delete(`/assets/insurances/${id}`);

export const getFleet = () => api.get('/assets/fleet');
export const createFleet = (data) => api.post('/assets/fleet', data);
export const updateFleet = (id, data) => api.put(`/assets/fleet/${id}`, data);
export const deleteFleet = (id) => api.delete(`/assets/fleet/${id}`);

export const getTools = () => api.get('/assets/tools');
export const createTool = (data) => api.post('/assets/tools', data);
export const updateTool = (id, data) => api.put(`/assets/tools/${id}`, data);
export const deleteTool = (id) => api.delete(`/assets/tools/${id}`);

// Operational
export const getAllocations = () => api.get('/operational/allocations');
export const createAllocation = (data) => api.post('/operational/allocations', data);
export const updateAllocation = (id, data) => api.put(`/operational/allocations/${id}`, data);
export const deleteAllocation = (id) => api.delete(`/operational/allocations/${id}`);

export const getCollaborators = () => api.get('/operational/collaborators');
export const createCollaborator = (data) => api.post('/operational/collaborators', data);
export const updateCollaborator = (id, data) => api.put(`/operational/collaborators/${id}`, data);
export const deleteCollaborator = (id) => api.delete(`/operational/collaborators/${id}`);

export const getCertifications = (collaboratorId) => api.get(`/operational/certifications/${collaboratorId}`);
export const createCertification = (data) => api.post('/operational/certifications', data);
export const deleteCertification = (id) => api.delete(`/operational/certifications/${id}`);

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

// Project Resources
export const getProjectCollaborators = (projectId) => api.get(`/project-resources/projects/${projectId}/collaborators`);
export const addProjectCollaborator = (projectId, data) => api.post(`/project-resources/projects/${projectId}/collaborators`, data);
export const removeProjectCollaborator = (id) => api.delete(`/project-resources/collaborators/${id}`);

export const getProjectTools = (projectId) => api.get(`/project-resources/projects/${projectId}/tools`);
export const addProjectTool = (projectId, data) => api.post(`/project-resources/projects/${projectId}/tools`, data);
export const removeProjectTool = (id) => api.delete(`/project-resources/tools/${id}`);

export const getProjectVehicles = (projectId) => api.get(`/project-resources/projects/${projectId}/vehicles`);
export const addProjectVehicle = (projectId, data) => api.post(`/project-resources/projects/${projectId}/vehicles`, data);
export const removeProjectVehicle = (id) => api.delete(`/project-resources/vehicles/${id}`);

// Purchases
export const getPurchases = (projectId) => api.get('/purchases/purchases', { params: { project_id: projectId } });
export const createPurchase = (data) => api.post('/purchases/purchases', data);
export const updatePurchase = (id, data) => api.put(`/purchases/purchases/${id}`, data);
export const deletePurchase = (id) => api.delete(`/purchases/purchases/${id}`);


export default api;
