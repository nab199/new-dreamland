import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import {
  BookOpen, Upload, FileText, File, FileImage, FileVideo,
  Download, Trash2, Plus, X, Search, FolderOpen,
  Video, FileAudio, FileArchive, Eye, Clock, User
} from 'lucide-react';

interface CourseResourcesProps {
  facultyCourses: any[];
  enrollments: any[];
}

interface Resource {
  id: number;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  course_name: string;
  uploaded_by: string;
  course_offering_id?: number;
}

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="text-red-500" />;
  if (type.includes('image')) return <FileImage className="text-purple-500" />;
  if (type.includes('video')) return <FileVideo className="text-blue-500" />;
  if (type.includes('audio')) return <FileAudio className="text-orange-500" />;
  if (type.includes('zip') || type.includes('archive')) return <FileArchive className="text-yellow-500" />;
  return <File className="text-stone-400" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CourseResources({ facultyCourses, enrollments }: CourseResourcesProps) {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', file: null as File | null });

  const isFaculty = user?.role === 'faculty';

  // Fetch resources from API
  useEffect(() => {
    const fetchResources = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        let allResources: Resource[] = [];

        if (isFaculty && facultyCourses.length > 0) {
          // Fetch resources for each faculty course
          const promises = facultyCourses.map(async (course) => {
            try {
              const res = await axios.get(`/api/courses/${course.id}/materials`, { headers });
              return res.data.map((r: any) => ({
                ...r,
                course_offering_id: course.id,
                course_name: course.course_name || course.title
              }));
            } catch (e) {
              console.error(`Failed to fetch resources for course ${course.id}`, e);
              return [];
            }
          });
          const results = await Promise.all(promises);
          allResources = results.flat();
        } else if (enrollments.length > 0) {
          // Fetch resources for enrolled courses
          const promises = enrollments.map(async (enrollment: any) => {
            try {
              const res = await axios.get(`/api/courses/${enrollment.course_offering_id}/materials`, { headers });
              return res.data.map((r: any) => ({
                ...r,
                course_offering_id: enrollment.course_offering_id,
                course_name: enrollment.course_name || enrollment.program_name
              }));
            } catch (e) {
              console.error(`Failed to fetch resources for enrollment ${enrollment.id}`, e);
              return [];
            }
          });
          const results = await Promise.all(promises);
          allResources = results.flat();
        }

        setResources(allResources);
      } catch (err) {
        console.error('Failed to fetch resources', err);
        showToast('Failed to load course resources', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [token, isFaculty, facultyCourses, enrollments, showToast]);

  const handleDownload = async (resource: Resource) => {
    try {
      const response = await axios.get(`/api/resources/${resource.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resource.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Download started!', 'success');
    } catch (err) {
      console.error('Download failed', err);
      showToast('Failed to download file', 'error');
    }
  };

  const handlePreview = (resource: Resource) => {
    if (resource.file_type.includes('pdf') || resource.file_type.includes('image')) {
      window.open(`/api/resources/${resource.id}/preview`, '_blank');
    } else {
      showToast('Preview not available for this file type', 'info');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.file || !selectedCourse) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description || '');

      const response = await axios.post(
        `/api/courses/${selectedCourse.id}/materials`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const newResource: Resource = {
        id: response.data.id,
        title: uploadForm.title,
        description: uploadForm.description,
        file_name: uploadForm.file.name,
        file_type: uploadForm.file.type,
        file_size: uploadForm.file.size,
        upload_date: new Date().toISOString().split('T')[0],
        course_name: selectedCourse.course_name || selectedCourse.title,
        uploaded_by: user?.full_name || 'Teacher',
        course_offering_id: selectedCourse.id
      };

      setResources([newResource, ...resources]);
      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', file: null });
      showToast('Material uploaded successfully!', 'success');
    } catch (err: any) {
      console.error('Upload failed', err);
      showToast('Failed to upload material: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
      await axios.delete(`/api/resources/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(resources.filter(r => r.id !== id));
      showToast('Resource deleted successfully!', 'success');
    } catch (err: any) {
      console.error('Delete failed', err);
      showToast('Failed to delete resource: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const courses = isFaculty ? facultyCourses : enrollments;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              {isFaculty ? 'Teaching Resources' : 'My Learning Resources'}
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              {isFaculty ? 'Upload and manage course materials' : 'Download study materials and assignments'}
            </p>
          </div>
          {isFaculty && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
            >
              <Upload size={16} />
              Upload Material
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="border-b pb-4">
              <h4 className="font-semibold text-stone-700 mb-3">
                {isFaculty ? 'My Courses' : 'Enrolled Courses'}
              </h4>
              {courses.length > 0 ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className={`w-full p-3 border-2 rounded-xl text-left transition-all ${
                      !selectedCourse
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-stone-200 hover:border-emerald-200'
                    }`}
                  >
                    <p className="font-bold text-stone-900 text-sm">All Courses</p>
                    <p className="text-xs text-emerald-600 mt-1">{resources.length} materials</p>
                  </button>
                  {courses.map((course: any, i: number) => {
                    const courseResources = resources.filter(r => r.course_offering_id === course.id);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedCourse(course)}
                        className={`w-full p-3 border-2 rounded-xl text-left transition-all ${
                          selectedCourse?.id === course.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-stone-200 hover:border-emerald-200'
                        }`}
                      >
                        <p className="font-bold text-stone-900 text-sm">{course.course_name || course.program_name || course.title}</p>
                        <p className="text-xs text-emerald-600 mt-1">{courseResources.length} materials</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No courses available</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-stone-700 mb-3">Upload Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Files</span>
                  <span className="font-bold text-stone-700">{resources.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Size</span>
                  <span className="font-bold text-stone-700">
                    {formatFileSize(resources.reduce((sum, r) => sum + r.file_size, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search materials..."
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {filteredResources.length > 0 ? (
              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-2xl hover:border-emerald-200 transition-all"
                  >
                    <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                      {getFileIcon(resource.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-stone-900">{resource.title}</h4>
                      <p className="text-sm text-stone-500 truncate">{resource.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          {resource.course_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {resource.uploaded_by}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {resource.upload_date}
                        </span>
                        <span>{formatFileSize(resource.file_size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePreview(resource)} className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Preview">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleDownload(resource)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Download">
                        <Download size={18} />
                      </button>
                      {isFaculty && (
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen size={48} className="text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">No materials found</p>
                {isFaculty && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 text-emerald-600 font-bold hover:underline"
                  >
                    Upload your first material
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Upload Teaching Material</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Select Course</label>
                <select
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={selectedCourse?.id || ''}
                  onChange={(e) => {
                    const course = facultyCourses.find(c => c.id === parseInt(e.target.value));
                    setSelectedCourse(course);
                  }}
                >
                  <option value="">Select a course...</option>
                  {facultyCourses.map((course: any, i: number) => (
                    <option key={i} value={course.id}>{course.course_name || course.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  placeholder="e.g., Lecture Notes - Chapter 1"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Description (Optional)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  placeholder="Brief description of the material"
                  rows={3}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">File</label>
                <div
                  className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.mp4"
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="text-emerald-600" />
                      <span className="font-semibold text-stone-700">{uploadForm.file.name}</span>
                      <span className="text-stone-400">({formatFileSize(uploadForm.file.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-stone-400 mx-auto mb-2" size={24} />
                      <p className="text-stone-500">Click to upload or drag and drop</p>
                      <p className="text-xs text-stone-400 mt-1">PDF, DOC, PPT, XLS, ZIP, Images, Videos</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.title || !uploadForm.file || !selectedCourse || isUploading}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
