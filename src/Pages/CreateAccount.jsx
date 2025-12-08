import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";

const AccountForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_name: "",
    category_id: "",
    account_code: ""
  });

  const [categories, setCategories] = useState([]);

  // Fetch user-created categories
  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/account-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch next account code for selected category
  const fetchNextCode = async (category_id) => {
    if (!category_id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/accounts/next-code?category_id=${category_id}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, account_code: data.next_code }));
      }
    } catch (err) {
      console.error("Error fetching next account code:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If category changes, fetch new account code
    if (name === "category_id") {
      setFormData(prev => ({ ...prev, category_id: value, account_code: "" }));
      fetchNextCode(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const token = localStorage.getItem("token");
 const userId = localStorage.getItem("user_id");
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_name || !formData.category_id) {
      toast.error("Please enter account name and select a category!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/accounts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
         },
        body: JSON.stringify({
          account_name: formData.account_name,
          category_id: formData.category_id,
          created_by: userId // replace with dynamic user if needed
        })
      });

      if (res.ok) {
        toast.success("Account created successfully!");
        setFormData({ account_name: "", category_id: "", account_code: "" });
        navigate("/accounts");
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
        <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate("/accounts")}>
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

            {/* ✅ Category dropdown */}
          <div className="row">
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
              className="col select-customer"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>

            {/*Action button*/}
            <button type="button" className="col add-btn" onClick={() => navigate("/create-category")}>
              Add Category
            </button>
          </div>

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
