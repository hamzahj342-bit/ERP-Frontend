import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import Select from 'react-select';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
  import api from "../../api"; // Import axios instance

const SupplierForm = () => {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isCustomerLinked, setIsCustomerLinked] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    shop_id: "" // Initial state remains "" (empty string)
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

    const finalShopId = formData.shop_id === "" ? null : formData.shop_id;

     if (!user || !user.company_id) {
          toast.error("User session expired or Company not selected. Please login again.");
          return;
        }

    if (isCustomerLinked && !selectedCustomer) {
      toast.error("Please select an active customer to link this supplier.");
      return;
    }

    // Payload bilkul same rakha hai
    const payload = {
      name: formData.name, 
      address: formData.address,
      contact: formData.contact,
      shop_id: finalShopId, 
      company_id: user.company_id,
      created_by: user ? user.username : "guest", 
      type: "supplier",
      is_customer_linked: isCustomerLinked,
      entity_relation_id: isCustomerLinked ? selectedCustomer.value : null
    };

    try {
      // POST request using api.js
      const res = await api.post("/entities", payload);

      // Axios success (200-299 status codes)
      toast.success("Supplier added successfully!");
      setFormData({ name: "", address: "", contact: "", shop_id: "" }); 
      setIsCustomerLinked(false);
      setSelectedCustomer(null);
      
    } catch (err) {
      console.error("Submit Error:", err);
      // Backend error message extract karein
      const errorMsg = err.response?.data?.error || "Error adding supplier.";
      toast.error(errorMsg);
    }
  };

  // Fetching Shops (Converted to Async/Await with api.js)
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await api.get("/shops");
        setShops(res.data);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };

    const fetchCustomers = async () => {
      try {
        const res = await api.get('/entities/transactions');
        setEntities(res.data || []);
      } catch (err) {
        console.error("Error fetching entities:", err);
      }
    };
    
    fetchShops();
    fetchCustomers();
  }, []);

  const customerOptions = entities
    .filter((entity) => entity?.type === 'customer')
    .map((customer) => ({ value: customer.id, label: customer.name }));

  return (
    <>
    <NavigationBar />
    <div className="page-container">
      <button className="back-btn" style={{marginTop:"30px"}}  
      onClick={() => navigate("/suppliers")}>
        <FaArrowLeft />
      </button>

      <div className="entity-card">
        <h2>Add Suppliers</h2>
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
          {/* ✅ Shops dropdown (Required removed) */}
          <div className="row">
            <select
              name="shop_id"
              value={formData.shop_id}
              onChange={handleChange}
              className=" col select-customer"
              // 🛑 Removed 'required' attribute here
            >
              <option value="">Select Shop (Optional)</option> {/* 🛑 Updated placeholder */}
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

          <div className="linkage-card">
            <label className="linkage-label">
              <input
                type="checkbox"
                checked={isCustomerLinked}
                onChange={(e) => {
                  setIsCustomerLinked(e.target.checked);
                  if (!e.target.checked) setSelectedCustomer(null);
                }}
              />
              <span>Is this supplier also an active Customer?</span>
            </label>

            {isCustomerLinked && (
              <Select
                options={customerOptions}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Search & select Customer..."
                isClearable
                isSearchable
                className="linkage-select"
              />
            )}
          </div>

          <button type="submit" className="save-btn">Save Supplier</button>
        </form>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default SupplierForm;