import { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Task, Completion } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StatsView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      const [tasksRes, compRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch(`/api/completions?month=${format(currentMonth, 'yyyy-MM')}`)
      ]);
      setTasks(await tasksRes.json());
      setCompletions(await compRes.json());
    };
    fetchData();
  }, [currentMonth]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const chartData = daysInMonth.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayCompletions = completions.filter(c => c.date === dateStr && c.completed === 1);
    const totalTasks = tasks.length;
    const rate = totalTasks > 0 ? (dayCompletions.length / totalTasks) * 100 : 0;
    
    return {
      date: format(day, 'MMM d'),
      rate: Math.round(rate),
      completed: dayCompletions.length,
      total: totalTasks
    };
  });

  const totalCompletedThisMonth = completions.filter(c => c.completed === 1).length;
  const totalPossibleThisMonth = tasks.length * daysInMonth.length;
  const overallRate = totalPossibleThisMonth > 0 ? Math.round((totalCompletedThisMonth / totalPossibleThisMonth) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 bg-slate-50">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Statistics</h1>
        <p className="text-slate-500 font-medium">Your progress overview</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium mb-1">Completion Rate</p>
          <p className="text-3xl font-bold text-emerald-500">{overallRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium mb-1">Habits Done</p>
          <p className="text-3xl font-bold text-slate-800">{totalCompletedThisMonth}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg text-slate-800">Monthly Overview</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Prev
            </button>
            <span className="text-sm font-semibold text-slate-800">{format(currentMonth, 'MMM yyyy')}</span>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Today
            </button>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate === 100 ? '#10b981' : entry.rate > 0 ? '#34d399' : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
