// src/pages/ShopsForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";

const ShopForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
      };

      await api.post("/shops", payload);

      toast.success("Shop added successfully!");
      setFormData({ name: "" });
      navigate("/shops");
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error adding shop.";
      toast.error(errorMsg);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          type="button"
          onClick={() => navigate("/shops")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Add Shop</h2>
          <form className="form erp-form" onSubmit={handleSubmit}>
            <div className="erp-form-grid">
              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="shop-name">Shop Name</label>
                <input
                  id="shop-name"
                  type="text"
                  name="name"
                  placeholder="Shop Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button type="submit" className="save-btn">
                Save Shop
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ShopForm;
