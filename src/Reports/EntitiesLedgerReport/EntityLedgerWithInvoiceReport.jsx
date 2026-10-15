import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFileInvoice, FaFilePdf, FaImage } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Select from "react-select";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import api from "../../../api";
import "./EntityLedgerReport.css";
import { localToday, localYearStart } from "../../utils/localDate";

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });

const EntityLedgerWithInvoiceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [entityType, setEntityType] = useState("supplier");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taxFilter, setTaxFilter] = useState("all");

  useEffect(() => {
    if (!fromDate || !toDate) {
      setFromDate(localYearStart());
      setToDate(localToday());
    }
  }, []);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await api.get("/entities/ledger-entities", {
          params: { type: entityType },
        });
        setEntities(
          (res.data || []).map((entity) => ({
            value: entity.id,
            label: entity.entity_relation_id
              ? `${entity.name} (Dual Account - Linked)`
              : `${entity.name} (${entity.type || entityType})`,
          }))
        );
        setSelectedEntity("");
        setReport(null);
      } catch {
        toast.error("Failed to load entities");
        setEntities([]);
      }
    };
    fetchEntities();
  }, [entityType]);

  useEffect(() => {
    if (selectedEntity && fromDate && toDate && entities.length > 0) {
      const t = setTimeout(() => fetchLedger(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedEntity, fromDate, toDate, taxFilter, entities.length]);

  const fetchLedger = async () => {
    if (!selectedEntity || !fromDate || !toDate) {
      toast.error("Please select entity and dates");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/entity-ledger-with-invoice", {
        params: {
          entity_id: selectedEntity,
          fromDate,
          toDate,
          tax_filter: taxFilter,
        },
      });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load ledger with invoice");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!report) return;
    const headerStyle = {
      fill: { fgColor: { rgb: "1E293B" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
    };
    const numStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
    const rows = [
      [{ v: `Entity Ledger With Invoice: ${report.entity.name}`, s: { font: { bold: true, sz: 14 } } }],
      [{ v: `Period: ${fromDate} to ${toDate}` }],
      [],
      [
        { v: "DATE", s: headerStyle },
        { v: "INVOICE #", s: headerStyle },
        { v: "PARTICULARS", s: headerStyle },
        { v: "ITEM", s: headerStyle },
        { v: "QTY", s: headerStyle },
        { v: "RATE", s: headerStyle },
        { v: "AMOUNT", s: headerStyle },
        { v: "DEBIT", s: headerStyle },
        { v: "CREDIT", s: headerStyle },
        { v: "BALANCE", s: headerStyle },
      ],
      [
        { v: "Opening Balance" },
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        { v: Number(report.openingBalance), s: { ...numStyle, font: { bold: true } } },
      ],
    ];

    (report.transactions || []).forEach((t) => {
      rows.push([
        { v: t.transaction_date },
        { v: t.invoice_no || "" },
        { v: t.description || "" },
        "",
        "",
        "",
        "",
        { v: Number(t.debit || 0), s: numStyle },
        { v: Number(t.credit || 0), s: numStyle },
        { v: Number(t.balance || 0), s: { ...numStyle, font: { bold: true } } },
      ]);
      (t.invoice?.lines || []).forEach((line) => {
        rows.push([
          "",
          "",
          "",
          { v: line.item_name || "" },
          { v: Number(line.qty || 0) },
          { v: Number(line.unit_price || 0), s: numStyle },
          { v: Number(line.amount || 0), s: numStyle },
          "",
          "",
          "",
        ]);
      });
    });

    rows.push([
      { v: "Closing Balance", s: { font: { bold: true } } },
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      { v: Number(report.closingBalance), s: { ...numStyle, font: { bold: true } } },
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 36 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LedgerWithInvoice");
    XLSX.writeFile(wb, `${report.entity.name}_Ledger_With_Invoice.xlsx`);
  };

  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${report.entity.name}_Ledger_With_Invoice.png`;
    link.click();
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("l", "mm", "a4");
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${report.entity.name}_Ledger_With_Invoice.pdf`);
    });
  };

  const selectStyles = {
    control: (p) => ({
      ...p,
      minWidth: "220px",
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
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/entities-menu")}>
                  <FaArrowLeft />
                </button>
                <div>
                  <h2 className="elr-title">
                    <FaFileInvoice /> Entity Ledger With Invoice
                  </h2>
                  <p className="elr-subtitle">
                    Party ledger with invoice line items (item, qty, rate, amount) under each document.
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
              <select
                className="date-input"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                style={{ minWidth: 120 }}
              >
                <option value="supplier">Suppliers</option>
                <option value="customer">Customers</option>
                <option value="employee">Employees</option>
              </select>

              <Select
                options={entities}
                value={entities.find((o) => o.value === selectedEntity) || null}
                onChange={(opt) => setSelectedEntity(opt ? opt.value : "")}
                placeholder="Search entity..."
                isClearable
                isSearchable
                styles={selectStyles}
              />

              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="elr-get-btn" onClick={fetchLedger}>
                {loading ? "..." : "Get Report"}
              </button>

              <div className="elr-tax-group">
                {["all", "taxable", "non-taxable"].map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setTaxFilter(filter)}
                    className={`elr-tax-btn${taxFilter === filter ? " active" : ""}`}
                  >
                    {filter === "all" ? "All" : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="elr-result">
              <h3 className="elr-result-title">Ledger + Invoice Detail: {report.entity.name}</h3>

              <div className="elr-meta">
                <span>
                  <strong>Opening:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(report.openingBalance)}</span>
                </span>
                <span>
                  <strong>Period:</strong> {fromDate} to {toDate}
                </span>
              </div>

              <div className="elr-table-scroll">
                <table className="elr-table elr-invoice-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Particulars</th>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="elr-opening-row">
                      <td colSpan={9}>
                        <strong>Opening Balance</strong>
                      </td>
                      <td className="text-right font-bold">{formatMoney(report.openingBalance)}</td>
                    </tr>

                    {(report.transactions || []).map((t) => {
                      const lines = t.invoice?.lines || [];
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="elr-txn-row">
                            <td>{t.transaction_date}</td>
                            <td>{t.invoice_no || "—"}</td>
                            <td>
                              {t.description || "—"}
                              {t.invoice?.doc_type ? (
                                <span className="elr-doc-tag"> {t.invoice.doc_type}</span>
                              ) : null}
                            </td>
                            <td colSpan={3} className="elr-muted">
                              {lines.length ? `${lines.length} line(s)` : "—"}
                            </td>
                            <td className="text-right">
                              {t.invoice?.grand_total != null && lines.length
                                ? formatMoney(t.invoice.grand_total)
                                : "—"}
                            </td>
                            <td className="text-right">{t.debit > 0 ? formatMoney(t.debit) : "—"}</td>
                            <td className="text-right">{t.credit > 0 ? formatMoney(t.credit) : "—"}</td>
                            <td className="text-right font-bold">{formatMoney(t.balance)}</td>
                          </tr>
                          {lines.map((line) => (
                            <tr key={line.line_id} className="elr-line-row">
                              <td colSpan={3} />
                              <td>{line.item_name}</td>
                              <td className="text-right">{formatQty(line.qty)}</td>
                              <td className="text-right">{formatMoney(line.unit_price)}</td>
                              <td className="text-right">{formatMoney(line.amount)}</td>
                              <td colSpan={3} />
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="elr-closing">
                <strong>Net Closing Balance: </strong>
                <span className="elr-closing-value">PKR {formatMoney(report.closingBalance)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EntityLedgerWithInvoiceReport;
