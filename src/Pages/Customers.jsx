import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", contact: "" });

  const navigate = useNavigate();

  // Fetch customers
  const fetchCustomers = () => {
    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => {
        const customerData = data.filter(item => item.type === "customer");
        setCustomers(customerData);
      })
      .catch(err => console.error("Error fetching customers:", err));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

   // Update API
  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`http://localhost:5000/api/entities/${onEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, type: "customer" })
    })
      .then(res => {
        if (res.ok) {
          setOnEdit(null);
          fetchCustomers();
        }
      })
      .catch(err => console.error("Error updating:", err));
  };


  // On Edit Click
  const handleEditClick = (customer) => {
    setOnEdit(customer);
    setFormData({
      name: customer.name,
      address: customer.address,
      contact: customer.contact || "",
    });
  };

  // Handle Input Change
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

 

  // Delete API
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    fetch(`http://localhost:5000/api/entities/${id}`, {
      method: "DELETE",
    })
      .then(res => {
        if (res.ok) fetchCustomers();
      })
      .catch(err => console.error("Error deleting:", err));
  };

  return (
    <>
      <NavigationBar />
    <div className="table-container">
      <button className='back-btn' style={{marginTop:"30px"}}
               onClick={() => navigate('/dashboard')}
      >
        <FaArrowLeft />
      </button>
      
      <div className="table-wrapper">
        <button className="add-cust-sup" onClick={() => navigate("/add-customers")}>Add Customers</button>
        <h2>Customers List</h2>

        {/* Edit Form */}
        {onEdit && (
          <div 
          style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '300px' }}>
            <h3>Edit Customer</h3>
          <form onSubmit={handleUpdate} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input className="input"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              required
            />
            <input className="input"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              required
            />
            <input className="input"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder="Contact"
            />
            <button type="submit" className="primary-btn">Update</button>
            <button type="button" className="primary-btn" onClick={() => setOnEdit(null)}>Cancel</button>
          </form>
          </div>
          </div>
        )}

        {/* Table */}
        <table className="entity-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Address</th>
              <th>Contact</th>
              <th>Account No</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((cust, index) => (
              <tr key={cust.id}>
                <td>{index + 1}</td>
                <td>{cust.name}</td>
                <td>{cust.address}</td>
                <td>{cust.contact || "N/A"}</td>
                <td>{cust.account?.account_code || "Not Created"}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEditClick(cust)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(cust.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
    <Footer />
    </>
  );
};

export default Customers;
