import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // This will proxy to localhost:3000 via Vite
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const adminToken = localStorage.getItem('adminToken');
    
    // Use admin token for admin routes, student token for student routes
    if (config.url?.includes('/admin/') && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (error.config.url?.includes('/admin/')) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (cin, password) => {
    const response = await api.post('/auth/login', { cin, password });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  getToken: () => {
    return localStorage.getItem('authToken');
  }
};


// Student API
// Updated studentAPI section in src/services/api.js

export const studentAPI = {
  getProfile: async () => {
    const response = await api.get('/student/me');
    return response.data;
  },
  getStudentCardRequestStatus: async () => {
    const response = await api.get('/student/request/student-card/status');
    return response.data;
  },

    getValidatedModules: async () => {
    const response = await api.get('/student/validated-modules');
    return response.data;
  },
    getPedagogicalSituation: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      
      const response = await api.get(`/student/pedagogical-situation?${params}`);
      return response.data;
    },
    getGradeStats: () => apiClient.get('/student/grades/stats').then(res => res.data),
  requestStudentCard: (formData) => api.post('/student/request/student-card', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(res => res.data),
  
  getPedagogicalStats: async () => {
    const response = await api.get('/student/pedagogical-stats');
    return response.data;
  },
  // Add to studentAPI in src/services/api.js
getAdministrativeSituation: async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.year) params.append('year', filters.year);
  
  const response = await api.get(`/student/administrative-situation?${params}`);
  return response.data;
},

