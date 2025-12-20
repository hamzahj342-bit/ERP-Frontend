import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { saveAuthData } from '../auth';
import bgImage from '../assets/Analytical.jpeg'  
import { FaUser, FaLock } from 'react-icons/fa';
import api from '../../api'

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
 const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Ab aapko pura URL likhne ki zaroorat nahi, sirf endpoint likhein
      const response = await api.post('/login', { username, password });

      if (response.status === 200) {
        const data = response.data;
        saveAuthData(data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage("");
        navigate("/dashboard");
      }
    } catch (error) {
      // Axios mein error response.data mein hota hai
      console.error("Login error:", error);
      if (error.response) {
        setMessage(error.response.data.message || "Invalid Credentials");
      } else {
        setMessage("Server is not responding");
      }
    }
  };

  return (  
    <div className="login-wrapper">
      <div className="image-section"
       style={{
        backgroundImage: `url(${bgImage})`,
    }}>

      </div>

    <div className='login-container'>
        <div className='login-box'>
        <h1 className='company-name'>Chemical And Detergents <br />Trader</h1>
      <h2 className="login-title">User Login</h2>
      <form onSubmit={handleSubmit} style={{ width: '300px' }}>
        <div className="input-box ">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <FaUser className="icon" />
        </div>
        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FaLock className="icon" />
        </div>

        {/* <div className="options">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <a href="#">Forgot Password?</a>
        </div> */}

        <button type="submit" className="login-btn">Login</button>
        {message && <p className="error-message">{message}</p>}
      </form>
      </div>
    </div>
    </div>
  );
};

export default Login;
