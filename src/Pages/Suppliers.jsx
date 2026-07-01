import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaFileInvoice } from "react-icons/fa"; 
import Swal from 'sweetalert2';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import api from "../../api"; 

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [onEdit, setOnEdit] = useState(null); // Customer ki tarah onEdit rakha
  const [searchTerm, setSearchTerm] = useState(""); 
  const [formData, setFormData] = useState({ // venderData ko formData kar diya
    name: "",
    address: "",
    contact: "",
    shop_id: ""
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  const fetchSuppliers = useCallback(async (page = 1, search = "") => {
    try {
      const res = await api.get(`/entities`, {
        params: { page, search, type: 'supplier' }
      });
      if (res.data && res.data.entities) {
        setSuppliers(res.data.entities);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  }, []);

  const fetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data || []);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers(1, searchTerm); 
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchSuppliers]);

  useEffect(() => {
    fetchShops();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/entities/${onEdit.id}`, { ...formData, type: "supplier" });
      Swal.fire({ icon: 'success', title: 'Updated!', showConfirmButton: false, timer: 1500 });
      setOnEdit(null);
      fetchSuppliers(currentPage, searchTerm);
    } catch (err) {
      Swal.fire('Error!', 'Failed to update supplier.', 'error');
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to delete supplier: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await api.delete(`/entities/${id}`);
                Swal.fire('Deleted!', 'Supplier deleted.', 'success');
                fetchSuppliers(currentPage, searchTerm);
            } catch (err) {
                Swal.fire('Error!', 'Failed to delete supplier.', 'error');
            }
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
            <h2>Suppliers List</h2>
            <button className="add-cust-sup" onClick={() => navigate("/add-suppliers")}>
              <FaPlus /> Add Supplier
            </button>
          </div>

          <div className="search-container" style={{ position: 'relative', marginBottom: '20px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '13px', color: '#aaa' }} />
            <input 
              type="text" className="input" placeholder="Search supplier..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '45px', marginBottom: '0' }}
            />
          </div>

          <table className="entity-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Shop</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => (
                <tr key={sup.id}>
                  <td>{sup.id}</td>
                  <td style={{fontWeight: '600'}}>{sup.name}</td>
                  <td>{sup.address}</td>
                  <td>{sup.contact || "N/A"}</td>
                  <td>{sup.shop?.name || "N/A"}</td>
                  <td style={{textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <button 
                        className="primary-btn" 
                        onClick={() => navigate(`/supplier-invoices/${sup.id}`)}
                      >
                        <FaFileInvoice /> Invoices
                      </button>

                      <button className="edit-btn-action" onClick={() => {
                         setOnEdit(sup);
                         setFormData({ 
                           name: sup.name, 
                           address: sup.address, 
                           contact: sup.contact || "", 
                           shop_id: sup.shop?.id || "" 
                         });
                      }}>
                        <FaEdit /> Edit
                      </button>
                      
                      <button className="delete-btn" onClick={() => handleDelete(sup.id, sup.name)}>
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={currentPage} totalPages={totalPages} onPageChange={(p) => fetchSuppliers(p, searchTerm)} />
        </div>
      </div>

      {/* ✅ Edit Modal (Customer ki tarah functional) */}
      {onEdit && (
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="modal-content" style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px'}}>
            <h3>Edit Supplier</h3>
            <form onSubmit={handleUpdate}>
              <input className="input" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" required />
              <input className="input" type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Address" required />
              <input className="input" type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} placeholder="Contact" />
              
              {/* Shop Selection Dropdown */}
              <select 
                className="input" 
                value={formData.shop_id} 
                onChange={(e) => setFormData({...formData, shop_id: e.target.value})}
                required
              >
                <option value="">Select Shop</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>

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

export default Suppliers;