import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaFileInvoice } from "react-icons/fa"; // FaFileInvoice icon add kiya
import Swal from 'sweetalert2';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import api from "../../api"; 

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [onUpdate, setOnUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [venderData, setVenderData] = useState({
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
      await api.put(`/entities/${onUpdate.id}`, { ...venderData, type: "supplier" });
      Swal.fire({ icon: 'success', title: 'Updated!', showConfirmButton: false, timer: 1500 });
      setOnUpdate(null);
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

          {/* Edit Modal Logic (Existing) */}
          {onUpdate && (
            <div className="modal-overlay" style={{/* same styling as yours */}}>
               {/* ... (Modal content same as your code) ... */}
            </div>
          )}

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
              {suppliers.length > 0 ? (
                suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td>{sup.id}</td>
                    <td style={{fontWeight: '600'}}>{sup.name}</td>
                    <td>{sup.address}</td>
                    <td>{sup.contact || "N/A"}</td>
                    <td>{sup.shop?.name || "N/A"}</td>
                    <td style={{textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                        
                        {/* ✅ Naya Invoices Button */}
                        <button 
                          className="edit-btn" 
                          style={{backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8'}}
                          onClick={() => navigate(`/supplier-invoices/${sup.id}`)}
                        >
                          <FaFileInvoice /> Invoices
                        </button>

                        <button className="edit-btn" onClick={() => {
                           setOnUpdate(sup);
                           setVenderData({ name: sup.name, address: sup.address, contact: sup.contact || "", shop_id: sup.shop?.id || "" });
                        }}>
                          <FaEdit /> Edit
                        </button>
                        
                        <button className="delete-btn" onClick={() => handleDelete(sup.id, sup.name)}>
                          <FaTrash /> Delete
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px'}}>No suppliers found.</td></tr>
              )}
            </tbody>
          </table>

          <Pagination page={currentPage} totalPages={totalPages} onPageChange={(p) => fetchSuppliers(p, searchTerm)} />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Suppliers;