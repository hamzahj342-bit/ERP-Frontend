import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";
import { FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../api";
import { hasPermission } from "../permissions";
import "../Transactions.css";
import "../PaymentVouchers/PaymentVoucherForm.css";

// Only open statuses: a tour created here must be selectable on the voucher right away.
const QUICK_TOUR_STATUSES = ["pending", "active"];

const emptyTourForm = {
  salesman_id: "",
  title: "",
  area: "",
  start_date: "",
  end_date: "",
  status: "pending",
  notes: "",
};

const tourLabel = (t) => `${t.tour_code || "T"} — ${t.title}`;

/**
 * Salesman + Tour selects.
 * variant="header" → side-by-side for voucher header, with a quick "add tour" button
 * variant="stack" → stacked (legacy / compact)
 */
const VoucherSalesmanTourCell = ({
  salesmanId,
  tourId,
  salesmenOptions,
  onSalesmanChange,
  onTourChange,
  selectProps = {},
  variant = "header",
  showLabels = true,
}) => {
  const [tourOptions, setTourOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [savingTour, setSavingTour] = useState(false);
  const [tourForm, setTourForm] = useState({ ...emptyTourForm });

  // Same permission that guards the Salesmen page, where tours are normally created.
  const canAddTour = hasPermission("salesmen.manage");

  useEffect(() => {
    let cancelled = false;
    if (!salesmanId) {
      setTourOptions([]);
      return undefined;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/salesmen/${salesmanId}/tours`, {
          params: { open_only: true },
        });
        let list = Array.isArray(res.data) ? res.data : [];
        if (tourId && !list.some((t) => String(t.id) === String(tourId))) {
          const allRes = await api.get(`/salesmen/${salesmanId}/tours`);
          const all = Array.isArray(allRes.data) ? allRes.data : [];
          const missing = all.find((t) => String(t.id) === String(tourId));
          if (missing) list = [missing, ...list];
        }
        if (!cancelled) {
          setTourOptions(
            list.map((t) => ({
              value: String(t.id),
              label: tourLabel(t),
            }))
          );
        }
      } catch {
        if (!cancelled) setTourOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salesmanId, tourId]);

  const openTourModal = () => {
    if (!salesmenOptions.length) {
      toast.info("Please add a salesman first.");
      return;
    }
    setTourForm({ ...emptyTourForm, salesman_id: salesmanId ? String(salesmanId) : "" });
    setShowTourModal(true);
  };

  const closeTourModal = () => {
    if (savingTour) return;
    setShowTourModal(false);
  };

  const handleTourFormChange = (e) => {
    const { name, value } = e.target;
    setTourForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTourSave = async (e) => {
    // The modal is portalled out of the voucher <form> in the DOM, but React still
    // bubbles its events to the voucher form — stop here so the voucher is not submitted.
    e.preventDefault();
    e.stopPropagation();

    const targetSalesmanId = String(tourForm.salesman_id || "");
    if (!targetSalesmanId) {
      toast.error("Please select a salesman for this tour.");
      return;
    }
    if (!tourForm.title.trim()) {
      toast.error("Tour title is required.");
      return;
    }
    if (tourForm.start_date && tourForm.end_date && tourForm.end_date < tourForm.start_date) {
      toast.error("End date cannot be before start date.");
      return;
    }

    try {
      setSavingTour(true);
      const res = await api.post(`/salesmen/${targetSalesmanId}/tours`, {
        title: tourForm.title.trim(),
        area: tourForm.area || null,
        start_date: tourForm.start_date || null,
        end_date: tourForm.end_date || null,
        status: tourForm.status || "pending",
        notes: tourForm.notes || null,
      });
      const created = res.data;
      const newTourId = String(created.id);

      // Select the new tour on the voucher (and its salesman, if it was picked in the modal).
      if (String(salesmanId || "") === targetSalesmanId) {
        setTourOptions((prev) => [
          { value: newTourId, label: tourLabel(created) },
          ...prev.filter((o) => o.value !== newTourId),
        ]);
      } else {
        onSalesmanChange(targetSalesmanId);
      }
      onTourChange(newTourId);

      toast.success(`Tour ${created.tour_code || ""} created.`);
      setShowTourModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create tour.");
    } finally {
      setSavingTour(false);
    }
  };

  const isHeader = variant === "header";

  const salesmanSelect = (
    <Select
      {...selectProps}
      options={salesmenOptions}
      value={salesmenOptions.find((o) => String(o.value) === String(salesmanId)) || null}
      onChange={(opt) => {
        onSalesmanChange(opt?.value || "");
        onTourChange("");
      }}
      placeholder="Salesman (optional)"
      isClearable
      isSearchable
    />
  );

  const tourSelect = (
    <Select
      {...selectProps}
      options={tourOptions}
      value={tourOptions.find((o) => String(o.value) === String(tourId)) || null}
      onChange={(opt) => onTourChange(opt?.value || "")}
      placeholder={salesmanId ? "Tour (optional)" : "Select salesman first"}
      isClearable
      isSearchable
      isDisabled={!salesmanId}
      isLoading={loading}
    />
  );

  const tourModal =
    showTourModal && typeof document !== "undefined"
      ? createPortal(
          <div className="voucher-tour-overlay">
            <div className="voucher-tour-modal" role="dialog" aria-modal="true" aria-label="Create tour">
              <div className="voucher-tour-modal-header">
                <h3>Create Tour</h3>
                <button
                  type="button"
                  className="voucher-tour-close"
                  onClick={closeTourModal}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleTourSave} className="voucher-tour-form">
                <div className="voucher-tour-field">
                  <label>Salesman *</label>
                  <select
                    className="rm-input-field"
                    name="salesman_id"
                    value={tourForm.salesman_id}
                    onChange={handleTourFormChange}
                    required
                  >
                    <option value="">Select salesman...</option>
                    {salesmenOptions.map((s) => (
                      <option key={s.value} value={String(s.value)}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="voucher-tour-field">
                  <label>Tour title *</label>
                  <input
                    className="rm-input-field"
                    name="title"
                    value={tourForm.title}
                    onChange={handleTourFormChange}
                    placeholder="Tour title"
                    autoFocus
                    required
                  />
                </div>

                <div className="voucher-tour-field">
                  <label>Tour code</label>
                  <input className="rm-input-field readonly-input" value="Auto-generated on save" readOnly disabled />
                </div>

                <div className="voucher-tour-field">
                  <label>Area (optional)</label>
                  <input
                    className="rm-input-field"
                    name="area"
                    value={tourForm.area}
                    onChange={handleTourFormChange}
                    placeholder="Area"
                  />
                </div>

                <div className="voucher-tour-field">
                  <label>Start date</label>
                  <input
                    className="rm-input-field"
                    type="date"
                    name="start_date"
                    value={tourForm.start_date}
                    onChange={handleTourFormChange}
                  />
                </div>

                <div className="voucher-tour-field">
                  <label>End date</label>
                  <input
                    className="rm-input-field"
                    type="date"
                    name="end_date"
                    value={tourForm.end_date}
                    onChange={handleTourFormChange}
                  />
                </div>

                <div className="voucher-tour-field">
                  <label>Status</label>
                  <select
                    className="rm-input-field"
                    name="status"
                    value={tourForm.status}
                    onChange={handleTourFormChange}
                  >
                    {QUICK_TOUR_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="voucher-tour-field voucher-tour-field--full">
                  <label>Notes (optional)</label>
                  <textarea
                    className="rm-input-field"
                    name="notes"
                    value={tourForm.notes}
                    onChange={handleTourFormChange}
                    placeholder="Notes"
                    rows={2}
                  />
                </div>

                <div className="voucher-tour-actions">
                  <button
                    type="button"
                    className="voucher-tour-cancel"
                    onClick={closeTourModal}
                    disabled={savingTour}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="save-btn" disabled={savingTour}>
                    {savingTour ? "Saving..." : "Create Tour"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  if (isHeader) {
    return (
      <>
        <div className="info-item">
          {showLabels && <label>Salesman</label>}
          {salesmanSelect}
        </div>
        <div className="info-item">
          {showLabels && <label>Tour</label>}
          {canAddTour ? (
            <div className="voucher-tour-with-add">
              <div className="voucher-tour-select">{tourSelect}</div>
              <button
                type="button"
                className="quick-add-btn"
                title="Add new tour"
                aria-label="Add new tour"
                onClick={openTourModal}
              >
                <FaPlus />
              </button>
            </div>
          ) : (
            tourSelect
          )}
        </div>
        {tourModal}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {salesmanSelect}
      {tourSelect}
    </div>
  );
};

export default VoucherSalesmanTourCell;
