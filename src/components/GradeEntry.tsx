import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { notificationService } from '../services/apiServices';
import { 
  FileSpreadsheet, Download, Upload, Save, Check, Calculator, 
  AlertCircle, X, Plus, Trash2, Edit3, ChevronDown, RotateCcw
} from 'lucide-react';

interface GradeEntryProps {
  facultyCourses: any[];
}

interface AssessmentType {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  color: string;
}

interface StudentGrade {
  enrollment_id: number;
  student_id: string;
  student_name: string;
  scores: { [key: string]: string };
  total: number;
  grade: string;
  remark: string;
}

  const defaultAssessments: AssessmentType[] = [
  { id: 'assignment_grade', name: 'Assignment', weight: 20, maxScore: 100, color: 'bg-orange-50' },
  { id: 'midterm_grade', name: 'Midterm', weight: 30, maxScore: 100, color: 'bg-purple-50' },
  { id: 'final_grade', name: 'Final Exam', weight: 50, maxScore: 100, color: 'bg-red-50' },
];

const colorClasses: { [key: string]: string } = {
  'bg-blue-50': 'ring-blue-500 focus:ring-blue-500 border-blue-500',
  'bg-purple-50': 'ring-purple-500 focus:ring-purple-500 border-purple-500',
  'bg-orange-50': 'ring-orange-500 focus:ring-orange-500 border-orange-500',
  'bg-red-50': 'ring-red-500 focus:ring-red-500 border-red-500',
  'bg-emerald-50': 'ring-emerald-500 focus:ring-emerald-500 border-emerald-500',
  'bg-yellow-50': 'ring-yellow-500 focus:ring-yellow-500 border-yellow-500',
  'bg-cyan-50': 'ring-cyan-500 focus:ring-cyan-500 border-cyan-500',
  'bg-pink-50': 'ring-pink-500 focus:ring-pink-500 border-pink-500',
};

const colors = ['bg-orange-50', 'bg-purple-50', 'bg-red-50', 'bg-blue-50', 'bg-emerald-50', 'bg-yellow-50', 'bg-cyan-50', 'bg-pink-50'];

const calculateGrade = (total: number): { grade: string; remark: string } => {
  if (total >= 90) return { grade: 'A', remark: 'Excellent' };
  if (total >= 80) return { grade: 'B', remark: 'Very Good' };
  if (total >= 70) return { grade: 'C', remark: 'Good' };
  if (total >= 60) return { grade: 'D', remark: 'Pass' };
  return { grade: 'F', remark: 'Fail' };
};

