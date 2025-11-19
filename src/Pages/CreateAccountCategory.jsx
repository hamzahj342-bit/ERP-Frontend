import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";

const CreateAccountCategory = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "", // read-only, auto from backend
  });

  // Fetch next category code from backend on load
  const fetchNextCategoryCode = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/account-categories/next-code");
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, category_code: data.next_code }));
      }
    } catch (err) {
      console.error("Error fetching next category code:", err);
    }
  };

  useEffect(() => {
    fetchNextCategoryCode();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const userId = localStorage.getItem("user_id")

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_name) {
      toast.error("Please enter a category name!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/account-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           category_name: formData.category_name,
           created_by: userId
        }),
      });

      if (res.ok) {
        toast.success("Category created successfully!");
        setFormData({ category_name: "", category_code: "" });
        fetchNextCategoryCode(); // get next code for new entry
        navigate("/account-categories");
      } else {
        toast.error("Error creating category.");
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
        <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate("/account-categories")}>
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Create Account Category</h2>
          <form className="form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="category_name"
              placeholder="Category Name"
              value={formData.category_name}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="category_code"
              placeholder="Category Code"
              value={formData.category_code}
              readOnly
            />

            <button type="submit" className="primary-btn">Create Category</button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CreateAccountCategory;
