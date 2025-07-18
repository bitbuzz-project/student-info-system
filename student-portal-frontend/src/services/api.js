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
  
  getPedagogicalSituation: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    
    const response = await api.get(`/student/pedagogical-situation?${params}`);
    return response.data;
  },
  
  getPedagogicalStats: async () => {
    const response = await api.get('/student/pedagogical-stats');
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

   // 1. Get all modules with filters and pagination
  getModules: async (params = {}) => {
    const searchParams = new URLSearchParams();
    
    // Add all filter parameters
    if (params.search) searchParams.append('search', params.search);
    if (params.element_type) searchParams.append('element_type', params.element_type);
    if (params.semester) searchParams.append('semester', params.semester);
    if (params.parent_code) searchParams.append('parent_code', params.parent_code);
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    
    const response = await api.get(`/admin/modules?${searchParams}`);
    return response.data;
  },
  
  // 2. Get detailed information about a specific module
  getModule: async (id) => {
    const response = await api.get(`/admin/modules/${id}`);
    return response.data;
  },
  
  // 3. Update module properties
  updateModule: async (id, moduleData) => {
    const response = await api.put(`/admin/modules/${id}`, moduleData);
    return response.data;
  },
  
  // 4. Update module parent relationship
  updateModuleParent: async (id, parentCode) => {
    const response = await api.put(`/admin/modules/${id}/parent`, { 
      parent_code: parentCode 
    });
    return response.data;
  },
  
  // 5. Get available parent modules for dropdowns
  getAvailableParents: async (search = '') => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/admin/modules/available-parents${params}`);
    return response.data;
  },
  
  // 6. Get module usage statistics
  getModuleUsage: async (id) => {
    const response = await api.get(`/admin/modules/${id}/usage`);
    return response.data;
  },
  
  // 7. Bulk update semester assignments
  bulkUpdateSemesters: async (updates) => {
    const response = await api.post('/admin/modules/bulk-update-semester', {
      updates: updates
    });
    return response.data;
  },
  
  // 8. Helper function to get semester options
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
  
  // 9. Helper function to get element type options
  getElementTypeOptions: () => {
    return [
      { value: 'MATIERE', label: 'MATIERE - Subject/Course' },
      { value: 'MODULE', label: 'MODULE - Module' },
      { value: 'SEMESTRE', label: 'SEMESTRE - Semester/Year' }
    ];
  },
  
  // 10. Format module data for display
  formatModuleForDisplay: (module) => {
    return {
      ...module,
      semester_display: module.semester_number ? `S${module.semester_number}` : 'Not Assigned',
      element_type_display: module.element_type || 'Not Set',
      usage_display: module.grade_usage_count ? `${module.grade_usage_count} grades` : 'No usage',
      children_display: module.children_count ? `${module.children_count} children` : 'No children',
      parent_display: module.parent_name || 'No parent',
      last_sync_display: module.last_sync ? 
        new Date(module.last_sync).toLocaleDateString() : 'Never'
    };
  },
  
  // 11. Validate module data before sending
  validateModuleData: (moduleData) => {
    const errors = [];
    
    // Validate semester number
    if (moduleData.semester_number !== null && 
        (moduleData.semester_number < 1 || moduleData.semester_number > 12)) {
      errors.push('Semester number must be between 1 and 12');
    }
    
    // Validate element type
    const validTypes = ['SEMESTRE', 'MODULE', 'MATIERE'];
    if (moduleData.element_type && !validTypes.includes(moduleData.element_type)) {
      errors.push('Element type must be SEMESTRE, MODULE, or MATIERE');
    }
    
    // Validate required fields
    if (moduleData.lib_elp && moduleData.lib_elp.trim().length === 0) {
      errors.push('Module name cannot be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  // 12. Search modules with debouncing helper
  searchModules: async (searchTerm, filters = {}) => {
    const params = {
      search: searchTerm,
      ...filters,
      limit: 20 // Smaller limit for search results
    };
    
    return await adminAPI.getModules(params);
  },
  
  // 13. Export modules data (for potential CSV export feature)
  exportModules: async (filters = {}) => {
    const params = {
      ...filters,
      limit: 1000, // Large limit to get all data
      page: 1
    };
    
    const response = await adminAPI.getModules(params);
    
    // Format data for export
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
  }

};

// System API
export const systemAPI = {
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;