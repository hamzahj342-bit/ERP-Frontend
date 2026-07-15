// // src/api.js
// import axios from 'axios';

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
// });


// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
      
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     // 2. User se company_id nikalein
//     const userStr = localStorage.getItem("user");
//     if (userStr) {
//       const user = JSON.parse(userStr);
      
   
//       if (['post', 'put', 'patch'].includes(config.method) && user.company_id) {
//         // Agar data FormData nahi hai (simple JSON hai)
//         if (!(config.data instanceof FormData)) {
//           config.data = {
//             ...(config.data || {}),
//             company_id: user.company_id 
//           };
//         } else {
          
//           config.data.append('company_id', user.company_id);
//         }
//       }
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// export default api;



// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      
      if (user.company_id) {
        const method = config.method ? config.method.toLowerCase() : 'get';

        if (['get', 'delete'].includes(method)) {
          config.params = {
            ...(config.params || {}),
            company_id: user.company_id
          };
        } 

        else if (['post', 'put', 'patch'].includes(method)) {
          if (!(config.data instanceof FormData)) {
            config.data = {
              ...(config.data || {}),
              company_id: user.company_id 
            };
          } else {

            if (!config.data.has('company_id')) {
              config.data.append('company_id', user.company_id);
            }
          }
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