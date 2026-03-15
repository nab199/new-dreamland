import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, FileText, MessageCircle, BookOpen, Sparkles, Loader2, Send } from 'lucide-react';
import { aiService } from '../services/apiServices';
import { useAuth } from '../context/AuthContext';

interface AIFeaturesProps {
  students?: any[];
}

export default function AIFeatures({ students = [] }: AIFeaturesProps) {
  const { token } = useAuth();
  const [activeFeature, setActiveFeature] = useState<'predict' | 'risk' | 'comment' | 'chat' | 'tips'>('predict');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Prediction state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Comment generation state
  const [commentData, setCommentData] = useState({
    student_name: '',
    subject: '',
    grade: 'B',
    strengths: [''],
    weaknesses: [''],
    attendance_rate: 85,
    participation: 'medium' as 'high' | 'medium' | 'low'
  });
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Study tips state
  const [tipsData, setTipsData] = useState({
    learning_style: 'visual' as 'visual' | 'auditory' | 'kinesthetic',
    weak_subjects: [''],
    available_hours: 10
  });

  const handlePredictGrade = async () => {
    if (!selectedStudent || !selectedCourse) return;
    setLoading(true);
    try {
      const data = await aiService.predictGrade(parseInt(selectedStudent), parseInt(selectedCourse));
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGetAtRisk = async () => {
    setLoading(true);
    try {
      const data = await aiService.getAtRiskStudents();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateComment = async () => {
    setLoading(true);
    try {
      const data = await aiService.generateComment({
        ...commentData,
        strengths: commentData.strengths.filter(s => s.trim()),
        weaknesses: commentData.weaknesses.filter(w => w.trim())
      });
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setLoading(true);
    try {
      const data = await aiService.chat(userMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please contact support.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStudyTips = async () => {
    setLoading(true);
    try {
      const data = await aiService.getStudyTips({
        ...tipsData,
        weak_subjects: tipsData.weak_subjects.filter(s => s.trim())
      });
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { id: 'predict', icon: Brain, label: 'Grade Prediction', color: 'text-blue-600' },
    { id: 'risk', icon: AlertTriangle, label: 'At-Risk Detection', color: 'text-red-600' },
    { id: 'comment', icon: FileText, label: 'Report Comments', color: 'text-green-600' },
    { id: 'chat', icon: MessageCircle, label: 'AI Chatbot', color: 'text-purple-600' },
    { id: 'tips', icon: BookOpen, label: 'Study Tips', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Feature Tabs */}
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => { setActiveFeature(feature.id as any); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeFeature === feature.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <feature.icon className={`w-5 h-5 ${activeFeature === feature.id ? 'text-white' : feature.color}`} />
            <span className="font-medium">{feature.label}</span>
          </button>
        ))}
      </div>

      {/* Feature Content */}
      <motion.div
        key={activeFeature}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        {/* Grade Prediction */}
        {activeFeature === 'predict' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold">AI Grade Prediction</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Choose a student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.student_id_code})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Choose a course...</option>
                  <option value="1">CS101 - Introduction to Programming</option>
                  <option value="2">CS102 - Data Structures</option>
                  <option value="3">ACC101 - Accounting Principles</option>
                </select>
              </div>
            </div>

            <button
              onClick={handlePredictGrade}
              disabled={loading || !selectedStudent || !selectedCourse}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Predict Grade
            </button>

            {result && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {result.error ? (
                  <p className="text-red-600">{result.error}</p>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-4xl font-bold text-blue-600">{result.prediction?.predictedGrade}</div>
                      <div>
                        <p className="text-sm text-gray-600">Confidence: {(result.prediction?.confidence * 100).toFixed(0)}%</p>
                        <p className="text-sm text-gray-600">Student: {result.student?.name}</p>
                      </div>
                    </div>
                    
                    {result.prediction?.riskFactors?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-red-600 mb-1">Risk Factors:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.prediction.riskFactors.map((factor: string, i: number) => (
                            <li key={i}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.prediction?.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-green-600 mb-1">Recommendations:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.prediction.recommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* At-Risk Detection */}
        {activeFeature === 'risk' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold">At-Risk Student Detection</h3>
            </div>

            <button
              onClick={handleGetAtRisk}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              Generate At-Risk Report
            </button>

            {result && (
              <div className="mt-4">
                {result.error ? (
                  <p className="text-red-600">{result.error}</p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Found {result.total} at-risk students</p>
                    <div className="space-y-3">
                      {result.atRiskStudents?.map((student: any, i: number) => (
                        <div key={i} className={`p-4 rounded-lg border-l-4 ${
                          student.riskLevel === 'HIGH' ? 'border-red-600 bg-red-50' : 'border-orange-600 bg-orange-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold">{student.full_name}</h4>
                              <p className="text-sm text-gray-600">{student.student_id_code}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              student.riskLevel === 'HIGH' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                            }`}>
                              {student.riskLevel} RISK ({student.riskScore}%)
                            </div>
                          </div>
                          
                          {student.interventions?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-semibold mb-1">Recommended Interventions:</p>
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {student.interventions.map((int: string, j: number) => (
                                  <li key={j}>{int}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Report Comments */}
        {activeFeature === 'comment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold">AI Report Comment Generator</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student Name</label>
                <input
                  type="text"
                  value={commentData.student_name}
                  onChange={(e) => setCommentData({...commentData, student_name: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={commentData.subject}
                  onChange={(e) => setCommentData({...commentData, subject: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <select
                  value={commentData.grade}
                  onChange={(e) => setCommentData({...commentData, grade: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Attendance Rate</label>
                <input
                  type="number"
                  value={commentData.attendance_rate}
                  onChange={(e) => setCommentData({...commentData, attendance_rate: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Participation</label>
                <select
                  value={commentData.participation}
                  onChange={(e) => setCommentData({...commentData, participation: e.target.value as any})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Strengths (comma separated)</label>
              <input
                type="text"
                value={commentData.strengths.join(', ')}
                onChange={(e) => setCommentData({...commentData, strengths: e.target.value.split(',')})}
                className="w-full p-2 border rounded-lg"
                placeholder="Problem solving, Team work, Critical thinking"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Areas for Improvement (comma separated)</label>
              <input
                type="text"
                value={commentData.weaknesses.join(', ')}
                onChange={(e) => setCommentData({...commentData, weaknesses: e.target.value.split(',')})}
                className="w-full p-2 border rounded-lg"
                placeholder="Time management, Attention to detail"
              />
            </div>

            <button
              onClick={handleGenerateComment}
              disabled={loading || !commentData.student_name || !commentData.subject}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Generate Comment
            </button>

            {result && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                {result.error ? (
                  <p className="text-red-600">{result.error}</p>
                ) : (
                  <div>
                    <p className="text-gray-800 italic mb-3">{result.comment?.comment}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-1">Strengths:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.comment?.strengths?.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-700 mb-1">Areas for Improvement:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.comment?.areasForImprovement?.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Chatbot */}
        {activeFeature === 'chat' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold">AI Student Assistant</h3>
            </div>

            <div className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-center mt-20">Ask me anything about grades, registration, payments, or college policies!</p>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border p-3 rounded-lg">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask a question..."
                className="flex-1 p-3 border rounded-lg"
              />
              <button
                onClick={handleChat}
                disabled={loading || !chatInput.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </div>
          </div>
        )}

        {/* Study Tips */}
        {activeFeature === 'tips' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold">Personalized Study Tips</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Learning Style</label>
                <select
                  value={tipsData.learning_style}
                  onChange={(e) => setTipsData({...tipsData, learning_style: e.target.value as any})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="visual">Visual (seeing)</option>
                  <option value="auditory">Auditory (hearing)</option>
                  <option value="kinesthetic">Kinesthetic (doing)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Study Hours/Week</label>
                <input
                  type="number"
                  value={tipsData.available_hours}
                  onChange={(e) => setTipsData({...tipsData, available_hours: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Challenging Subjects (comma separated)</label>
              <input
                type="text"
                value={tipsData.weak_subjects.join(', ')}
                onChange={(e) => setTipsData({...tipsData, weak_subjects: e.target.value.split(',')})}
                className="w-full p-2 border rounded-lg"
                placeholder="Mathematics, Physics, Chemistry"
              />
            </div>

            <button
              onClick={handleGetStudyTips}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Get Study Tips
            </button>

            {result && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                {result.error ? (
                  <p className="text-red-600">{result.error}</p>
                ) : (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3">Your Personalized Study Tips:</h4>
                    <ul className="space-y-2">
                      {result.tips?.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-600 font-bold">{i + 1}.</span>
                          <span className="text-gray-800">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
