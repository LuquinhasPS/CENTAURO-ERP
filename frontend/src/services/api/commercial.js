/**
 * Commercial API Module
 * Clients, Client Contacts, Contracts, Projects, and Project Feedbacks
 */
import api from './core';

// Clients
export const getClients = () => api.get('/commercial/clients/');
export const createClient = (data) => api.post('/commercial/clients/', data);
export const updateClient = (id, data) => api.put(`/commercial/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/commercial/clients/${id}`);

// Contracts
export const getContracts = () => api.get('/commercial/contracts/');
export const createContract = (data) => api.post('/commercial/contracts/', data);
export const updateContract = (id, data) => api.put(`/commercial/contracts/${id}`, data);
export const deleteContract = (id) => api.delete(`/commercial/contracts/${id}`);

// Projects
export const getProjects = () => api.get('/commercial/projects/');
export const getProject = (id) => api.get(`/commercial/projects/${id}`);
export const createProject = (data) => api.post('/commercial/projects/', data);
export const updateProject = (id, data) => api.put(`/commercial/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/commercial/projects/${id}`);

// Project Feedbacks
export const createProjectFeedback = (projectId, feedback) => api.post(`/commercial/projects/${projectId}/feedback`, feedback);
export const getProjectFeedbacks = (projectId) => api.get(`/commercial/projects/${projectId}/feedback`);
export const deleteProjectFeedback = (feedbackId) => api.delete(`/commercial/projects/feedback/${feedbackId}`);
