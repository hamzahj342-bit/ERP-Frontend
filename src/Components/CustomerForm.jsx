// src/pages/CustomerForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";

const CustomerForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      created_by: user ? user.id : null,
      type: "customer" // 👈 hardcoded for customer
    };

    try {
      const res = await api.post("/entities", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      toast.success("Customer added successfully!");
      setFormData({ name: "", address: "", contact: "" });
      
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error adding customer.";
      toast.error(errorMsg);
    }
  };
  return (
    <>
    <NavigationBar />
    <div className="page-container">
      <button className="back-btn" style={{marginTop:"30px"}}
       onClick={() => navigate("/customers")}>
        <FaArrowLeft />
      </button>

      <div className="entity-card">
        <h2>Add Customer</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="contact"
            placeholder="Contact (Optional)"
            value={formData.contact}
            onChange={handleChange}
          />

          <button type="submit" className="primary-btn" onClick={() => navigate("/customers")}>Add Customer</button>
        </form>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default CustomerForm;