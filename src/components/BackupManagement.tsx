import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Download, Upload, Trash2, Shield, FileJson, 
  Loader2, CheckCircle, AlertTriangle, Clock, HardDrive 
} from 'lucide-react';
import { backupService, studentService } from '../services/apiServices';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function BackupManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await backupService.listBackups();
      setBackups(data.backups || []);
    } catch (error: any) {
      showMessage('error', 'Failed to load backups');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await backupService.createBackup('manual');
      showMessage('success', 'Backup created successfully!');
      loadBackups();
    } catch (error: any) {
      showMessage('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    setLoading(true);
    try {
      await backupService.restoreBackup(filename);
      showToast('Database restored successfully!', 'success');
      loadBackups();
    } catch (error: any) {
      showToast('Failed to restore backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await backupService.deleteBackup(filename);
      showToast('Backup deleted successfully!', 'success');
      loadBackups();
    } catch (error: any) {
      showToast('Failed to delete backup', 'error');
    }
  };

  const handleExportStudentData = async () => {
    const studentId = prompt('Enter student ID for data export:');
    if (!studentId) return;
    
    try {
      const data = await backupService.exportStudentData(parseInt(studentId));
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_${studentId}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', 'Student data exported!');
    } catch (error: any) {
      showMessage('error', 'Failed to export student data');
    }
  };

  const handleExportAll = async () => {
    try {
      await backupService.exportAllData();
      showToast('Export completed!', 'success');
    } catch (error: any) {
      showToast('Failed to export data', 'error');
    }
  };

  const handleAutoEnroll = async () => {
    const semesterId = prompt('Enter semester ID for auto-enrollment:');
    const branchId = prompt('Enter branch ID:');
    if (!semesterId || !branchId) return;

    setLoading(true);
    try {
      const result = await studentService.autoEnroll({ 
        semester_id: parseInt(semesterId), 
        branch_id: parseInt(branchId) 
      });
      showMessage('success', `Auto-enrollment complete! Enrolled: ${result.enrolled}, Skipped: ${result.skipped}`);
    } catch (error: any) {
      showMessage('error', 'Auto-enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
          Create Backup
        </button>

        <button
          onClick={handleExportStudentData}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FileJson className="w-5 h-5" />
          Export Student Data (GDPR)
        </button>

        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Download className="w-5 h-5" />
          Export All Data
        </button>

        <button
          onClick={handleAutoEnroll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Auto-Enrollment
        </button>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </motion.div>
      )}

      {/* Backup Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Backups</p>
              <p className="text-2xl font-bold">{backups.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Latest Backup</p>
              <p className="text-lg font-bold">
                {backups[0]?.filename ? 'Today' : 'None'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Auto Backup</p>
              <p className="text-lg font-bold">Daily 2:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Available Backups
        </h3>

        {backups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No backups available. Create your first backup!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Filename</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Size</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{backup.filename}</td>
                    <td className="p-3">
                      {new Date(backup.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">{(backup.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        backup.reason === 'scheduled_daily' ? 'bg-blue-100 text-blue-700' :
                        backup.reason === 'pre_restore' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {backup.reason}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(backup.filename)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(backup.filename)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GDPR Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          GDPR Compliance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Right to Access</h4>
            <p className="text-sm text-gray-700">
              Students can request and export all their personal data in a machine-readable format.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Right to be Forgotten</h4>
            <p className="text-sm text-gray-700">
              Students can request complete deletion of their data (Superadmin only).
            </p>
          </div>
        </div>
      </div>

      {/* Automation Info */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          Automated Tasks
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg">
            <p className="font-semibold text-green-700">Daily Backup</p>
            <p className="text-sm text-gray-600">2:00 AM every day</p>
            <p className="text-xs text-gray-500 mt-1">Automatic database backup with 30-day retention</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="font-semibold text-blue-700">At-Risk Report</p>
            <p className="text-sm text-gray-600">Monday 9:00 AM</p>
            <p className="text-xs text-gray-500 mt-1">AI-powered student risk assessment</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="font-semibold text-orange-700">SMS Reminders</p>
            <p className="text-sm text-gray-600">Daily 8:00 AM</p>
            <p className="text-xs text-gray-500 mt-1">Registration and payment reminders</p>
          </div>
        </div>
      </div>
    </div>
  );
}
