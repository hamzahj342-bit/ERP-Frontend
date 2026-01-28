import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";

import api from "../../api"; 

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", contact: "", salary: "" });

  const navigate = useNavigate();

  // 1. Fetch employees (GET)
  const fetchEmployees = async () => {
    try {
      const res = await api.get("/entities");
      // Filter logic bilkul same
      const empData = res.data.filter(item => item.type === "employee");
      setEmployees(empData);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to load employees");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 2. Update API (PUT using api.js)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // payload same rakha hai
      await api.put(`/entities/${onEdit.id}`, { 
        ...formData, 
        type: "employee" 
      });

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Employee ${formData.name} details have been updated.`,
        showConfirmButton: false,
        timer: 1500
      });
      setOnEdit(null);
      fetchEmployees();
    } catch (err) {
      console.error("Error updating:", err);
      Swal.fire('Error!', 'Failed to update employee.', 'error');
    }
  };

  const handleEditClick = (employee) => {
    setOnEdit(employee);
    setFormData({
      name: employee.name,
      address: employee.address,
      contact: employee.contact || "",
      salary: employee.salary || "",
    });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 3. Delete API (DELETE using api.js)
  const handleDelete = (id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to delete employee: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Fetch ki jagah api.delete
                await api.delete(`/entities/${id}`);
                
                Swal.fire(
                    'Deleted!',
                    `Employee ${name} has been deleted.`,
                    'success'
                );
                fetchEmployees();
            } catch (err) {
                console.error("Error deleting:", err);
                Swal.fire('Error!', 'Failed to delete employee.', 'error');
            }
        }
    });
  };
  
  return (
    <>
      <NavigationBar />
      <div className="table-container">
        <button
          className='back-btn'
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/dashboard')}
        >
          <FaArrowLeft />
        </button>

        <div className="table-wrapper">
          <button
            className="add-cust-sup"
            onClick={() => navigate("/add-employees")}
          >
            Add Employees
          </button>

          <h2>Employees List</h2>

          {/* Edit Form */}
          {onEdit && (
            <div style={{
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
                <h3>Edit Employee</h3>

                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    className="input"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Name"
                    required
                  />
                  <input
                    className="input"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address"
                    required
                  />
                  <input
                    className="input"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Contact"
                  />

                  <input
                    className="input"
                    type="number"
                    name="salary"
                    placeholder="Monthly Salary (Optional)"
                    value={formData.salary}
                    onChange={handleChange}
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
                <th>Id</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Salary</th>
                {/* <th>Account No</th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index) => (
                <tr key={emp.id}>
                  <td>{emp.id}</td>
                  <td>{emp.name}</td>
                  <td>{emp.address}</td>
                  <td>{emp.contact || "N/A"}</td>
                  <td>{parseFloat(emp.salary || "N/A")}</td>
                  {/* <td>{emp.account?.account_code || "Not Created"}</td> */}
                  <td>
                    <button className="edit-btn" onClick={() => handleEditClick(emp)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(emp.id, emp.name)}>Delete</button>
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

export default Employees;