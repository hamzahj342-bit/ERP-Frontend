import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from "../../api"; 

const Suppliers = () => { 
  const [suppliers, setSuppliers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [onUpdate, setOnUpdate] = useState(null);
  const [venderData, setVenderData] = useState({
    name: "",
    address: "",
    contact: "",
    shop_id: ""
  });

  const navigate = useNavigate();

  // ✅ Fetch suppliers (Filtered by type: supplier)
  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/entities");
      // Axios mein data 'res.data' mein hota hai
      const supplierData = res.data.filter(item => item.type === "supplier");
      setSuppliers(supplierData);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // ✅ Fetch shops
  const fetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
  }, []);

  // ✅ Update API (Standardized)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/entities/${onUpdate.id}`, { 
        ...venderData, 
        type: "supplier" 
      });

      if (res.status === 200 || res.status === 204) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: `Supplier ${venderData.name} has been updated.`,
          showConfirmButton: false,
          timer: 1500
        });
        setOnUpdate(null);
        fetchSuppliers();
      }
    } catch (err) {
      console.error("Error updating:", err);
      Swal.fire('Error!', err.response?.data?.message || 'Failed to update supplier.', 'error');
    }
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

  // ✅ Delete API (Standardized)
  const handleDelete = (id, name) => {
    Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to delete supplier: ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/entities/${id}`);
          Swal.fire('Deleted!', `Supplier ${name} has been deleted.`, 'success');
          fetchSuppliers();
        } catch (err) {
          console.error("Error deleting:", err);
          Swal.fire('Error!', err.response?.data?.message || 'Failed to delete supplier.', 'error');
        }
      }
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="table-container">
        {/* Back Button */}
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/dashboard")}
        >
          <FaArrowLeft />
        </button>

        <div className="table-wrapper">
          <button
            className="add-cust-sup"
            onClick={() => navigate("/add-suppliers")}
          >
            Add Suppliers
          </button>
          <h2>Suppliers List</h2>

          {/* Edit Form */}
          {onUpdate && (
            <div
              // Added zIndex for modal overlay
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "10px",
                  width: "300px"
                }}
              >
                <h3>Edit Supplier</h3>
                <form
                  onSubmit={handleUpdate}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <input
                    className="input"
                    name="name"
                    value={venderData.name}
                    onChange={handleChange}
                    placeholder="Name"
                    required
                  />
                  <input
                    className="input"
                    name="address"
                    value={venderData.address}
                    onChange={handleChange}
                    placeholder="Address"
                    required
                  />
                  <input
                    className="input"
                    name="contact"
                    value={venderData.contact}
                    onChange={handleChange}
                    placeholder="Contact"
                  />

                  {/* Shop Dropdown */}
                  <select
                    name="shop_id"
                    value={venderData.shop_id}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Select Shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>

                  <button type="submit" className="primary-btn">
                    Update
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setOnUpdate(null)}
                  >
                    Cancel
                  </button>
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
                <th>Shop</th>
{/*                 <th>Account No</th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup, index) => (
                <tr key={sup.id}>
                  <td>{sup.id}</td>
                  <td>{sup.name}</td>
                  <td>{sup.address}</td>
                  <td>{sup.contact || "N/A"}</td>
                  <td>{sup.shop?.name || "N/A"}</td>
{/*                   <td>{sup.account?.account_code || "Not Created"}</td> */}
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(sup)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(sup.id, sup.name)} // 💡 Passing ID and Name
                    >
                      Delete
                    </button>
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

export default Suppliers;