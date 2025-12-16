import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";

const AddRecipe = () => {
  const navigate = useNavigate();
  const { recipe_id, id } = useParams();

  const user = JSON.parse(localStorage.getItem("user")); 
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    name: "",
    createdby:  user ? user.username : "guest",
    details: [{ rm_id: "", rm_name: "", percentage: "" }],
  });
  const [rawMaterials, setRawMaterials] = useState([]);
  const [totalPercentage, setTotalPercentage] = useState(0); // 👈 total tracker

  // Fetch raw materials
  const fetchRawMaterials = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/add-materials");
      const data = await res.json();
      setRawMaterials(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Add new row
  const addRow = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { rm_id: "", rm_name: "", percentage: "" }],
    });
  };

  // Remove row
  const removeRow = (index) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData({ ...formData, details: newDetails });
  };

  // Handle input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Updated handleDetailChange with total limit logic
  const handleDetailChange = (index, e) => {
    const { name, value } = e.target;
    const updatedDetails = [...formData.details];

    if (name === "rm_id") {
  const selectedRM = rawMaterials.find((r) => r.rm_id == value);
  updatedDetails[index].rm_name = selectedRM ? selectedRM.name : "";
  updatedDetails[index].uom_id = selectedRM ? selectedRM.uom_id : "";
  updatedDetails[index].uom_name = selectedRM ? selectedRM.uom?.name : "";
}


    if (name === "percentage") {
      let val = Number(value);
      if (val < 0) val = 0;

      // total of all other rows
      const totalOther = updatedDetails.reduce(
        (sum, d, i) => (i === index ? sum : sum + Number(d.percentage || 0)),
        0
      );

      const maxAllowed = 100 - totalOther;
      if (val > maxAllowed) {
        toast.warning(`You can enter maximum ${maxAllowed}% for this material`);
        val = maxAllowed;
      }

      updatedDetails[index].percentage = val;
    } else {
      updatedDetails[index][name] = value;
    }

    setFormData({ ...formData, details: updatedDetails });

    // ✅ Update total percentage instantly
    const total = updatedDetails.reduce(
      (sum, d) => sum + Number(d.percentage || 0),
      0
    );
    setTotalPercentage(total);
  };

  // ✅ Updated submit function
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter recipe name");
      return;
    }

    const invalidDetail = formData.details.some(
      (d) => !d.rm_id || !d.percentage || d.percentage <= 0
    );
    if (invalidDetail) {
      toast.error("Please fill all raw material and percentage fields correctly");
      return;
    }

    if (totalPercentage !== 100) {
      toast.error(`Total percentage must be exactly 100%. Current: ${totalPercentage}%`);
      return;
    }

    try {
      const method = id ? "PUT" : "POST";
      const url = id
        ? `http://localhost:5000/api/recipe/${id}`
        : `http://localhost:5000/api/recipe`;

      const payload = id
        ? { ...formData, updatedby: user.username }
        : formData;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          recipe_id
            ? "Recipe updated successfully!"
            : "Recipe created successfully!"
        );
        navigate("/recipe");
      } else {
        toast.error("Failed to save recipe");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  useEffect(() => {
  if (id) {
    fetch(`http://localhost:5000/api/recipe/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          name: data.name,
          createdby: data.createdby,
          details: data.details.map((d) => ({
            rm_id: d.rm_id,
            rm_name: d.rm_name,
            percentage: d.percentage,
            uom_id: d.uom_id,
            uom_name: rawMaterials.find((rm) => rm.rm_id === d.rm_id)?.uom?.name || "",
          })),
        });
      })
      .catch((err) => console.error("Error fetching recipe:", err));
  }
}, [recipe_id]);

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/recipe")}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Create Recipe</h2>
          <form onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              name="name"
              placeholder="Recipe Name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <h3>Raw Materials</h3>

            <div style={{ marginTop: "20px" }}>
              {formData.details.map((detail, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr auto",
                    gap: "10px",
                    marginBottom: "10px",
                    alignItems: "center",
                  }}
                >
                  <select
                    className="input"
                    name="rm_id"
                    value={detail.rm_id}
                    onChange={(e) => handleDetailChange(index, e)}
                  >
                    <option value="">Select Raw Material</option>
                    {rawMaterials.map((rm) => (
                      <option key={rm.rm_id} value={rm.rm_id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>
                  <input
  type="text"
  className="input"
  name="uom_name"
  placeholder="UOM"
  value={detail.uom_name || ""}
  readOnly
/>


                  <input
                    className="input"
                    type="number"
                    name="percentage"
                    placeholder="% Material Percentage"
                    value={detail.percentage}
                    onChange={(e) => handleDetailChange(index, e)}
                  />

                  <div>
                    <button
                      type="button"
                      className="add-more-recipe"
                      onClick={addRow}
                    >
                      <FaPlus />
                    </button>
                    {formData.details.length > 1 && (
                      <button
                        type="button"
                        className="del-btn-recipe"
                        onClick={() => removeRow(index)}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Live total percentage counter */}
            <p style={{ marginTop: "15px", fontWeight: "bold", color: totalPercentage === 100 ? "green" : "red" }}>
              Total Percentage: {totalPercentage}%
            </p>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                Save Recipe
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AddRecipe;
