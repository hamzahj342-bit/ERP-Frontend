import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
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
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: `Customer ${formData.name} has been updated.`,
            showConfirmButton: false,
            timer: 1500
          });
          setOnEdit(null);
          fetchCustomers();
        } else {
            // Handle error response from server
            Swal.fire('Error!', 'Failed to update customer.', 'error');
        }
      })
      .catch(err => {
        console.error("Error updating:", err);
        Swal.fire('Error!', 'Server error while updating customer.', 'error');
      });
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

  // 🗑️ Delete API with SweetAlert2 Confirmation
  const handleDelete = (id, name) => { // Added 'name' for better alert message
    Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to delete customer: ${name}? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // User confirmed, proceed with deletion
            fetch(`http://localhost:5000/api/entities/${id}`, {
                method: "DELETE",
            })
            .then(res => {
                if (res.ok) {
                    // Show success alert
                    Swal.fire(
                        'Deleted!',
                        `Customer ${name} has been deleted.`,
                        'success'
                    );
                    fetchCustomers();
                } else {
                    // Handle server error response
                    Swal.fire('Error!', 'Failed to delete customer.', 'error');
                }
            })
            .catch(err => {
                console.error("Error deleting:", err);
                Swal.fire('Error!', 'Server error during deletion.', 'error');
            });
        }
    });
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

        {/* Edit Form (remains the same) */}
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
          alignItems: 'center',
          zIndex: 1000 // Ensure modal is on top
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
              {/* <th>Account No</th> */}
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
                {/* <td>{cust.account?.account_code || "Not Created"}</td> */}
                <td>
                  <button className="edit-btn" onClick={() => handleEditClick(cust)}>Edit</button>
                  {/* 💡 Passing 'cust.name' to the delete handler for a better message */}
                  <button className="delete-btn" onClick={() => handleDelete(cust.id, cust.name)}>Delete</button>
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