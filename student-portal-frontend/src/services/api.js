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
export const studentAPI = {
  getProfile: async () => {
    const response = await api.get('/student/me');
    return response.data;
  },
  
  getGrades: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.session) params.append('session', filters.session);
    
    const response = await api.get(`/student/grades?${params}`);
    return response.data;
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