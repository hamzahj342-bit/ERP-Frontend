// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

// Request Interceptor: Har request se pehle ye function chalega
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Header khud hi attach ho jayega
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. User se company_id nikalein
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      
      // Agar request POST, PUT ya PATCH hai (yani body bhej rahe hain)
      if (['post', 'put', 'patch'].includes(config.method) && user.company_id) {
        // Agar data FormData nahi hai (simple JSON hai)
        if (!(config.data instanceof FormData)) {
          config.data = {
            ...(config.data || {}),
            company_id: user.company_id // 👈 Har request mein khud add ho jayegi
          };
        } else {
          // Agar file upload (FormData) hai
          config.data.append('company_id', user.company_id);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;