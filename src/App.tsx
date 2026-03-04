/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Settings } from 'lucide-react';
import { format } from 'date-fns';
import TodayView from './views/TodayView';
import StatsView from './views/StatsView';
import SettingsView from './views/SettingsView';
import AddHabitModal from './components/AddHabitModal';
import { cn } from './lib/utils';
import { Task, Completion } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'stats' | 'settings'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(format(new Date(), 'HH:mm'));
  const [refreshKey, setRefreshKey] = useState(0);

  // Notification engine
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const today = format(now, 'yyyy-MM-dd');
      
      // Only check once per minute
      if (currentTime === lastCheckedTime) return;
      setLastCheckedTime(currentTime);

      try {
        const [tasksRes, compRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch(`/api/completions?date=${today}`)
        ]);
        
        const tasks: Task[] = await tasksRes.json();
        const completions: Completion[] = await compRes.json();
        
        const completedTaskIds = new Set(completions.filter(c => c.completed === 1).map(c => c.task_id));

        tasks.forEach(task => {
          if (task.time === currentTime && !completedTaskIds.has(task.id)) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Habit Reminder', {
                body: `It's time to: ${task.title}`,
                icon: '/vite.svg'
              });
            }
          }
        });
      } catch (err) {
        console.error('Failed to check reminders', err);
      }
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [lastCheckedTime]);

  const handleAddHabit = async (title: string, time: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, time })
    });
    setActiveTab('today');
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 relative overflow-hidden shadow-2xl sm:rounded-3xl sm:h-[850px] sm:my-10 border border-slate-200">
      {activeTab === 'today' && <TodayView key={refreshKey} onAddTask={() => setIsAddModalOpen(true)} />}
      {activeTab === 'stats' && <StatsView />}
      {activeTab === 'settings' && <SettingsView />}

      <AddHabitModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddHabit} 
      />

      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-30 pb-safe">
        <button 
          onClick={() => setActiveTab('today')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'today' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <CheckSquare className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Today</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'stats' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Stats</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'settings' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Settings</span>
        </button>
      </nav>
    </div>
  );
}
