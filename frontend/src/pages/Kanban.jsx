import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Edit, X, User, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getProjects, getCollaborators, getClients } from '../services/api';
import ConfirmModal from '../components/shared/ConfirmModal';
import Modal from '../components/shared/Modal';
import './Kanban.css';

// --- COMPONENTS ---

const DroppableArea = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="droppable-area">
      {children}
    </div>
  );
};

const TaskCard = ({ task, onEdit, getProjectName, getCollaboratorName, canEdit, isOverlay }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  // If overlay, we might want to skip some Sortable logic or just render raw
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: canEdit ? 'pointer' : 'grab'
  };

  // If it's an overlay, we don't need sortable wrappers, just the visual
  if (isOverlay) {
    return (
      <div className="task-card overlay">
        <div className="task-content">
          <h4 className="task-title">{task.title}</h4>
        </div>
      </div>
    )
  }

  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="task-card"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (canEdit) onEdit(task);
      }}
    >
      <div className="task-content">
        <h4 className="task-title">{task.title}</h4>
        {task.description && <p className="task-description">{task.description}</p>}

        <div className="task-meta">
          {task.project_id && (
            <div className="meta-item">
              <Briefcase size={12} />
              <span>{getProjectName(task.project_id)}</span>
            </div>
          )}
          {task.collaborator_id && (
            <div className="meta-item">
              <User size={12} />
              <span>{getCollaboratorName(task.collaborator_id)}</span>
            </div>
          )}
        </div>

        <div className="task-footer">
          <span
            className="task-priority"
            style={{ background: `${priorityColors[task.priority]}15`, color: priorityColors[task.priority] }}
          >
            {task.priority === 'low' ? 'Baixa' : task.priority === 'high' ? 'Alta' : 'Média'}
          </span>
        </div>
      </div>
    </div>
  );
};

const Column = ({ column, tasks, onAddTask, onEditTask, getProjectName, getCollaboratorName, canEdit }) => {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div className="column-content">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <DroppableArea id={column.id}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                getProjectName={getProjectName}
                getCollaboratorName={getCollaboratorName}
                canEdit={canEdit}
              />
            ))}
          </DroppableArea>
        </SortableContext>
        {canEdit && (
          <button className="add-task-btn" onClick={() => onAddTask(column.id)}>
            <Plus size={16} />
            Adicionar Tarefa
          </button>
        )}
      </div>
    </div>
  );
};

const Kanban = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('kanban', 'edit');

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState(null); // DnD Active State

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    project_id: '',
    collaborator_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, projectsRes, collaboratorsRes, clientsRes] = await Promise.all([
        getTasks(),
        getProjects(),
        getCollaborators(),
        getClients()
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setCollaborators(collaboratorsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (id) => {
    const project = projects.find(p => p.id === id);
    return project ? project.name : 'N/A';
  };

  const getCollaboratorName = (id) => {
    const collaborator = collaborators.find(c => c.id === id);
    return collaborator ? collaborator.name : 'N/A';
  };

  const columns = [
    { id: 'todo', title: 'A Fazer' },
    { id: 'in-progress', title: 'Em Progresso' },
    { id: 'done', title: 'Concluído' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    // Check if dropped on column (empty area) or task (reorder)
    let newStatus = columns.some(c => c.id === overId) ? overId : null;

    if (!newStatus) {
      // Dropped on another task, find that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (!newStatus) return; // Should not happen if over is valid

    if (task.status !== newStatus) {
      // Changed Column
      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, status: newStatus } : t
      ));
      try {
        await updateTask(activeId, { status: newStatus });
      } catch (error) {
        console.error("Failed to update status", error);
        loadData(); // Revert
      }
    } else {
      // Reordering in same column
      if (activeId !== overId) {
        const oldIndex = tasks.findIndex(t => t.id === activeId);
        const newIndex = tasks.findIndex(t => t.id === overId);
        setTasks((items) => arrayMove(items, oldIndex, newIndex));
        // Note: If backend supports ordering, send update here.
      }
    }
  };

  const handleAddTask = (status) => {
    setFormData({
      title: '',
      description: '',
      status: status,
      priority: 'medium',
      project_id: '',
      collaborator_id: '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditTask = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      project_id: task.project_id || '',
      collaborator_id: task.collaborator_id || '',
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleDeleteTask = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTask(itemToDelete);
      setShowConfirmModal(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erro ao excluir tarefa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up empty strings
      const payload = { ...formData };
      if (!payload.project_id) delete payload.project_id;
      if (!payload.collaborator_id) delete payload.collaborator_id;

      if (editingId) {
        await updateTask(editingId, payload);
      } else {
        await createTask(payload);
      }
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Erro ao salvar tarefa');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const activeTask = useMemo(() =>
    activeId ? tasks.find(t => t.id === activeId) : null
    , [activeId, tasks]);

  return (
    <div className="kanban">
      <header className="kanban-header">
        <div>
          <h1>Kanban - Gestão de Tarefas</h1>
          <p>Controle de atividades dos supervisores</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleAddTask('todo')}>
            <Plus size={20} />
            Nova Tarefa
          </button>
        )}
      </header>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Tarefa' : 'Nova Tarefa'}
        maxWidth="600px"
        headerActions={
          editingId && canEdit && (
            <button
              type="button"
              className="std-modal-close-btn danger"
              onClick={() => handleDeleteTask(editingId)}
              title="Excluir Tarefa"
            >
              <Trash2 size={24} />
            </button>
          )
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Título *</label>
            <input
              type="text"
              name="title"
              className="input"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Descrição</label>
            <textarea
              name="description"
              className="input"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Status</label>
              <select
                name="status"
                className="input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="todo">A Fazer</option>
                <option value="in-progress">Em Progresso</option>
                <option value="done">Concluído</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Prioridade</label>
              <select
                name="priority"
                className="input"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Projeto</label>
            <select
              name="project_id"
              className="input"
              value={formData.project_id}
              onChange={handleChange}
            >
              <option value="">Sem Projeto</option>
              {projects.map(p => {
                const client = clients.find(c => c.id === p.client_id);
                return (
                  <option key={p.id} value={p.id}>
                    {client ? `${client.name} - ` : ''}{p.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Colaborador</label>
            <select
              name="collaborator_id"
              className="input"
              value={formData.collaborator_id}
              onChange={handleChange}
            >
              <option value="">Sem Responsável</option>
              {collaborators.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            {canEdit && (
              <button type="submit" className="btn btn-primary">
                Salvar Tarefa
              </button>
            )}
          </div>
        </form>
      </Modal>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.id)}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              getProjectName={getProjectName}
              getCollaboratorName={getCollaboratorName}
              canEdit={canEdit}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isOverlay={true}
              canEdit={false}
              getProjectName={getProjectName}
              getCollaboratorName={getCollaboratorName}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Kanban;
