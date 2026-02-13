import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { saveAuthData } from '../auth';
import bgImage from '../assets/Analytical.jpeg';
import { FaBuilding, FaUser, FaLock, FaEnvelope, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../../api';

// Notifications
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';

const Login = () => {
    // --- States ---
    const [view, setView] = useState('login'); // 'login', 'forgot', 'register'
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Login States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password States
    const [step, setStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);

    // Registration States
    const [regData, setRegData] = useState({
        username: '',
        email: '',
        password: '',
        company_id: ''
    });

    // --- Fetch Companies ---
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await api.get('/companies');
                setCompanies(response.data);
            } catch (error) {
                console.error("Error fetching companies", error);
                toast.error("Failed to load companies");
            }
        };
        fetchCompanies();
    }, []);

    // --- Handlers ---

    // 1. Login Handler
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedCompany) {
            toast.warning("Please select a company!");
            return;
        }
        try {
            const response = await api.post('/login', { 
                username, 
                password, 
                company_id: selectedCompany 
            });

            if (response.status === 200) {
                saveAuthData(response.data.token);
                localStorage.setItem("user", JSON.stringify(response.data.user));
                navigate("/dashboard");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid Credentials");
        }
    };

    // 2. Registration Handler
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regData.company_id) {
            toast.warning("Please select a company to assign!");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/register', regData);
            Swal.fire({
                title: 'Request Sent!',
                text: res.data.message,
                icon: 'success',
                confirmButtonColor: '#1a73e8'
            }).then(() => {
                setView('login');
                setRegData({ username: '', email: '', password: '', company_id: '' });
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration Failed");
        } finally {
            setLoading(false);
        }
    };

    // 3. Forgot Password Handlers
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

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords do not match!");
            return;
        }
        setLoading(true);
        try {
            await api.post('/reset-password', { email: forgotEmail, newPassword });
            Swal.fire('Success!', 'Password updated. You can now login.', 'success').then(() => {
                setView('login');
                setStep(1);
                setForgotEmail('');
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
                    
                    <div className="login-header">
                        <h1 className='company-name'>Chemical And Detergents Trader</h1>
                    </div>

                    {/* --- LOGIN VIEW --- */}
                    {view === 'login' && (
                        <div className="form-content animate-slide-right">
                            <h2 className="login-title">User Login</h2>
                            <form onSubmit={handleLogin}>
                                <div className="input-box">
                                    <input type="text" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} required />
                                    <FaUser className="icon" />
                                </div>
                                <div className="input-box">
                                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                                    <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </div>
                                    <FaLock className="icon" />
                                </div>
                                <div className="input-box">
                                    <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} required className="company-select-field">
                                        <option value="" disabled>Select Company</option>
                                        {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                                    </select>
                                    <FaBuilding className="icon" />
                                </div>
                                <div className="options">
                                    <span className="forgot-link" onClick={() => setView('forgot')}>Forgot Password?</span>
                                    <span className="forgot-link" onClick={() => setView('register')}>Register New User</span>
                                </div>
                                <button type="submit" className="login-btn">Login</button>
                            </form>
                        </div>
                    )}

                    {/* --- REGISTER VIEW --- */}
                    {view === 'register' && (
                        <div className="form-content animate-slide-left">
                            <div className="back-arrow" onClick={() => setView('login')}>
                                <FaArrowLeft /> <span>Back to Login</span>
                            </div>
                            <h2 className="login-title">User Registration</h2>
                            <form onSubmit={handleRegister}>
                                <div className="input-box">
                                    <input type="text" placeholder="Full Name" value={regData.username} onChange={(e)=>setRegData({...regData, username: e.target.value})} required />
                                    <FaUser className="icon" />
                                </div>
                                <div className="input-box">
                                    <input type="email" placeholder="Email Address" value={regData.email} onChange={(e)=>setRegData({...regData, email: e.target.value})} required />
                                    <FaEnvelope className="icon" />
                                </div>
                                <div className="input-box">
                                    <input type="password" placeholder="Password" value={regData.password} onChange={(e)=>setRegData({...regData, password: e.target.value})} required />
                                    <FaLock className="icon" />
                                </div>
                                <div className="input-box">
                                    <select value={regData.company_id} onChange={(e) => setRegData({...regData, company_id: e.target.value})} required className="company-select-field">
                                        <option value="" disabled>Select Company</option>
                                        {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                                    </select>
                                    <FaBuilding className="icon" />
                                </div>
                                <button type="submit" className="login-btn" disabled={loading}>{loading ? "Sending Request..." : "Register Now"}</button>
                            </form>
                        </div>
                    )}

                    {/* --- FORGOT PASSWORD VIEW --- */}
                    {view === 'forgot' && (
                        <div className="form-content animate-slide-left">
                            <div className="back-arrow" onClick={() => { setView('login'); setStep(1); }}>
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
                                        <div className="password-toggle-icon" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}>
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