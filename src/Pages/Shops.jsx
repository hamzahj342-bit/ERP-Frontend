import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Swal from 'sweetalert2';
import api from "../../api";

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [shopData, setShopData] = useState({ name: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const fetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data || []);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const filteredShops = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) =>
      String(shop.name || "").toLowerCase().includes(q) ||
      String(shop.id || "").includes(q)
    );
  }, [shops, searchTerm]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/shops/${onEdit.id}`, { name: shopData.name });

      if (res.status === 200 || res.status === 204) {
        setOnEdit(null);
        setShopData({ name: "" });
        fetchShops();
        Swal.fire("Updated!", "Shop updated successfully.", "success");
      }
    } catch (err) {
      console.error("Error updating:", err);
      Swal.fire("Error", "Failed to update shop", "error");
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete shop: ${name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/shops/${id}`);
          fetchShops();
          Swal.fire("Deleted!", "Shop has been deleted.", "success");
        } catch (err) {
          console.error("Error deleting:", err);
          Swal.fire("Error", "Failed to delete shop", "error");
        }
      }
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button
                className="back-btn erp-back-btn"
                type="button"
                onClick={() => navigate('/dashboard')}
              >
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Shops List</h2>
            </div>
            <button
              className="add-cust-sup erp-btn-primary"
              type="button"
              onClick={() => navigate('/add-shops')}
            >
              <FaPlus /> Add Shop
            </button>
          </div>

          <div className="erp-search-bar search-container">
            <FaSearch className="erp-search-icon" />
            <input
              type="text"
              className="input erp-search-input"
              placeholder="Search shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="erp-table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>
                      No shops found.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => (
                    <tr key={shop.id}>
                      <td data-label="Id">{shop.id}</td>
                      <td data-label="Name" style={{ fontWeight: 600 }}>{shop.name}</td>
                      <td data-label="Actions" className="erp-actions-cell">
                        <div className="erp-actions-group">
                          <button
                            type="button"
                            className="edit-btn-action"
                            onClick={() => {
                              setOnEdit(shop);
                              setShopData({ name: shop.name });
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(shop.id, shop.name)}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {onEdit && (
        <div className="erp-modal-overlay modal-overlay">
          <div className="erp-modal-content modal-content">
            <h3>Edit Shop</h3>
            <form onSubmit={handleUpdate}>
              <input
                className="input"
                type="text"
                name="name"
                value={shopData.name}
                onChange={(e) => setShopData({ name: e.target.value })}
                placeholder="Shop Name"
                required
              />
              <div className="erp-modal-actions">
                <button type="submit" className="add-cust-sup">Update</button>
                <button type="button" className="delete-btn" onClick={() => setOnEdit(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default Shops;
