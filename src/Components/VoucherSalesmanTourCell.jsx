import React, { useEffect, useState } from "react";
import Select from "react-select";
import api from "../../api";

/**
 * Salesman + Tour selects.
 * variant="header" → side-by-side for voucher header
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
              label: `${t.tour_code || "T"} — ${t.title}`,
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

  if (isHeader) {
    return (
      <>
        <div className="info-item">
          {showLabels && <label>Salesman</label>}
          {salesmanSelect}
        </div>
        <div className="info-item">
          {showLabels && <label>Tour</label>}
          {tourSelect}
        </div>
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