getAdministrativeStats: async () => {
  const response = await api.get('/student/administrative-stats');
  return response.data;
},
  // Current year grades from RESULTAT_EPR
  getGrades: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.session) params.append('session', filters.session);
    
    const response = await api.get(`/student/grades?${params}`);
    return response.data;
  },
  
  // NEW: Official documents/transcripts 
  getOfficialDocuments: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.semester) params.append('semester', filters.semester);
    
    const response = await api.get(`/student/official-documents?${params}`);
    return response.data;
  },
  
  // NEW: Generate transcript PDF (server-side)
  downloadTranscriptPDF: async (semester, studentCode) => {
    try {
      const response = await api.get(`/student/transcript/${semester}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Releve_Notes_S${semester}_${studentCode}_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download PDF error:', error);
      throw error;
    }
  },
  
  // NEW: Print transcript
  printTranscriptPDF: async (semester) => {
    try {
      const response = await api.get(`/student/transcript/${semester}/print`);
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Print transcript error:', error);
      throw error;
    }
  },
  
  getGradeStats: async () => {
    const response = await api.get('/student/grade-stats');
    return response.data;
  }
};



// Admin API
export const adminAPI = {
  login: async (username, password) => {
    const response = await api.post('/admin/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('adminToken', response.data.token);
    }
    return response.data;
  },

  // Student Management APIs
  searchStudents: async (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) searchParams.append(key, params[key]);
    });
    
    const response = await api.get(`/admin/students/search?${searchParams}`);
    return response.data;
  },

  // NEW: Export Students Function
  exportStudents: async (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) searchParams.append(key, params[key]);
    });
    
    const response = await api.get(`/admin/students/export?${searchParams}`, {
      responseType: 'blob' // Important for handling file downloads
    });
    
    // Trigger file download in browser
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `students_export_${params.year || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  },
  getLaureatDetails: async (codEtu) => {
    const response = await api.get(`/admin/laureats/student/${codEtu}`);
    return response.data;
  },
  // Add this new function:
  getEmployeeStats: async () => {
    const response = await api.get('/admin/employees/stats');
    return response.data;
  },
  // --- RH MANAGEMENT (Employees) ---
  getEmployees: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    
    const response = await api.get(`/admin/employees?${params}`);
    return response.data;
  },

  addEmployee: async (employeeData) => {
    const response = await api.post('/admin/employees', employeeData);
    return response.data;
  },

  updateEmployee: async (id, employeeData) => {
    const response = await api.put(`/admin/employees/${id}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (id) => {
    const response = await api.delete(`/admin/employees/${id}`);
    return response.data;
  },
  // --- FIXED LAUREAT ROUTES (Uses axios 'api' instance) ---
// Laureat Management
  getLaureats: async (params) => {
    const searchParams = new URLSearchParams();
    
    // Add filters to query string
    if (params.year) searchParams.append('year', params.year);
    if (params.diploma) searchParams.append('diploma', params.diploma);
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page);
    
    // --- FIX: Pass the multiDiploma parameter ---
    if (params.multiDiploma) searchParams.append('multiDiploma', 'true');
    // --------------------------------------------
    
    const response = await api.get(`/admin/laureats?${searchParams.toString()}`);
    return response.data;
  },

  getLaureatStats: async () => {
    const response = await api.get('/admin/laureats/stats');
    return response.data;
  },

  syncLaureats: async (years) => {
    const response = await api.post('/admin/laureats/sync', { years });
    return response.data;
  },
  // -------------------------------------------------------

  // Student Registration Management APIs
  getStudentRegistrations: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.year) searchParams.append('year', params.year);
    if (params.user) searchParams.append('user', params.user);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params.limit) searchParams.append('limit', params.limit);
    
    const response = await api.get(`/admin/registrations?${searchParams}`);
    return response.data;
  },

  exportRegistrationsPDF: async (filters = {}) => {
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams();
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.user) queryParams.append('user', filters.user);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const url = `/admin/registrations/export-pdf?${queryParams.toString()}`;
      
      const response = await api.get(url, {
        responseType: 'text',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (newWindow) {
        newWindow.document.write(response.data);
        newWindow.document.close();
      } else {
        const blob = new Blob([response.data], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
      return { success: true, message: 'Rapport PDF généré avec succès' };
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  },

  getRegistrationStats: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.year) searchParams.append('year', params.year);
    if (params.user) searchParams.append('user', params.user);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    
    const response = await api.get(`/admin/registrations/stats?${searchParams}`);
    return response.data;
  },

  exportRegistrations: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.year) searchParams.append('year', params.year);
    if (params.user) searchParams.append('user', params.user);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    
    try {
      const response = await api.get(`/admin/registrations/export?${searchParams}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_registrations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('adminToken');
  },
  
  verify: async () => {
    const response = await api.get('/admin/verify');
    return response.data;
  },
  
  getToken: () => {
    return localStorage.getItem('adminToken');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },
  
  // Dashboard APIs
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },
  
  getDataOverview: async () => {
    const response = await api.get('/admin/dashboard/overview');
    return response.data;
  },
  
  // Student Management APIs
  searchStudents: async (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) searchParams.append(key, params[key]);
    });
    
    const response = await api.get(`/admin/students/search?${searchParams}`);
    return response.data;
  },
  
  getStudent: async (id) => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },
  
  // Sync Management APIs
  getSyncStatus: async (limit = 10) => {
    const response = await api.get(`/admin/sync/status?limit=${limit}`);
    return response.data;
  },
  
  triggerManualSync: async () => {
    const response = await api.post('/admin/sync/manual');
    return response.data;
  },
  
  // System Health APIs
  getSystemHealth: async () => {
    const response = await api.get('/admin/system/health');
    return response.data;
  },
  
  getSystemStats: async (period = 30) => {
    const response = await api.get(`/admin/system/stats?period=${period}`);
    return response.data;
  },

  // Module Management
  getModules: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.element_type) searchParams.append('element_type', params.element_type);
    if (params.semester) searchParams.append('semester', params.semester);
    if (params.parent_code) searchParams.append('parent_code', params.parent_code);
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    
    const response = await api.get(`/admin/modules?${searchParams}`);
    return response.data;
  },
  
  getModule: async (id) => {
    const response = await api.get(`/admin/modules/${id}`);
    return response.data;
  },
  
  updateModule: async (id, moduleData) => {
    const response = await api.put(`/admin/modules/${id}`, moduleData);
    return response.data;
  },
  
  updateModuleParent: async (id, parentCode) => {
    const response = await api.put(`/admin/modules/${id}/parent`, { parent_code: parentCode });
    return response.data;
  },
  
  getAvailableParents: async (search = '') => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/admin/modules/available-parents${params}`);
    return response.data;
  },
  
  getModuleUsage: async (id) => {
    const response = await api.get(`/admin/modules/${id}/usage`);
    return response.data;
  },
  
  bulkUpdateSemesters: async (updates) => {
    const response = await api.post('/admin/modules/bulk-update-semester', { updates: updates });
    return response.data;
  },
  
  getSemesterOptions: () => {
    return [
      { value: null, label: 'No Semester Assigned' },
      { value: 1, label: 'S1 - First Semester' },
      { value: 2, label: 'S2 - Second Semester' },
      { value: 3, label: 'S3 - Third Semester' },
      { value: 4, label: 'S4 - Fourth Semester' },
      { value: 5, label: 'S5 - Fifth Semester' },
      { value: 6, label: 'S6 - Sixth Semester' },
      { value: 7, label: 'S7 - Seventh Semester' },
      { value: 8, label: 'S8 - Eighth Semester' },
      { value: 9, label: 'S9 - Ninth Semester' },
      { value: 10, label: 'S10 - Tenth Semester' },
      { value: 11, label: 'S11 - Eleventh Semester' },
      { value: 12, label: 'S12 - Twelfth Semester' }
    ];
  },
  
  getElementTypeOptions: () => {
    return [
      { value: 'MATIERE', label: 'MATIERE - Subject/Course' },
      { value: 'MODULE', label: 'MODULE - Module' },
      { value: 'SEMESTRE', label: 'SEMESTRE - Semester/Year' },
      { value: 'ANNEE', label: 'ANNEE - Academic Year' }
    ];
  },

  getYearLevelOptions: () => {
    return [
      { value: null, label: 'No Year Assigned' },
      { value: 1, label: 'Year 1 (1ère Année)' },
      { value: 2, label: 'Year 2 (2ème Année)' },
      { value: 3, label: 'Year 3 (3ème Année)' },
      { value: 4, label: 'Year 4 (4ème Année)' },
      { value: 5, label: 'Year 5 (5ème Année)' },
      { value: 6, label: 'Year 6 (6ème Année)' }
    ];
  },
  
  formatModuleForDisplay: (module) => {
    return {
      ...module,
      semester_display: module.semester_number ? `S${module.semester_number}` : 'Not Assigned',
      year_display: module.year_level ? `Year ${module.year_level}` : 'Not Assigned',
      element_type_display: module.element_type || 'Not Set',
      usage_display: module.grade_usage_count ? `${module.grade_usage_count} grades` : 'No usage',
      children_display: module.children_count ? `${module.children_count} children` : 'No children',
      parent_display: module.parent_name || 'No parent',
      last_sync_display: module.last_sync ? new Date(module.last_sync).toLocaleDateString() : 'Never'
    };
  },
  
  validateModuleData: (moduleData) => {
    const errors = [];
    if (moduleData.semester_number !== null && moduleData.element_type !== 'ANNEE') {
      if (moduleData.semester_number < 1 || moduleData.semester_number > 12) {
        errors.push('Semester number must be between 1 and 12');
      }
    }
    if (moduleData.year_level !== null && moduleData.element_type === 'ANNEE') {
      if (moduleData.year_level < 1 || moduleData.year_level > 6) {
        errors.push('Year level must be between 1 and 6');
      }
    }
    const validTypes = ['SEMESTRE', 'MODULE', 'MATIERE', 'ANNEE'];
    if (moduleData.element_type && !validTypes.includes(moduleData.element_type)) {
      errors.push(`Invalid element type: ${moduleData.element_type}. Valid types are: ${validTypes.join(', ')}`);
    }
    if (moduleData.lib_elp && moduleData.lib_elp.trim().length === 0) {
      errors.push('Module name cannot be empty');
    }
    if (moduleData.element_type === 'ANNEE') {
      if (moduleData.semester_number !== null) errors.push('ANNEE elements should not have a semester number');
      if (moduleData.year_level === null) errors.push('ANNEE elements must have a year level');
    } else if (moduleData.element_type !== 'ANNEE') {
      if (moduleData.year_level !== null) errors.push('Only ANNEE elements can have a year level');
    }
    return { isValid: errors.length === 0, errors: errors };
  },
  
  searchModules: async (searchTerm, filters = {}) => {
    const params = {
      search: searchTerm,
      ...filters,
      limit: 20
    };
    return await adminAPI.getModules(params);
  },
  
  exportModules: async (filters = {}) => {
    const params = {
      ...filters,
      limit: 1000,
      page: 1
    };
    const response = await adminAPI.getModules(params);
    const exportData = response.modules.map(module => ({
      'Module Code': module.cod_elp,
      'Module Name': module.lib_elp,
      'Arabic Name': module.lib_elp_arb,
      'Element Type': module.element_type,
      'Semester': module.semester_number ? `S${module.semester_number}` : 'Not Assigned',
      'Parent Code': module.parent_code || 'No Parent',
      'Parent Name': module.parent_name || 'No Parent',
      'Grade Usage': module.grade_usage_count || 0,
      'Children Count': module.children_count || 0,
      'Last Sync': module.last_sync ? new Date(module.last_sync).toLocaleDateString() : 'Never'
    }));
    return exportData;
  },

  getStudentCardRequests: async () => {
    const response = await api.get('/admin/student-card-requests');
    return response.data;
  },
};



// System API
export const systemAPI = {
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;