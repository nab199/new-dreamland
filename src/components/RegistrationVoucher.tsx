import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, CheckCircle, MapPin, Phone, Calendar, Info } from 'lucide-react';

interface VoucherProps {
  studentName: string;
  studentId: string;
  program: string;
  branch: string;
}

export default function RegistrationVoucher({ studentName, studentId, program, branch }: VoucherProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto bg-white border-2 border-stone-200 rounded-[32px] overflow-hidden shadow-2xl print:border-0 print:shadow-none"
    >
      <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">REGISTRATION CONFIRMATION</h2>
          <p className="opacity-80 font-bold uppercase tracking-widest text-[10px] mt-1">Dreamland College Management System</p>
        </div>
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <CheckCircle size={32} />
        </div>
      </div>

      <div className="p-10 space-y-8">
        <div className="flex justify-between items-start border-b border-stone-100 pb-8">
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Student Name</p>
            <h3 className="text-xl font-black text-stone-900">{studentName}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Student ID</p>
            <h3 className="text-xl font-black text-emerald-600 font-mono">{studentId}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-500"><BookOpen size={16} /></div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase">Program</p>
                <p className="text-sm font-bold">{program}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-500"><MapPin size={16} /></div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase">Branch</p>
                <p className="text-sm font-bold">{branch}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-500"><Calendar size={16} /></div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase">Date Registered</p>
                <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl space-y-3">
          <h4 className="text-emerald-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <Info size={14} /> Next Steps
          </h4>
          <ul className="text-emerald-800 text-xs font-bold space-y-2 leading-relaxed opacity-80">
            <li>1. Log in to the student portal using your email and chosen password.</li>
            <li>2. Complete your profile information if any fields are missing.</li>
            <li>3. Check the academic calendar for upcoming course registrations.</li>
            <li>4. Visit your assigned branch for physical ID card processing.</li>
          </ul>
        </div>

        <div className="flex gap-4 print:hidden pt-4">
          <button 
            onClick={handlePrint}
            className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-xl"
          >
            <Printer size={20} /> Print Confirmation
          </button>
          <button className="flex-1 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all">
            <Download size={20} /> Save as Image
          </button>
        </div>
      </div>

      <div className="bg-stone-50 p-6 text-center border-t border-stone-100">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[4px]">Verified by Dreamland College MIS</p>
      </div>
    </motion.div>
  );
}

// Minimal icons for internal use
const BookOpen = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;

