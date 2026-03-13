import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, MapPin, Phone, Mail, BookOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function EditStudentModal({ student, onClose, onUpdate }: any) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({ ...student });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/students/${student.id}`, formData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update student.');
    }
  };

  const InputField = ({ label, name, type = "text", icon: Icon }: any) => (
    <div className="relative">
      <label className="block text-sm font-semibold text-stone-700 mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />}
        <input 
          type={type} 
          name={name}
          value={formData[name] || ''}
          onChange={(e) => setFormData({...formData, [name]: e.target.value})}
          className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none`}
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          className="bg-white p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-900">Edit Student</h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <InputField label="Full Name" name="full_name" icon={User} />
              <InputField label="Birth Year" name="birth_year" type="number" />
              <InputField label="Phone" name="phone" icon={Phone} />
              <InputField label="Email" name="email" type="email" icon={Mail} />
              <InputField label="Region" name="birth_place_region" icon={MapPin} />
              <InputField label="Zone" name="birth_place_zone" />
              <InputField label="Woreda" name="birth_place_woreda" />
              <InputField label="Kebele" name="birth_place_kebele" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Student Status</label>
                <select name="status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Probation">Probation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Program Degree</label>
                <select name="program_degree" value={formData.program_degree || ''} onChange={(e) => setFormData({...formData, program_degree: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none">
                  <option value="">Select Degree</option>
                  {['Masters', 'Degree', 'Diploma', 'Certificate'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all">
              Save Changes
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
