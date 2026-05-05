import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaCamera, FaIdBadge, FaBuilding, FaArrowLeft, FaLock, FaTimes, FaShieldAlt } from "react-icons/fa";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";
import Swal from 'sweetalert2';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

    const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

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

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    return (
        <div className="bg-light min-vh-100">
            <NavigationBar />
            
            <div className="container py-5">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="back-btn"
                >
                    <FaArrowLeft className="me-2" />
                </button>

                {/* Main Profile Card */}
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden mx-auto" style={{ maxWidth: "850px" }}>
                    
                    {/* Header Image/Gradient */}
                    <div className="profile-banner position-relative" style={{ height: "180px", background: "linear-gradient(135deg, #001d3d 0%, #003566 100%)" }}>
                        <div className="position-absolute" style={{ bottom: "-60px", left: "40px" }}>
                            <div className="position-relative d-inline-block">
                                {user?.profile_image ? (
                                    <img 
                                        src={`${IMAGE_BASE_URL}/uploads/${user.profile_image}`} 
                                        alt="Profile" 
                                        className="rounded-circle border border-5 border-white shadow"
                                        style={{ width: "130px", height: "130px", objectFit: "cover" }}
                                    />
                                ) : (
                                    <FaUserCircle className="rounded-circle bg-white border border-5 border-white shadow text-light" style={{ fontSize: "130px" }} />
                                )}
                                <button 
                                    onClick={() => fileInputRef.current.click()}
                                    className="btn btn-primary rounded-circle position-absolute bottom-0 end-0 shadow-sm d-flex align-items-center justify-content-center"
                                    style={{ width: "38px", height: "38px" }}
                                >
                                    <FaCamera size={14} />
                                </button>
                                <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />
                                {uploading && (
                                    <div className="position-absolute top-0 start-0 w-100 h-100 rounded-circle d-flex align-items-center justify-content-center bg-dark bg-opacity-25">
                                        <div className="spinner-border spinner-border-sm text-white"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-4 p-md-5 mt-5">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                            <div>
                                <h2 className="fw-black text-dark mb-1 text-uppercase tracking-tighter">{user?.name}</h2>
                                <div className="d-flex align-items-center">
                                    <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle fw-bold">
                                        <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: "8px", height: "8px" }}></span>
                                        ACTIVE SESSION
                                    </span>
                                </div>
                            </div>
                            <button className="btn btn-outline-dark rounded-pill px-4 fw-bold">Edit Profile</button>
                        </div>

                        <hr className="opacity-10 mb-5" />

                        {/* Information Grid */}
                        <div className="row g-4">
                            <ProfileInfoItem label="Email Address" value={user?.email} icon={<FaEnvelope className="text-primary" />} />
                            <ProfileInfoItem label="User Identification" value={`#USR-${user?.id}`} icon={<FaIdBadge className="text-primary" />} />
                            <ProfileInfoItem label="Company Reference" value={`CID-${user?.company_id}`} icon={<FaBuilding className="text-primary" />} />
                            <ProfileInfoItem label="Registration Date" value={user?.createdat ? new Date(user.createdat).toLocaleDateString("en-GB") : "N/A"} icon={<FaCalendarAlt className="text-primary" />} />
                        </div>

                        {/* Security Alert Section */}
                        <div className="mt-5 p-4 rounded-4 border border-primary border-dashed bg-primary bg-opacity-10">
                            <div className="row align-items-center">
                                <div className="col-auto">
                                    <div className="bg-primary p-3 rounded-3 shadow">
                                        <FaShieldAlt className="text-white fs-4" />
                                    </div>
                                </div>
                                <div className="col text-center text-md-start my-3 my-md-0">
                                    <h6 className="fw-bold mb-1 text-dark">Security Settings</h6>
                                    <p className="small text-muted mb-0">Manage your account security and password preferences.</p>
                                </div>
                                <div className="col-12 col-md-auto">
                                    <button onClick={() => setShowModal(true)} className="btn btn-primary w-100 rounded-3 fw-bold px-4 py-2 shadow-sm">
                                        Reset Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PASSWORD MODAL (Bootstrap Logic) */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-2xl p-3">
                            <div className="modal-header border-0">
                                <button onClick={() => { setShowModal(false); setStep(1); }} className="btn-close shadow-none"></button>
                            </div>
                            <div className="modal-body text-center">
                                <div className="bg-light rounded-circle d-inline-flex p-3 mb-4">
                                    <FaLock className="text-primary fs-3" />
                                </div>
                                <h4 className="fw-black mb-3">
                                    {step === 1 && "Identity Check"}
                                    {step === 2 && "Verification"}
                                    {step === 3 && "Update Password"}
                                </h4>

                                {step === 1 && (
                                    <form onSubmit={handleSendOTP}>
                                        <p className="text-muted small mb-4">Confirm your email to receive a 6-digit verification code.</p>
                                        <input type="email" className="form-control form-control-lg text-center fw-bold bg-light mb-4 border-0" value={forgotEmail} readOnly />
                                        <button className="btn btn-primary btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Sending Code..." : "Send OTP"}
                                        </button>
                                    </form>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleVerifyOTP}>
                                        <p className="text-muted small mb-4">Enter the code sent to <strong>{forgotEmail}</strong></p>
                                        <input type="text" className="form-control form-control-lg text-center fs-2 fw-bold mb-4 tracking-widest" placeholder="000000" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                                        <button className="btn btn-primary btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Verifying..." : "Verify OTP"}
                                        </button>
                                    </form>
                                )}

                                {step === 3 && (
                                    <form onSubmit={handleResetPassword}>
                                        <input type="password" placeholder="New Password" className="form-control form-control-lg mb-3 rounded-3" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                                        <input type="password" placeholder="Confirm Password" className="form-control form-control-lg mb-4 rounded-3" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
                                        <button className="btn btn-success btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Saving..." : "Change Password"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />

            <style>{`
                .fw-black { font-weight: 900; }
                .tracking-tighter { letter-spacing: -0.5px; }
                .tracking-widest { letter-spacing: 10px; }
                .card { transition: transform 0.3s ease; }
            `}</style>
        </div>
    );
};

// Reusable Sub-component
const ProfileInfoItem = ({ label, value, icon }) => (
    <div className="col-md-6">
        <div className="p-3 bg-white border-start border-4 border-primary rounded-3 h-100 shadow-sm">
            <label className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: "10px", letterSpacing: "1.5px" }}>{label}</label>
            <div className="d-flex align-items-center gap-2">
                {icon}
                <span className="fw-bold text-dark truncate">{value || 'N/A'}</span>
            </div>
        </div>
    </div>
);

export default Profile;