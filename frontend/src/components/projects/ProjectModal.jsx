import { useState, useEffect, Suspense, lazy } from 'react';
import { X, LayoutDashboard, Users, FileText, DollarSign, Wrench, Package, Truck, MessageSquare, Edit } from 'lucide-react';
import {
  getProject, updateProject, getClients, getCollaborators, getTools, getFleet,
  getPurchases, getProjectCollaborators, getProjectTools, getProjectVehicles, getProjectFeedbacks,
  createPurchase // Needed for New Request shortcut? Or handled in Tab?
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../shared/ConfirmModal';
import RequestDetailsModal from '../purchases/RequestDetailsModal';

// Tabs
// Tabs (Lazy Loaded)
import ProjectInfoTab from './tabs/ProjectInfoTab';
const ProjectFinancialTab = lazy(() => import('./tabs/ProjectFinancialTab'));
const ProjectTeamTab = lazy(() => import('./tabs/ProjectTeamTab'));
const ProjectAssetsTab = lazy(() => import('./tabs/ProjectAssetsTab'));
const ProjectPurchasesTab = lazy(() => import('./tabs/ProjectPurchasesTab'));
const ProjectFeedbackTab = lazy(() => import('./tabs/ProjectFeedbackTab'));

import './ProjectModal.css';

const ProjectModal = ({ project: initialProject, onClose, onUpdate, onEdit }) => {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('projects', 'edit');

  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(initialProject);

  // Data State
  const [projectDetails, setProjectDetails] = useState({});
  const [clients, setClients] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [billings, setBillings] = useState([]);

  // Resources State
  const [projectCollaborators, setProjectCollaborators] = useState([]);
  const [projectTools, setProjectTools] = useState([]);
  const [projectVehicles, setProjectVehicles] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  // Available Resources (for selection)
  const [availableCollaborators, setAvailableCollaborators] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [initialProject.id]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        projRes, clientsRes, collabsRes, toolsRes, fleetRes,
        pCollabsRes, pToolsRes, pVehiclesRes,
        purchasesRes, feedbacksRes
      ] = await Promise.all([
        getProject(initialProject.id),
        getClients(),
        getCollaborators(), // optimized endpoint?
        getTools(),
        getFleet(),
        getProjectCollaborators(initialProject.id),
        getProjectTools(initialProject.id),
        getProjectVehicles(initialProject.id),
        getPurchases(initialProject.id),
        getProjectFeedbacks(initialProject.id)
      ]);

      setProject(projRes.data); // ensure we have latest status
      setProjectDetails(projRes.data); // Project info + Billings usually come here? 
      // Note: original getProject returned dict with "billings" key usually? or distinct endpoint?
      // Assuming getProject returns obj with .billings
      setBillings(projRes.data.billings || []);

      setClients(clientsRes.data);
      setAvailableCollaborators(collabsRes.data);
      setAvailableTools(toolsRes.data);
      setAvailableVehicles(fleetRes.data); // Filter active only?

      setProjectCollaborators(pCollabsRes.data);
      setProjectTools(pToolsRes.data);
      setProjectVehicles(pVehiclesRes.data);
      setPurchases(purchasesRes.data);
      setFeedbacks(feedbacksRes.data);

    } catch (error) {
      console.error("Error loading project data", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleEditClick = (proj) => {
    if (onEdit) {
      onEdit(proj);
    }
  };

  // Helper for purchases total invoiced passed to info tab
  const totalInvoiced = (billings || []).reduce((acc, b) => acc + (parseFloat(b.gross_value || b.value) || 0), 0);

  // Tabs Configuration
  const tabs = [
    { id: 'info', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'team', label: 'Equipe', icon: Users },
    { id: 'assets', label: 'Ativos', icon: Wrench },
    { id: 'purchases', label: 'Compras', icon: Package },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
  ];

  if (loading) return (
    <div className="project-modal-overlay">
      <div className="project-modal">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados do projeto...</div>
      </div>
    </div>
  );

  return (
    <div className="project-modal-overlay">
      <div className="project-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="project-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '8px', color: '#0284c7' }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{project.name}</h2>
                {project.tag && (
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                    {project.tag}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{project.description}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {canEdit && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleEditClick(project)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Edit size={16} /> Editar Dados
              </button>
            )}
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="project-modal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="project-modal-content scrollable-content">
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Carregando aba...</div>}>
            {activeTab === 'info' && (
              <ProjectInfoTab
                project={project}
                clients={clients}
                purchases={purchases} // For cost breakdown
                totalInvoiced={totalInvoiced}
                canEdit={canEdit}
                onEdit={handleEditClick}
              />
            )}
            {activeTab === 'financial' && (
              <ProjectFinancialTab
                project={project}
                projectDetails={projectDetails}
                billings={billings}
                canEdit={canEdit}
                onUpdate={loadAllData}
              />
            )}
            {activeTab === 'team' && (
              <ProjectTeamTab
                project={project}
                projectCollaborators={projectCollaborators}
                availableCollaborators={availableCollaborators}
                canEdit={canEdit}
                onUpdate={loadAllData}
              />
            )}
            {activeTab === 'assets' && (
              <ProjectAssetsTab
                project={project}
                projectTools={projectTools}
                projectVehicles={projectVehicles}
                availableTools={availableTools}
                availableVehicles={availableVehicles}
                canEdit={canEdit}
                onUpdate={loadAllData}
              />
            )}
            {activeTab === 'purchases' && (
              <ProjectPurchasesTab
                project={project}
                purchases={purchases}
                canEdit={canEdit}
                onSelectRequest={(req) => setSelectedRequest(req)}
                onCreateRequest={() => { }} // Now handled internally by ProjectPurchasesTab
                getClientName={(id) => clients.find(c => c.id === id)?.name}
                onUpdate={loadAllData}
              />
            )}
            {activeTab === 'feedback' && (
              <ProjectFeedbackTab
                project={project}
                feedbacks={feedbacks}
                canEdit={canEdit}
                onUpdate={loadAllData}
              />
            )}
          </Suspense>
        </div>


        {/* Stacked Modals */}
        {selectedRequest && (
          <RequestDetailsModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onUpdate={loadAllData}
            context="projects"
            readOnly={!canEdit}
          />
        )}
      </div>
    </div >
  );
};

export default ProjectModal;
