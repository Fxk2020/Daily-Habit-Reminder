import { useState, useEffect } from 'react';
import { Bell, BellOff, Info } from 'lucide-react';

export default function SettingsView() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 bg-slate-50">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
      </header>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
                {permission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                <p className="text-sm text-slate-500">Get reminded for your tasks</p>
              </div>
            </div>
            <button 
              onClick={requestPermission}
              disabled={permission === 'granted'}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl text-sm disabled:opacity-50"
            >
              {permission === 'granted' ? 'Enabled' : 'Enable'}
            </button>
          </div>
          
          <div className="p-5 bg-slate-50/50 flex gap-3 items-start">
            <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-500 leading-relaxed">
              When notifications are enabled, you will receive a browser notification at the exact time you set for your daily habits. Make sure to keep the app open in a tab to receive them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
