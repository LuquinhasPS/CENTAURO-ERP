import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Calendar, ArrowRight, Check } from 'lucide-react';
import { getPendingTasks, completeProposalTask, getProposal } from '../../services/api';

const CrmTaskWidget = ({ onOpenProposal }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await getPendingTasks();
      setTasks(res.data);
    } catch (error) {
      console.error("Error loading CRM tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId) => {
    try {
      await completeProposalTask(taskId);
      loadTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Erro ao concluir tarefa");
    }
  };

  const handleOpenProposal = async (proposalId) => {
    if (onOpenProposal) {
      try {
        const res = await getProposal(proposalId);
        onOpenProposal(res.data);
      } catch (error) {
        console.error("Error fetching proposal details:", error);
        alert("Erro ao abrir proposta.");
      }
    }
  };

  if (loading) return <div className="widget-loading py-10 text-center text-slate-400 font-medium">Carregando tarefas...</div>;

  return (
    <div className="dashboard-widget bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[550px]">
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="flex items-center gap-3 text-lg font-bold text-slate-800 uppercase tracking-tight">
            <CheckCircle size={20} className="text-blue-500" />
            Tarefas CRM
          </h3>
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
            {tasks.length} pendentes
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 min-h-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <CheckCircle size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Tudo em dia! Nenhuma tarefa.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`task-item flex items-start gap-3 p-3 rounded-lg border-l-4 bg-slate-50 transition-all hover:shadow-sm ${task.is_overdue ? 'border-red-500' : 'border-emerald-500'}`}
              >
                {/* Check Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}
                  className="flex-shrink-0 w-6 h-6 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-colors mt-1"
                  title="Concluir Tarefa"
                >
                  <Check size={14} />
                </button>

                {/* Info */}
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => handleOpenProposal(task.proposal_id)}
                >
                  <div className="font-bold text-slate-800 text-sm truncate">{task.title}</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    <span className="text-slate-700 block truncate">{task.client_name}</span>
                    <span className="truncate block opacity-70">{task.proposal_title}</span>
                  </div>
                </div>

                {/* Date */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-[11px] font-bold flex items-center justify-end gap-1 ${task.is_overdue ? 'text-red-500' : 'text-emerald-600'}`}>
                    {task.is_overdue && <AlertCircle size={10} />}
                    {new Date(task.due_date).toLocaleDateString('pt-BR').slice(0, 5)}
                  </div>
                  {task.recurrence_days && (
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Repete {task.recurrence_days}d
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-100">
        <button
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
          onClick={() => window.location.href = '/commercial'}
        >
          Central Comercial <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default CrmTaskWidget;
