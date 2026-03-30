import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { calculateDynamicFIFOCost } from "../utilities/FIFO_Production";
import api from "../../api"; 
import "../css/FP/Production/ProductionForm.css"; // CSS Link

const ProductionForm = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    product_name: "",
    recipe_master_id: "",
    production_quantity: "",
    uom_id: "",
  });

  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [uoms, setUoms] = useState([]);

  const fetchRecipes = async () => {
    try {
      const res = await api.get("/recipe/for-production");
      setRecipes(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUOMs = async () => {
    try {
      const res = await api.get("/uoms"); 
      setUoms(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRecipeDetails = async (recipeId) => {
    try {
      const res = await api.get(`/production/${recipeId}/materials`);
      const data = res.data;
      const filled = data.map((item) => ({
        ...item,
        display_name: item.name,
        unit_price: item.unit_price || 0,
        recipe_qty: parseFloat(item.qty) || 0,
        required_qty: 0,
        total_price: 0,
        type: item.type
      }));
      setMaterials(filled);
      if (formData.production_quantity) {
          calculateRequirements(filled, formData.production_quantity);
      }
    } catch (err) { toast.error("Failed to fetch recipe details"); }
  };

  const calculateRequirements = (itemsList, prodQty) => {
    const pQty = parseFloat(prodQty) || 0;
    const updated = itemsList.map(mat => {
      const neededQty = mat.recipe_qty * pQty;
      let dynamicFIFOCost = mat.unit_price;
      if (typeof calculateDynamicFIFOCost === 'function' && mat.fifo_batches?.length > 0) {
        dynamicFIFOCost = calculateDynamicFIFOCost(mat.fifo_batches, neededQty);
      }
      return {
        ...mat,
        required_qty: neededQty,
        unit_price: dynamicFIFOCost,
        total_price: (dynamicFIFOCost * neededQty)
      };
    });
    setMaterials(updated);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRecipeSelect = (e) => {
    const recipeId = e.target.value;
    setFormData({ ...formData, recipe_master_id: recipeId });
    if (recipeId) fetchRecipeDetails(recipeId);
    else setMaterials([]);
  };

  const handleProductionQuantityChange = (e) => {
    const newQty = e.target.value;
    setFormData({ ...formData, production_quantity: newQty });
    calculateRequirements(materials, newQty);
  };

  useEffect(() => {
    const total = materials.reduce((sum, mat) => sum + parseFloat(mat.total_price || 0), 0);
    setGrandTotal(total);
  }, [materials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.recipe_master_id || !formData.uom_id) {
      return toast.error("Please fill all product header fields");
    }

    const outOfStock = materials.filter(mat => mat.required_qty > mat.total_available_stock);
    if (outOfStock.length > 0) {
      return toast.error(`Insufficient stock! Check highlighted items.`);
    }

    const payload = {
      product_name: formData.product_name,
      recipe_master_id: formData.recipe_master_id,
      grand_total: grandTotal,
      details: materials.map(m => ({...m, quantity: m.required_qty})),
      createdby: user?.username || "guest",
      production_quantity: parseFloat(formData.production_quantity),
      uom_id: formData.uom_id,
    };

    try {
      await api.post("/production", payload);
      toast.success("Production completed successfully!");
      navigate("/finished-products");
    } catch (err) { toast.error(err.response?.data?.message || "Production failed"); }
  };

  useEffect(() => { fetchRecipes(); fetchUOMs(); }, []);

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <div className="prod-form-wrapper">
        <div className="prod-form-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate("/production")} style={{ marginBottom: "20px" }}>
            <FaArrowLeft />
          </button>

          <div className="prod-form-card">
            <div className="form-header" style={{ marginBottom: "25px" }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaCheckCircle style={{ color: '#3b82f6' }} /> Production Order
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Fill finished product details and verify BOM consumption.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="prod-header-grid">
                <div className="input-group">
                  <label>Finished Product Name</label>
                  <input className="recipe-input" type="text" name="product_name" placeholder="Enter Product Name" value={formData.product_name} onChange={handleInputChange} required />
                </div>

                <div className="input-group">
                  <label>Select Recipe / BOM</label>
                  <select className="recipe-input" name="recipe_master_id" value={formData.recipe_master_id} onChange={handleRecipeSelect} required>
                    <option value="">-- Choose Recipe --</option>
                    {recipes.map((r) => <option key={r.recipe_id} value={r.recipe_id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>UOM (Unit of Measure)</label>
                  <select className="recipe-input" name="uom_id" value={formData.uom_id} onChange={handleInputChange} required>
                    <option value="">-- Select UOM --</option>
                    {uoms.map((u) => (
                      <option key={u.uom_id || u.id} value={u.uom_id || u.id}>{u.uom_name || u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Batch Size / Production Qty</label>
                  <input className="recipe-input" type="number" name="production_quantity" placeholder="Quantity to Produce" value={formData.production_quantity} onChange={handleProductionQuantityChange} required />
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '15px' }}>Material Consumption Details</h3>
              
              <div className="consumption-table-wrapper">
                <div className="consumption-header">
                  <span>Item Name</span>
                  <span>In Stock</span>
                  <span>UOM</span>
                  <span>BOM Qty</span>
                  <span>Unit Cost</span>
                  <span>Required</span>
                  <span>Total Cost</span>
                </div>

                {materials.map((mat, index) => {
                  const isShort = mat.required_qty > mat.total_available_stock;
                  return (
                    <div key={index} className={`consumption-row ${isShort ? 'row-short-stock' : ''}`}>
                      <span style={{ fontWeight: '600' }}>
                        {isShort && <FaExclamationTriangle style={{ color: 'red', marginRight: '5px' }} />}
                        {mat.display_name}
                      </span>
                      <span className={isShort ? "text-danger" : ""}>{parseFloat(mat.total_available_stock).toFixed(2)}</span>
                      <span>{mat.uom_name}</span>
                      <span style={{ color: '#64748b' }}>{mat.recipe_qty}</span>
                      <span>{mat.unit_price.toFixed(2)}</span>
                      <span className={isShort ? "text-danger" : "text-success"}>
                        {mat.required_qty.toFixed(3)}
                      </span>
                      <span style={{ fontWeight: '700' }}>{mat.total_price.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="prod-summary-bar">
                <div className="total-cost-label">
                  Total Production Cost: <span style={{ color: '#3b82f6' }}>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="submit" className="save-btn" style={{ padding: '12px 40px', fontSize: '1rem' }}>
                  Complete Production
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductionForm;