import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import ActiveToggle from "./ActiveToggle";
import api from "../../api";

const SalesmanForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    is_active: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      await api.post("/salesmen", {
        name: formData.name.trim(),
        contact: formData.contact || null,
        address: formData.address || null,
        is_active: formData.is_active !== false,
      });
      toast.success("Salesman added successfully!");
      navigate("/salesmen");
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error(err.response?.data?.message || "Error adding salesman.");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          type="button"
          onClick={() => navigate("/salesmen")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Add Salesman</h2>

          <form className="form erp-form" onSubmit={handleSubmit}>
            <div className="erp-form-grid">
              <div className="erp-form-field">
                <label htmlFor="salesman-name">Full Name</label>
                <input
                  id="salesman-name"
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="erp-form-field">
                <label htmlFor="salesman-address">Address</label>
                <input
                  id="salesman-address"
                  type="text"
                  name="address"
                  placeholder="Address (Optional)"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="erp-form-field">
                <label htmlFor="salesman-contact">Contact (Optional)</label>
                <input
                  id="salesman-contact"
                  type="text"
                  name="contact"
                  placeholder="Contact (Optional)"
                  value={formData.contact}
                  onChange={handleChange}
                />
              </div>

              <div className="erp-form-field">
                <ActiveToggle
                  value={formData.is_active}
                  onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
                  fullWidth
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button type="submit" className="save-btn">
                Add Salesman
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SalesmanForm;
