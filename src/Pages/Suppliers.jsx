import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const Suppliers = ({ onEdit, onDelete }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [shops, setShops] = useState([]); // shops list
  const [onUpdate, setOnUpdate] = useState(null);
  const [venderData, setVenderData] = useState({
    name: "",
    address: "",
    contact: "",
    shop_id: ""
  });

  const navigate = useNavigate();

  // Fetch suppliers
  const fetchSuppliers = () => {
    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => {
        const supplierData = data.filter(item => item.type === "supplier");
        setSuppliers(supplierData);
      })
      .catch(err => console.error("Error fetching suppliers:", err));
  };

  // Fetch shops
  const fetchShops = () => {
    fetch("http://localhost:5000/api/shops")
      .then(res => res.json())
      .then(data => setShops(data))
      .catch(err => console.error("Error fetching shops:", err));
  };

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
  }, []);

  // Update API
  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`http://localhost:5000/api/entities/${onUpdate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...venderData, type: "supplier" })
    })
      .then(res => {
        if (res.ok) {
          setOnUpdate(null);
          fetchSuppliers();
        }
      })
      .catch(err => console.error("Error updating:", err));
  };

  // On Edit Click
  const handleEditClick = (supplier) => {
    setOnUpdate(supplier);
    setVenderData({
      name: supplier.name,
      address: supplier.address,
      contact: supplier.contact || "",
      shop_id: supplier.shop?.id || ""
    });
  };

  // Handle Input Change
  const handleChange = (e) => {
    setVenderData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Delete API
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    fetch(`http://localhost:5000/api/entities/${id}`, {
      method: "DELETE",
    })
      .then(res => {
        if (res.ok) fetchSuppliers();
      })
      .catch(err => console.error("Error deleting:", err));
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
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
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
                <th>#</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Shop</th>
                <th>Account No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup, index) => (
                <tr key={sup.id}>
                  <td>{index + 1}</td>
                  <td>{sup.name}</td>
                  <td>{sup.address}</td>
                  <td>{sup.contact || "N/A"}</td>
                  <td>{sup.shop?.name || "N/A"}</td>
                  <td>{sup.account?.account_code || "Not Created"}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(sup)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(sup.id)}
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
