import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaFileInvoice } from "react-icons/fa"; 
import Swal from 'sweetalert2';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import api from "../../api"; 

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", contact: "" });
  const [searchTerm, setSearchTerm] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // 1. Fetch Customers
  const fetchCustomers = useCallback(async (page = 1, search = "") => {
    try {
      const res = await api.get(`/entities`, {
        params: { page, search, type: 'customer' }
      });
      if (res.data && res.data.entities) {
        setCustomers(res.data.entities);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(1, searchTerm); 
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchCustomers]);

  // CRUD Logic (handleUpdate, handleDelete same rahega)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/entities/${onEdit.id}`, { ...formData, type: "customer" });
      Swal.fire({ icon: 'success', title: 'Updated!', showConfirmButton: false, timer: 1500 });
      setOnEdit(null);
      fetchCustomers(currentPage, searchTerm);
    } catch (err) { Swal.fire('Error!', 'Update failed.', 'error'); }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Delete customer: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await api.delete(`/entities/${id}`);
                Swal.fire('Deleted!', 'Customer deleted.', 'success');
                fetchCustomers(currentPage, searchTerm);
            } catch (err) { Swal.fire('Error!', 'Deletion failed.', 'error'); }
        }
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="table-container">
        <div style={{marginTop: '50px', width: '100%' }}>
          <button className='back-btn' onClick={() => navigate('/dashboard')}><FaArrowLeft /></button>
        </div>
        
        <div className="table-wrapper">
          <div className="header-flex">
            <h2>Customers Management</h2>
            <button className="add-cust-sup" onClick={() => navigate("/add-customers")}><FaPlus /> Add Customer</button>
          </div>

          <div className="search-container" style={{ position: 'relative', marginBottom: '20px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '13px', color: '#aaa' }} />
            <input 
              type="text" className="input" placeholder="Search customer..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '45px', marginBottom: '0' }}
            />
          </div>

          <table className="entity-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id}>
                  <td>{cust.id}</td>
                  <td style={{fontWeight: 'bold'}}>{cust.name}</td>
                  <td>{cust.address}</td>
                  <td>{cust.contact || "N/A"}</td>
                  <td style={{textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                      
                      {/* ✅ Naya Invoices Button */}
                      <button 
                        className="edit-btn" 
                        style={{backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8'}}
                        onClick={() => navigate(`/customer-invoices/${cust.id}`)}
                      >
                        <FaFileInvoice /> Invoices
                      </button>

                      <button className="edit-btn" onClick={() => { 
                        setOnEdit(cust); 
                        setFormData({ name: cust.name, address: cust.address, contact: cust.contact || "" });
                      }}>
                        <FaEdit /> Edit
                      </button>

                      <button className="delete-btn" onClick={() => handleDelete(cust.id, cust.name)}>
                        <FaTrash /> Delete
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={currentPage} totalPages={totalPages} onPageChange={(p) => fetchCustomers(p, searchTerm)} />
        </div>
      </div>

      {/* Edit Modal (Sirf editing ke liye rakha hai) */}
      {onEdit && (
         <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
            <div className="modal-content" style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px'}}>
              <h3>Edit Customer</h3>
              <form onSubmit={handleUpdate}>
                <input className="input" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" required />
                <input className="input" type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Address" required />
                <input className="input" type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} placeholder="Contact" />
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                  <button type="submit" className="add-cust-sup">Update</button>
                  <button type="button" className="delete-btn" onClick={() => setOnEdit(null)}>Cancel</button>
                </div>
              </form>
            </div>
         </div>
      )}

      <Footer />
    </>
  );
};

export default Customers;