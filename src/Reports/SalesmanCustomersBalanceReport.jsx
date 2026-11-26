import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaUsers } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Select from "react-select";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import "./EntitiesLedgerReport/EntityLedgerReport.css";
import { localToday } from "../utils/localDate";

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sideLabel = (side) => {
  if (side === "receivable") return "Receivable";
  if (side === "payable") return "Payable";
  return "Settled";
};

const SalesmanCustomersBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [asOf, setAsOf] = useState(localToday());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSalesmen = async () => {
      try {
        const res = await api.get("/salesmen", { params: { active_only: true } });
        const list = Array.isArray(res.data) ? res.data : res.data?.salesmen || [];
        setSalesmen(
          list.map((s) => ({
            value: s.id,
            label: s.name || `Salesman #${s.id}`,
          }))
        );
      } catch {
        toast.error("Failed to load salesmen");
        setSalesmen([]);
      }
    };
    loadSalesmen();
  }, []);

  const fetchReport = async () => {
    if (!selectedSalesman || !asOf) {
      toast.error("Please select salesman and as-of date");
      return;
    }
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      toast.error("Provide both invoice From and To dates, or leave both empty");
      return;
    }
    setLoading(true);
    try {
      const params = {
        salesman_id: selectedSalesman.value,
        asOf,
      };
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      }
      const res = await api.get("/reports/salesman-customers-balance", { params });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSalesman && asOf) {
      const t = setTimeout(() => fetchReport(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedSalesman, asOf, fromDate, toDate]);

  const filteredCustomers = useMemo(() => {
    const rows = report?.customers || [];
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(term) ||
        String(r.type || "").toLowerCase().includes(term) ||
        String(r.side || "").toLowerCase().includes(term)
    );
  }, [report, searchTerm]);

  const filteredTotals = useMemo(() => {
    const receivable_amount = filteredCustomers
      .filter((c) => c.side === "receivable")
      .reduce((s, c) => s + Number(c.balance || 0), 0);
    const payable_amount = filteredCustomers
      .filter((c) => c.side === "payable")
      .reduce((s, c) => s + Number(c.balance || 0), 0);
    return {
      customer_count: filteredCustomers.length,
      receivable_amount,
      payable_amount,
      net_amount: receivable_amount - payable_amount,
      invoice_count: filteredCustomers.reduce((s, c) => s + Number(c.invoice_count || 0), 0),
    };
  }, [filteredCustomers]);

  const openLedger = (row) => {
    if (!row?.id) {
      toast.error("Customer ID missing");
      return;
    }
    navigate(`/entity-ledger?entity_id=${row.id}&type=${row.type || "customer"}`);
  };

  const exportToExcel = () => {
    if (!report || !filteredCustomers.length) {
      toast.warning("No data to export.");
      return;
    }
    const name = report.salesman?.name || "Salesman";
    const headerStyle = {
      fill: { fgColor: { rgb: "1E293B" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
    };
    const rows = [
      [{ v: `Salesman Customers Balance: ${name}`, s: { font: { bold: true, sz: 14 } } }],
      [{ v: `As of: ${asOf}` }],
      fromDate && toDate ? [{ v: `Invoice period: ${fromDate} to ${toDate}` }] : [],
      [],
      [
        { v: "#", s: headerStyle },
        { v: "Customer", s: headerStyle },
        { v: "Type", s: headerStyle },
        { v: "Invoices", s: headerStyle },
        { v: "Side", s: headerStyle },
        { v: "Balance", s: headerStyle },
      ],
      ...filteredCustomers.map((c, i) => [
        i + 1,
        c.name,
        c.type || "",
        c.invoice_count,
        sideLabel(c.side),
        { v: Number(c.balance || 0), t: "n", z: "#,##0.00" },
      ]),
      [],
      ["", "Total Receivable", "", "", "", filteredTotals.receivable_amount],
      ["", "Total Payable", "", "", "", filteredTotals.payable_amount],
      ["", "Net", "", "", "", filteredTotals.net_amount],
    ].filter((r) => r.length);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers Balance");
    XLSX.writeFile(wb, `${name}_Customers_Balance_${asOf}.xlsx`);
  };

  const exportToPDF = () => {
    if (!report || !filteredCustomers.length) {
      toast.warning("No data to export.");
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");
    const name = report.salesman?.name || "Salesman";
    doc.setFontSize(14);
    doc.text(`Salesman Customers Balance: ${name}`, 14, 14);
    doc.setFontSize(10);
    doc.text(
      `As of: ${asOf}  |  Customers: ${filteredTotals.customer_count}  |  Net: ${formatMoney(filteredTotals.net_amount)}`,
      14,
      20
    );
    autoTable(doc, {
      startY: 26,
      head: [["#", "Customer", "Type", "Invoices", "Side", "Balance (Rs)"]],
      body: [
        ...filteredCustomers.map((c, i) => [
          i + 1,
          c.name || "",
          c.type || "",
          c.invoice_count || 0,
          sideLabel(c.side),
          formatMoney(c.balance),
        ]),
        ["", "Total Receivable", "", "", "", formatMoney(filteredTotals.receivable_amount)],
        ["", "Total Payable", "", "", "", formatMoney(filteredTotals.payable_amount)],
        ["", "Net", "", "", "", formatMoney(filteredTotals.net_amount)],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 5: { halign: "right" } },
    });
    doc.save(`${name}_Customers_Balance_${asOf}.pdf`);
  };

  const exportToPNG = async () => {
    if (!report || !reportRef.current) return toast.warning("No report to export.");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${report.salesman?.name || "Salesman"}_Customers_Balance.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Image downloaded.");
    } catch (err) {
      console.error(err);
      toast.error("Image export failed.");
    }
  };

  const selectStyles = {
    control: (p) => ({
      ...p,
      minWidth: "240px",
      minHeight: "32px",
      height: "32px",
      borderRadius: "6px",
      borderColor: "#e2e8f0",
      fontSize: "12px",
      boxShadow: "none",
    }),
    valueContainer: (p) => ({ ...p, padding: "0 8px", height: "30px" }),
    indicatorsContainer: (p) => ({ ...p, height: "30px" }),
    input: (p) => ({ ...p, margin: 0, padding: 0 }),
    singleValue: (p) => ({ ...p, fontSize: "12px", color: "#334155" }),
    placeholder: (p) => ({ ...p, fontSize: "12px", color: "#94a3b8" }),
    menu: (p) => ({ ...p, zIndex: 9999, fontSize: "12px" }),
    option: (p) => ({ ...p, fontSize: "12px", padding: "6px 10px" }),
  };

  return (
    <>
      <NavigationBar />
      <div className="elr-page">
        <div className="elr-card">
          <div className="elr-header">
            <div className="elr-header-top">
              <div className="elr-header-left">
                <button
                  type="button"
                  className="back-btn erp-back-btn"
                  onClick={() => navigate("/reports")}
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h2 className="elr-title">
                    <FaUsers /> Salesman Customers Balance
                  </h2>
                  <p className="elr-subtitle">
                    Outstanding balances of customers linked via this salesman&apos;s sale invoices.
                  </p>
                </div>
              </div>

              {report && (
                <div className="elr-export-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF">
                    <FaFilePdf />
                  </button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel">
                    <FaFileExcel />
                  </button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="Image">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            <div className="elr-filters">
              <Select
                options={salesmen}
                value={selectedSalesman}
                onChange={setSelectedSalesman}
                placeholder="Select salesman..."
                isClearable
                isSearchable
                styles={selectStyles}
              />
              <input
                type="date"
                className="date-input"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                title="As of date (closing balance)"
              />
              <input
                type="date"
                className="date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                title="Optional: invoice from date"
              />
              <input
                type="date"
                className="date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title="Optional: invoice to date"
              />
              <input
                type="text"
                className="date-input"
                style={{ minWidth: 140 }}
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button" className="elr-get-btn" onClick={fetchReport}>
                {loading ? "..." : "Get Report"}
              </button>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="elr-result">
              <h3 className="elr-result-title">
                Customers of: {report.salesman?.name || selectedSalesman?.label}
              </h3>

              <div className="elr-meta">
                <span>
                  <strong>As of:</strong> {asOf}
                </span>
                {fromDate && toDate ? (
                  <span>
                    <strong>Invoice period:</strong> {fromDate} to {toDate}
                  </span>
                ) : (
                  <span>
                    <strong>Customers:</strong> all ever sold by this salesman
                  </span>
                )}
                <span>
                  <strong>Customers:</strong>{" "}
                  <span className="elr-meta-value">{filteredTotals.customer_count}</span>
                </span>
                <span>
                  <strong>Invoices:</strong>{" "}
                  <span className="elr-meta-value">{filteredTotals.invoice_count}</span>
                </span>
                <span>
                  <strong>Receivable:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(filteredTotals.receivable_amount)}</span>
                </span>
                <span>
                  <strong>Payable:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(filteredTotals.payable_amount)}</span>
                </span>
              </div>

              <div className="elr-table-scroll">
                <table className="elr-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th className="text-right">Invoices</th>
                      <th>Side</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: 20, color: "#64748b" }}>
                          No customers found for this salesman.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c, i) => (
                        <tr
                          key={c.id}
                          className="elr-txn-row"
                          style={{ cursor: "pointer" }}
                          onClick={() => openLedger(c)}
                          title="Open entity ledger"
                        >
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.type || "—"}</td>
                          <td className="text-right">{c.invoice_count}</td>
                          <td>{sideLabel(c.side)}</td>
                          <td className="text-right font-bold">{formatMoney(c.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="elr-closing">
                <strong>Net (Receivable − Payable): </strong>
                <span className="elr-closing-value">PKR {formatMoney(filteredTotals.net_amount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SalesmanCustomersBalanceReport;
