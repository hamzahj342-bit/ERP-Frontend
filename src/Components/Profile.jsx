import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast} from "react-toastify";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaCamera, FaIdBadge, FaBuilding, FaArrowLeft, FaLock, FaTimes, FaShieldAlt } from "react-icons/fa";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api"; 
import Swal from 'sweetalert2';
import "../Profitloss.css";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // --- Password Change States (Step Logic) ---
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const res = await api.get("/profile"); 
            setUser(res.data);
            setForgotEmail(res.data.email);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size should be less than 2MB");
            return;
        }

        const formData = new FormData();
        formData.append("profileImage", file);
        setUploading(true);
        try {
            const res = await api.post("/upload-profile-pic", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const updatedUser = { ...user, profile_image: res.data.imageUrl };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("storage"));
            toast.success("Profile picture updated!");
        } catch (err) {
            toast.error("Failed to upload image");
        } finally { setUploading(false); }
    };

    // --- Password Flow Handlers ---
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await api.post('/send-otp', { email: forgotEmail });
            toast.success("Code sent to your email!");
            setStep(2);
        } catch (error) {
            toast.error("Error sending code");
        } finally { setModalLoading(false); }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await api.post('/verify-otp', { email: forgotEmail, otp });
            setStep(3);
        } catch (error) {
            toast.error("Invalid OTP Code");
        } finally { setModalLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords do not match!");
            return;
        }
        setModalLoading(true);
        try {
            await api.post('/reset-password', { email: forgotEmail, newPassword });
            Swal.fire('Success!', 'Your password has been changed.', 'success');
            setShowModal(false);
            setStep(1);
            setOtp(''); setNewPassword(''); setConfirmPassword('');
        } catch (error) {
            toast.error("Failed to update password");
        } finally { setModalLoading(false); }
    };

    if (loading) return <div className="loader-container"><div className="loader"></div></div>;

    return (
        <>
            <NavigationBar />
            {/* <ToastContainer /> */}
            <div className="report-page-wrapper">
                <button className="back-btn" style={{ marginTop: "50px" }} onClick={() => navigate('/dashboard')}><FaArrowLeft /></button>
                
                <div className="report-card" style={{ maxWidth: "800px", margin: "40px auto", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                    <div className="profile-header-gradient" style={{ background: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)", height: "160px", borderRadius: "12px 12px 0 0", position: "relative" }}>
                        <div className="profile-img-container" style={{ position: "absolute", bottom: "-55px", left: "40px" }}>
                            <div style={{ position: "relative" }}>
                                {user?.profile_image ? (
                                    <img src={`http://localhost:5000/uploads/${user.profile_image}`} alt="Profile" style={{ width: "130px", height: "130px", borderRadius: "50%", border: "5px solid white", objectFit: "cover" }} />
                                ) : (
                                    <FaUserCircle style={{ fontSize: "130px", color: "#ddd", background: "white", borderRadius: "50%", border: "5px solid white" }} />
                                )}
                                <button className="img-edit-btn" onClick={() => fileInputRef.current.click()} style={{ position: "absolute", bottom: "10px", right: "5px", background: "#007bff", color: "white", border: "none", borderRadius: "50%", width: "35px", height: "35px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}><FaCamera size={16} /></button>
                                <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />
                            </div>
                        </div>
                    </div>

                    <div className="profile-body p-5" style={{ marginTop: "60px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h2 className="m-0" style={{ fontWeight: "800", color: "#2c3e50", fontSize: "28px" }}>{user?.name}</h2>
                                <span style={{ color: "#27ae60", fontWeight: "bold", fontSize: "14px" }}>● Active Session</span>
                            </div>
                            <button className="get-report-btn" style={{ borderRadius: "25px", padding: "10px 20px" }}>Edit Profile</button>
                        </div>

                        <hr style={{ opacity: "0.1" }} />

                        <div className="row mt-4">
                            {/* Full Email */}
                            <div className="col-md-6 mb-4">
                                <div className="info-box p-3" style={{ background: "#f8f9fa", borderRadius: "10px", borderLeft: "4px solid #3498db" }}>
                                    <label className="text-muted d-block mb-1" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>EMAIL ADDRESS</label>
                                    <span style={{ fontWeight: "600", color: "#34495e" }}><FaEnvelope className="me-2 text-primary" /> {user?.email}</span>
                                </div>
                            </div>
                            {/* User ID */}
                            <div className="col-md-6 mb-4">
                                <div className="info-box p-3" style={{ background: "#f8f9fa", borderRadius: "10px", borderLeft: "4px solid #3498db" }}>
                                    <label className="text-muted d-block mb-1" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>USER ID</label>
                                    <span style={{ fontWeight: "600", color: "#34495e" }}><FaIdBadge className="me-2 text-primary" /> #USR-{user?.id}</span>
                                </div>
                            </div>
                            {/* Company ID */}
                            <div className="col-md-6 mb-4">
                                <div className="info-box p-3" style={{ background: "#f8f9fa", borderRadius: "10px", borderLeft: "4px solid #3498db" }}>
                                    <label className="text-muted d-block mb-1" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>COMPANY ID</label>
                                    <span style={{ fontWeight: "600", color: "#34495e" }}><FaBuilding className="me-2 text-primary" /> CID-{user?.company_id}</span>
                                </div>
                            </div>
                            {/* Member Since */}
                            <div className="col-md-6 mb-4">
                                <div className="info-box p-3" style={{ background: "#f8f9fa", borderRadius: "10px", borderLeft: "4px solid #3498db" }}>
                                    <label className="text-muted d-block mb-1" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>MEMBER SINCE</label>
                                    <span style={{ fontWeight: "600", color: "#34495e" }}><FaCalendarAlt className="me-2 text-primary" /> {user?.createdat ? new Date(user.createdat).toLocaleDateString("en-GB") : "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="mt-4 p-4 d-flex align-items-center justify-content-between" style={{ border: "1px dashed #3498db", borderRadius: "12px", background: "#f0f7ff" }}>
                            <div className="d-flex align-items-center">
                                <div style={{ background: "#3498db", padding: "10px", borderRadius: "10px", marginRight: "15px" }}>
                                    <FaShieldAlt color="white" size={20} />
                                </div>
                                <div>
                                    <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "700" }}>Account Security</h5>
                                    <p className="m-0 text-muted" style={{ fontSize: "13px" }}>Reset your password using email verification.</p>
                                </div>
                            </div>
                            <button className="primary-btn" onClick={() => setShowModal(true)} style={{ padding: "10px 25px", borderRadius: "8px" }}>Change Password</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PASSWORD MODAL (Step Logic) --- */}
            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, backdropFilter: "blur(4px)" }}>
                    <div className="modal-content" style={{ background: "white", padding: "35px", borderRadius: "20px", width: "420px", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                        <button onClick={() => { setShowModal(false); setStep(1); }} style={{ position: "absolute", top: "20px", right: "20px", border: "none", background: "none", cursor: "pointer", color: "#999" }}><FaTimes size={22} /></button>
                        
                        <div className="text-center mb-4">
                           <div style={{ width: "60px", height: "60px", background: "#f0f7ff", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "15px" }}>
                                <FaLock size={24} color="#3498db" />
                           </div>
                            <h3 style={{ fontWeight: "800", fontSize: "22px" }}>
                                {step === 1 && "Verify Identity"}
                                {step === 2 && "Enter OTP Code"}
                                {step === 3 && "Set New Password"}
                            </h3>
                        </div>

                        {step === 1 && (
                            <form onSubmit={handleSendOTP}>
                                <p className="text-center text-muted mb-4" style={{ fontSize: "14px" }}>Click below to send a 6-digit verification code to your registered email.</p>
                                <div className="mb-4">
                                    <input type="email" className="form-control" value={forgotEmail} readOnly style={{ background: "#f8f9fa", border: "1px solid #ddd", padding: "12px", borderRadius: "8px", textAlign: "center", fontWeight: "600" }} />
                                </div>
                                <button type="submit" className="btn btn-primary w-100" style={{ padding: "12px", fontWeight: "600", borderRadius: "8px" }} disabled={modalLoading}>{modalLoading ? "Sending..." : "Get OTP Code"}</button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP}>
                                <p className="text-center text-muted mb-4" style={{ fontSize: "14px" }}>Enter the code sent to <b>{forgotEmail}</b></p>
                                <input type="text" className="form-control text-center mb-4" placeholder="0 0 0 0 0 0" maxLength="6" style={{ fontSize: "24px", letterSpacing: "8px", fontWeight: "bold", padding: "10px", borderRadius: "8px" }} value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                                <button type="submit" className="btn btn-primary w-100" style={{ padding: "12px", fontWeight: "600", borderRadius: "8px" }} disabled={modalLoading}>{modalLoading ? "Verifying..." : "Verify Code"}</button>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword}>
                                <div className="mb-3">
                                    <input type="password" placeholder="Enter New Password" className="form-control" style={{ padding: "12px", borderRadius: "8px" }} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                                </div>
                                <div className="mb-4">
                                    <input type="password" placeholder="Confirm New Password"  className="form-control" style={{ padding: "12px", borderRadius: "8px" }} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn btn-success w-100" style={{ padding: "12px", fontWeight: "600", borderRadius: "8px" }} disabled={modalLoading}>{modalLoading ? "Saving..." : "Update Password"}</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
            <Footer />
        </>
    );
};

export default Profile;