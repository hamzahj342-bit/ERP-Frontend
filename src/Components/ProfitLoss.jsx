import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
// ⚠️ xlsx-js-style use karenge professional styling ke liye
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine, FaImage } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api"; 
import "../Profitloss.css"

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

  // ------------------------------
  // 📗 PROFESSIONAL EXCEL EXPORT
  // ------------------------------
  const exportToExcel = () => {
    if (!report) return;

    const headerStyle = {
      fill: { fgColor: { rgb: "212121" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center" }
    };

    const sectionStyle = {
      fill: { fgColor: { rgb: "F5F5F5" } },
      font: { bold: true },
      border: { bottom: { style: "thin" } }
    };

    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
    const totalStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E8F5E9" } }, border: { top: { style: "thin" } } };

    const rows = [
      [{ v: `Profit & Loss Report (${fromDate} to ${toDate})`, s: headerStyle }, "", ""],
      [],
      [{ v: "REVENUE", s: sectionStyle }, "", ""],
    ];

    if (report.details?.Income) {
      Object.values(report.details.Income).forEach(acc => {
        rows.push([{ v: acc.name }, "", { v: Number(acc.total), s: amountStyle }]);
      });
    }
    rows.push([{ v: "TOTAL REVENUE", s: totalStyle }, "", { v: Number(report.totals.totalIncome), s: { ...amountStyle, ...totalStyle } }]);
    
    rows.push([], [{ v: "EXPENSES", s: sectionStyle }, "", ""]);
    
    if (report.details?.Expense) {
      Object.values(report.details.Expense).forEach(acc => {
        rows.push([{ v: acc.name }, "", { v: -Number(acc.total), s: amountStyle }]);
      });
    }
    rows.push([{ v: "TOTAL COST OF SALES", s: totalStyle }, "", { v: -Number(report.totals.totalExpenses), s: { ...amountStyle, ...totalStyle } }]);
    
    rows.push([], 
      [{ v: "GROSS PROFIT", s: { ...totalStyle, fill: { fgColor: { rgb: "FFF9C4" } } } }, "", { v: Number(report.totals.grossProfit), s: { ...amountStyle, ...totalStyle, fill: { fgColor: { rgb: "FFF9C4" } } } }],
      [{ v: "NET PROFIT (OR LOSS)", s: { ...totalStyle, fill: { fgColor: { rgb: "BBDEFB" } } } }, "", { v: Number(report.totals.netProfit), s: { ...amountStyle, ...totalStyle, fill: { fgColor: { rgb: "BBDEFB" } } } }]
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 5 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit_Loss");
    XLSX.writeFile(wb, `Profit_Loss_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Professional Excel Downloaded");
  };

  // ------------------------------
  // 🖼️ PNG EXPORT
  // ------------------------------
  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `Profit_Loss_${fromDate}.png`;
    link.click();
    toast.success("Image Downloaded");
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 5, 5, pdfWidth - 10, pdfHeight - 10);
      pdf.save(`Profit_Loss_${fromDate}.pdf`);
      toast.success("PDF Downloaded");
    });
  };

 return (
  <>
    <NavigationBar />
    <div className="report-page-wrapper">
      <button className="back-btn"
      style={{marginTop: "50px"}}
       onClick={() => navigate("/reports")}>
        <FaArrowLeft />
      </button>

      <div className="report-card" style={{marginTop: "20px"}}>
        <div className="report-header">
          <h3 className="report-title">
            <FaChartLine style={{color: '#4caf50'}} /> Profit & Loss Statement
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
          <div ref={reportRef} className="pl-table-container">
            <h4 style={{textAlign: 'center', marginBottom: '15px'}}>Period: {fromDate} to {toDate}</h4>
            <table className="pl-table">
              <tbody>
                <tr className="row-section-head"><td colSpan="2">REVENUE</td></tr>
                {report.details?.Income && Object.values(report.details.Income).map(acc => (
                  <tr key={acc.id}>
                    <td style={{paddingLeft: '30px'}}>{acc.name}</td>
                    <td className="text-right">{Number(acc.total).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="row-total-income">
                  <td>TOTAL REVENUE</td>
                  <td className="text-right">{Number(report.totals.totalIncome).toLocaleString()}</td>
                </tr>

                <tr className="row-section-head"><td colSpan="2">EXPENSE</td></tr>
                {report.details?.Expense && Object.values(report.details.Expense).map(acc => (
                  <tr key={acc.id}>
                    <td style={{paddingLeft: '30px'}}>{acc.name}</td>
                    <td className="text-right">({Number(acc.total).toLocaleString()})</td>
                  </tr>
                ))}
                <tr className="row-total-expense">
                  <td>TOTAL COST OF SALES</td>
                  <td className="text-right">({Number(report.totals.totalExpenses).toLocaleString()})</td>
                </tr>

                <tr className="row-gross-profit">
                  <td>GROSS PROFIT</td>
                  <td className="text-right" style={{color: '#047857'}}>{Number(report.totals.grossProfit).toLocaleString()}</td>
                </tr>
                <tr className="row-net-profit">
                  <td>NET PROFIT (OR LOSS)</td>
                  <td className="text-right" style={{color: '#1d4ed8'}}>{Number(report.totals.netProfit).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    <Footer />
  </>
);};

export default ProfitLoss;