import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaEdit } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const RecipeList = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);

  // Fetch all recipes
  const fetchRecipes = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/recipe");
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    }
  };

  // ✅ Delete a recipe with SweetAlert2
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This recipe will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:5000/api/recipe/${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          toast.success("Recipe deleted successfully");
          fetchRecipes();
          Swal.fire("Deleted!", "The recipe has been deleted.", "success");
        } else {
          toast.error("Failed to delete recipe");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      }
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

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
            onClick={() => navigate("/add-recipe")}
          >
            Add Recipe
          </button>
          <h2>Recipe List</h2>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Recipe Name</th>
                <th>Created By</th>
                <th>Current Stock</th>
                <th>Current Stock Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length > 0 ? (
                recipes.map((r) => {
                  const currentStock = parseFloat(r.current_stock) || 0;
                  const isDisabled = currentStock > 0; // Agar stock > 0 hai to buttons disable ho jayenge
                  return (
                    <tr key={r.recipe_id}>
                      <td>{r.recipe_id}</td>
                      <td>{r.name}</td>
                    <td>{r.createdby || "—"}</td>
                    <td>{parseFloat(r.current_stock ?? "-")}</td>
                    <td>{parseFloat(r.current_stock_price ?? "-")}</td>
                    <td>
                      <button className="edit-btn" disabled={isDisabled} 
                      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
                      onClick={() => navigate(`/add-recipe/${r.recipe_id}`)} >
                         {/* <FaEdit /> */}
                         Edit
                          </button>
                      <button
                        className="delete-btn"  disabled={isDisabled}
                        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
                        onClick={() => handleDelete(r.recipe_id)}
                      >
                        {/* <FaTrash /> */}
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No recipes found.
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

export default RecipeList;