export default function GradeEntry({ facultyCourses }: GradeEntryProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [assessments, setAssessments] = useState<AssessmentType[]>(defaultAssessments);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newAssessment, setNewAssessment] = useState({ name: '', weight: 10, maxScore: 100 });
  const [editingAssessment, setEditingAssessment] = useState<string | null>(null);
  const [savedTables, setSavedTables] = useState<any[]>([
    { id: 1, name: 'Computer Science Year 1 - CS101', course: 'CS101', updated: '2026-03-20', studentCount: 45 },
    { id: 2, name: 'Business Admin Year 2 - BA201', course: 'BA201', updated: '2026-03-18', studentCount: 38 },
    { id: 3, name: 'Engineering Year 1 - ENG101', course: 'ENG101', updated: '2026-03-15', studentCount: 52 },
  ]);

  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);

  const handleExport = () => {
    if (!selectedCourse || students.length === 0) {
      showToast('Please select a course first', 'error');
      return;
    }
    const csvContent = [
      ['#', 'Student ID', 'Student Name', ...assessments.map(a => a.name), 'Total', 'Grade', 'Status'],
      ...students.map((s, i) => [
        i + 1,
        s.student_id,
        s.student_name,
        ...assessments.map(a => s.scores[a.id] || ''),
        s.total.toFixed(1),
        s.grade,
        s.remark
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${selectedCourse.course_name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Grades exported successfully!', 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const lines = event.target.result.split('\n');
          const headers = lines[0].split(',');
          const newStudents = students.map((s, idx) => {
            const lineIdx = idx + 1;
            if (lineIdx >= lines.length) return s;
            const values = lines[lineIdx].split(',');
            const newScores: { [key: string]: string } = {};
            assessments.forEach((a, i) => {
              if (headers[i + 3]) {
                newScores[a.id] = values[i + 3] || '';
              }
            });
            return { ...s, scores: newScores };
          });
          setStudents(newStudents);
          showToast('Grades imported successfully!', 'success');
        } catch (err) {
          showToast('Failed to parse CSV file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    loadStudents(course.id);
  };

  const loadStudents = async (courseId: number) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/faculty/course/${courseId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const mappedStudents: StudentGrade[] = response.data.map((s: any) => {
        const scores: { [key: string]: string } = {
          assignment_grade: s.assignment_grade?.toString() || '',
          midterm_grade: s.midterm_grade?.toString() || '',
          final_grade: s.final_grade?.toString() || ''
        };
        
        // Calculate total based on weights
        const total = (
          (parseFloat(scores.assignment_grade) || 0) * 0.2 +
          (parseFloat(scores.midterm_grade) || 0) * 0.3 +
          (parseFloat(scores.final_grade) || 0) * 0.5
        );
        
        const { grade, remark } = calculateGrade(total);
        
        return {
          enrollment_id: s.enrollment_id,
          student_id: s.student_id_code || s.id.toString(),
          student_name: s.full_name,
          scores,
          total,
          grade: s.final_letter_grade || grade,
          remark
        };
      });
      
      setStudents(mappedStudents);
    } catch (err) {
      console.error('Failed to load students', err);
      showToast('Failed to load students for this course', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (studentIdx: number, assessmentId: string, value: string) => {
    const updated = [...students];
    updated[studentIdx].scores[assessmentId] = value;
    
    // Calculate total based on backend weights (20/30/50)
    const assignmentScore = parseFloat(updated[studentIdx].scores['assignment_grade']) || 0;
    const midtermScore = parseFloat(updated[studentIdx].scores['midterm_grade']) || 0;
    const finalScore = parseFloat(updated[studentIdx].scores['final_grade']) || 0;
    
    const total = (assignmentScore * 0.2) + (midtermScore * 0.3) + (finalScore * 0.5);
    
    const { grade, remark } = calculateGrade(total);
    updated[studentIdx].total = total;
    updated[studentIdx].grade = grade;
    updated[studentIdx].remark = remark;
    
    setStudents(updated);
  };

  const addAssessment = () => {
    if (!newAssessment.name.trim()) return;
    const colorIdx = assessments.length % colors.length;
    const newAssess: AssessmentType = {
      id: `custom_${Date.now()}`,
      name: newAssessment.name,
      weight: newAssessment.weight,
      maxScore: newAssessment.maxScore,
      color: colors[colorIdx]
    };
    setAssessments([...assessments, newAssess]);
    setNewAssessment({ name: '', weight: 10, maxScore: 100 });
    setShowAddAssessment(false);
  };

  const removeAssessment = (id: string) => {
    if (assessments.length <= 1) return;
    setAssessments(assessments.filter(a => a.id !== id));
  };

  const saveGrades = async () => {
    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Save grades for each student
      for (const student of students) {
        await axios.post('/api/enrollments/grades', {
          enrollment_id: student.enrollment_id,
          assignment_grade: parseFloat(student.scores['assignment_grade']) || 0,
          midterm_grade: parseFloat(student.scores['midterm_grade']) || 0,
          final_grade: parseFloat(student.scores['final_grade']) || 0
        }, { headers });
      }
      
      setSavedMessage('Grades submitted successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
      showToast('All grades have been submitted to the registry', 'success');
      
      // Notify Students and Staff
      try {
        await notificationService.sendNotification({
          role: 'student',
          title: 'Grades Posted',
          message: `New grades have been posted for ${selectedCourse.course_name || selectedCourse.title}.`
        });
        
        await notificationService.sendNotification({
          role: 'branch_admin',
          title: 'Marklist Submitted',
          message: `Professor submitted the final marklist for ${selectedCourse.course_name || selectedCourse.title}.`
        });
      } catch (notifyErr) {
        console.error('Failed to send notifications', notifyErr);
      }
    } catch (err: any) {
      console.error('Failed to save grades', err);
      showToast('Failed to save grades: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const clearAllScores = () => {
    const cleared = students.map(s => ({
      ...s,
      scores: {},
      total: 0,
      grade: '',
      remark: ''
    }));
    setStudents(cleared);
    showToast('All scores cleared!', 'success');
  };

  const stats = {
    total: students.length,
    avg: students.length > 0 ? (students.reduce((sum, s) => sum + s.total, 0) / students.length).toFixed(1) : 0,
    passed: students.filter(s => s.total >= 60).length,
    failed: students.filter(s => s.total < 60).length,
    aCount: students.filter(s => s.grade === 'A').length,
    bCount: students.filter(s => s.grade === 'B').length,
    cCount: students.filter(s => s.grade === 'C').length,
    dCount: students.filter(s => s.grade === 'D').length,
    fCount: students.filter(s => s.grade === 'F').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Grade Entry Worksheet</h3>
            <p className="text-sm text-stone-500 mt-1">Click on cells to enter scores. Total weight: {totalWeight}%</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearAllScores} className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 text-sm font-bold rounded-xl hover:bg-stone-200">
              <RotateCcw size={16} />
              Clear
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700">
              <Download size={16} />
              Export
            </button>
            <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">
              <Upload size={16} />
              Import
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="border-b pb-4">
              <h4 className="font-semibold text-stone-700 mb-3">My Courses</h4>
              {facultyCourses.length > 0 ? (
                <div className="space-y-2">
                  {facultyCourses.map((course: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleCourseSelect(course)}
                      className={`w-full p-3 border-2 rounded-xl text-left transition-all ${
                        selectedCourse?.id === course.id 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-stone-200 hover:border-emerald-200'
                      }`}
                    >
                      <p className="font-bold text-stone-900 text-sm">{course.course_name || course.title}</p>
                      <p className="text-xs text-stone-500">{course.program_name}</p>
                      <p className="text-xs text-emerald-600 mt-1">{course.enrolled_count || 0} students</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No courses assigned</p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-stone-700 text-sm">Saved Tables</h4>
                <button 
                  onClick={() => setShowNewTableModal(true)}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedTables.map((table) => (
                  <div key={table.id} className="p-2 bg-stone-50 rounded-lg hover:bg-stone-100 cursor-pointer border-l-4 border-emerald-400">
                    <p className="text-sm font-semibold text-stone-800">{table.name}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-stone-500">{table.course}</p>
                      <p className="text-xs text-emerald-600">{table.studentCount} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-stone-700 text-sm">Assessment Types</h4>
                <button 
                  onClick={() => setShowAddAssessment(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1">
                {assessments.map((a) => (
                  <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${a.color}`}>
                    <div className="flex items-center gap-2">
                      {editingAssessment === a.id ? (
                        <input 
                          type="text" 
                          defaultValue={a.name}
                          className="w-16 text-xs border rounded px-1 py-0.5"
                          autoFocus
                          onBlur={(e) => {
                            setAssessments(assessments.map(ass => ass.id === a.id ? {...ass, name: e.target.value} : ass));
                            setEditingAssessment(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingAssessment(null)}
                        />
                      ) : (
                        <span 
                          className="cursor-pointer font-medium"
                          onDoubleClick={() => setEditingAssessment(a.id)}
                        >
                          {a.name}
                        </span>
                      )}
                      <span className="text-stone-500">({a.weight}%)</span>
                    </div>
                    <button 
                      onClick={() => removeAssessment(a.id)}
                      className="text-stone-400 hover:text-red-500"
                      disabled={assessments.length <= 1}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-center text-stone-500">
                Total: <span className={`font-bold ${totalWeight !== 100 ? 'text-red-500' : 'text-emerald-600'}`}>{totalWeight}%</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            {selectedCourse ? (
              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">{selectedCourse.course_name || selectedCourse.title}</h4>
                      <p className="text-emerald-100 text-sm">
                        {selectedCourse.program_name} • Year {selectedCourse.year}, Semester {selectedCourse.semester}
                      </p>
                    </div>
                    <div className="text-right bg-white/10 rounded-xl px-4 py-2">
                      <p className="text-xs text-emerald-100">Class Average</p>
                      <p className="text-2xl font-bold">{stats.avg}%</p>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-stone-500 mt-2">Loading students...</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-100 text-stone-600 text-xs uppercase">
                            <th className="px-2 py-2 text-center font-bold w-8">#</th>
                            <th className="px-2 py-2 text-left font-bold w-20">ID</th>
                            <th className="px-2 py-2 text-left font-bold min-w-[140px]">Student Name</th>
                            {assessments.map((a) => (
                              <th key={a.id} className={`px-1 py-2 text-center font-bold w-16 ${a.color}`}>
                                {a.name}<br/><span className="text-[9px] font-normal">({a.weight}%)</span>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-center font-bold w-14 bg-emerald-50">Total</th>
                            <th className="px-2 py-2 text-center font-bold w-10 bg-emerald-50">Grade</th>
                            <th className="px-2 py-2 text-center font-bold w-14 bg-emerald-50">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {students.map((student, idx) => (
                            <tr key={idx} className="hover:bg-stone-50">
                              <td className="px-2 py-2 text-center text-stone-400">{idx + 1}</td>
                              <td className="px-2 py-2 font-mono text-stone-500 text-xs">{student.student_id}</td>
                              <td className="px-2 py-2 font-semibold text-stone-900">{student.student_name}</td>
                              {assessments.map((a) => (
                                <td key={a.id} className={`px-1 py-1 ${a.color}`}>
                                  <input
                                    type="number"
                                    min="0"
                                    max={a.maxScore}
                                    value={student.scores[a.id] || ''}
                                    onChange={(e) => handleScoreChange(idx, a.id, e.target.value)}
                                    className={`w-full text-center bg-white border border-stone-200 rounded py-1.5 text-sm focus:ring-2 ${colorClasses[a.color]} focus:border-transparent`}
                                    placeholder="-"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center bg-emerald-50 font-bold text-emerald-700 text-base">
                                {student.total.toFixed(1)}
                              </td>
                              <td className="px-2 py-2 text-center bg-emerald-50">
                                <span className={`inline-block w-8 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                  student.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                  student.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                  student.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                  student.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                  student.grade === 'F' ? 'bg-red-100 text-red-700' :
                                  'bg-stone-100 text-stone-400'
                                }`}>
                                  {student.grade || '-'}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center bg-emerald-50">
                                <span className={`text-xs font-semibold ${student.total >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {student.remark || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-stone-50 border-t border-stone-200">
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calculator size={16} className="text-stone-400" />
                            <span className="text-sm text-stone-500">Statistics:</span>
                          </div>
                          <div className="flex gap-3 text-sm">
                            <span className="font-bold text-stone-700">Avg: {stats.avg}%</span>
                            <span className="text-emerald-600">✓ {stats.passed}</span>
                            <span className="text-red-600">✗ {stats.failed}</span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">A: {stats.aCount}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">B: {stats.bCount}</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">C: {stats.cCount}</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">D: {stats.dCount}</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">F: {stats.fCount}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {savedMessage && (
                            <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                              <Check size={16} /> {savedMessage}
                            </span>
                          )}
                          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm font-bold rounded-xl hover:bg-stone-50">
                            <Save size={16} />
                            Save Draft
                          </button>
                          <button 
                            onClick={saveGrades}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-stone-200 rounded-2xl p-16 text-center">
                <FileSpreadsheet size={64} className="text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500 text-lg">Select a course from the left to start entering grades</p>
                <p className="text-stone-400 text-sm mt-2">Grade entries will be saved automatically</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900">Grading Scale</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800 mt-2">
                <div><span className="font-bold">A:</span> 90-100 (Excellent)</div>
                <div><span className="font-bold">B:</span> 80-89 (Very Good)</div>
                <div><span className="font-bold">C:</span> 70-79 (Good)</div>
                <div><span className="font-bold">D:</span> 60-69 (Pass)</div>
                <div><span className="font-bold">F:</span> 0-59 (Fail)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl">
          <div className="flex items-start gap-4">
            <FileSpreadsheet size={24} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900">Excel Import/Export</h4>
              <p className="text-sm text-emerald-800 mt-1 opacity-80">
                Export a template, fill in Excel, then import back. Make sure columns match the assessment types.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-2xl">
          <div className="flex items-start gap-4">
            <Edit3 size={24} className="text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-orange-900">Quick Tips</h4>
              <ul className="text-sm text-orange-800 mt-1 opacity-80 space-y-1">
                <li>• Double-click assessment name to rename</li>
                <li>• Use Tab/Enter to move between cells</li>
                <li>• Scores auto-calculate as you type</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showAddAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Add Assessment Type</h3>
              <button onClick={() => setShowAddAssessment(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Assessment Name</label>
                <input
                  type="text"
                  value={newAssessment.name}
                  onChange={(e) => setNewAssessment({...newAssessment, name: e.target.value})}
                  placeholder="e.g., Quiz 3, Lab Work, Project"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Weight (%)</label>
                  <input
                    type="number"
                    value={newAssessment.weight}
                    onChange={(e) => setNewAssessment({...newAssessment, weight: parseInt(e.target.value) || 0})}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    value={newAssessment.maxScore}
                    onChange={(e) => setNewAssessment({...newAssessment, maxScore: parseInt(e.target.value) || 100})}
                    min="1"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowAddAssessment(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={addAssessment}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Create New Grade Table</h3>
              <button onClick={() => setShowNewTableModal(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Table Name</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., CS101 - Mid Term Exam"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Course</label>
                <select className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">Select course...</option>
                  {facultyCourses.map((course, i) => (
                    <option key={i} value={course.id}>{course.course_name || course.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowNewTableModal(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (newTableName.trim()) {
                      setSavedTables([{ id: Date.now(), name: newTableName, course: selectedCourse?.course_name || 'New', updated: new Date().toISOString().split('T')[0], studentCount: students.length }, ...savedTables]);
                      setNewTableName('');
                      setShowNewTableModal(false);
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}