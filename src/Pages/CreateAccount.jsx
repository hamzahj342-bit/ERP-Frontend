import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";

const AccountForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_name: "",
    account_code: "", // read-only, auto from backend
  });

  // Fetch next account code from backend on load
  const fetchNextAccountCode = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/accounts/next-code");
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, account_code: data.next_code }));
      }
    } catch (err) {
      console.error("Error fetching next account code:", err);
    }
  };

  useEffect(() => {
    fetchNextAccountCode();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_name) {
      toast.error("Please enter an account name!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Account created successfully!");
        setFormData({ account_name: "", account_code: "" });
        fetchNextAccountCode(); // get next code
        navigate("/accounts")
      } else {
        toast.error("Error creating account.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Server error occurred.");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button className="back-btn" style={{marginTop:"30px"}} onClick={() => navigate("/accounts")}>
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Create Account</h2>
          <form className="form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="account_name"
              placeholder="Account Name"
              value={formData.account_name}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="account_code"
              placeholder="Account Code"
              value={formData.account_code}
              readOnly
            />

            <button type="submit" className="primary-btn">Create Account</button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountForm;
