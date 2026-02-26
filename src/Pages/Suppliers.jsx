import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa"; 
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

  // 1. Fetch Suppliers API (Pagination + Search + Type)
  const fetchSuppliers = useCallback(async (page = 1, search = "") => {
    try {
      const res = await api.get(`/entities`, {
        params: {
          page: page,
          search: search,
          type: 'supplier' // 👈 Sirf supplier mangwa rahe hain
        }
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

  // 2. Fetch Shops for Dropdown
  const fetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data || []);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  // 3. Debounce Effect for Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers(1, searchTerm); 
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchSuppliers]);

  useEffect(() => {
    fetchShops();
  }, []);

  // 4. Update Handler
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/entities/${onUpdate.id}`, { 
        ...venderData, 
        type: "supplier" 
      });

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Supplier ${venderData.name} has been updated.`,
        showConfirmButton: false,
        timer: 1500
      });
      setOnUpdate(null);
      fetchSuppliers(currentPage, searchTerm);
    } catch (err) {
      Swal.fire('Error!', 'Failed to update supplier.', 'error');
    }
  };

  // 5. Delete Handler
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
                Swal.fire('Deleted!', 'Supplier has been deleted.', 'success');
                fetchSuppliers(currentPage, searchTerm);
            } catch (err) {
                Swal.fire('Error!', 'Failed to delete supplier.', 'error');
            }
        }
    });
  };

  const handleEditClick = (supplier) => {
    setOnUpdate(supplier);
    setVenderData({
      name: supplier.name,
      address: supplier.address,
      contact: supplier.contact || "",
      shop_id: supplier.shop?.id || ""
    });
  };

  const handleChange = (e) => {
    setVenderData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    fetchSuppliers(pageNum, searchTerm);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <NavigationBar />
      <div className="table-container">
        <div style={{marginTop: '50px', width: '100%' }}>
          <button className='back-btn' onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
        </div>
        
        <div className="table-wrapper">
          <div className="header-flex">
            <h2>Suppliers List</h2>
            <button className="add-cust-sup" onClick={() => navigate("/add-suppliers")}>
              <FaPlus /> Add Supplier
            </button>
          </div>

          {/* 🔍 Search Bar */}
          <div className="search-container" style={{ position: 'relative', marginBottom: '20px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '13px', color: '#aaa' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search supplier by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '45px', marginBottom: '0' }}
            />
          </div>

          {/* Edit Modal */}
          {onUpdate && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
              justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
                <h3 style={{marginBottom: '15px', color: '#1a73e8'}}>Edit Supplier</h3>
                <form onSubmit={handleUpdate} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <input className="input" name="name" value={venderData.name} onChange={handleChange} placeholder="Name" required />
                  <input className="input" name="address" value={venderData.address} onChange={handleChange} placeholder="Address" required />
                  <input className="input" name="contact" value={venderData.contact} onChange={handleChange} placeholder="Contact" />
                  
                  <select name="shop_id" value={venderData.shop_id} onChange={handleChange} className="input">
                    <option value="">Select Shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>

                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                    <button type="submit" className="add-cust-sup" style={{flex: 1}}>Update</button>
                    <button type="button" className="add-cust-sup" style={{flex: 1, backgroundColor: '#6c757d'}} onClick={() => setOnUpdate(null)}>Cancel</button>
                  </div>
                </form>
              </div>
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
                    <td data-label="Id">{sup.id}</td>
                    <td data-label="Name" style={{fontWeight: '600'}}>{sup.name}</td>
                    <td data-label="Address">{sup.address}</td>
                    <td data-label="Contact">{sup.contact || "N/A"}</td>
                    <td data-label="Shop">{sup.shop?.name || "N/A"}</td>
                    <td data-label="Actions" style={{textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                        <button className="edit-btn" onClick={() => handleEditClick(sup)}><FaEdit /> Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(sup.id, sup.name)}><FaTrash /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '30px'}}>No suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Suppliers;