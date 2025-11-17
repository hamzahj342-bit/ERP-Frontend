// src/pages/SupplierForm.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";

const SupplierForm = () => {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    shop_id: ""
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

    const payload = {
      ...formData,
      type: "supplier" // 👈 changed here
    };

    try {
      const res = await fetch("http://localhost:5000/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Supplier added successfully!");
        setFormData({ name: "", address: "", contact: "" });
      } else {
        toast.error("Error adding supplier.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Server error occurred.");
    }
  };

   useEffect(() => {
    fetch("http://localhost:5000/api/shops")
      .then((res) => res.json())
      .then((data) => {
        setShops(data);
      })
      .catch((err) => console.error("Error fetching shops:", err));
  }, []);

  return (
    <>
    <NavigationBar />
    <div className="page-container">
      <button className="back-btn" style={{marginTop:"30px"}}  
      onClick={() => navigate("/suppliers")}>
        <FaArrowLeft />
      </button>

      <div className="entity-card">
        <h2>Add Suppliers</h2> {/* 👈 changed here */}
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
          {/* ✅ Shops dropdown */}
          <div className="row">
            <select
              name="shop_id"
              value={formData.shop_id}
              onChange={handleChange}
              className=" col select-customer"
              required
            >
              <option value="">Select Shop</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            {/*Action button*/}
            <button type="button" className="col add-btn" onClick={() => navigate("/add-shops")}>
              Add Shop
            </button>
          </div>

          <button type="submit" className="primary-btn" onClick={() => navigate("/suppliers")}>Add Supplier</button>
        </form>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default SupplierForm;