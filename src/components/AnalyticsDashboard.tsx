import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { analyticsService } from '../services/apiServices';
import { TrendingUp, DollarSign, Users, Award, Loader2, TrendingDown } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'enrollment' | 'revenue' | 'program' | 'branch' | 'performance'>('enrollment');
  const [data, setData] = useState<any>({
    enrollmentTrends: [],
    revenueTrends: [],
    programDistribution: [],
    branchComparison: [],
    coursePerformance: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [
        enrollment,
        revenue,
        program,
        branch,
        performance
      ] = await Promise.all([
        analyticsService.getEnrollmentTrends(),
        analyticsService.getRevenueTrends(),
        analyticsService.getProgramDistribution(),
        analyticsService.getBranchComparison(),
        analyticsService.getCoursePerformance(),
      ]);

      setData({
        enrollmentTrends: enrollment.trends || [],
        revenueTrends: revenue.trends || [],
        programDistribution: program.distribution || [],
        branchComparison: branch.comparison || [],
        coursePerformance: performance.performance || [],
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const charts = [
    { id: 'enrollment', label: 'Enrollment Trends', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue Trends', icon: DollarSign },
    { id: 'program', label: 'Program Distribution', icon: Award },
    { id: 'branch', label: 'Branch Comparison', icon: Users },
    { id: 'performance', label: 'Course Performance', icon: TrendingDown },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Selection Tabs */}
      <div className="flex flex-wrap gap-2">
        {charts.map((chart) => (
          <button
            key={chart.id}
            onClick={() => setActiveChart(chart.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeChart === chart.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <chart.icon className="w-5 h-5" />
            <span className="font-medium">{chart.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <motion.div
        key={activeChart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        {/* Enrollment Trends */}
        {activeChart === 'enrollment' && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Enrollment Trends (Last 12 Months)
            </h3>
            {data.enrollmentTrends.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No enrollment data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.enrollmentTrends}>
                  <defs>
                    <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Students" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorEnrollment)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Current Month</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.enrollmentTrends[data.enrollmentTrends.length - 1]?.count || 0}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Previous Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.enrollmentTrends[data.enrollmentTrends.length - 2]?.count || 0}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(data.enrollmentTrends.reduce((sum: number, t: any) => sum + t.count, 0) / (data.enrollmentTrends.length || 1))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Trends */}
        {activeChart === 'revenue' && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Revenue Trends (Last 12 Months)
            </h3>
            {data.revenueTrends.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No revenue data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue (ETB)" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.revenueTrends.reduce((sum: any, t: any) => sum + (t.revenue || 0), 0).toFixed(2)} ETB
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.revenueTrends.reduce((sum: any, t: any) => sum + (t.transaction_count || 0), 0)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg per Month</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(data.revenueTrends.reduce((sum: any, t: any) => sum + (t.revenue || 0), 0) / (data.revenueTrends.length || 1)).toFixed(2)} ETB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Program Distribution */}
        {activeChart === 'program' && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Program Distribution
            </h3>
            {data.programDistribution.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No program data available</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.programDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.programDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  <h4 className="font-semibold mb-2">Program Details</h4>
                  {data.programDistribution.map((prog: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span>{prog.program}</span>
                      </div>
                      <span className="font-semibold">{prog.count} students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branch Comparison */}
        {activeChart === 'branch' && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-600" />
              Branch Comparison
            </h3>
            {data.branchComparison.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No branch data available</p>
            ) : (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.branchComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branch" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="student_count" name="Students" fill="#3B82F6" />
                    <Bar yAxisId="right" dataKey="total_revenue" name="Revenue" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-4">
                  {data.branchComparison.map((branch: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <h4 className="font-bold text-lg mb-2">{branch.branch}</h4>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{branch.location}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-600">Students:</span>
                          <span className="font-medium">{branch.student_count}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-medium">{branch.total_revenue.toFixed(2)} ETB</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-600">Contact:</span>
                          <span className="font-medium">{branch.contact}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Course Performance */}
        {activeChart === 'performance' && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-red-600" />
              Course Performance Heatmap
            </h3>
            {data.coursePerformance.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No course data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">Course</th>
                      <th className="text-left p-3">Enrollments</th>
                      <th className="text-left p-3">Avg Score</th>
                      <th className="text-left p-3">Avg GPA</th>
                      <th className="text-left p-3">Fail Rate</th>
                      <th className="text-left p-3">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.coursePerformance.map((course: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-semibold">{course.code}</p>
                            <p className="text-sm text-gray-600">{course.title}</p>
                          </div>
                        </td>
                        <td className="p-3">{course.enrollment_count}</td>
                        <td className="p-3">{course.avg_score?.toFixed(1) || 'N/A'}</td>
                        <td className="p-3">{course.avg_gpa?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${
                            (course.fail_rate || 0) > 20 ? 'text-red-600' :
                            (course.fail_rate || 0) > 10 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {(course.fail_rate || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (course.avg_score || 0) >= 80 ? 'bg-green-500' :
                                (course.avg_score || 0) >= 70 ? 'bg-blue-500' :
                                (course.avg_score || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min((course.avg_score || 0), 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
