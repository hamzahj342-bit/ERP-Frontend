import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaCalendarAlt, FaUniversity, FaBalanceScale } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const CapitalReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = new Date().toISOString().split('T')[0];

  // --- 📊 State Definitions ---
  const currentYearStart = `${new Date().getFullYear()}-01-01`;
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_assets: 0, total_liabilities: 0, net_capital: 0 });
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  // --- 🌐 Fetch Data From Secured Route ---
  const fetchCapitalData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/capital', {
        params: { 
          from_date: fromDate, 
          to_date: toDate 
        }
      });
      
      if (response.data.success) {
        setSummary(response.data.summary);
        setAssets(response.data.data.assets || []);
        setLiabilities(response.data.data.liabilities || []);
      } else {
        toast.error(response.data.message || "Failed to process data");
      }
    } catch (err) {
      console.error("Error generating capital report:", err);
      toast.error(err.response?.data?.message || "Server error occurred while fetching balances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapitalData();
  }, [fromDate, toDate]);

  // --- 📊 EXPORT OPERATIONS ---

  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, bottom: { style: "thin" } }
    };

    const sectionStyle = {
      fill: { fgColor: { rgb: "E3F2FD" } },
      font: { color: { rgb: "0D47A1" }, bold: true, sz: 11 },
      alignment: { horizontal: "left" }
    };

    const cellStyle = { alignment: { horizontal: "left" }, border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const totalStyle = { font: { bold: true }, alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { top: { style: "thin" }, bottom: { style: "double" } } };

    let wb = XLSX.utils.book_new();
    
    const headers = [
      { v: "ACCOUNT CODE", s: headerStyle },
      { v: "ACCOUNT NAME", s: headerStyle },
      { v: "BALANCE (RS)", s: headerStyle }
    ];

    let rows = [];

    rows.push([{ v: "1. ASSETS", s: sectionStyle }, { v: "", s: sectionStyle }, { v: "", s: sectionStyle }]);
    assets.forEach(item => {
      rows.push([
        { v: item.account_code, s: cellStyle },
        { v: item.account_name, s: cellStyle },
        { v: Number(item.balance), s: amountStyle }
      ]);
    });
    rows.push([
      { v: "", s: cellStyle },
      { v: "Total Assets:", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: Number(summary.total_assets), s: totalStyle }
    ]);

    rows.push([{ v: "" }, { v: "" }, { v: "" }]);

    rows.push([{ v: "2. LIABILITIES", s: sectionStyle }, { v: "", s: sectionStyle }, { v: "", s: sectionStyle }]);
    liabilities.forEach(item => {
      rows.push([
        { v: item.account_code, s: cellStyle },
        { v: item.account_name, s: cellStyle },
        { v: Number(item.balance), s: amountStyle }
      ]);
    });
    rows.push([
      { v: "", s: cellStyle },
      { v: "Total Liabilities:", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: Number(summary.total_liabilities), s: totalStyle }
    ]);

    rows.push([{ v: "" }, { v: "" }, { v: "" }]);

    rows.push([
      { v: "NET OWNER EQUITY / CAPITAL (A - B):", s: { fill: { fgColor: { rgb: "0D47A1" } }, font: { color: { rgb: "FFFFFF" }, bold: true } } },
      { v: "", s: { fill: { fgColor: { rgb: "0D47A1" } } } },
      { v: Number(summary.net_capital), s: { fill: { fgColor: { rgb: "0D47A1" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "right" }, numFmt: "#,##0.00" } }
    ]);

    let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(wb, ws, "Capital Statement");
    XLSX.writeFile(wb, `Capital_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("CAPITAL & EQUITY REPORT", 14, 15);
      doc.setFontSize(10);
      doc.text(`Duration: ${fromDate} to ${toDate} | Generated on: ${today}`, 14, 22);

      let tableData = [];

      tableData.push([{ content: '1. ASSETS', colSpan: 3, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }]);
      assets.forEach(item => {
        tableData.push([item.account_code, item.account_name, { content: Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }]);
      });
      tableData.push([
        '', 
        { content: 'Total Assets:', styles: { halign: 'right', fontStyle: 'bold' } }, 
        { content: Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);

      tableData.push([{ content: '', colSpan: 3, styles: { cellPadding: 2 } }]);

      tableData.push([{ content: '2. LIABILITIES', colSpan: 3, styles: { fillColor: [255, 235, 235], textColor: [198, 40, 40], fontStyle: 'bold' } }]);
      liabilities.forEach(item => {
        tableData.push([item.account_code, item.account_name, { content: Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }]);
      });
      tableData.push([
        '', 
        { content: 'Total Liabilities:', styles: { halign: 'right', fontStyle: 'bold' } }, 
        { content: Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);

      tableData.push([{ content: '', colSpan: 3, styles: { cellPadding: 2 } }]);

      tableData.push([
        { content: 'NET CAPITAL (OWNER\'S EQUITY):', colSpan: 2, styles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Account Code', 'Account Name', 'Balance (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] }
      });

      doc.save(`Capital_Report_${fromDate}_to_${toDate}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error("PDF Export execution failed");
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Capital_Statement_${fromDate}_to_${toDate}.png`;
      link.click();
    }
  };

  return (
    <div className="vw-100 min-vh-100 bg-light">
      <MainLayout />
      
      <div className="p-4 mx-auto" style={{ width: '98%' }}>
        
        {/* --- Header Control Panel Section --- */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <button onClick={() => navigate(-1)} className='back-btn'>
              <FaArrowLeft />
            </button>
            <h2 className="m-0 font-bold text-dark h4 d-flex align-items-center gap-2">
              <FaBalanceScale className="text-primary" /> Net Capital Statement
            </h2>
          </div>
          
          {/* 🎯 Realignment Bar With Exact Match Styles */}
          <div className="d-flex gap-3 align-items-center bg-white p-2 rounded shadow-sm flex-wrap border">
            
            {/* FROM DATE */}
            <div className="d-flex align-items-center gap-2">
              <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>From:</span>
              <div className="position-relative d-flex align-items-center">
                <FaCalendarAlt className="position-absolute text-muted" style={{ left: '12px', pointerEvents: 'none' }} />
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="form-control form-control-sm bg-light border-0 ps-5 text-dark"
                  style={{ width: '160px', height: '36px', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* VERTICAL LINE 1 */}
            <div className="text-muted opacity-50 px-1">|</div>

            {/* TO DATE */}
            <div className="d-flex align-items-center gap-2">
              <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>To:</span>
              <div className="position-relative d-flex align-items-center">
                <FaCalendarAlt className="position-absolute text-muted" style={{ left: '12px', pointerEvents: 'none' }} />
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="form-control form-control-sm bg-light border-0 ps-5 text-dark"
                  style={{ width: '160px', height: '36px', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* VERTICAL LINE 2 */}
            <div className="text-muted opacity-50 px-1">|</div>

            {/* 🎯 Exact Styled Action Square Buttons Panel */}
            <div className="d-flex gap-2">
               {/* PDF BUTTON - Deep Red */}
               <button 
                 onClick={exportToPDF} 
                 title="Export PDF" 
                 className="btn d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm"
                 style={{ width: '38px', height: '38px', backgroundColor: '#dc3545', borderRadius: '8px', fontSize: '16px' }}
               >
                 <FaFilePdf />
               </button>

               {/* EXCEL BUTTON - Dark Green */}
               <button 
                 onClick={exportToExcel} 
                 title="Export Excel" 
                 className="btn d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm"
                 style={{ width: '38px', height: '38px', backgroundColor: '#198754', borderRadius: '8px', fontSize: '16px' }}
               >
                 <FaFileExcel />
               </button>

               {/* IMAGE BUTTON - Amber/Orange */}
               <button 
                 onClick={exportToPNG} 
                 title="Export Image" 
                 className="btn d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm"
                 style={{ width: '38px', height: '38px', backgroundColor: '#ff9100', borderRadius: '8px', fontSize: '16px' }}
               >
                 <FaImage />
               </button>
            </div>
          </div>
        </div>

        {/* --- Financial Aggregate Summary Cards Section --- */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-3">
            <div className="card bg-white border-0 shadow-sm rounded-3 border-start border-primary border-4 p-3">
              <div className="text-muted text-uppercase small font-monospace">Total Assets (A)</div>
              <div className="h3 font-bold text-success mt-1">
                {Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="small text-muted h6">Rs</span>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="card bg-white border-0 shadow-sm rounded-3 border-start border-danger border-4 p-3">
              <div className="text-muted text-uppercase small font-monospace">Total Liabilities (B)</div>
              <div className="h3 font-bold text-danger mt-1">
                {Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="small text-muted h6">Rs</span>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="card bg-success text-white border-0 shadow-sm rounded-3 p-3">
              <div className="text-white-50 text-uppercase small font-monospace">Net Worth / Capital (A - B)</div>
              <div className="h3 font-bold mt-1">
                {Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-white-50 h6">Rs</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Content Statements Table Output Container --- */}
        {loading ? (
          <div className="text-center bg-white rounded shadow-sm p-5 text-muted fs-5">
            <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
            Analyzing ledger balances snapshot arrays...
          </div>
        ) : (
          <div ref={reportRef} className="bg-white rounded shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                <h5 className="m-0 text-secondary">Statement View Balance Ledger Sheet</h5>
                <span className="badge bg-light text-dark border p-2">Timeline Range: {fromDate} to {toDate}</span>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '150px' }}>Account Code</th>
                    <th>Account Name</th>
                    <th className="text-end" style={{ width: '250px' }}>Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* SECTION 1: ASSETS */}
                  <tr className="table-primary font-weight-bold">
                    <td colSpan="3" className="fw-bold text-primary font-monospace"><FaUniversity className="me-2" /> 1. ASSETS</td>
                  </tr>
                  {assets.length > 0 ? assets.map((row, index) => (
                    <tr key={`asset-${index}`}>
                      <td className="text-muted font-monospace">{row.account_code}</td>
                      <td className="fw-medium">{row.account_name}</td>
                      <td className="text-end text-success fw-bold">
                        {Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center text-muted italic small">No asset entries reported within this frame.</td></tr>
                  )}
                  <tr className="bg-light fw-bold">
                    <td></td>
                    <td className="text-end pe-3 fw-bold">Total Assets Summary (A):</td>
                    <td className="text-end text-success border-bottom border-2 border-dark fw-bold">
                      {Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Spacer Row */}
                  <tr><td colSpan="3" className="border-0 py-3"></td></tr>

                  {/* SECTION 2: LIABILITIES */}
                  <tr className="table-danger font-weight-bold">
                    <td colSpan="3" className="fw-bold text-danger font-monospace"><FaUniversity className="me-2" /> 2. LIABILITIES</td>
                  </tr>
                  {liabilities.length > 0 ? liabilities.map((row, index) => (
                    <tr key={`liab-${index}`}>
                      <td className="text-muted font-monospace">{row.account_code}</td>
                      <td className="fw-medium">{row.account_name}</td>
                      <td className="text-end text-danger fw-bold">
                        {Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center text-muted italic small">No liability entries reported within this frame.</td></tr>
                  )}
                  <tr className="bg-light fw-bold">
                    <td></td>
                    <td className="text-end pe-3 fw-bold">Total Liabilities Summary (B):</td>
                    <td className="text-end text-danger border-bottom border-2 border-dark fw-bold">
                      {Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* --- Net Capital Conclusion Footer Board --- */}
            <div className="mt-4 p-3 bg-dark text-white rounded d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 text-uppercase tracking-wider fw-bold">Statement Formula Result</h6>
                <small className="text-white-50">Net Worth Value base formula (Assets less Liabilities)</small>
              </div>
              <div className="h3 m-0 font-weight-bold text-warning fw-bold">
                {Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="small text-white-50 h6">PKR</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CapitalReport;