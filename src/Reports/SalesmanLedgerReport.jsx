import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaUserTie } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Select from "react-select";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import "./EntitiesLedgerReport/EntityLedgerReport.css";
import { localToday, localYearStart } from "../utils/localDate";

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const invoicePath = (row) => {
  const inv = encodeURIComponent(row.invoice_no || "");
  if (!inv) return null;
  if (String(row.source || "").toUpperCase() === "FP") {
    return `/fp-invoice-detail/${inv}`;
  }
  return `/rm-invoice/${inv}`;
};

const SalesmanLedgerReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromDate || !toDate) {
      setFromDate(localYearStart());
      setToDate(localToday());
    }
  }, []);

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

  useEffect(() => {
    if (selectedSalesman && fromDate && toDate) {
      const t = setTimeout(() => fetchLedger(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedSalesman, fromDate, toDate]);

  const fetchLedger = async () => {
    if (!selectedSalesman || !fromDate || !toDate) {
      toast.error("Please select salesman and dates");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/salesman-ledger", {
        params: {
          salesman_id: selectedSalesman.value,
          fromDate,
          toDate,
        },
      });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load salesman ledger");
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
    const name = report.salesman?.name || "Salesman";
    const rows = [
      [{ v: `Salesman Ledger: ${name}`, s: { font: { bold: true, sz: 14 } } }],
      [{ v: `Period: ${fromDate} to ${toDate}` }],
      [],
      [
        { v: "DATE", s: headerStyle },
        { v: "INVOICE #", s: headerStyle },
        { v: "CUSTOMER", s: headerStyle },
        { v: "PARTICULARS", s: headerStyle },
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
        { v: Number(report.openingBalance || 0), s: { ...numStyle, font: { bold: true } } },
      ],
    ];

    (report.transactions || []).forEach((t) => {
      rows.push([
        { v: t.transaction_date || "" },
        { v: t.invoice_no || "" },
        { v: t.customer_name || "" },
        { v: t.description || "" },
        { v: Number(t.debit || 0), s: numStyle },
        { v: Number(t.credit || 0), s: numStyle },
        { v: Number(t.balance || 0), s: { ...numStyle, font: { bold: true } } },
      ]);
    });

    rows.push([
      { v: "Closing Balance", s: { font: { bold: true } } },
      "",
      "",
      "",
      { v: Number(report.totals?.debit || 0), s: numStyle },
      { v: Number(report.totals?.credit || 0), s: numStyle },
      { v: Number(report.closingBalance || 0), s: { ...numStyle, font: { bold: true } } },
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesmanLedger");
    XLSX.writeFile(wb, `${name}_Salesman_Ledger.xlsx`);
  };

  const exportToPDF = () => {
    if (!report) return toast.warning("No report to export.");
    const doc = new jsPDF("l", "mm", "a4");
    const name = report.salesman?.name || "Salesman";
    const marginX = 12;
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Salesman Ledger", marginX, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(name, marginX, 17);
    doc.text(`Period: ${fromDate}  to  ${toDate}`, pageW - marginX, 17, { align: "right" });

    const body = [
      [
        { content: "Opening Balance", colSpan: 6, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        {
          content: formatMoney(report.openingBalance),
          styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] },
        },
      ],
      ...(report.transactions || []).map((t) => [
        t.transaction_date || "",
        t.invoice_no || "-",
        t.customer_name || "-",
        t.description || "-",
        t.debit > 0 ? formatMoney(t.debit) : "-",
        t.credit > 0 ? formatMoney(t.credit) : "-",
        formatMoney(t.balance),
      ]),
      [
        { content: "Closing Balance", colSpan: 4, styles: { fontStyle: "bold", fillColor: [220, 252, 231] } },
        {
          content: formatMoney(report.totals?.debit),
          styles: { fontStyle: "bold", halign: "right", fillColor: [220, 252, 231] },
        },
        {
          content: formatMoney(report.totals?.credit),
          styles: { fontStyle: "bold", halign: "right", fillColor: [220, 252, 231] },
        },
        {
          content: formatMoney(report.closingBalance),
          styles: { fontStyle: "bold", halign: "right", fillColor: [220, 252, 231] },
        },
      ],
    ];

    autoTable(doc, {
      startY: 28,
      margin: { left: marginX, right: marginX, bottom: 14 },
      head: [["Date", "Invoice #", "Customer", "Particulars", "Debit", "Credit", "Balance"]],
      body,
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 30 },
        2: { cellWidth: 42 },
        3: { cellWidth: 70 },
        4: { cellWidth: 30, halign: "right" },
        5: { cellWidth: 30, halign: "right" },
        6: { cellWidth: 32, halign: "right" },
      },
      theme: "grid",
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, doc.internal.pageSize.getHeight() - 8, {
        align: "right",
      });
    }

    doc.save(`${name}_Salesman_Ledger.pdf`);
    toast.success(pageCount > 1 ? `PDF saved (${pageCount} pages).` : "PDF saved.");
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
      link.download = `${report.salesman?.name || "Salesman"}_Salesman_Ledger.png`;
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
                    <FaUserTie /> Salesman Ledger
                  </h2>
                  <p className="elr-subtitle">
                    Salesman invoice ledger with customer and linked invoice — no item lines.
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
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <button type="button" className="elr-get-btn" onClick={fetchLedger}>
                {loading ? "..." : "Get Report"}
              </button>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="elr-result">
              <h3 className="elr-result-title">
                Salesman Ledger: {report.salesman?.name || selectedSalesman?.label}
              </h3>

              <div className="elr-meta">
                <span>
                  <strong>Opening:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(report.openingBalance)}</span>
                </span>
                <span>
                  <strong>Period:</strong> {fromDate} to {toDate}
                </span>
                <span>
                  <strong>Debit:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(report.totals?.debit)}</span>
                </span>
                <span>
                  <strong>Credit:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(report.totals?.credit)}</span>
                </span>
              </div>

              <div className="elr-table-scroll">
                <table className="elr-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Particulars</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="elr-opening-row">
                      <td colSpan={6}>
                        <strong>Opening Balance</strong>
                      </td>
                      <td className="text-right font-bold">{formatMoney(report.openingBalance)}</td>
                    </tr>

                    {(report.transactions || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center" style={{ padding: 20, color: "#64748b" }}>
                          No invoices for this salesman in the selected period.
                        </td>
                      </tr>
                    ) : (
                      (report.transactions || []).map((t) => {
                        const path = invoicePath(t);
                        return (
                          <tr key={t.id} className="elr-txn-row">
                            <td>{t.transaction_date || "—"}</td>
                            <td>
                              {path ? (
                                <Link
                                  to={path}
                                  style={{ color: "#0284c7", fontWeight: 600, textDecoration: "none" }}
                                >
                                  {t.invoice_no}
                                </Link>
                              ) : (
                                t.invoice_no || "—"
                              )}
                            </td>
                            <td>{t.customer_name || "—"}</td>
                            <td>
                              {t.description || "—"}
                              {t.source ? <span className="elr-doc-tag"> {t.source}</span> : null}
                            </td>
                            <td className="text-right">{t.debit > 0 ? formatMoney(t.debit) : "—"}</td>
                            <td className="text-right">{t.credit > 0 ? formatMoney(t.credit) : "—"}</td>
                            <td className="text-right font-bold">{formatMoney(t.balance)}</td>
                          </tr>
                        );
                      })
                    )}
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

export default SalesmanLedgerReport;
