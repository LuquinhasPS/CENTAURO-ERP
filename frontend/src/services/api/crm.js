/**
 * CRM API Module
 * Proposals and Proposal Tasks functions
 */
import api from './core';

// Commercial Proposals (CRM)
export const getProposals = () => api.get('/commercial/proposals/');
export const getProposal = (id) => api.get(`/commercial/proposals/${id}`);
export const createProposal = (data) => api.post('/commercial/proposals/', data);
export const updateProposal = (id, data) => api.put(`/commercial/proposals/${id}`, data);
export const deleteProposal = (id) => api.delete(`/commercial/proposals/${id}`);
export const convertProposalToProject = (id, data) => api.post(`/commercial/proposals/${id}/convert`, data);

// Proposal Tasks (Follow-up Recorrente)
export const getPendingTasks = () => api.get('/commercial/proposals/tasks/pending');
export const getProposalTasks = (proposalId) => api.get(`/commercial/proposals/${proposalId}/tasks`);
export const createProposalTask = (proposalId, data) => api.post(`/commercial/proposals/${proposalId}/tasks`, data);
export const updateProposalTask = (taskId, data) => api.put(`/commercial/proposals/tasks/${taskId}`, data);
export const deleteProposalTask = (taskId) => api.delete(`/commercial/proposals/tasks/${taskId}`);
export const completeProposalTask = (taskId) => api.post(`/commercial/proposals/tasks/${taskId}/complete`);
export const stopTaskRecurrence = (taskId) => api.post(`/commercial/proposals/tasks/${taskId}/stop-recurrence`);
