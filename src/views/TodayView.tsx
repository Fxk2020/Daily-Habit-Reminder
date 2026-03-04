import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { Task, Completion } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function TodayView({ onAddTask }: { onAddTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  };

  const fetchCompletions = async () => {
    const res = await fetch(`/api/completions?date=${today}`);
    const data: Completion[] = await res.json();
    const compMap: Record<string, boolean> = {};
    data.forEach(c => {
      compMap[c.task_id] = c.completed === 1;
    });
    setCompletions(compMap);
  };

  useEffect(() => {
    fetchTasks();
    fetchCompletions();
  }, []);

  const toggleTask = async (taskId: string) => {
    const current = completions[taskId] || false;
    const next = !current;
    setCompletions(prev => ({ ...prev, [taskId]: next }));
    
    await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, date: today, completed: next })
    });
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 bg-slate-50">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Today</h1>
        <p className="text-slate-500 font-medium">{format(new Date(), 'EEEE, MMMM do')}</p>
      </header>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No habits set for today.</p>
            <p className="text-sm mt-1">Tap the + button to add one.</p>
          </div>
        ) : (
          tasks.map(task => {
            const isCompleted = completions[task.id];
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={task.id} 
                className={cn(
                  "bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between transition-all",
                  isCompleted && "opacity-60"
                )}
              >
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleTask(task.id)}>
                  <button className="text-emerald-500 flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-7 h-7 fill-emerald-100" />
                    ) : (
                      <Circle className="w-7 h-7 text-slate-300" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={cn(
                      "font-semibold text-lg transition-all",
                      isCompleted ? "text-slate-400 line-through" : "text-slate-800"
                    )}>
                      {task.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium">{task.time}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      <button 
        onClick={onAddTask}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 transition-transform active:scale-95 z-20"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
