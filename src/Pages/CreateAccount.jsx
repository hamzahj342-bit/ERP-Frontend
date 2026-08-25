import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api"; 

const AccountForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_name: "",
    category_id: "",
    account_code: "",
    type: "General" // Default set to General
  });

  const [categories, setCategories] = useState([]);

  // 1. Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await api.get("/account-categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 2. Fetch next account code
  const fetchNextCode = async (category_id) => {
    if (!category_id) return;
    try {
      const res = await api.get("/accounts/next-code", {
        params: { category_id }
      });
      setFormData(prev => ({ ...prev, account_code: res.data.next_code }));
    } catch (err) {
      console.error("Error fetching next account code:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category_id") {
      setFormData(prev => ({ ...prev, category_id: value, account_code: "" }));
      fetchNextCode(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const userId = localStorage.getItem("user_id");

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_name || !formData.category_id || !formData.type) {
      toast.error("Please fill all required fields!");
      return;
    }

    try {
      const res = await api.post("/accounts", {
        account_name: formData.account_name,
        category_id: formData.category_id,
        type: formData.type, // Added type field
        created_by: userId
      });

      toast.success("Account created successfully!");
      setFormData({ account_name: "", category_id: "", account_code: "", type: "General" });
      navigate("/accounts");
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error creating account.";
      toast.error(errorMsg);
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

            {/* Category dropdown */}
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

              <button type="button" className="col add-btn" onClick={() => navigate("/create-category")}>
                Add Category
              </button>
            </div>

            {/* Account Type Dropdown */}
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="General">General</option>
              <option value="Payable">Payable</option>
              <option value="Receivable">Receivable</option>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>

            <input
              type="text"
              name="account_code"
              placeholder="Account Code"
              value={formData.account_code}
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

export default AccountForm;