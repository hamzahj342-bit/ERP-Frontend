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
    details: [
      {
        rm_id: null,
        rm_name: "",
        fp_id: null,
        fp_name: "",
        qty: "",
        percentage: 0,
        uom_id: null,
        uom_name: "",
      },
    ],
  });

  const [availableItems, setAvailableItems] = useState([]);

  // 1. Fetch Materials and Products
  const fetchAllItems = async () => {
    try {
      const [rmRes, fpRes] = await Promise.all([
        api.get("/add-materials"),
        api.get("/production"),
      ]);

      const materials = rmRes.data.map((item) => ({
        ...item,
        type: "RM",
        uniqueKey: `RM-${item.rm_id}`,
      }));
      const products = fpRes.data.map((item) => ({
        ...item,
        type: "FP",
        uniqueKey: `FP-${item.id}`,
      }));

      setAvailableItems([...materials, ...products]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load materials or products");
    }
  };

  // 2. Fetch Recipe for Editing with Name Fix
  const fetchRecipeData = async () => {
    if (!id || availableItems.length === 0) return;
    try {
      const res = await api.get(`/recipe/${id}`);
      const data = res.data;

      setFormData({
        name: data.name,
        createdby: data.createdby,
        details: data.details.map((d) => {
          const uniqueKey = d.rm_id ? `RM-${d.rm_id}` : `FP-${d.fp_id}`;
          const matchedItem = availableItems.find(i => i.uniqueKey === uniqueKey);

          return {
            rm_id: d.rm_id || null,
            rm_name: d.rm_name || (matchedItem ? matchedItem.name : ""),
            fp_id: d.fp_id || null,
            fp_name: d.fp_name || (matchedItem ? matchedItem.name : ""),
            qty: d.qty || "",
            percentage: d.percentage || 0,
            uom_id: d.uom_id,
            uom_name: d.uom?.uom_name || d.uom?.name || d.uom_name || (matchedItem?.uom?.name || ""),
          };
        }),
      });
    } catch (err) {
      toast.error("Could not load recipe details");
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, []);

  // Is useEffect ko availableItems par depend karwaya taake names mil saken
  useEffect(() => {
    if (id && availableItems.length > 0) {
      fetchRecipeData();
    }
  }, [id, availableItems]);

  // AUTO CALCULATION LOGIC
  useEffect(() => {
    const updatedDetails = [...formData.details];
    const totalSum = updatedDetails.reduce(
      (sum, item) => sum + (parseFloat(item.qty) || 0),
      0
    );

    if (totalSum > 0) {
      updatedDetails.forEach((item) => {
        const itemQty = parseFloat(item.qty) || 0;
        item.percentage = ((itemQty / totalSum) * 100).toFixed(2);
      });
      // Sirf tab update karein jab values badli hon taake infinite loop na bane
    }
  }, [JSON.stringify(formData.details.map((d) => d.qty))]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQtyChange = (index, value) => {
    const updatedDetails = [...formData.details];
    updatedDetails[index].qty = value;
    setFormData({ ...formData, details: updatedDetails });
  };

  const handleItemSelection = (index, uniqueKey) => {
    const updatedDetails = [...formData.details];
    const selectedItem = availableItems.find((item) => item.uniqueKey === uniqueKey);

    if (!selectedItem) {
      updatedDetails[index] = {
        ...updatedDetails[index],
        rm_id: null, fp_id: null, rm_name: "", fp_name: "", uom_id: null, uom_name: ""
      };
    } else {
      const isRM = selectedItem.type === "RM";
      updatedDetails[index] = {
        ...updatedDetails[index],
        rm_id: isRM ? selectedItem.rm_id : null,
        rm_name: isRM ? selectedItem.name : "",
        fp_id: isRM ? null : selectedItem.id,
        fp_name: isRM ? "" : selectedItem.name,
        uom_id: selectedItem.uom_id,
        uom_name: selectedItem.uom?.name || selectedItem.uom?.uom_name || ""
      };
    }
    setFormData({ ...formData, details: updatedDetails });
  };

  const addRow = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        {
          rm_id: null, rm_name: "", fp_id: null, fp_name: "",
          qty: "", percentage: 0, uom_id: null, uom_name: "",
        },
      ],
    });
  };

  const removeRow = (index) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData({ ...formData, details: newDetails });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Please enter recipe name");
    
    // Clean data before sending to ensure no null names go to backend
    const cleanedDetails = formData.details.map(d => {
        const isRM = d.rm_id !== null;
        const matched = availableItems.find(i => 
            isRM ? i.rm_id === d.rm_id : i.id === d.fp_id
        );
        return {
            ...d,
            rm_name: isRM ? (d.rm_name || matched?.name || "") : "",
            fp_name: !isRM ? (d.fp_name || matched?.name || "") : ""
        };
    });

    if (cleanedDetails.some((d) => (!d.rm_id && !d.fp_id) || !d.qty || d.qty <= 0)) {
      return toast.error("Please fill all items and quantities correctly");
    }

    try {
      const payload = { 
        ...formData, 
        details: cleanedDetails,
        updatedby: user?.username 
      };
      
      id ? await api.put(`/recipe/${id}`, payload) : await api.post("/recipe", payload);
      
      toast.success(id ? "Recipe updated and versioned!" : "Recipe created!");
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
          <h2>{id ? "Edit Recipe (New Version)" : "Create Recipe"}</h2>
          <form onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              name="name"
              placeholder="Recipe Name"
              value={formData.name}
              onChange={handleInputChange}
            />

            <h3 style={{ marginTop: "20px" }}>Materials & Formulas</h3>

            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "10px", marginBottom: "10px", fontWeight: "bold" }}>
                <div>Item Selection</div>
                <div>Quantity</div>
                <div>UOM</div>
                <div>Percentage (%)</div>
                <div>Actions</div>
              </div>

              {formData.details.map((detail, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <select
                    className="input"
                    value={detail.rm_id ? `RM-${detail.rm_id}` : detail.fp_id ? `FP-${detail.fp_id}` : ""}
                    onChange={(e) => handleItemSelection(index, e.target.value)}
                  >
                    <option value="">Select Item</option>
                    <optgroup label="Raw Materials">
                      {availableItems.filter((i) => i.type === "RM").map((rm) => (
                        <option key={rm.uniqueKey} value={rm.uniqueKey}>{rm.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Finished Products (Sub-Assembly)">
                      {availableItems.filter((i) => i.type === "FP").map((fp) => (
                        <option key={fp.uniqueKey} value={fp.uniqueKey}>{fp.name}</option>
                      ))}
                    </optgroup>
                  </select>

                  <input
                    className="input"
                    type="number"
                    placeholder="Qty"
                    value={detail.qty}
                    onChange={(e) => handleQtyChange(index, e.target.value)}
                  />

                  <input
                    type="text"
                    className="input"
                    placeholder="UOM"
                    value={detail.uom_name || ""}
                    readOnly
                    style={{ background: "#f8f9fa" }}
                  />

                  <input
                    className="input"
                    type="text"
                    value={detail.percentage + "%"}
                    readOnly
                    style={{ background: "#e9ecef", fontWeight: "bold" }}
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

            <div className="form-actions" style={{ marginTop: "30px" }}>
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