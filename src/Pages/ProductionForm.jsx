import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { calculateDynamicFIFOCost } from "../utilities/FIFO_Production";

const ProductionForm = () => {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

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

  // ✅ Fetch all recipes for dropdown
  const fetchRecipes = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/recipe");
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    }
  };

  const fetchUOMs = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/uoms/uoms"); 
      const data = await res.json();
      setUoms(data);
    } catch (err) {
      console.error("Error fetching UOMs:", err);
    }
};

  // ✅ Fetch recipe materials + stock when recipe selected
  const fetchRecipeDetails = async (recipeId) => {
    try {
      console.log("Fetching recipe details for ID:", recipeId);
      const res = await fetch(`http://localhost:5000/api/production/${recipeId}/materials`);
      if (!res.ok) {
        toast.error("Recipe details not found!");
        setMaterials([]);
        return;
      }
      const data = await res.json();
      console.log("📦 Recipe details:", data);

      // Set initial editable material rows
      const filled = data.map((mat) => ({
        ...mat,
        unit_price: mat.unit_price || 0,
        quantity: mat.quantity || 0,
        total_price: 0,
      }));
      setMaterials(filled);
    } catch (err) {
      console.error("Error fetching recipe details:", err);
      toast.error("Failed to fetch recipe details");
    }
  };

  // ✅ Handle product name & recipe dropdown
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle recipe select
  const handleRecipeSelect = (e) => {
    const recipeId = e.target.value;
    setFormData({ ...formData, recipe_id: recipeId });
    if (recipeId) fetchRecipeDetails(recipeId);
    else setMaterials([]);
  };

  // ✅ Update unit price or quantity & auto calculate totals
 const handleMaterialChange = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = parseFloat(value) || 0;
    
    // --- 🛑 Stock Validation (Aapka pehla check) ---
    if (field === "quantity" && updated[index].quantity > updated[index].total_available_stock) {
      toast.error(`Stock: Sirf ${updated[index].total_available_stock} units available hain!`);
      // Value ko available stock par set kar diya
      updated[index].quantity = updated[index].total_available_stock;
    }
    
    // --- ✅ NEW: Percentage Validation ---
    const matPercentage = parseFloat(updated[index].percentage) || 0;
    const productionQty = parseFloat(formData.production_quantity) || 0;

    if (field === "quantity" && productionQty > 0) {
        // Required quantity nikalte hain (Ex: 100 kg product ka 10% = 10 kg)
        const requiredQty = (productionQty * matPercentage) / 100;

        // Check karte hain ke user required quantity se zyada ya kam to nahi daal raha
        if (updated[index].quantity !== requiredQty) {
            // Agar quantity required se match nahi karti to error dikhao
            toast.error(
                `Percentage Error: ${updated[index].rm_name} ki required quantity ${requiredQty} ${updated[index].uom_name} hai (${matPercentage}% of ${productionQty}).`
            );
            // Aur quantity ko required value par set kar do
            // updated[index].quantity = requiredQty.toFixed(2);
        }
    }


    // Auto calculate total price
    updated[index].total_price = (
      updated[index].unit_price * updated[index].quantity
    );

    setMaterials(updated);
};

