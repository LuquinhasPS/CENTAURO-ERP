/**
 * API Index - Aggregator for backward compatibility
 * Re-exports all functions from modular files
 * 
 * Pages can continue importing from 'services/api' without changes
 */

// Core API instance
import api from './core';
export default api;

// Re-export all from CRM
export {
  getProposals,
  getProposal,
  createProposal,
  getPendingTasks,
  updateProposal,
  deleteProposal,
  convertProposalToProject,
  getProposalTasks,
  createProposalTask,
  updateProposalTask,
  deleteProposalTask,
  completeProposalTask,
  stopTaskRecurrence,
} from './crm';

// Re-export all from Commercial
export {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  createProjectFeedback,
  getProjectFeedbacks,
  deleteProjectFeedback,
} from './commercial';

// Re-export all from Finance
export {
  createProjectBilling,
  deleteProjectBilling,
  getAllBillings,
  updateProjectBilling,
  previewTaxesImport,
  confirmTaxesImport,
  uploadPayroll,
  getPayrollPeriods,
  getPayrollDetails,
} from './finance';

// Re-export all from Operational
export {
  // Allocations
  getAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  deleteBatchAllocations,
  // Collaborators
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  // Certifications
  getCertifications,
  createCertification,
  deleteCertification,
  // Education
  getCollaboratorEducation,
  createCollaboratorEducation,
  deleteCollaboratorEducation,
  // Reviews
  getCollaboratorReviews,
  createCollaboratorReview,
  deleteCollaboratorReview,
  getCollaboratorPerformance,
  // Fleet
  getFleet,
  createFleet,
  updateFleet,
  deleteFleet,
  // Insurances
  getInsurances,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  // Tools
  getTools,
  createTool,
  updateTool,
  deleteTool,
  // Maintenance
  getVehicleMaintenances,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  // Project Resources
  getProjectCollaborators,
  addProjectCollaborator,
  removeProjectCollaborator,
  getProjectTools,
  addProjectTool,
  removeProjectTool,
  getProjectVehicles,
  addProjectVehicle,
  removeProjectVehicle,
  // Purchases
  getPurchases,
  getPurchasesWithDetails,
  createPurchase,
  updatePurchase,
  deletePurchase,
  approvePurchase,
  rejectPurchase,
  clearPurchaseRejection,
  withdrawPurchase,
  getWithdrawals,
  addPurchaseObservation,
  // Tickets
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  // Kanban
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  // AI
  chatAI,
} from './operational';
