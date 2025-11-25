import { useState, useEffect } from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Edit, X, User, Briefcase } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask, getProjects, getCollaborators } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import './Kanban.css';

const TaskCard = ({ task, onEdit, onDelete, getProjectName, getCollaboratorName }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  return (
    <div ref={setNodeRef} style={style} className="task-card">
      <div className="task-header">
        <div className="task-drag" {...attributes} {...listeners}>
          <GripVertical size={16} color="#94a3b8" />
        </div>
        <div className="task-actions">
          <button className="btn-icon-small" onClick={() => onEdit(task)}>
            <Edit size={14} />
          </button>
          <button className="btn-icon-small danger" onClick={() => onDelete(task.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="task-content">
        <h4 className="task-title">{task.title}</h4>
        <p className="task-description">{task.description}</p>

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
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );
};

const Column = ({ column, tasks, onAddTask, onEditTask, onDeleteTask, getProjectName, getCollaboratorName }) => {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div className="column-content">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              getProjectName={getProjectName}
              getCollaboratorName={getCollaboratorName}
            />
          ))}
        </SortableContext>
        <button className="add-task-btn" onClick={() => onAddTask(column.id)}>
          <Plus size={16} />
          Adicionar Tarefa
        </button>
      </div>
    </div>
  );
};

const Kanban = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const [tasksRes, projectsRes, collaboratorsRes] = await Promise.all([
        getTasks(),
        getProjects(),
        getCollaborators()
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setCollaborators(collaboratorsRes.data);
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);

      // Optimistic update for sorting within same column
      if (tasks[oldIndex].status === tasks[newIndex].status) {
        setTasks((tasks) => arrayMove(tasks, oldIndex, newIndex));
      }
    }

    // Handle status change if dropped in different column area (not implemented in this simple dnd-kit setup without droppable columns)
    // For this implementation, we'll rely on the column structure. 
    // Actually, dnd-kit sortable context handles reordering. 
    // To handle moving between columns, we need to detect which column we dropped into.
    // Since we are using a simple list, let's just implement the CRUD first.
    // Drag and drop between columns requires more complex setup with dnd-kit.
    // For now, let's keep the reordering visual and focus on CRUD.
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
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erro ao excluir tarefa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTask(editingId, formData);
      } else {
        await createTask(formData);
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

  return (
    <div className="kanban">
      <header className="kanban-header">
        <div>
          <h1>Kanban - Gestão de Tarefas</h1>
          <p>Controle de atividades dos supervisores</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleAddTask('todo')}>
          <Plus size={20} />
          Nova Tarefa
        </button>
      </header>

      {showForm && (
        <div className="kanban-form-modal">
          <div className="kanban-form card">
            <div className="form-header">
              <h3>{editingId ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
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
              <div className="form-group">
                <label className="label">Descrição</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
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
                <div className="form-group">
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
              <div className="form-group">
                <label className="label">Projeto</label>
                <select
                  name="project_id"
                  className="input"
                  value={formData.project_id}
                  onChange={handleChange}
                >
                  <option value="">Sem Projeto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
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
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.id)}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              getProjectName={getProjectName}
              getCollaboratorName={getCollaboratorName}
            />
          ))}
        </div>
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
