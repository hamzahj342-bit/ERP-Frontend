import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { saveAuthData } from '../auth';
import bgImage from '../assets/Analytical.jpeg';
import logo from '../assets/CNDlogo.jpeg'; 
import { FaUser, FaLock, FaEnvelope, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../../api';

// Notifications
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // States for Switching Views
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [step, setStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Login ke liye
  const [showNewPass, setShowNewPass] = useState(false);   // Reset mode ke liye
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // --- Login Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { username, password });
      if (response.status === 200) {
        saveAuthData(response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/dashboard");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Invalid Credentials");
    }
  };

  // --- Step 1: Send OTP ---
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/send-otp', { email: forgotEmail });
      toast.success("Code sent to your email!");
      setStep(2);
    } catch (error) {
      toast.error("Email not found or Server Error");
    } finally { setLoading(false); }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/verify-otp', { email: forgotEmail, otp });
      setStep(3);
    } catch (error) {
      toast.error("Invalid OTP Code");
    } finally { setLoading(false); }
  };

  // --- Step 3: Reset Password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.warning("Passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      await api.post('/reset-password', { email: forgotEmail, newPassword });
      Swal.fire({
        title: 'Success!',
        text: 'Password updated. You can now login.',
        icon: 'success',
        confirmButtonColor: '#1a73e8'
      }).then(() => {
        // --- Inputs aur States Khali (Reset) Karein ---
        setIsForgotMode(false);
        setStep(1);
        setForgotEmail('');    // Email khali
        setOtp('');            // OTP khali
        setNewPassword('');    // New password khali
        setConfirmPassword(''); // Confirm password khali
        setMessage('');        // Purana koi error message ho toh wo bhi clear
      });
    } catch (error) {
      toast.error("Failed to update password");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">
      <ToastContainer position="top-right" theme="colored" />
      
      <div className="image-section" style={{ backgroundImage: `url(${bgImage})` }}></div>

      <div className='login-container'>
        <div className="login-box">
          
          {/* Header & Logo Section */}
          <div className="login-header">
             {/* {username.toLowerCase() === 'admin' && (
              <div className="admin-logo-fade">
                <img src={logo} alt="Logo" className="admin-logo" />
              </div>
            )} */}
            <h1 className='company-name'>Chemical And Detergents Trader</h1>
          </div>

          {!isForgotMode ? (
            /* --- MAIN LOGIN VIEW --- */
            <div className="form-content animate-slide-right">
              <h2 className="login-title">User Login</h2>
              <form onSubmit={handleSubmit}>
                <div className="input-box">
                  <input type="text" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} required />
                  <FaUser className="icon" />
                </div>
                <div className="input-box">
                  <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" value={password} 
                  onChange={(e)=>setPassword(e.target.value)} 
                  required />
                  <div 
                   className="password-toggle-icon" 
                   onClick={() => setShowPassword(!showPassword)}
                   style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}
                  >
                   {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </div>
                  <FaLock className="icon" />
                </div>
                <div className="options">
                  <label><input type="checkbox" /> Remember me</label>
                  <span className="forgot-link" onClick={() => setIsForgotMode(true)}>Forgot Password?</span>
                </div>
                <button type="submit" className="login-btn">Login</button>
                {message && <p className="error-message">{message}</p>}
              </form>
            </div>
          ) : (
            /* --- FORGOT PASSWORD VIEW (SLIDE IN) --- */
            <div className="form-content animate-slide-left">
              <div className="back-arrow" onClick={() => { setIsForgotMode(false); setStep(1); }}>
                <FaArrowLeft /> <span>Back to Login</span>
              </div>
              
              <h2 className="login-title">
                {step === 1 && "Reset Password"}
                {step === 2 && "Verification"}
                {step === 3 && "New Password"}
              </h2>

              {step === 1 && (
                <form onSubmit={handleSendOTP}>
                  <p className="step-info">Enter your email to get a 6-digit code.</p>
                  <div className="input-box">
                    <input type="email" placeholder="Email Address" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} required />
                    <FaEnvelope className="icon" />
                  </div>
                  <button type="submit" className="login-btn" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP}>
                  <p className="step-info">Code sent to <b>{forgotEmail}</b></p>
                  <div className="input-box">
                    <input type="text" placeholder="000000" className="otp-center" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                  </div>
                  <button type="submit" className="login-btn" disabled={loading}>{loading ? "Verifying..." : "Verify Code"}</button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="input-box">
                    <input type={showNewPass ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                    <div 
                     className="password-toggle-icon" 
                     onClick={() => setShowNewPass(!showNewPass)}
                     style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}
                     >
                     {showNewPass ? <FaEyeSlash /> : <FaEye />}
                     </div>
                    <FaLock className="icon" />
                  </div>
                  <div className="input-box">
                    <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
                    <FaLock className="icon" />
                  </div>
                  <button type="submit" className="login-btn" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;