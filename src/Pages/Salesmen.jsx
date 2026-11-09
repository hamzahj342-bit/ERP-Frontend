import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaRoute } from "react-icons/fa";
import Swal from "sweetalert2";
import "../CustomersAndSuppliers.css";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import ActiveToggle from "../Components/ActiveToggle";
import api from "../../api";

const TOUR_STATUSES = ["pending", "active", "completed", "cancelled"];

const emptyTourForm = {
  salesman_id: "",
  title: "",
  area: "",
  start_date: "",
  end_date: "",
  status: "pending",
  notes: "",
  tour_code: "",
};

const Salesmen = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [tours, setTours] = useState([]);
  const [tourEdit, setTourEdit] = useState(null);
  const [tourForm, setTourForm] = useState({ ...emptyTourForm });
  const [showTourModal, setShowTourModal] = useState(false);

  const navigate = useNavigate();

  const fetchSalesmen = useCallback(async () => {
    try {
      const res = await api.get("/salesmen");
      setSalesmen(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching salesmen:", err);
    }
  }, []);

  const fetchTours = useCallback(async (salesmanId) => {
    if (!salesmanId) {
      setTours([]);
      return;
    }
    try {
      const res = await api.get(`/salesmen/${salesmanId}/tours`);
      setTours(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setTours([]);
    }
  }, []);

  useEffect(() => {
    fetchSalesmen();
  }, [fetchSalesmen]);

  useEffect(() => {
    if (selectedSalesman?.id) fetchTours(selectedSalesman.id);
  }, [selectedSalesman, fetchTours]);

  const filtered = salesmen.filter((s) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(t)) ||
      (s.contact && String(s.contact).toLowerCase().includes(t)) ||
      (s.address && String(s.address).toLowerCase().includes(t))
    );
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/salesmen/${onEdit.id}`, formData);
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: `Salesman ${formData.name} has been updated.`,
        showConfirmButton: false,
        timer: 1500,
      });
      setOnEdit(null);
      fetchSalesmen();
      if (selectedSalesman?.id === onEdit.id) {
        setSelectedSalesman({ ...selectedSalesman, ...formData });
      }
    } catch (err) {
      Swal.fire("Error!", err.response?.data?.message || "Failed to update salesman.", "error");
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete salesman: ${name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await api.delete(`/salesmen/${id}`);
        Swal.fire("Deleted!", "Salesman has been deleted.", "success");
        if (selectedSalesman?.id === id) {
          setSelectedSalesman(null);
          setTours([]);
        }
        fetchSalesmen();
      } catch (err) {
        Swal.fire(
          "Error!",
          err.response?.data?.message || "Failed to delete salesman.",
          "error"
        );
      }
    });
  };

  const handleEditClick = (sm) => {
    setOnEdit(sm);
    setFormData({
      name: sm.name || "",
      address: sm.address || "",
      contact: sm.contact || "",
      is_active: sm.is_active !== false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreateTour = () => {
    if (!salesmen.length) {
      Swal.fire("No salesman", "Please add a salesman first.", "info");
      return;
    }
    setTourEdit(null);
    setTourForm({ ...emptyTourForm, salesman_id: selectedSalesman?.id ? String(selectedSalesman.id) : "" });
    setShowTourModal(true);
  };

  const openEditTour = (tour) => {
    setTourEdit(tour);
    setTourForm({
      salesman_id: String(tour.salesman_id || selectedSalesman?.id || ""),
      title: tour.title || "",
      area: tour.area || "",
      start_date: tour.start_date ? String(tour.start_date).slice(0, 10) : "",
      end_date: tour.end_date ? String(tour.end_date).slice(0, 10) : "",
      status: tour.status || "pending",
      notes: tour.notes || "",
      tour_code: tour.tour_code || "",
    });
    setShowTourModal(true);
  };

  const handleTourFormChange = (e) => {
    const { name, value } = e.target;
    setTourForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTourSave = async (e) => {
    e.preventDefault();
    const targetSalesmanId = Number(tourForm.salesman_id || selectedSalesman?.id || 0);
    if (!targetSalesmanId) {
      Swal.fire("Error!", "Please select a salesman for this tour.", "error");
      return;
    }
    if (!tourForm.title?.trim()) {
      Swal.fire("Error!", "Tour title is required.", "error");
      return;
    }
    const payload = {
      title: tourForm.title.trim(),
      area: tourForm.area || null,
      start_date: tourForm.start_date || null,
      end_date: tourForm.end_date || null,
      status: tourForm.status || "pending",
      notes: tourForm.notes || null,
    };
    try {
      if (tourEdit) {
        await api.put(`/salesmen/tours/${tourEdit.id}`, payload);
        Swal.fire({ icon: "success", title: "Tour updated", showConfirmButton: false, timer: 1200 });
      } else {
        await api.post(`/salesmen/${targetSalesmanId}/tours`, payload);
        Swal.fire({ icon: "success", title: "Tour created", showConfirmButton: false, timer: 1200 });
      }
      setShowTourModal(false);
      const sm = salesmen.find((s) => s.id === targetSalesmanId);
      if (sm && selectedSalesman?.id !== sm.id) {
        setSelectedSalesman(sm); // effect will fetch tours
      } else {
        fetchTours(targetSalesmanId);
      }
    } catch (err) {
      Swal.fire("Error!", err.response?.data?.message || "Failed to save tour.", "error");
    }
  };

  const handleTourDelete = (tour) => {
    Swal.fire({
      title: "Delete tour?",
      text: tour.title,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await api.delete(`/salesmen/tours/${tour.id}`);
        Swal.fire("Deleted!", "Tour has been deleted.", "success");
        fetchTours(selectedSalesman.id);
      } catch (err) {
        Swal.fire("Error!", err.response?.data?.message || "Failed to delete tour.", "error");
      }
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button
                className="back-btn erp-back-btn"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Salesmen</h2>
            </div>
            <button
              className="add-cust-sup erp-btn-primary"
              type="button"
              onClick={() => navigate("/add-salesman")}
            >
              <FaPlus /> Add Salesman
            </button>
          </div>

          <div className="erp-search-bar search-container">
            <FaSearch className="erp-search-icon" />
            <input
              type="text"
              className="input erp-search-input"
              placeholder="Search salesman by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {onEdit && (
            <div className="erp-modal-overlay modal-overlay">
              <div className="erp-modal-content modal-content">
                <h3>Edit Salesman</h3>
                <form onSubmit={handleUpdate}>
                  <input
                    className="input"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Name"
                    required
                  />
                  <input
                    className="input"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address"
                  />
                  <input
                    className="input"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Contact"
                  />
                  <div style={{ marginTop: 10 }}>
                    <ActiveToggle
                      value={formData.is_active}
                      onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
                      fullWidth
                    />
                  </div>
                  <div className="erp-modal-actions">
                    <button type="submit" className="add-cust-sup">
                      Update
                    </button>
                    <button type="button" className="delete-btn" onClick={() => setOnEdit(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showTourModal && (
            <div className="erp-modal-overlay modal-overlay">
              <div className="erp-modal-content modal-content erp-tour-modal">
                <h3>{tourEdit ? "Edit Tour" : "Create Tour"}</h3>
                <form onSubmit={handleTourSave} className="erp-tour-form">
                  <div className="erp-tour-field">
                    <label>Salesman</label>
                    <select
                      className="input"
                      name="salesman_id"
                      value={tourForm.salesman_id}
                      onChange={handleTourFormChange}
                      disabled={Boolean(tourEdit)}
                      required
                    >
                      <option value="">Select salesman...</option>
                      {salesmen.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-tour-field">
                    <label>Tour title</label>
                    <input
                      className="input"
                      name="title"
                      value={tourForm.title}
                      onChange={handleTourFormChange}
                      placeholder="Tour title"
                      required
                    />
                  </div>

                  <div className="erp-tour-field">
                    <label>Tour code</label>
                    <input
                      className="input"
                      value={tourEdit ? tourForm.tour_code || "—" : "TOUR-0001"}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="erp-tour-field">
                    <label>Area (optional)</label>
                    <input
                      className="input"
                      name="area"
                      value={tourForm.area}
                      onChange={handleTourFormChange}
                      placeholder="Area"
                    />
                  </div>

                  <div className="erp-tour-field">
                    <label>Start date</label>
                    <input
                      className="input"
                      type="date"
                      name="start_date"
                      value={tourForm.start_date}
                      onChange={handleTourFormChange}
                    />
                  </div>

                  <div className="erp-tour-field">
                    <label>End date</label>
                    <input
                      className="input"
                      type="date"
                      name="end_date"
                      value={tourForm.end_date}
                      onChange={handleTourFormChange}
                    />
                  </div>

                  <div className="erp-tour-field">
                    <label>Status</label>
                    <select
                      className="input"
                      name="status"
                      value={tourForm.status}
                      onChange={handleTourFormChange}
                    >
                      {TOUR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-tour-field erp-tour-field--full">
                    <label>Notes (optional)</label>
                    <textarea
                      className="input"
                      name="notes"
                      value={tourForm.notes}
                      onChange={handleTourFormChange}
                      placeholder="Notes"
                      rows={2}
                    />
                  </div>

                  <div className="erp-modal-actions">
                    <button type="submit" className="add-cust-sup">
                      {tourEdit ? "Update Tour" : "Create Tour"}
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => setShowTourModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="erp-table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((sm) => (
                    <tr
                      key={sm.id}
                      onClick={() => setSelectedSalesman(sm)}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedSalesman?.id === sm.id ? "rgba(15, 23, 42, 0.06)" : undefined,
                      }}
                    >
                      <td data-label="Id">{sm.id}</td>
                      <td data-label="Name" style={{ fontWeight: 600 }}>
                        {sm.name}
                      </td>
                      <td data-label="Address">{sm.address || "N/A"}</td>
                      <td data-label="Contact">{sm.contact || "N/A"}</td>
                      <td data-label="Status">{sm.is_active !== false ? "Active" : "Inactive"}</td>
                      <td data-label="Actions" className="erp-actions-cell">
                        <div className="erp-actions-group">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSalesman(sm);
                            }}
                          >
                            <FaRoute /> Tours
                          </button>
                          <button
                            type="button"
                            className="edit-btn-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(sm);
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sm.id, sm.name);
                            }}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="erp-empty-cell">
                      No salesmen found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tours panel */}
          <div style={{ marginTop: 28, borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
            <div className="erp-page-header header-flex" style={{ marginBottom: 12 }}>
              <h3 className="erp-page-title" style={{ fontSize: "1.1rem" }}>
                Tours
                {selectedSalesman ? ` — ${selectedSalesman.name}` : ""}
              </h3>
              <button
                className="add-cust-sup erp-btn-primary"
                type="button"
                onClick={openCreateTour}
              >
                <FaPlus /> Add Tour
              </button>
            </div>
            {!selectedSalesman ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Click a salesman row (or its <b>Tours</b> button) to view tours, or use <b>Add Tour</b> and pick the salesman in the form.
              </p>
            ) : (
              <div className="erp-table-scroll">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Area</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tours.length > 0 ? (
                      tours.map((t) => (
                        <tr key={t.id}>
                          <td data-label="Code">{t.tour_code || "—"}</td>
                          <td data-label="Title" style={{ fontWeight: 600 }}>
                            {t.title}
                          </td>
                          <td data-label="Area">{t.area || "—"}</td>
                          <td data-label="Start">
                            {t.start_date ? String(t.start_date).slice(0, 10) : "—"}
                          </td>
                          <td data-label="End">
                            {t.end_date ? String(t.end_date).slice(0, 10) : "—"}
                          </td>
                          <td data-label="Status">{t.status}</td>
                          <td data-label="Actions" className="erp-actions-cell">
                            <div className="erp-actions-group">
                              <button
                                type="button"
                                className="edit-btn-action"
                                onClick={() => openEditTour(t)}
                              >
                                <FaEdit /> Edit
                              </button>
                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() => handleTourDelete(t)}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="erp-empty-cell">
                          No tours for this salesman.
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
    </>
  );
};

export default Salesmen;
