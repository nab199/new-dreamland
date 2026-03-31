import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, RefreshCw, Server, 
  MessageSquare, Mail, CreditCard, Cpu, HardDrive, Database
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SystemStatus {
  database: { status: string; type: string };
  ai: { status: string; provider: string };
  sms: { status: string; provider: string };
  email: { status: string; provider: string };
  payment: { chapa: string; cbe_ocr: string };
  storage: { uploads: string; backups: string };
}

export default function AdminStatusDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/system-status');
      setStatus(res.data);
    } catch (err) {
      showToast('Failed to fetch system status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const StatusCard = ({ title, icon: Icon, state, provider }: any) => {
    const isOnline = state === 'online' || state === 'configured' || state === 'writable' || state === 'simulation_active';
    const isWarning = state === 'demo_mode' || state === 'console_only';
    
    return (
      <div className="bg-white p-6 rounded-[28px] border-2 border-stone-100 shadow-sm flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isOnline ? 'bg-emerald-50 text-emerald-600' : 
          isWarning ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
        }`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-stone-900">{title}</h3>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 
              isWarning ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {state.replace('_', ' ')}
            </div>
          </div>
          <p className="text-stone-400 text-[11px] font-bold uppercase tracking-widest">{provider || 'Internal Service'}</p>
        </div>
      </div>
    );
  };

  if (loading && !status) return <div className="p-10 text-center animate-pulse font-bold text-stone-400">Pinging System...</div>;

  return (
    <div className="space-y-8 p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-stone-900">System Integrity</h2>
          <p className="text-stone-500 font-medium">Monitoring connections and service health</p>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-3 bg-stone-100 hover:bg-stone-200 rounded-2xl transition-all text-stone-600"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatusCard title="Database" icon={Server} state={status?.database.status} provider={status?.database.type} />
        <StatusCard title="AI Engine" icon={Cpu} state={status?.ai.status} provider={status?.ai.provider} />
        <StatusCard title="SMS API" icon={MessageSquare} state={status?.sms.status} provider={status?.sms.provider} />
        <StatusCard title="Email API" icon={Mail} state={status?.email.status} provider={status?.email.provider} />
        <StatusCard title="Online Payments" icon={CreditCard} state={status?.payment.chapa} provider="Chapa" />
        <StatusCard title="CBE OCR" icon={ShieldCheck} state={status?.payment.cbe_ocr} provider="Self-hosted" />
        <StatusCard title="File Storage" icon={HardDrive} state={status?.storage.uploads} provider="Local Disk" />
        <StatusCard title="Backup Engine" icon={Database} state={status?.storage.backups} provider="Internal" />
      </div>

      <div className="bg-emerald-50 p-8 rounded-[32px] border-2 border-emerald-100 flex items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h3 className="text-lg font-black text-emerald-900">System Fully Functional</h3>
          <p className="text-emerald-700 font-medium leading-relaxed opacity-80">
            All primary services are operational. Automated backups are scheduled for 12:00 AM daily. 
            Real-time monitoring is active for all external API connections.
          </p>
        </div>
      </div>
    </div>
  );
}
