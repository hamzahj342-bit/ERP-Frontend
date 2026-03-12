import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaEdit } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api"; 

const RecipeList = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Native Debounce Logic for Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ✅ Fetch recipes with pagination and search (Server-side)
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/recipe", {
        params: {
          page: page,
          limit: 50,
          search: debouncedSearch
        }
      });
      
      if (res.data && res.data.data) {
        setRecipes(Array.isArray(res.data.data) ? res.data.data : []);
        setTotalPages(res.data.totalPages || 1);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching recipes:", err);
      toast.error("Failed to load recipes");
      setLoading(false);
    }
  };

  // Fetch recipes when page or search changes
  useEffect(() => {
    fetchRecipes();
  }, [page, debouncedSearch]);

  // ✅ Delete a recipe with SweetAlert2 (Standardized)
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
        // Fetch ki jagah api.delete use kiya
        await api.delete(`/recipe/${id}`);

        toast.success("Recipe deleted successfully");
        fetchRecipes();
        Swal.fire("Deleted!", "The recipe has been deleted.", "success");
      } catch (err) {
        console.error(err);
        // Backend se aane wala error message dikhane ke liye
        toast.error(err.response?.data?.message || err.response?.data?.error || "Something went wrong");
      }
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

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
            onClick={() => navigate("/fp-production")}
          >
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <button
            className="add-sale-btn"
            onClick={() => navigate("/add-recipe")}
          >
            Add Recipe
          </button>
          <h2>Recipe List</h2>

          {/* Search Bar */}
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by recipe name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{
                width: "100%",
                padding: "12px 15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "1rem",
              }}
            />
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "20px" }}>Loading data...</p>
          ) : (
            <>
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
                            <button
                              className="edit-btn"
                              onClick={() => navigate(`/add-recipe/${r.recipe_id}`)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn"
                              disabled={isDisabled}
                              style={{
                                cursor: isDisabled ? "not-allowed" : "pointer",
                                opacity: isDisabled ? 0.5 : 1,
                              }}
                              onClick={() => handleDelete(r.recipe_id)}
                            >
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

              {/* Pagination Component */}
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RecipeList;
