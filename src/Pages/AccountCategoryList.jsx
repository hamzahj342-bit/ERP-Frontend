import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const AccountCategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onUpdate, setOnUpdate] = useState(null);
  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "",
  });

  const navigate = useNavigate();

  // Fetch categories
  const fetchCategories = () => {
    setLoading(true);
    fetch("http://localhost:5000/api/account-categories/user-created")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Edit category
  const handleEdit = (cat) => {
    setOnUpdate(cat);
    setFormData({
      category_name: cat.category_name,
      category_code: cat.category_code,
    });
  };


  const userId = localStorage.getItem("user_id")
  
  // Update category API
  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`http://localhost:5000/api/account-categories/${onUpdate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         category_name: formData.category_name,
         updated_by: userId
      }),
    })
      .then((res) => {
        if (res.ok) {
          toast.success("Category updated successfully!");
          setOnUpdate(null);
          fetchCategories();
        }
      })
      .catch((err) => console.error("Update error:", err));
  };

  // Delete category
  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://localhost:5000/api/account-categories/${id}`, {
          method: "DELETE",
        })
          .then((res) => {
            if (res.ok) {
              fetchCategories();
              Swal.fire("Deleted!", "Category has been deleted.", "success");
            }
          })
          .catch((err) => {
            console.error("Delete error:", err);
            Swal.fire(
              "Error!",
              "Something went wrong while deleting.",
              "error"
            );
          });
      }
    });
  };

  return (
    <>
      <NavigationBar />

      <div className="table-container">
        {/* Back Button */}
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/accounts-setting")}
        >
          <FaArrowLeft />
        </button>

        <div className="table-wrapper">
          <button
            className="add-cust-sup"
            onClick={() => navigate("/create-category")}
          >
            Add Category
          </button>

          <h2>Account Categories</h2>

          {/* Edit Modal */}
          {onUpdate && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "10px",
                  width: "300px",
                }}
              >
                <h3>Edit Category</h3>

                <form
                  onSubmit={handleUpdate}
                  style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <input
                    className="input"
                    name="category_name"
                    value={formData.category_name}
                    onChange={handleChange}
                    placeholder="Category Name"
                    required
                  />

                  <input
                    className="input"
                    name="category_code"
                    value={formData.category_code}
                    onChange={handleChange}
                    placeholder="Category Code"
                    readOnly
                  />

                  <button type="submit" className="primary-btn">
                    Update
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setOnUpdate(null)}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <p style={{ textAlign: "center", marginTop: "20px" }}>Loading...</p>
          ) : (
            <table className="entity-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category Code</th>
                  <th>Category Name</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((cat, index) => (
                  <tr key={cat.id}>
                    <td>{index + 1}</td>
                    <td>{cat.category_code}</td>
                    <td>{cat.category_name}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(cat)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(cat.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AccountCategoryList;
