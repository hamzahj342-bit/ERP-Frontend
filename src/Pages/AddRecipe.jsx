import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api"; 

const AddRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const user = JSON.parse(localStorage.getItem("user")); 

  const [formData, setFormData] = useState({
    name: "",
    createdby: user ? user.username : "guest",
    details: [{ rm_id: null, rm_name: "", fp_id: null, fp_name: "", percentage: "", uom_name: "" }],
  });

  // 🚨 New States: Materials aur Products dono ke liye
  const [availableItems, setAvailableItems] = useState([]); 
  const [totalPercentage, setTotalPercentage] = useState(0);

  // 1. Fetch Materials and Products (Merged List)
  const fetchAllItems = async () => {
    try {
      const [rmRes, fpRes] = await Promise.all([
        api.get("/add-materials"),
        api.get("/production") // Assuming /recipe returns list of finished products
      ]);

      // RM ko identify karne ke liye type add kar rahe hain
      const materials = rmRes.data.map(item => ({ ...item, type: 'RM', uniqueKey: `RM-${item.rm_id}` }));
      const products = fpRes.data.map(item => ({ ...item, type: 'FP', uniqueKey: `FP-${item.id}` }));

      setAvailableItems([...materials, ...products]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load materials or products");
    }
  };

  // 2. Fetch Recipe for Editing
  const fetchRecipeData = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/recipe/${id}`);
      const data = res.data;
      
      setFormData({
        name: data.name,
        createdby: data.createdby,
        details: data.details.map((d) => ({
          rm_id: d.rm_id || null,
          rm_name: d.rm_name || "",
          fp_id: d.fp_id || null,
          fp_name: d.fp_name || "",
          percentage: d.percentage,
          uom_id: d.uom_id,
          uom_name: d.uom_name || "",
        })),
      });

      const total = data.details.reduce((sum, d) => sum + Number(d.percentage || 0), 0);
      setTotalPercentage(total);
    } catch (err) {
      toast.error("Could not load recipe details");
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, []);

  useEffect(() => {
    if (id && availableItems.length > 0) {
      fetchRecipeData();
    }
  }, [id, availableItems.length]);

  const addRow = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { rm_id: null, rm_name: "", fp_id: null, fp_name: "", percentage: "", uom_name: "" }],
    });
  };

  const removeRow = (index) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData({ ...formData, details: newDetails });
    const total = newDetails.reduce((sum, d) => sum + Number(d.percentage || 0), 0);
    setTotalPercentage(total);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🚨 Handle Selection (RM vs FP)
  const handleItemSelection = (index, uniqueKey) => {
    const updatedDetails = [...formData.details];
    const selectedItem = availableItems.find(item => item.uniqueKey === uniqueKey);
 
    if (!selectedItem) {
      updatedDetails[index] = { ...updatedDetails[index], rm_id: null, fp_id: null, rm_name: "", fp_name: "", uom_name: "" };
    } else if (selectedItem.type === 'RM') {
      updatedDetails[index].rm_id = selectedItem.rm_id;
      updatedDetails[index].rm_name = selectedItem.name;
      updatedDetails[index].fp_id = null;
      updatedDetails[index].fp_name = "";
      updatedDetails[index].uom_id = selectedItem.uom_id;
      updatedDetails[index].uom_name = selectedItem.uom?.name || "";
    } else { // Finished Product
      updatedDetails[index].fp_id = selectedItem.id;
      updatedDetails[index].fp_name = selectedItem.name;
      updatedDetails[index].rm_id = null;
      updatedDetails[index].rm_name = "";
      updatedDetails[index].uom_id = selectedItem.uom_id;
      updatedDetails[index].uom_name = selectedItem.uom?.name || ""; // Or get from FP UOM
    }

    setFormData({ ...formData, details: updatedDetails });
  };

  const handlePercentageChange = (index, value) => {
    const updatedDetails = [...formData.details];
    let val = Number(value);
    if (val < 0) val = 0;

    const totalOther = updatedDetails.reduce((sum, d, i) => (i === index ? sum : sum + Number(d.percentage || 0)), 0);
    const maxAllowed = 100 - totalOther;

    if (val > maxAllowed) {
      toast.warning(`Maximum ${maxAllowed}% allowed`);
      val = maxAllowed;
    }

    updatedDetails[index].percentage = val;
    setFormData({ ...formData, details: updatedDetails });
    setTotalPercentage(totalOther + val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Please enter recipe name");
    if (formData.details.some((d) => (!d.rm_id && !d.fp_id) || !d.percentage || d.percentage <= 0)) {
      return toast.error("Please fill all fields correctly");
    }
    if (totalPercentage !== 100) return toast.error(`Total percentage must be 100%`);

    try {
      const payload = id ? { ...formData, updatedby: user.username } : formData;
      id ? await api.put(`/recipe/${id}`, payload) : await api.post("/recipe", payload);
      toast.success(id ? "Recipe updated!" : "Recipe created!");
      navigate("/recipe");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save recipe");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate("/recipe")}>
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>{id ? "Edit Recipe" : "Create Recipe"}</h2>
          <form onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              name="name"
              placeholder="Recipe Name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <h3>Materials & Sub-Products</h3>

            <div style={{ marginTop: "20px" }}>
              {formData.details.map((detail, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  
                  {/* Item Selector Dropdown */}
                  <select
                    className="input"
                    value={detail.rm_id ? `RM-${detail.rm_id}` : detail.fp_id ? `FP-${detail.fp_id}` : ""}
                    onChange={(e) => handleItemSelection(index, e.target.value)}
                  >
                    <option value="">Select Item</option>
                    <optgroup label="Raw Materials">
                      {availableItems.filter(i => i.type === 'RM').map((rm) => (
                        <option key={rm.uniqueKey} value={rm.uniqueKey}>{rm.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Finished Products (Sub-Assembly)">
                      {availableItems.filter(i => i.type === 'FP').map((fp) => (
                        <option key={fp.uniqueKey} value={fp.uniqueKey}>{fp.name}</option>
                      ))}
                    </optgroup>
                  </select>

                  <input type="text" className="input" placeholder="UOM" value={detail.uom_name || ""} readOnly />

                  <input
                    className="input"
                    type="number"
                    placeholder="%"
                    value={detail.percentage}
                    onChange={(e) => handlePercentageChange(index, e.target.value)}
                  />

                  <div>
                    <button type="button" className="add-more-recipe" onClick={addRow}><FaPlus /></button>
                    {formData.details.length > 1 && (
                      <button type="button" className="del-btn-recipe" onClick={() => removeRow(index)}><FaTimes /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: "15px", fontWeight: "bold", color: totalPercentage === 100 ? "green" : "red" }}>
              Total Percentage: {totalPercentage}%
            </p>

            <div className="form-actions">
              <button type="submit" className="save-btn">Save Recipe</button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AddRecipe;