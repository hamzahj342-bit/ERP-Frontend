import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrashAlt, FaBook, FaSearch } from "react-icons/fa"; // 🔎 Added FaSearch
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import api from "../../api"; 
import "../css/Accounts/AccountList.css"; // CSS Link

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]); // 🎯 State for holding search results
  const [searchQuery, setSearchQuery] = useState(""); // 🎯 State for search string
  const [loading, setLoading] = useState(true);
  const [onUpdate, setOnUpdate] = useState(null);
  const [formData, setFormData] = useState({
    account_name: "",
    account_code: ""
  });

  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data);
      setFilteredAccounts(res.data); // Initial loading sync
    } catch (err) {
      console.error("Error fetching accounts:", err);
      toast.error("Failed to load accounts list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 🎯 Real-time dynamic search filter handler
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(acc => {
        const nameMatch = acc.account_name ? acc.account_name.toLowerCase().includes(query) : false;
        // matching explicitly with category_code column field from database structure
        const categoryMatch = acc.category_code ? acc.category_code.toLowerCase().includes(query) : false;
        
        return nameMatch || categoryMatch;
      });
      setFilteredAccounts(filtered);
    }
  }, [searchQuery, accounts]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEdit = (acc) => {
    setOnUpdate(acc);
    setFormData({
      account_name: acc.account_name,
      account_code: acc.account_code
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/accounts/${onUpdate.id}`, {
        account_name: formData.account_name,
        account_code: formData.account_code,
        updated_by: userId
      });
      setOnUpdate(null);
      fetchAccounts();
      toast.success("Account updated successfully");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This might affect your financial transactions!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete account!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/accounts/${id}`);
          fetchAccounts();
          Swal.fire('Deleted!', 'Account has been removed.', 'success');
        } catch (err) {
          Swal.fire('Error!', 'Something went wrong.', 'error');
        }
      }
    });
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />

      <div className="acc-list-wrapper">
        <div className="acc-list-container">
          
          {/* Header Section */}
          <div className="header-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0px 25px 0px' }}>
            <button className="back-btn" onClick={() => navigate("/accounts-setting")}>
              <FaArrowLeft />
            </button>
            <button className="add-sale-btn" onClick={() => navigate("/create-account")} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus /> Add Account
            </button>
          </div>

          <div className="acc-card">
            {/* 🎯 Updated Title Section to hold both Title & Search Box inline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaBook style={{ color: '#3b82f6' }} /> Chart of Accounts
              </h2>
              
              {/* 🔎 Live Search Bar Input Component */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
                <input 
                  type="text"
                  placeholder="Search by name or category code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 35px',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    width: '280px',
                    outline: 'none',
                    color: '#334155'
                  }}
                />
              </div>
            </div>

            {/* Edit Modal */}
            {onUpdate && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Update Account</h3>
                  <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', display: 'block' }}>Account Name</label>
                      <input
                        className="input"
                        name="account_name"
                        value={formData.account_name}
                        onChange={handleChange}
                        placeholder="e.g. Petty Cash"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', display: 'block' }}>Account Code</label>
                      <input
                        className="input"
                        name="account_code"
                        value={formData.account_code}
                        onChange={handleChange}
                        placeholder="e.g. 1001"
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="primary-btn" style={{ flex: 2 }}>Save Changes</button>
                      <button type="button" className="primary-btn" onClick={() => setOnUpdate(null)} style={{ flex: 1, backgroundColor: '#64748b' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Table Section */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px" }}>
                <div className="loader"></div>
                <p style={{ color: '#64748b', marginTop: '10px' }}>Loading accounts...</p>
              </div>
            ) : (
              <div className="prod-table-container">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Code</th>
                      <th>Account Name</th>
                      <th>Category Code</th> {/* Added display column for testing visualization */}
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((acc, index) => (
                      <tr key={acc.id}>
                        <td>{index + 1}</td>
                        <td><span className="acc-code-pill">{acc.account_code}</span></td>
                        <td style={{ fontWeight: '500', color: '#1e293b' }}>{acc.account_name}</td>
                        <td>
                          <span className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: '0.8rem', borderRadius: '4px' }}>
                            {acc.category_code || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="edit-btn" onClick={() => handleEdit(acc)} title="Edit">
                              <FaEdit />
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(acc.id)} title="Delete">
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: '#94a3b8' }}>
                          No accounts match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AccountList;