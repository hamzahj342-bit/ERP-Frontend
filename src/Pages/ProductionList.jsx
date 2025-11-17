import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa"; // FaTrash, FaEdit removed
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";

const ProductionList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch("http://localhost:5000/api/production", { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || 'Failed to fetch products.');
      }
    } catch (err) {
      setError('Server connection error.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return <p className="page-container" style={{ textAlign: 'center' }}>Loading products...</p>;
  }

  if (error) {
    return <p className="page-container" style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>;
  }

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            className="back-btn"
            style={{ marginTop: "30px" }}
            onClick={() => navigate("/dashboard")}
          >
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <button
            className="add-cust-sup"
            // Navigate to the Product Creation Form
            onClick={() => navigate("/production-form")} 
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <FaPlus /> Add Product
          </button>
          <h2>Product Master List</h2>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>UOM</th>
                <th>Unit Price (Cost)</th>
                <th>Quantity</th>
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.uom ? p.uom.name : 'N/A'}</td>  
                    <td>{parseFloat(p.unit_price) ?? "—"}</td>
                    <td>{parseFloat(p.current_stock) ?? "-"}</td>
                    <td>{parseFloat(p.current_stock_price) ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductionList;