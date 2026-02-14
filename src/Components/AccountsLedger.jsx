import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaBook } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";
import "../Profitloss.css"; 

const AccountLedger = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- 1. Fetch Accounts ---
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get("/accounts");
        setAccounts(res.data);
      } catch (err) {
        toast.error("Failed to load accounts");
      }
    };
    fetchAccounts();
  }, []);

  // --- 2. Fetch Ledger Report ---
  const fetchLedger = async () => {
    if (!selectedAccount || !fromDate || !toDate) {
      toast.error("Please select account and date range");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/ledger", {
        params: { accountId: selectedAccount, fromDate, toDate }
      });
      setReport(res.data);
      toast.success("Ledger loaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching ledger");
    } finally {
      setLoading(false);
    }
  };

  const calculateRunningBalance = (index, items, openingBalance, category) => {
    const naturalDebit = ['Assets', 'Expense'].includes(category);
    let balance = Number(openingBalance);
    for (let i = 0; i <= index; i++) {
      const debit = Number(items[i].debit) || 0;
      const credit = Number(items[i].credit) || 0;
      balance += naturalDebit ? (debit - credit) : (credit - debit);
    }
    return balance;
  };

  // --- 📗 PROFESSIONAL EXCEL EXPORT ---
  const exportToExcel = () => {
    if (!report) return;

    const headerStyle = {
      fill: { fgColor: { rgb: "2C3E50" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    const subHeaderStyle = {
      fill: { fgColor: { rgb: "F8F9FA" } },
      font: { bold: true },
      border: { bottom: { style: "thin" } }
    };

    const numStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };

    const rows = [
      [{ v: `Account Ledger: ${report.accountName}`, s: { font: { bold: true, sz: 14 } } }, "", "", "", ""],
      [{ v: `Period: ${fromDate} to ${toDate}`, s: { font: { italic: true } } }, "", "", "", ""],
      [],
      [{ v: "Opening Balance", s: subHeaderStyle }, "", "", "", { v: Number(report.openingBalance), s: { ...numStyle, font: { bold: true } } }],
      [{ v: "DATE", s: headerStyle }, { v: "DESCRIPTION", s: headerStyle }, { v: "DEBIT", s: headerStyle }, { v: "CREDIT", s: headerStyle }, { v: "BALANCE", s: headerStyle }],
    ];

    report.ledger.forEach((t, index) => {
      const rb = calculateRunningBalance(index, report.ledger, report.openingBalance, report.categoryName);
      rows.push([
        { v: t.date.split('T')[0] },
        { v: t.description || t.narration },
        { v: Number(t.debit), s: numStyle },
        { v: Number(t.credit), s: numStyle },
        { v: Number(rb), s: { ...numStyle, font: { bold: true } } }
      ]);
    });

    rows.push(
      [],
      [{ v: "Closing Balance", s: { ...subHeaderStyle, fill: { fgColor: { rgb: "E8F5E9" } } } }, "", "", "", { v: Number(report.closingBalance), s: { ...numStyle, font: { bold: true }, fill: { fgColor: { rgb: "E8F5E9" } } } }]
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `${report.accountName}_Ledger.xlsx`);
  };

  // --- 🖼️ PNG EXPORT ---
  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `${report.accountName}_Ledger.png`;
    link.click();
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${report.accountName}_Ledger.pdf`);
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <button className="back-btn" onClick={() => navigate("/reports")} style={{marginTop: "50px"}}><FaArrowLeft /></button>
        <div className="report-card" style={{marginTop: "15px"}}>
          <div className="report-header">
            <h3 className="report-title"><FaBook className="mr-2"/> Account Ledger Report</h3>
            <div className="filter-group">
              <select className="date-input" style={{minWidth: '220px'}} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                <option value="">Select Account</option>
                {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.category_name})</option>)}
              </select>
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button className="get-report-btn" onClick={fetchLedger}>{loading ? "..." : "Get Report"}</button>
              
              {report && (
                <div className="export-btn-group">
                  <button className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="pl-table-container bg-white p-3">
              <h3 className="text-xl font-bold mb-1" style={{color: '#2c3e50'}}>{report.accountName}</h3>
              <p className="text-muted mb-2" style={{fontSize: '14px'}}>{report.categoryName} Account</p>
              
              <div className="d-flex justify-content-between mb-3">
                <span><strong>Opening Balance:</strong> <span className="text-blue-700">{Number(report.openingBalance).toLocaleString()}</span></span>
                <span><strong>Period:</strong> {fromDate} to {toDate}</span>
              </div>

              <table className="pl-table">
                <thead>
                  <tr className="row-section-head">
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Description</th>
                    <th className="border p-2 text-right">Debit</th>
                    <th className="border p-2 text-right">Credit</th>
                    <th className="border p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ledger.map((t, index) => {
                    const rb = calculateRunningBalance(index, report.ledger, report.openingBalance, report.categoryName);
                    return (
                      <tr key={index}>
                        <td className="border p-2">{t.date.split('T')[0]}</td>
                        <td className="border p-2">{t.description || t.narration}</td>
                        <td className="border p-2 text-right">{t.debit > 0 ? Number(t.debit).toLocaleString() : '-'}</td>
                        <td className="border p-2 text-right">{t.credit > 0 ? Number(t.credit).toLocaleString() : '-'}</td>
                        <td className="border p-2 text-right font-bold">{Number(rb).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 p-3" style={{ background: '#f0fdf4', borderRadius: '6px', textAlign: 'right' }}>
                <span className="text-xl"><strong>Closing Balance: </strong> 
                  <span style={{ color: '#15803d', fontWeight: '800' }}>PKR {Number(report.closingBalance).toLocaleString()}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountLedger;