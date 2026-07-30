import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine, FaImage } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api"; 
import "../Profitloss.css";

const ProfitLoss = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfitLoss = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await api.get("/reports/profit-loss", {
        params: { fromDate, toDate }
      });
      setReport(res.data);
      toast.success("Profit & Loss loaded successfully");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Server error";
      toast.error(`Failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const incomeItems = report?.details?.Income ? Object.values(report.details.Income) : [];
  const cogsItems = report?.details?.COGS ? Object.values(report.details.COGS) : [];
  const opexItems = report?.details?.OperatingExpense ? Object.values(report.details.OperatingExpense) : [];

  const totalRevenue = report?.totals?.totalIncome ?? 0;
  const totalCogs = report?.totals?.totalCogs ?? 0;
  const grossProfit = report?.totals?.grossProfit ?? 0;
  const totalOpex = report?.totals?.totalOpex ?? 0;
  const netProfit = report?.totals?.netProfit ?? 0;

  // Format numbers to professional standard (1,234.56 or (1,234.56))
  const formatCurrency = (amount, isNegativeDisplay = false) => {
    const val = Number(amount || 0);
    const formatted = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val < 0 || isNegativeDisplay) {
      return `(${formatted})`;
    }
    return formatted;
  };

  // ------------------------------
  // 📗 PROFESSIONAL EXCEL EXPORT
  // ------------------------------
  const exportToExcel = () => {
    if (!report) return;

    const companyHeaderStyle = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "1A202C" } },
      alignment: { horizontal: "center" }
    };

    const titleStyle = {
      font: { name: "Arial", sz: 12, bold: true, color: { rgb: "2D3748" } },
      alignment: { horizontal: "center" }
    };

    const subtitleStyle = {
      font: { name: "Arial", sz: 10, italic: true, color: { rgb: "718096" } },
      alignment: { horizontal: "center" }
    };

    const sectionStyle = {
      fill: { fgColor: { rgb: "EDF2F7" } },
      font: { bold: true, color: { rgb: "1A202C" }, sz: 11 },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E0" } } }
    };

    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
    const subAccountStyle = { alignment: { horizontal: "left" }, font: { name: "Arial", sz: 10 } };

    const totalStyle = { 
      font: { bold: true, sz: 11 }, 
      fill: { fgColor: { rgb: "F7FAFC" } }, 
      border: { top: { style: "thin" }, bottom: { style: "thin" } } 
    };

    const grossProfitStyle = {
      font: { bold: true, color: { rgb: "047857" }, sz: 11 },
      fill: { fgColor: { rgb: "E6F4EA" } },
      border: { top: { style: "medium" }, bottom: { style: "medium" } }
    };

    // Conditional Styling for Excel Net Profit / Net Loss
    const isNetProfitPositive = netProfit >= 0;
    const netProfitStyle = {
      font: { bold: true, color: { rgb: isNetProfitPositive ? "047857" : "B91C1C" }, sz: 12 },
      fill: { fgColor: { rgb: isNetProfitPositive ? "E6F4EA" : "FEE2E2" } },
      border: { top: { style: "double" }, bottom: { style: "double" } }
    };

    const rows = [
      [{ v: "PROFIT & LOSS STATEMENT", s: companyHeaderStyle }, "", ""],
      [{ v: `Period: ${fromDate} to ${toDate}`, s: titleStyle }, "", ""],
      [{ v: `Generated on: ${new Date().toLocaleDateString()}`, s: subtitleStyle }, "", ""],
      [],
      [{ v: "ACCOUNT DESCRIPTION", s: sectionStyle }, "", { v: "AMOUNT", s: { ...sectionStyle, alignment: { horizontal: "right" } } }],
      
      // REVENUE
      [{ v: "REVENUE", s: sectionStyle }, "", ""],
    ];

    incomeItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL REVENUE", s: totalStyle }, "", { v: totalRevenue, s: { ...amountStyle, ...totalStyle } }]);
    
    // COGS
    rows.push([], [{ v: "COST OF GOODS SOLD (COGS)", s: sectionStyle }, "", ""]);
    cogsItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: -Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL COST OF GOODS SOLD", s: totalStyle }, "", { v: -totalCogs, s: { ...amountStyle, ...totalStyle } }]);
    
    // GROSS PROFIT
    rows.push([], [{ v: "GROSS PROFIT", s: grossProfitStyle }, "", { v: grossProfit, s: { ...amountStyle, ...grossProfitStyle } }]);

    // OPERATING EXPENSES
    rows.push([], [{ v: "OPERATING EXPENSES", s: sectionStyle }, "", ""]);
    opexItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: -Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL OPERATING EXPENSES", s: totalStyle }, "", { v: -totalOpex, s: { ...amountStyle, ...totalStyle } }]);

    // NET PROFIT / LOSS
    rows.push([], [{ v: isNetProfitPositive ? "NET PROFIT" : "NET LOSS", s: netProfitStyle }, "", { v: netProfit, s: { ...amountStyle, ...netProfitStyle } }]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 45 }, { wch: 5 }, { wch: 22 }];
    
    // Merge Header Rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit_Loss");
    XLSX.writeFile(wb, `Profit_Loss_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Professional Excel Downloaded");
  };

  // ------------------------------
  // 🖼️ PNG EXPORT
  // ------------------------------
  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `Profit_Loss_Report_${fromDate}_to_${toDate}.png`;
    link.click();
    toast.success("Image Downloaded");
  };

  // ------------------------------
  // 📄 PDF EXPORT
  // ------------------------------
  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 10, 10, pdfWidth - 20, pdfHeight - 10);
      pdf.save(`Profit_Loss_Report_${fromDate}_to_${toDate}.pdf`);
      toast.success("PDF Downloaded");
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <button className="back-btn" style={{ marginTop: "40px" }} onClick={() => navigate("/reports")}>
          <FaArrowLeft />
        </button>

        <div className="report-card" style={{ marginTop: "20px" }}>
          <div className="report-header">
            <h3 className="report-title">
              <FaChartLine style={{ color: '#4caf50' }} /> Profit & Loss Statement
            </h3>

            <div className="filter-group">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              
              <button className="get-report-btn" onClick={fetchProfitLoss} disabled={loading}>
                {loading ? "Loading..." : "Get Report"}
              </button>

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
            <div ref={reportRef} className="pl-printable-container" style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '8px' }}>
              
              {/* PROFESSIONAL REPORT HEADER */}
              <div className="pl-header-section" style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', pb: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a202c', letterSpacing: '0.5px' }}>
                  PROFIT & LOSS STATEMENT
                </h2>
                <p style={{ margin: '5px 0 0', color: '#4a5568', fontSize: '14px', fontWeight: '500' }}>
                  For the Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                </p>
                <p style={{ margin: '2px 0 0', color: '#a0aec0', fontSize: '12px' }}>
                  Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>

              {/* ERP STATEMENT TABLE */}
              <table className="pl-table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e0', backgroundColor: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '12px', textTransform: 'uppercase', color: '#4a5568' }}>Account Description</th>
                    <th style={{ textAlign: 'right', padding: '12px 10px', fontSize: '12px', textTransform: 'uppercase', color: '#4a5568' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* REVENUE SECTION */}
                  <tr className="row-section-head" style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ padding: '10px', fontSize: '13px', color: '#1e293b' }}>REVENUE</td>
                  </tr>
                  {incomeItems.map(acc => (
                    <tr key={acc.id || acc.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: '35px', paddingY: '8px', color: '#334155', fontSize: '13px' }}>{acc.name}</td>
                      <td className="text-right" style={{ padding: '8px 10px', fontSize: '13px' }}>{formatCurrency(acc.total)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-income" style={{ borderTop: '1px solid #cbd5e0', borderBottom: '1px solid #cbd5e0', fontWeight: '600' }}>
                    <td style={{ padding: '10px 10px', fontSize: '13px' }}>TOTAL REVENUE</td>
                    <td className="text-right" style={{ padding: '10px 10px', fontSize: '13px' }}>{formatCurrency(totalRevenue)}</td>
                  </tr>

                  {/* COGS SECTION */}
                  <tr className="row-section-head" style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ padding: '10px', paddingTop: '15px', fontSize: '13px', color: '#1e293b' }}>COST OF GOODS SOLD (COGS)</td>
                  </tr>
                  {cogsItems.map(acc => (
                    <tr key={acc.id || acc.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: '35px', paddingY: '8px', color: '#334155', fontSize: '13px' }}>{acc.name}</td>
                      <td className="text-right" style={{ padding: '8px 10px', fontSize: '13px' }}>{formatCurrency(acc.total, true)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-expense" style={{ borderTop: '1px solid #cbd5e0', borderBottom: '1px solid #cbd5e0', fontWeight: '600' }}>
                    <td style={{ padding: '10px 10px', fontSize: '13px' }}>TOTAL COST OF GOODS SOLD</td>
                    <td className="text-right" style={{ padding: '10px 10px', fontSize: '13px' }}>{formatCurrency(totalCogs, true)}</td>
                  </tr>

                  {/* GROSS PROFIT */}
                  <tr className="row-gross-profit" style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #a7f3d0', borderBottom: '2px solid #a7f3d0' }}>
                    <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: 'bold'}}>GROSS PROFIT</td>
                    <td className="text-right" style={{ padding: '12px 10px', fontSize: '14px', fontWeight: 'bold'}}>
                      {formatCurrency(grossProfit)}
                    </td>
                  </tr>

                  {/* OPERATING EXPENSES */}
                  <tr className="row-section-head" style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ padding: '10px', paddingTop: '15px', fontSize: '13px', color: '#1e293b' }}>OPERATING EXPENSES</td>
                  </tr>
                  {opexItems.map(acc => (
                    <tr key={acc.id || acc.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: '35px', paddingY: '8px', color: '#334155', fontSize: '13px' }}>{acc.name}</td>
                      <td className="text-right" style={{ padding: '8px 10px', fontSize: '13px' }}>{formatCurrency(acc.total, true)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-expense" style={{ borderTop: '1px solid #cbd5e0', borderBottom: '1px solid #cbd5e0', fontWeight: '600' }}>
                    <td style={{ padding: '10px 10px', fontSize: '13px' }}>TOTAL OPERATING EXPENSES</td>
                    <td className="text-right" style={{ padding: '10px 10px', fontSize: '13px' }}>{formatCurrency(totalOpex, true)}</td>
                  </tr>

                  {/* CONDITIONAL NET PROFIT / LOSS ROW */}
                  <tr 
                    className="row-net-profit" 
                    style={{ 
                      backgroundColor: netProfit >= 0 ? '#f0fdf4' : '#ffe8e8', 
                      borderTop: netProfit >= 0 ? '2px solid #a7f3d0' : '2px solid #fca5a5', 
                      borderBottom: netProfit >= 0 ? '2px solid #a7f3d0' : '2px solid #b91c1c' 
                    }}
                  >
                    <td style={{ padding: '14px 10px', fontSize: '15px', fontWeight: 'bold', }}>
                      {netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                    </td>
                    <td className="text-right" style={{ padding: '14px 10px', fontSize: '15px', fontWeight: 'bold'}}>
                      {formatCurrency(netProfit)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProfitLoss;