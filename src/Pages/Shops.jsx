import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Swal from 'sweetalert2';   // 👈 import SweetAlert2

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [onUpdate, setOnUpdate] = useState(null);
  const [shopData, setShopData] = useState({ name: "" });
  
  const navigate = useNavigate();

  // Fetch shops
  const fetchShops = () => {
    fetch("http://localhost:5000/api/shops")
      .then(res => res.json())
      .then(data => {
        setShops(data);
      })
      .catch(err => console.error("Error fetching shops:", err));
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Update API
  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`http://localhost:5000/api/shops/${onUpdate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: shopData.name })
    })
      .then(res => {
        if (res.ok) {
          setOnUpdate(null);
          fetchShops();
          Swal.fire("Updated!", "Shop updated successfully.", "success");
        }
      })
      .catch(err => console.error("Error updating:", err));
  };

  // On Edit Click
  const handleEditClick = (shop) => {
    setOnUpdate(shop);
    setShopData({ name: shop.name });
  };

  // Handle Input Change
  const handleChange = (e) => {
    setShopData({ name: e.target.value });
  };

  // Delete API with SweetAlert2 confirm
  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won’t be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://localhost:5000/api/shops/${id}`, {
          method: "DELETE",
        })
          .then(res => {
            if (res.ok) {
              fetchShops();
              Swal.fire("Deleted!", "Shop has been deleted.", "success");
            }
          })
          .catch(err => console.error("Error deleting:", err));
      }
    });
  };

  return (
    <>
    <NavigationBar />
    <div className="table-container">
      <button className='back-btn' style={{marginTop:"30px"}}
              onClick={() => navigate('/dashboard')}>
        <FaArrowLeft />
      </button>
      <div className="table-wrapper">
        <button className='add-cust-sup' onClick={() => navigate('/add-shops')}>Add Shop</button>
        <h2>Shops List</h2>

        {/* Edit Form */}
        {onUpdate && (
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
              <h3>Edit Shop</h3>
              <form onSubmit={handleUpdate} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <input className="input"
                  name="name"
                  value={shopData.name}
                  onChange={handleChange}
                  placeholder="Shop Name"
                  required
                />
                <button type="submit" className="primary-btn">Update</button>
                <button type="button" className="primary-btn" onClick={() => setOnUpdate(null)}>Cancel</button>
              </form>
            </div>
          </div>
        )}

        <table className="entity-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.id}</td>
                <td>{shop.name}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEditClick(shop)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(shop.id)}>Delete</button>
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

export default Shops;
