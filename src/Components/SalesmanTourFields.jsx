import React, { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import api from "../../api";

/**
 * Optional Salesman + Tour selects for sale / return forms.
 * Clears tour when salesman changes (parent should also clear tour_id).
 */
const SalesmanTourFields = ({
  salesmanId,
  tourId,
  onSalesmanChange,
  onTourChange,
  openOnly = true,
}) => {
  const [salesmen, setSalesmen] = useState([]);
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/salesmen", { params: { active_only: true } });
        if (!cancelled) setSalesmen(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load salesmen:", err);
        if (!cancelled) setSalesmen([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTours = useCallback(
    async (sid, preserveTourId) => {
      if (!sid) {
        setTours([]);
        return;
      }
      setLoadingTours(true);
      try {
        const params = openOnly && !preserveTourId ? { open_only: true } : {};
        const res = await api.get(`/salesmen/${sid}/tours`, { params });
        let list = Array.isArray(res.data) ? res.data : [];
        // If editing a closed tour, ensure it still appears in options
        if (preserveTourId && !list.some((t) => String(t.id) === String(preserveTourId))) {
          const allRes = await api.get(`/salesmen/${sid}/tours`);
          const all = Array.isArray(allRes.data) ? allRes.data : [];
          const missing = all.find((t) => String(t.id) === String(preserveTourId));
          if (missing) list = [missing, ...list];
        }
        setTours(list);
      } catch (err) {
        console.error("Failed to load tours:", err);
        setTours([]);
      } finally {
        setLoadingTours(false);
      }
    },
    [openOnly]
  );

  useEffect(() => {
    loadTours(salesmanId, tourId);
  }, [salesmanId, tourId, loadTours]);

  const salesmanOptions = salesmen.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const tourOptions = tours.map((t) => ({
    value: t.id,
    label: `${t.tour_code || "T"} — ${t.title}${t.status ? ` (${t.status})` : ""}`,
  }));

  return (
    <>
      <div className="info-item">
        <label>Salesman (optional)</label>
        <Select
          className="rm-input-field"
          classNamePrefix="react-select"
          options={salesmanOptions}
          value={salesmanOptions.find((o) => String(o.value) === String(salesmanId)) || null}
          onChange={(opt) => {
            onSalesmanChange(opt?.value || "");
            onTourChange("");
          }}
          isSearchable
          isClearable
          placeholder="Select salesman..."
        />
      </div>
      <div className="info-item">
        <label>Tour (optional)</label>
        <Select
          className="rm-input-field"
          classNamePrefix="react-select"
          options={tourOptions}
          value={tourOptions.find((o) => String(o.value) === String(tourId)) || null}
          onChange={(opt) => onTourChange(opt?.value || "")}
          isSearchable
          isClearable
          isDisabled={!salesmanId}
          isLoading={loadingTours}
          placeholder={salesmanId ? "Select tour..." : "Select salesman first"}
        />
      </div>
    </>
  );
};

export default SalesmanTourFields;
