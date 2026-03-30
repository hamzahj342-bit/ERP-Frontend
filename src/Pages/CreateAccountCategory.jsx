import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api"; 

const CreateAccountCategory = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "", // read-only, auto from backend
  });

  // 1. Fetch next category code (GET)
  const fetchNextCategoryCode = async () => {
    try {
      const res = await api.get("/account-categories/next-code");
      // Axios automatically parses JSON into res.data
      setFormData(prev => ({ ...prev, category_code: res.data.next_code }));
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

  const userId = localStorage.getItem("user_id");

  // 2. Handle Submit (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_name) {
      toast.error("Please enter a category name!");
      return;
    }

    try {
      // api.post handles JSON stringify and headers automatically
      const res = await api.post("/account-categories", {
        category_name: formData.category_name,
        category_code: formData.category_code,
        created_by: userId
      });

      toast.success("Category created successfully!");
      setFormData({ category_name: "", category_code: "" });
      fetchNextCategoryCode(); // get next code for new entry
      navigate("/account-categories");

    } catch (err) {
      console.error("Submit Error:", err);
      // Backend error message handle karein
      const errorMsg = err.response?.data?.message || "Error creating category.";
      toast.error(errorMsg);
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

            <button type="submit" className="save-btn">Save</button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CreateAccountCategory;
