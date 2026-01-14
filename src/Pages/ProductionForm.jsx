import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { calculateDynamicFIFOCost } from "../utilities/FIFO_Production";
import api from "../../api"; 

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

  // 1. Fetch all recipes
  const fetchRecipes = async () => {
    try {
      const res = await api.get("/recipe");
      setRecipes(res.data);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    }
  };

  // 2. Fetch UOMs (Dropdown fix)
  const fetchUOMs = async () => {
    try {
      const res = await api.get("/uoms"); 
      setUoms(res.data);
    } catch (err) {
      console.error("Error fetching UOMs:", err);
    }
  };

  // 3. Fetch Materials & Sub-Products with Stock
  const fetchRecipeDetails = async (recipeId) => {
    try {
      const res = await api.get(`/production/${recipeId}/materials`);
      const data = res.data;

      // Initial map without calculating required qty yet
      const filled = data.map((item) => ({
        ...item,
        display_name: item.name,
        unit_price: item.unit_price || 0,
        recipe_qty: parseFloat(item.qty) || 0, // Database se aane wali per-unit qty
        required_qty: 0,
        total_price: 0,
        type: item.type
      }));
      setMaterials(filled);
      
      // Agar production_quantity pehle se likhi ho to calculation trigger karein
      if (formData.production_quantity) {
          calculateRequirements(filled, formData.production_quantity);
      }
    } catch (err) {
      console.error("Error fetching recipe details:", err);
      toast.error("Failed to fetch recipe details");
    }
  };

  // Helper function to calculate requirements based on Qty (Not Percentage)
  const calculateRequirements = (itemsList, prodQty) => {
    const pQty = parseFloat(prodQty) || 0;
    
    const updated = itemsList.map(mat => {
      // Formula: Recipe Qty * Production Batch Qty
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

    if (parseFloat(formData.production_quantity) <= 0) {
      return toast.error("Enter a valid production quantity.");
    }

    // Stock check
    const outOfStock = materials.filter(mat => mat.required_qty > mat.total_available_stock);
    if (outOfStock.length > 0) {
      return toast.error(`Insufficient stock for: ${outOfStock.map(i => i.display_name).join(", ")}`);
    }

    const payload = {
      product_name: formData.product_name,
      recipe_master_id: formData.recipe_master_id,
      grand_total: grandTotal,
      details: materials.map(m => ({...m, quantity: m.required_qty})), // standardizing key name for backend
      createdby: user?.username || "guest",
      production_quantity: parseFloat(formData.production_quantity),
      uom_id: formData.uom_id,
    };

    try {
      await api.post("/production", payload);
      toast.success("Production saved successfully!");
      navigate("/finished-products");
    } catch (err) {
      toast.error(err.response?.data?.message || "Production failed to save");
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchUOMs();
  }, []);

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" onClick={() => navigate("/production")}>
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Production Order (Quantity Based)</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <input className="input" type="text" name="product_name" placeholder="Finished Product Name" value={formData.product_name} onChange={handleInputChange} />
              
              <select className="input" name="recipe_master_id" value={formData.recipe_master_id} onChange={handleRecipeSelect}>
                <option value="">Select Recipe</option>
                {recipes.map((r) => <option key={r.recipe_id} value={r.recipe_id}>{r.name}</option>)}
              </select>

              {/* UOM Dropdown Fix: Checking both name and uom_name */}
              <select className="input" name="uom_id" value={formData.uom_id} onChange={handleInputChange}>
                <option value="">Select UOM</option>
                {uoms.map((u) => (
                  <option key={u.uom_id || u.id} value={u.uom_id || u.id}>
                    {u.uom_name || u.name}
                  </option>
                ))}
              </select>

              <input className="input" type="number" name="production_quantity" placeholder="Quantity to Produce (Bottles)" value={formData.production_quantity} onChange={handleProductionQuantityChange} />
            </div>

            <h3 style={{ marginTop: "30px" }}>Material Consumption Details</h3>
            <div style={{ marginTop: "10px", overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr", fontWeight: "bold", background: "#eee", padding: "10px", borderRadius: "5px" }}>
                <span>Item</span><span>In Stock</span><span>UOM</span><span>BOM Qty</span><span>Unit Cost</span><span>Total Req.</span><span>Total Cost</span>
              </div>

              {materials.map((mat, index) => {
                const isShort = mat.required_qty > mat.total_available_stock;
                return (
                  <div key={index} style={{ 
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr", gap: "10px", padding: "10px 5px", borderBottom: "1px solid #ddd",
                    background: isShort ? "#fff1f1" : "transparent"
                  }}>
                    <span style={{ fontWeight: "500" }}>{mat.type === 'FP' ? '📦 ' : '🧪 '}{mat.display_name}</span>
                    <span style={{ color: isShort ? "red" : "inherit" }}>{mat.total_available_stock}</span>
                    <span>{mat.uom_name}</span>
                    <span style={{color: "#666"}}>{mat.recipe_qty}</span>
                    <span>{mat.unit_price.toFixed(2)}</span>
                    <span style={{ fontWeight: "bold", color: isShort ? "red" : "#27ae60" }}>{mat.required_qty.toFixed(6)}</span>
                    <span>{mat.total_price.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <h3 style={{ textAlign: "right", marginTop: "20px", color: "#2c3e50" }}>Batch Production Cost: {grandTotal.toFixed(2)}</h3>
            <div className="form-actions"><button type="submit" className="save-btn">Complete Production</button></div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductionForm;