import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [onUpdate, setOnUpdate] = useState(null);
  const [formData, setFormData] = useState({
    account_name: "",
    account_code: ""
  });

  const navigate = useNavigate();

  // Fetch only user-created accounts
  const fetchAccounts = () => {
    fetch("http://localhost:5000/api/create-accounts/user-created")
      .then(res => res.json())
      .then(data => setAccounts(data))
      .catch(err => console.error("Error fetching accounts:", err));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle change
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Edit click
  const handleEdit = (acc) => {
    setOnUpdate(acc);
    setFormData({
      account_name: acc.account_name,
      account_code: acc.account_code
    });
  };

  // Update API
  const handleUpdate = (e) => {
    e.preventDefault();

    fetch(`http://localhost:5000/api/create-accounts/${onUpdate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    })
      .then(res => {
        if (res.ok) {
          setOnUpdate(null);
          fetchAccounts();
        }
        toast.success("Account Info Updated Successfully")
      })
      .catch(err => console.error("Update error:", err));
  };

 const handleDelete = (id) => {
  Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`http://localhost:5000/api/create-accounts/${id}`, {
        method: "DELETE"
      })
        .then(res => {
          if (res.ok) {
            fetchAccounts();
            Swal.fire(
              'Deleted!',
              'Account has been deleted.',
              'success'
            );
          }
        })
        .catch(err => {
          console.error("Delete error:", err);
          Swal.fire(
            'Error!',
            'Something went wrong while deleting.',
            'error'
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
          onClick={() => navigate("/dashboard")}
        >
          <FaArrowLeft />
        </button>

        <div className="table-wrapper">
          <button
            className="add-cust-sup"
            onClick={() => navigate("/create-account")}
          >
            Add Account
          </button>

          <h2>Accounts List</h2>

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
                alignItems: "center"
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "10px",
                  width: "300px"
                }}
              >
                <h3>Edit Account</h3>

                <form
                  onSubmit={handleUpdate}
                  style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <input
                    className="input"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleChange}
                    placeholder="Account Name"
                    required
                  />

                  <input
                    className="input"
                    name="account_code"
                    value={formData.account_code}
                    onChange={handleChange}
                    placeholder="Account Code"
                    required
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

          {/* Table */}
          <table className="entity-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {accounts.map((acc, index) => (
                <tr key={acc.id}>
                  <td>{index + 1}</td>
                  <td>{acc.account_code}</td>
                  <td>{acc.account_name}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(acc)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(acc.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {accounts.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    No user-created accounts found.
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

export default AccountList;