// ✅ Handle production quantity change
const handleProductionQuantityChange = (e) => {
    const newQty = parseFloat(e.target.value) ;
    setFormData({ ...formData, production_quantity: newQty });

    // Agar production quantity change ho to materials ki quantity bhi update karo
    const updated = materials.map(mat => {
        const matPercentage = parseFloat(mat.percentage) || 0;
        const requiredQty = (newQty * matPercentage) / 100;

        const dynamicFIFOCost = calculateDynamicFIFOCost(mat.fifo_batches, requiredQty);
        
        // Stock se zyada to nahi ho rahi?
        if (requiredQty > mat.total_available_stock) {
            toast.error(
                `Stock Error: ${mat.rm_name} ki required quantity (${requiredQty}) available stock (${mat.total_available_stock}) se zyada hai. Kam Quantity use karein.`
            );

            // Yahan hum quantity ko stock limit par set kar sakte hain
            mat.quantity = mat.total_available_stock;
        } else {
            mat.quantity = requiredQty;
        }

        mat.unit_price = dynamicFIFOCost

        // Total price bhi update karo
        mat.total_price = (mat.unit_price * mat.quantity);
        return mat;
    });
    setMaterials(updated);
};

  // ✅ Recalculate grand total when materials change
  useEffect(() => {
    const total = materials.reduce(
      (sum, mat) => sum + parseFloat(mat.total_price || 0),
      0
    );
    setGrandTotal(total);
  }, [materials]);

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim()) {
      toast.error("Please enter product name");
      return;
    }
    if (!formData.recipe_id) {
      toast.error("Please select a recipe");
      return;
    }

    // ✅ NEW: Production Quantity validation
    if (parseFloat(formData.production_quantity) <= 0) {
      toast.error("Please enter a valid production quantity.");
      return;
    }

    // Double check all materials have enough stock before submission
    const insufficientStock = materials.some(mat => 
        parseFloat(mat.quantity) > parseFloat(mat.total_available_stock)
    );

    if (insufficientStock) {
        toast.error("One or more materials have insufficient stock after calculation. Please re-check.");
        return;
    }

    const payload = {
      product_name: formData.product_name,
      recipe_master_id: formData.recipe_id,
      grand_total: grandTotal,
      details: materials,
      createdby: user?.username || "guest",
      production_quantity: parseFloat(formData.production_quantity),
      uom_id: formData.uom_id,
    };

    try {
      const res = await fetch("http://localhost:5000/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Product created successfully!");
        navigate("/production");
      } else {
        toast.error("Failed to save product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
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
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/production")}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Production Form</h2>
          <form onSubmit={handleSubmit}>
            {/* ✅ Product Name */}
            <input
              className="input"
              type="text"
              name="product_name"
              placeholder="Product Name"
              value={formData.product_name}
              onChange={handleInputChange}
            />

            {/* ✅ Select Recipe */}
            <select
              className="input"
              name="recipe_id"
              value={formData.recipe_id}
              onChange={handleRecipeSelect}
            >
              <option value="">Select Recipe</option>
              {recipes.map((r) => (
                <option key={r.recipe_id} value={r.recipe_id}>
                  {r.name}
                </option>
              ))}
            </select>
            {/* ✅ Select Product UOM (KG / LITRE) */}
<select
  className="input"
  name="uom_id" // State key is: uom_id
  value={formData.uom_id}
  onChange={handleInputChange} 
>
  <option value="">Select Product UOM (Kg/Litre)</option>
  {uoms.map((u) => (
    <option key={u.id} value={u.id}>
      {u.uom_name}
    </option>
  ))}
</select>
            {/* ✅ NEW: Production Quantity */}
            <input
              className="input"
              type="number"
              name="production_quantity"
              placeholder="Production Quantity (Finished Product)"
              value={formData.production_quantity}
              onChange={handleProductionQuantityChange} // ✅ Naya handler use kia
              />

            <h3 style={{ marginTop: "20px" }}>Recipe Materials</h3>

            {/* ✅ Auto-filled materials section */}
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                  fontWeight: "bold",
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              >
                <span>Material Name</span>
                <span>Stock</span>
                <span>UOM</span>
                <span>% Percentage</span>
                <span>Unit Price</span>
                <span>Quantity</span>
                <span>Total Price</span>
              </div>

              {materials.length === 0 ? (
                <p style={{ color: "#888" }}>Select a recipe to view its materials</p>
              ) : (
                materials.map((mat, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                      gap: "10px",
                      marginBottom: "10px",
                      alignItems: "center",
                    }}
                  >
                    <input className="input" value={mat.rm_name || ""} readOnly />
                    <input className="input" value={mat.total_available_stock || ""} readOnly />
                    <input className="input" value={mat.uom_name || ""} readOnly />
                    <input className="input" value={parseFloat(mat.percentage || "").toFixed(4)} readOnly />

                    {/* Editable unit price */}
                    <input
                      className="input"
                      placeholder="Unit Price"
                      type="number"
                      value={parseFloat(mat.unit_price || "")}
                      onChange={(e) =>
                        handleMaterialChange(index, "unit_price", e.target.value)
                      }
                      readOnly
                    />

                    {/* Editable quantity */}
                    <input
                      className="input"
                      placeholder="Quantity"
                      type="number"
                      value={mat.quantity || ""}
                      onChange={(e) =>
                        handleMaterialChange(index, "quantity", e.target.value)
                      }
                      readOnly
                    />

                    {/* Auto total */}
                    <input
                      className="input"
                      value={mat.total_price || 0}
                      readOnly
                    />
                  </div>
                ))
              )}
            </div>

            {/* ✅ Grand total display */}
            <h3 style={{ marginTop: "20px", textAlign: "right" }}>
              Grand Total: {grandTotal}
            </h3>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button type="submit" className="save-btn">
                Save Product
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductionForm;
