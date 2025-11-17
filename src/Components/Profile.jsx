import React, { useState, useEffect } from 'react';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { FaUserCircle, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        const token = localStorage.getItem('token'); // Assuming you store the token in localStorage
        if (!token) {
            setError('Authentication required.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}` // Backend route mein verifyToken middleware use hoga
                }
            });
            const data = await res.json();

            if (res.ok) {
                setUser(data);
                setError('');
            } else {
                setError(data.message || 'Failed to fetch user data.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Server connection error.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <p className="page-container" style={{ textAlign: 'center' }}>Loading profile...</p>;
    }

    if (error || !user) {
        return <p className="page-container" style={{ color: 'red', textAlign: 'center' }}>Error: {error || 'User data not available.'}</p>;
    }

    return (
        <>
            <NavigationBar />
            <div className="page-container">
                <div className="rm-card" style={{ maxWidth: '600px', margin: '50px auto' }}>
                    <h2><FaUserCircle /> My Profile</h2>
                    <hr />

                    <div className="profile-detail">
                        <p><strong>Name:</strong> {user.name}</p>
                        <p><strong>Email:</strong> <FaEnvelope /> {user.email}</p>
                        <p><strong>User ID:</strong> {user.id}</p>
                        <p><strong>Account Created:</strong> <FaCalendarAlt /> {new Date(user.createdat).toLocaleDateString()}</p>
                        {/* You can add a button here for Password Change (will require a separate backend POST route) */}
                        <button style={{ marginTop: '20px' }}>Change Password</button>
                    </div>

                </div>
            </div>
            <Footer />
        </>
    );
};

export default Profile;