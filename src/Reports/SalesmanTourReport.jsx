import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import {
  FaArrowLeft,
  FaFileExcel,
  FaFilePdf,
  FaImage,
  FaSync,
  FaChartLine,
  FaRoute,
  FaCalendarAlt,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import "../Profitloss.css";
import { localToday, localFirstOfMonth } from "../utils/localDate";

const formatCurrency = (amount) => {
  const val = Number(amount || 0);
  return `Rs. ${val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const AmountCell = ({ value, strong = false }) => {
  const n = Number(value || 0);
  const neg = n < 0;
  return (
    <td
      className={`sm-amt${neg ? " is-neg" : ""}${strong ? " is-strong" : ""}`}
    >
      {formatCurrency(n)}
    </td>
  );
};

const SummaryCard = ({ label, value }) => {
  const n = Number(value || 0);
  return (
    <div className={`sm-summary-card${n < 0 ? " is-neg" : ""}`}>
      <div className="sm-summary-label">{label}</div>
      <div className="sm-summary-value">{formatCurrency(n)}</div>
    </div>
  );
};

const selectCustomStyles = {
  control: (provided) => ({
    ...provided,
    minHeight: "38px",
    borderRadius: "6px",
    borderColor: "#cbd5e1",
    fontSize: "13px",
    minWidth: "220px",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    fontSize: "13px",
  }),
};

const SalesmanTourReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  const [activeTab, setActiveTab] = useState("performance");
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [tourOptions, setTourOptions] = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);

  const [perfData, setPerfData] = useState({ rows: [], totals: null });
  const [tourPnl, setTourPnl] = useState(null);
  const [periodRows, setPeriodRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/salesmen", { params: { active_only: true } });
        const list = Array.isArray(res.data) ? res.data : [];
        setSalesmen(list.map((s) => ({ value: s.id, label: s.name, ...s })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load salesmen.");
      }
    })();
  }, []);

  const loadTourOptions = useCallback(async (salesmanId) => {
    try {
      const res = await api.get("/reports/salesman-tours-list", {
        params: salesmanId ? { salesman_id: salesmanId } : {},
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setTourOptions(
        list.map((t) => ({
          value: t.id,
          label: `${t.tour_code || "T"} — ${t.title} (${t.salesman_name || ""})`,
          ...t,
        }))
      );
    } catch (err) {
      console.error(err);
      setTourOptions([]);
    }
  }, []);

  useEffect(() => {
    loadTourOptions(selectedSalesman?.value || null);
    setSelectedTour(null);
  }, [selectedSalesman, loadTourOptions]);

  const fetchPerformance = async () => {
    if (!fromDate || !toDate) {
      toast.warning("Please select from and to dates.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/salesman-performance", {
        params: {
          fromDate,
          toDate,
          salesman_id: selectedSalesman?.value || undefined,
        },
      });
      setPerfData({
        rows: res.data?.rows || [],
        totals: res.data?.totals || null,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load performance.");
      setPerfData({ rows: [], totals: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchTourPnl = async () => {
    if (!selectedTour?.value) {
      toast.warning("Please select a tour.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/tour-pnl", {
        params: {
          tour_id: selectedTour.value,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          salesman_id: selectedSalesman?.value || undefined,
        },
      });
      setTourPnl(res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tour P&L.");
      setTourPnl(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriod = async () => {
    if (!fromDate || !toDate) {
      toast.warning("Please select from and to dates.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/salesman-period", {
        params: {
          fromDate,
          toDate,
          salesman_id: selectedSalesman?.value || undefined,
        },
      });
      setPeriodRows(res.data?.rows || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load period report.");
      setPeriodRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    if (activeTab === "performance") fetchPerformance();
    else if (activeTab === "tour") fetchTourPnl();
    else fetchPeriod();
  };

  useEffect(() => {
    if (activeTab === "performance") fetchPerformance();
    else if (activeTab === "period") fetchPeriod();
    // Tour P&L waits for explicit tour selection + Get Report
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fromDate, toDate, selectedSalesman]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    if (activeTab === "performance") {
      const header = [
        "Salesman",
        "Sale",
        "Sale Return",
        "Net Sale",
        "COGS",
        "Gross Profit",
        "Tour Expenses",
        "Net After Tour Exp",
      ];
      const rows = (perfData.rows || []).map((r) => [
        r.salesman_name,
        Number(r.sale || 0),
        Number(r.sale_return || 0),
        Number(r.net_sale || 0),
        Number(r.cogs || 0),
        Number(r.gross_profit || 0),
        Number(r.tour_expenses || 0),
        Number(r.net_after_tour_expense || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        ["SALESMAN PERFORMANCE"],
        [`Period: ${fromDate} to ${toDate}`],
        [],
        header,
        ...rows,
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Performance");
    } else if (activeTab === "tour" && tourPnl) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["TOUR P&L"],
        [tourPnl.tour?.title || ""],
        [`Period: ${tourPnl.fromDate} to ${tourPnl.toDate}`],
        [],
        ["Metric", "Amount"],
        ["Sale", Number(tourPnl.sale || 0)],
        ["Sale Return", Number(tourPnl.sale_return || 0)],
        ["Net Sale", Number(tourPnl.net_sale || 0)],
        ["COGS", Number(tourPnl.cogs || 0)],
        ["Gross Profit", Number(tourPnl.gross_profit || 0)],
        ["Tour Expenses", Number(tourPnl.tour_expenses || 0)],
        ["Tour Net", Number(tourPnl.tour_net || 0)],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Tour PnL");
    } else {
      const header = [
        "Salesman",
        "Month",
        "Sale",
        "Sale Return",
        "Net Sale",
        "COGS",
        "Gross Profit",
        "Tour Expenses",
        "Net After Tour Exp",
      ];
      const rows = periodRows.map((r) => [
        r.salesman_name,
        r.month,
        Number(r.sale || 0),
        Number(r.sale_return || 0),
        Number(r.net_sale || 0),
        Number(r.cogs || 0),
        Number(r.gross_profit || 0),
        Number(r.tour_expenses || 0),
        Number(r.net_after_tour_expense || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        ["SALESMAN PERIOD"],
        [`Period: ${fromDate} to ${toDate}`],
        [],
        header,
        ...rows,
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Period");
    }
    XLSX.writeFile(wb, `Salesman_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.text("Salesman / Tour Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate} | Tab: ${activeTab}`, 14, 20);

    if (activeTab === "performance") {
      autoTable(doc, {
        startY: 26,
        head: [["Salesman", "Sale", "Return", "Net", "COGS", "GP", "Tour Exp", "Net"]],
        body: (perfData.rows || []).map((r) => [
          r.salesman_name,
          Number(r.sale || 0).toFixed(2),
          Number(r.sale_return || 0).toFixed(2),
          Number(r.net_sale || 0).toFixed(2),
          Number(r.cogs || 0).toFixed(2),
          Number(r.gross_profit || 0).toFixed(2),
          Number(r.tour_expenses || 0).toFixed(2),
          Number(r.net_after_tour_expense || 0).toFixed(2),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    } else if (activeTab === "tour" && tourPnl) {
      autoTable(doc, {
        startY: 26,
        head: [["Metric", "Amount"]],
        body: [
          ["Sale", Number(tourPnl.sale || 0).toFixed(2)],
          ["Sale Return", Number(tourPnl.sale_return || 0).toFixed(2)],
          ["Net Sale", Number(tourPnl.net_sale || 0).toFixed(2)],
          ["COGS", Number(tourPnl.cogs || 0).toFixed(2)],
          ["Gross Profit", Number(tourPnl.gross_profit || 0).toFixed(2)],
          ["Tour Expenses", Number(tourPnl.tour_expenses || 0).toFixed(2)],
          ["Tour Net", Number(tourPnl.tour_net || 0).toFixed(2)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    } else {
      autoTable(doc, {
        startY: 26,
        head: [["Salesman", "Month", "Sale", "Return", "Net", "COGS", "GP", "Tour Exp", "Net"]],
        body: periodRows.map((r) => [
          r.salesman_name,
          r.month,
          Number(r.sale || 0).toFixed(2),
          Number(r.sale_return || 0).toFixed(2),
          Number(r.net_sale || 0).toFixed(2),
          Number(r.cogs || 0).toFixed(2),
          Number(r.gross_profit || 0).toFixed(2),
          Number(r.tour_expenses || 0).toFixed(2),
          Number(r.net_after_tour_expense || 0).toFixed(2),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    }
    doc.save(`Salesman_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `Salesman_Report_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const tabBtn = (id, label, icon) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "14px",
        border: "none",
        cursor: "pointer",
        backgroundColor: activeTab === id ? "#0f172a" : "#f1f5f9",
        color: activeTab === id ? "#ffffff" : "#475569",
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button
                  type="button"
                  className="back-btn erp-back-btn"
                  onClick={() => navigate("/reports")}
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaRoute className="report-title-icon" /> Salesman / Tour Reports
                  </h3>
                  <p className="report-description">
                    Performance, tour profit &amp; loss, and monthly period rollups.
                  </p>
                </div>
              </div>
              <div className="export-btn-group">
                <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF">
                  <FaFilePdf />
                </button>
                <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel">
                  <FaFileExcel />
                </button>
                <button type="button" className="icon-button bg-png" onClick={exportToImage} title="PNG">
                  <FaImage />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: "10px",
                flexWrap: "wrap",
              }}
            >
              {tabBtn("performance", "Performance", <FaChartLine />)}
              {tabBtn("tour", "Tour P&L", <FaRoute />)}
              {tabBtn("period", "Period", <FaCalendarAlt />)}
            </div>

            <div className="filter-group" style={{ marginTop: "15px" }}>
              <input
                type="date"
                className="date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <Select
                  options={salesmen}
                  value={selectedSalesman}
                  onChange={setSelectedSalesman}
                  placeholder="All salesmen..."
                  isClearable
                  styles={selectCustomStyles}
                />
              </div>
              {activeTab === "tour" && (
                <div style={{ flex: 1, minWidth: 240 }}>
                  <Select
                    options={tourOptions}
                    value={selectedTour}
                    onChange={setSelectedTour}
                    placeholder="Select tour..."
                    isClearable
                    styles={selectCustomStyles}
                  />
                </div>
              )}
              <button type="button" className="get-report-btn" onClick={handleFetch} disabled={loading}>
                <FaSync className={loading ? "spin" : ""} /> {loading ? "Loading..." : "Get Report"}
              </button>
            </div>
          </div>

          <div ref={reportRef} className="report-body">
            {activeTab === "performance" && (
              <>
                {perfData.totals && (
                  <div className="sm-summary-grid">
                    <SummaryCard label="Net Sale" value={perfData.totals.net_sale} />
                    <SummaryCard label="Gross Profit" value={perfData.totals.gross_profit} />
                    <SummaryCard label="Tour Expenses" value={perfData.totals.tour_expenses} />
                    <SummaryCard label="Net After Tour Exp" value={perfData.totals.net_after_tour_expense} />
                  </div>
                )}
                <div className="sm-table-wrap">
                  <table className="sm-report-table">
                    <thead>
                      <tr>
                        <th>Salesman</th>
                        <th className="sm-amt">Sale</th>
                        <th className="sm-amt">Sale Return</th>
                        <th className="sm-amt">Net Sale</th>
                        <th className="sm-amt">COGS</th>
                        <th className="sm-amt">Gross Profit</th>
                        <th className="sm-amt">Tour Expenses</th>
                        <th className="sm-amt">Net After Tour Exp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(perfData.rows || []).length ? (
                        perfData.rows.map((r) => (
                          <tr key={r.salesman_id || r.salesman_name}>
                            <td className="sm-name">{r.salesman_name}</td>
                            <AmountCell value={r.sale} />
                            <AmountCell value={r.sale_return} />
                            <AmountCell value={r.net_sale} />
                            <AmountCell value={r.cogs} />
                            <AmountCell value={r.gross_profit} />
                            <AmountCell value={r.tour_expenses} />
                            <AmountCell value={r.net_after_tour_expense} strong />
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="sm-empty">
                            {loading ? "Loading..." : "No data for selected period."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "tour" && (
              <>
                {!tourPnl ? (
                  <p style={{ color: "#64748b", padding: 16 }}>
                    Select a tour and click Get Report.
                  </p>
                ) : (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <strong>{tourPnl.tour?.title}</strong>
                      {tourPnl.tour?.tour_code ? ` (${tourPnl.tour.tour_code})` : ""}
                      {" — "}
                      {tourPnl.tour?.salesman_name}
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {tourPnl.fromDate} to {tourPnl.toDate} · Status: {tourPnl.tour?.status}
                      </div>
                    </div>
                    <div className="sm-summary-grid">
                      <SummaryCard label="Net Sale" value={tourPnl.net_sale} />
                      <SummaryCard label="Gross Profit" value={tourPnl.gross_profit} />
                      <SummaryCard label="Tour Expenses" value={tourPnl.tour_expenses} />
                      <SummaryCard label="Tour Net" value={tourPnl.tour_net} />
                    </div>
                    {(tourPnl.expense_breakdown || []).length > 0 && (
                      <div className="sm-table-wrap" style={{ marginBottom: 16 }}>
                        <h4 className="sm-section-title">Expense by account</h4>
                        <table className="sm-report-table">
                          <thead>
                            <tr>
                              <th>Account</th>
                              <th>Code</th>
                              <th className="sm-amt">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tourPnl.expense_breakdown.map((e) => (
                              <tr key={e.account_id || e.account_name}>
                                <td>{e.account_name}</td>
                                <td>{e.account_code || "—"}</td>
                                <AmountCell value={e.amount} />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="sm-table-wrap">
                      <h4 className="sm-section-title">Invoices</h4>
                      <table className="sm-report-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Invoice</th>
                            <th>Source</th>
                            <th>Type</th>
                            <th className="sm-amt">Grand Total</th>
                            <th className="sm-amt">COGS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tourPnl.invoices || []).length ? (
                            tourPnl.invoices.map((inv, idx) => (
                              <tr key={`${inv.invoice_id}-${idx}`}>
                                <td>{inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : "—"}</td>
                                <td>{inv.invoice_no}</td>
                                <td>{inv.source}</td>
                                <td>{inv.type}</td>
                                <AmountCell value={inv.grand_total} />
                                <AmountCell value={inv.cogs} />
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="sm-empty">
                                No invoices.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "period" && (
              <div className="sm-table-wrap">
                <table className="sm-report-table">
                  <thead>
                    <tr>
                      <th>Salesman</th>
                      <th>Month</th>
                      <th className="sm-amt">Sale</th>
                      <th className="sm-amt">Sale Return</th>
                      <th className="sm-amt">Net Sale</th>
                      <th className="sm-amt">COGS</th>
                      <th className="sm-amt">Gross Profit</th>
                      <th className="sm-amt">Tour Expenses</th>
                      <th className="sm-amt">Net After Tour Exp</th>
                      <th>Tours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.length ? (
                      periodRows.map((r, idx) => (
                        <tr key={`${r.salesman_id}-${r.month}-${idx}`}>
                          <td className="sm-name">{r.salesman_name}</td>
                          <td>{r.month}</td>
                          <AmountCell value={r.sale} />
                          <AmountCell value={r.sale_return} />
                          <AmountCell value={r.net_sale} />
                          <AmountCell value={r.cogs} />
                          <AmountCell value={r.gross_profit} />
                          <AmountCell value={r.tour_expenses} />
                          <AmountCell value={r.net_after_tour_expense} strong />
                          <td>
                            {(r.tours || [])
                              .map((t) => t.tour_code || t.title)
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="sm-empty">
                          {loading ? "Loading..." : "No data for selected period."}
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

export default SalesmanTourReport;
