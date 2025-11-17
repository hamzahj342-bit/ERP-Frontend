// src/pages/ShopsForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";

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
        // 👇 frontend se nahi bhejna, backend set karega createdby
      };

      const res = await fetch("http://localhost:5000/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Shop added successfully!");
        setFormData({ name: "" });
        navigate("/shops");
      } else {
        toast.error("Error adding shop.");
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
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/shops")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Add Shop</h2>
          <form className="form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Shop Name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <button type="submit" className="primary-btn">
              Add Shop
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ShopForm;
