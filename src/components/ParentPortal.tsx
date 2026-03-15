import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { parentService } from '../services/apiServices';
import { useAuth } from '../context/AuthContext';

export default function ParentPortal() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance' | 'finance'>('overview');
  const [childData, setChildData] = useState<any>(null);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildData();
    }
  }, [selectedChild, activeTab]);

  const loadChildren = async () => {
    try {
      const data = await parentService.getMyChildren();
      setChildren(data.children || []);
      if (data.children?.length > 0) {
        setSelectedChild(data.children[0]);
      }
    } catch (error: any) {
      console.error('Failed to load children:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChildData = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      let data;
      switch (activeTab) {
        case 'grades':
          data = await parentService.getChildGrades(selectedChild.id);
          break;
        case 'attendance':
          data = await parentService.getChildAttendance(selectedChild.id);
          break;
        case 'finance':
          data = await parentService.getChildFinance(selectedChild.id);
          break;
        default:
          data = await parentService.getChildReport(selectedChild.id);
      }
      setChildData(data);
    } catch (error: any) {
      console.error('Failed to load child data:', error);
      setChildData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Children Linked</h3>
        <p className="text-gray-500">Please contact the administration to link your account to your child's record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Children Selection */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 min-w-[200px] ${
              selectedChild?.id === child.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              {child.full_name?.charAt(0) || 'C'}
            </div>
            <div className="text-left">
              <p className="font-semibold">{child.full_name}</p>
              <p className="text-sm text-gray-600">{child.student_id_code}</p>
              <p className="text-xs text-gray-500">{child.relationship}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedChild && (
        <>
          {/* Child Info Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedChild.full_name}</h2>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    {selectedChild.program_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedChild.branch_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Status: {selectedChild.academic_status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-100">Student ID</p>
                <p className="text-xl font-bold">{selectedChild.student_id_code}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            {[
              { id: 'overview', label: 'Overview', icon: Users },
              { id: 'grades', label: 'Grades', icon: GraduationCap },
              { id: 'attendance', label: 'Attendance', icon: CheckCircle },
              { id: 'finance', label: 'Finance', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow p-6"
            >
              {/* Overview Tab */}
              {activeTab === 'overview' && childData && (
                <div className="space-y-6">
                  {childData.error ? (
                    <p className="text-red-600">{childData.error}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-3xl font-bold text-blue-600">{childData.academicSummary?.gpa}</p>
                          <p className="text-sm text-gray-600">Current GPA</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">{childData.academicSummary?.totalCourses}</p>
                          <p className="text-sm text-gray-600">Courses Completed</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-3xl font-bold text-purple-600">
                            {childData.academicSummary?.grades?.A || 0}
                          </p>
                          <p className="text-sm text-gray-600">A Grades</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Grade Distribution</h3>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D', 'F'].map((grade) => (
                            <div key={grade} className="flex-1 text-center">
                              <div className={`h-24 rounded-lg flex items-end justify-center pb-2 ${
                                grade === 'A' ? 'bg-green-500' :
                                grade === 'B' ? 'bg-blue-500' :
                                grade === 'C' ? 'bg-yellow-500' :
                                grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                              }`}>
                                <span className="text-white font-bold">
                                  {childData.academicSummary?.grades?.[grade] || 0}
                                </span>
                              </div>
                              <p className="mt-1 font-semibold">{grade}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Grades Tab */}
              {activeTab === 'grades' && childData && (
                <div>
                  {childData.error ? (
                    <p className="text-red-600">{childData.error}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3">Course</th>
                            <th className="text-left p-3">Code</th>
                            <th className="text-left p-3">Semester</th>
                            <th className="text-left p-3">Grade</th>
                            <th className="text-left p-3">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {childData.grades?.map((grade: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="p-3">{grade.title}</td>
                              <td className="p-3">{grade.code}</td>
                              <td className="p-3">{grade.semester_name}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded font-semibold ${
                                  grade.grade === 'A' ? 'bg-green-100 text-green-700' :
                                  grade.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                  grade.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                  grade.grade === 'D' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {grade.grade}
                                </span>
                              </td>
                              <td className="p-3">{grade.points?.toFixed(2) || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance Tab */}
              {activeTab === 'attendance' && childData && (
                <div>
                  {childData.error ? (
                    <p className="text-red-600">{childData.error}</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{childData.summary?.present || 0}</p>
                          <p className="text-sm text-gray-600">Present</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{childData.summary?.absent || 0}</p>
                          <p className="text-sm text-gray-600">Absent</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{childData.summary?.total || 0}</p>
                          <p className="text-sm text-gray-600">Total Days</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{childData.summary?.rate || 0}%</p>
                          <p className="text-sm text-gray-600">Attendance Rate</p>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-white">
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-3">Date</th>
                              <th className="text-left p-3">Course</th>
                              <th className="text-left p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {childData.attendance?.map((record: any, i: number) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-3">{record.formatted_date}</td>
                                <td className="p-3">{record.course_name}</td>
                                <td className="p-3">
                                  <span className={`flex items-center gap-1 ${
                                    record.status === 'Present' ? 'text-green-600' :
                                    record.status === 'Absent' ? 'text-red-600' : 'text-orange-600'
                                  }`}>
                                    {record.status === 'Present' ? <CheckCircle className="w-4 h-4" /> :
                                     record.status === 'Absent' ? <XCircle className="w-4 h-4" /> :
                                     <AlertCircle className="w-4 h-4" />}
                                    {record.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Finance Tab */}
              {activeTab === 'finance' && childData && (
                <div>
                  {childData.error ? (
                    <p className="text-red-600">{childData.error}</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {childData.finance?.summary?.totalInvoiced?.toFixed(2) || '0.00'} ETB
                          </p>
                          <p className="text-sm text-gray-600">Total Invoiced</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {childData.finance?.summary?.totalPaid?.toFixed(2) || '0.00'} ETB
                          </p>
                          <p className="text-sm text-gray-600">Total Paid</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {childData.finance?.summary?.balanceDue?.toFixed(2) || '0.00'} ETB
                          </p>
                          <p className="text-sm text-gray-600">Balance Due</p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg ${
                        childData.finance?.summary?.financialClearance ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {childData.finance?.summary?.financialClearance ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600" />
                          )}
                          <div>
                            <p className={`font-semibold ${
                              childData.finance?.summary?.financialClearance ? 'text-green-700' : 'text-red-700'
                            }`}>
                              Financial Status: {childData.finance?.summary?.financialClearance ? 'Cleared' : 'Not Cleared'}
                            </p>
                            {!childData.finance?.summary?.financialClearance && (
                              <p className="text-sm text-red-600">Please settle outstanding balance to access grades and registration.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Payment History</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-3">Date</th>
                                <th className="text-left p-3">Amount</th>
                                <th className="text-left p-3">Method</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {childData.finance?.payments?.map((payment: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-gray-50">
                                  <td className="p-3">{new Date(payment.created_at).toLocaleDateString()}</td>
                                  <td className="p-3">{payment.amount.toFixed(2)} ETB</td>
                                  <td className="p-3">{payment.payment_method}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${
                                      payment.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {payment.status}
                                    </span>
                                  </td>
                                  <td className="p-3">{payment.transaction_ref || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
