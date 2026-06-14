import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaCalendarAlt, FaBookOpen, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const TrialBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = new Date().toISOString().split('T')[0];
  const currentYearStart = `${new Date().getFullYear()}-01-01`;

  // --- States ---
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    total_opening_debit: 0, total_opening_credit: 0,
    total_current_debit: 0, total_current_credit: 0,
    total_closing_debit: 0, total_closing_credit: 0,
    is_balanced: true
  });

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/trial-balance', {
        params: { from_date: fromDate, to_date: toDate }
      });
      if (response.data.success) {
        setRows(response.data.data || []);
        setTotals(response.data.totals);
      } else {
        toast.error(response.data.message || "Failed to fetch statements");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server for summary grids.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [fromDate, toDate]);

  const renderAmount = (amount) => amount > 0 ? Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-';

  // --- 📊 EXCEL ADVANCED STYLING ENGINE ---
  const exportToExcel = () => {
    let wb = XLSX.utils.book_new();
    
    // Core Palettes & Styles Mapping
    const titleStyle = {
      font: { name: "Calibri", bold: true, sz: 16, color: { rgb: "1A202C" } },
      alignment: { horizontal: "left" }
    };
    
    const durationStyle = {
      font: { name: "Calibri", italic: true, sz: 11, color: { rgb: "718096" } },
      alignment: { horizontal: "left" }
    };

    const mainHeaderStyle = {
      fill: { fgColor: { rgb: "1A202C" } },
      font: { name: "Calibri", color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "4A5568" } }, bottom: { style: "thin", color: { rgb: "4A5568" } } }
    };

    const subHeaderStyle = (bgColor, textColor) => ({
      fill: { fgColor: { rgb: bgColor } },
      font: { name: "Calibri", color: { rgb: textColor }, bold: true, sz: 10 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "E2E8F0" } } }
    });

    const cellText = (isZebra) => ({
      fill: { fgColor: { rgb: isZebra ? "F8FAFC" : "FFFFFF" } },
      font: { name: "Calibri", sz: 10, color: { rgb: "334155" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "F1F5F9" } } }
    });

    const cellAmount = (isZebra, colorHex, isBold = false) => ({
      fill: { fgColor: { rgb: isZebra ? "F8FAFC" : "FFFFFF" } },
      font: { name: "Calibri", sz: 10, color: { rgb: colorHex }, bold: isBold },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0.00;(#,##0.00);\"-\"",
      border: { bottom: { style: "thin", color: { rgb: "F1F5F9" } } }
    });

    const totalLabelStyle = {
      fill: { fgColor: { rgb: "E2E8F0" } },
      font: { name: "Calibri", bold: true, sz: 11, color: { rgb: "1A202C" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "1A202C" } }, bottom: { style: "double", color: { rgb: "1A202C" } } }
    };

    const totalAmountStyle = (colorHex) => ({
      fill: { fgColor: { rgb: "E2E8F0" } },
      font: { name: "Calibri", bold: true, sz: 11, color: { rgb: colorHex } },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0.00;(#,##0.00);\"-\"",
      border: { top: { style: "thin", color: { rgb: "1A202C" } }, bottom: { style: "double", color: { rgb: "1A202C" } } }
    });

    // Building Rows Matrix Array
    let rowsData = [];
    
    // Row 1 & 2: Report Titles
    rowsData.push([{ v: "DETAILED TRIAL BALANCE MATRIX", s: titleStyle }]);
    rowsData.push([{ v: `Duration Timeline: ${fromDate} to ${toDate} | Generated on: ${today}`, s: durationStyle }]);
    rowsData.push([]); // Spacing

    // Row 4: Multi-tier Parent Headings
    rowsData.push([
      { v: "ACCOUNT DETAILS", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "OPENING BALANCE", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "TRANSACTIONS (PERIOD)", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "CLOSING BALANCE", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle }
    ]);

    // Row 5: Column Definition Labels
    rowsData.push([
      { v: "A/C CODE", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "ACCOUNT TITLE", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "CLASSIFICATION", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "DEBIT", s: subHeaderStyle("718096", "FFFFFF") },
      { v: "CREDIT", s: subHeaderStyle("718096", "FFFFFF") },
      { v: "DEBIT", s: subHeaderStyle("63B3ED", "1A202C") },
      { v: "CREDIT", s: subHeaderStyle("63B3ED", "1A202C") },
      { v: "DEBIT", s: subHeaderStyle("2D3748", "FFFFFF") },
      { v: "CREDIT", s: subHeaderStyle("2D3748", "FFFFFF") }
    ]);

    // Dynamic Account Rows Injection with Zebra Striping
    rows.forEach((r, idx) => {
      const isZebra = idx % 2 === 1;
      rowsData.push([
        { v: r.account_code, s: cellText(isZebra) },
        { v: r.account_name, s: cellText(isZebra) },
        { v: r.category_name, s: cellText(isZebra) },
        { v: r.opening_debit > 0 ? Number(r.opening_debit) : "", s: cellAmount(isZebra, "198754") },
        { v: r.opening_credit > 0 ? Number(r.opening_credit) : "", s: cellAmount(isZebra, "DC3545") },
        { v: r.current_debit > 0 ? Number(r.current_debit) : "", s: cellAmount(isZebra, "198754") },
        { v: r.current_credit > 0 ? Number(r.current_credit) : "", s: cellAmount(isZebra, "DC3545") },
        { v: r.closing_debit > 0 ? Number(r.closing_debit) : "", s: cellAmount(isZebra, "198754", true) },
        { v: r.closing_credit > 0 ? Number(r.closing_credit) : "", s: cellAmount(isZebra, "DC3545", true) }
      ]);
    });

    // Grand Accounting Summary Bottom Row
    rowsData.push([
      { v: "Grand Aggregates Summary:", s: totalLabelStyle },
      { v: "", s: totalLabelStyle },
      { v: "", s: totalLabelStyle },
      { v: Number(totals.total_opening_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_opening_credit), s: totalAmountStyle("DC3545") },
      { v: Number(totals.total_current_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_current_credit), s: totalAmountStyle("DC3545") },
      { v: Number(totals.total_closing_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_closing_credit), s: totalAmountStyle("DC3545") }
    ]);

    let ws = XLSX.utils.aoa_to_sheet(rowsData);

    // Dynamic Merges Setup (Account Details merges, Opening, Tx, Closing top row block merges)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title span
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Subtitle span
      { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Account Details Group Merge
      { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } }, // Opening Group Merge
      { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } }, // Transactions Group Merge
      { s: { r: 3, c: 7 }, e: { r: 3, c: 8 } }, // Closing Group Merge
      { s: { r: rows.length + 5, c: 0 }, e: { r: rows.length + 5, c: 2 } } // Bottom summary text merge
    ];

    // Perfect Layout Widths Optimization
    ws['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 16 }, { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance Summary");
    XLSX.writeFile(wb, `Trial_Balance_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text("DETAILED TRIAL BALANCE STATEMENT", 14, 12);
    doc.setFontSize(10);
    doc.text(`Duration Frame: ${fromDate} to ${toDate}`, 14, 18);

    const pdfRows = rows.map(r => [
      r.account_code, r.account_name, r.category_name,
      renderAmount(r.opening_debit), renderAmount(r.opening_credit),
      renderAmount(r.current_debit), renderAmount(r.current_credit),
      renderAmount(r.closing_debit), renderAmount(r.closing_credit)
    ]);

    pdfRows.push([
      { content: 'Grand Accumulations Summary:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_opening_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_opening_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_current_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_current_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_closing_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_closing_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 24,
      head: [
        [{ content: 'Account Details', colSpan: 3, styles: { halign: 'center' } }, { content: 'Opening Balance', colSpan: 2, styles: { halign: 'center' } }, { content: 'Transactions', colSpan: 2, styles: { halign: 'center' } }, { content: 'Closing Balance', colSpan: 2, styles: { halign: 'center' } }],
        ['Code', 'Account Title', 'Classification', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit']
      ],
      body: pdfRows,
      theme: 'grid',
      headStyles: { fillColor: [52, 58, 64] }
    });
    doc.save(`Trial_Balance_Detailed_${fromDate}.pdf`);
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Trial_Balance_${fromDate}_to_${toDate}.png`;
      link.click();
    }
  };

  return (
    <div className="vw-100 min-vh-100 bg-light">
      <MainLayout />
      
      <style>{`
        @media (max-width: 768px) {
          .mobile-column-stack { flex-direction: column !important; align-items: flex-start !important; }
          .mobile-w-100 { width: 100% !important; justify-content: space-between !important; }
          .desktop-table-container { display: none !important; }
          .mobile-cards-container { display: block !important; }
          .mobile-filter-box { width: 100% !important; flex-grow: 1; }
        }
        @media (min-width: 769px) {
          .mobile-cards-container { display: none !important; }
          .desktop-table-container { display: block !important; }
        }
      `}</style>

      <div className="p-2 p-md-4 mx-auto" style={{ width: '98%' }}>
        
        {/* --- Top Layout Panel --- */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3 mobile-column-stack">
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button onClick={() => navigate(-1)} className='back-btn'>
              <FaArrowLeft /> 
            </button>
            <h2 className="m-0 font-bold text-dark h5 d-flex align-items-center gap-2">
              <FaBookOpen className="text-secondary" /> Detailed Trial Balance Matrix
            </h2>
          </div>
          
          {/* Controls Filters Grid */}
          <div className="d-flex gap-2 gap-md-3 align-items-center bg-white p-2 rounded shadow-sm flex-wrap border mobile-w-100">
            <div className="d-flex align-items-center gap-2 mobile-filter-box justify-content-between">
              <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>From:</span>
              <div className="position-relative d-flex align-items-center">
                <FaCalendarAlt className="position-absolute text-muted d-none d-sm-block" style={{ left: '12px', pointerEvents: 'none' }} />
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="form-control form-control-sm bg-light border-0 ps-2 ps-sm-5 text-dark"
                  style={{ width: '140px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div className="text-muted opacity-50 px-1 d-none d-md-block">|</div>

            <div className="d-flex align-items-center gap-2 mobile-filter-box justify-content-between">
              <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>To:</span>
              <div className="position-relative d-flex align-items-center">
                <FaCalendarAlt className="position-absolute text-muted d-none d-sm-block" style={{ left: '12px', pointerEvents: 'none' }} />
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="form-control form-control-sm bg-light border-0 ps-2 ps-sm-5 text-dark"
                  style={{ width: '140px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div className="text-muted opacity-50 px-1 mobile-w-100 d-block d-md-none my-1" style={{ height: '1px', backgroundColor: '#e0e0e0' }}></div>

            {/* Square Export Controls */}
            <div className="d-flex gap-2 justify-content-end mobile-w-100 mt-2 mt-md-0">
               <button onClick={exportToPDF} title="Export PDF" className="btn btn-danger d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FaFilePdf /></button>
               <button onClick={exportToExcel} title="Export Excel" className="btn btn-success d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FaFileExcel /></button>
               <button onClick={exportToPNG} title="Export Image" className="btn d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', backgroundColor: '#ff9100', borderRadius: '8px' }}><FaImage /></button>
            </div>
          </div>
        </div>

        {/* --- Trial Balance Dynamic Status Quick Summary Card --- */}
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className={`card border-0 shadow-sm rounded-3 border-start border-4 p-3 ${totals.is_balanced ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mobile-column-stack">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0" style={{ width: '42px', height: '42px', backgroundColor: totals.is_balanced ? '#198754' : '#dc3545', fontSize: '18px' }}>
                    {totals.is_balanced ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  </div>
                  <div>
                    <h6 className="m-0 text-dark fw-bold" style={{ fontSize: '1rem' }}>
                      {totals.is_balanced ? "Ledger Book Integrity: Balanced" : "Ledger Book Integrity: Out of Balance Variance"}
                    </h6>
                    <p className="m-0 text-secondary small d-none d-sm-block">
                      Double-entry records reconcile smoothly across structural ledger matrices.
                    </p>
                  </div>
                </div>
                
                <div className="d-flex align-items-center gap-3 gap-sm-4 mobile-w-100 border-top pt-2 pt-md-0 border-md-0 justify-content-around">
                  <div className="text-start text-md-end">
                    <span className="text-muted text-uppercase font-monospace" style={{ fontSize: '10px', display: 'block' }}>Total Debits</span>
                    <h6 className="m-0 text-success fw-bold font-monospace mt-1">
                      {Number(totals.total_closing_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="small text-muted" style={{ fontSize: '10px' }}>Rs</span>
                    </h6>
                  </div>
                  <div className="text-muted opacity-25 fs-5">|</div>
                  <div className="text-end">
                    <span className="text-muted text-uppercase font-monospace" style={{ fontSize: '10px', display: 'block' }}>Total Credits</span>
                    <h6 className="m-0 text-danger fw-bold font-monospace mt-1">
                      {Number(totals.total_closing_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="small text-muted" style={{ fontSize: '10px' }}>Rs</span>
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Dynamic Conditional Output Viewport --- */}
        {loading ? (
          <div className="text-center bg-white rounded shadow-sm p-5 text-muted small">
            <div className="spinner-border text-secondary spinner-border-sm me-2" role="status"></div>
            Syncing ledger matrix architecture...
          </div>
        ) : (
          <>
            {/* 🖥️ VIEW 1: DESKTOP SHEET TABLE ENGINE */}
            <div ref={reportRef} className="bg-white rounded shadow-sm p-4 desktop-table-container">
              <div className="table-responsive">
                <table className="table table-bordered align-middle m-0 text-center">
                  <thead className="table-dark">
                    <tr>
                      <th rowSpan="2" className="align-middle" style={{ width: '110px' }}>A/C Code</th>
                      <th rowSpan="2" className="align-middle text-start">Account Title</th>
                      <th rowSpan="2" className="align-middle">Classification Group</th>
                      <th colSpan="2" className="py-1" style={{ backgroundColor: '#4a5568', color: '#fff' }}>Opening Balance</th>
                      <th colSpan="2" className="py-1" style={{ backgroundColor: '#2b6cb0', color: '#fff' }}>Transactions (Period)</th>
                      <th colSpan="2" className="py-1" style={{ backgroundColor: '#1a202c', color: '#e2e8f0' }}>Closing Balance</th>
                    </tr>
                    <tr>
                      <th style={{ width: '120px', backgroundColor: '#718096', color: '#fff' }}>Debit</th>
                      <th style={{ width: '120px', backgroundColor: '#718096', color: '#fff' }}>Credit</th>
                      <th style={{ width: '120px', backgroundColor: '#63b3ed', color: '#1a202c' }}>Debit</th>
                      <th style={{ width: '120px', backgroundColor: '#63b3ed', color: '#1a202c' }}>Credit</th>
                      <th style={{ width: '120px', backgroundColor: '#2d3748', color: '#fff' }}>Debit</th>
                      <th style={{ width: '120px', backgroundColor: '#2d3748', color: '#fff' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? rows.map((row, idx) => (
                      <tr key={`dt-row-${idx}`}>
                        <td className="font-monospace text-muted small">{row.account_code}</td>
                        <td className="text-start fw-medium text-dark">{row.account_name}</td>
                        <td><span className="badge bg-light text-secondary border px-2 py-1">{row.category_name}</span></td>
                        <td className="text-end text-success font-monospace">{renderAmount(row.opening_debit)}</td>
                        <td className="text-end text-danger font-monospace">{renderAmount(row.opening_credit)}</td>
                        <td className="text-end text-success font-monospace">{renderAmount(row.current_debit)}</td>
                        <td className="text-end text-danger font-monospace">{renderAmount(row.current_credit)}</td>
                        <td className="text-end text-success font-monospace fw-bold" style={{ backgroundColor: '#f7fafc' }}>{renderAmount(row.closing_debit)}</td>
                        <td className="text-end text-danger font-monospace fw-bold" style={{ backgroundColor: '#f7fafc' }}>{renderAmount(row.closing_credit)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="text-center p-5 text-muted italic">No records mapped.</td></tr>
                    )}
                    <tr className="table-secondary fw-bold" style={{ fontSize: '14px' }}>
                      <td colSpan="3" className="text-end pe-3 fw-bold">Grand Aggregates Summary:</td>
                      <td className="text-end text-success font-monospace">{renderAmount(totals.total_opening_debit)}</td>
                      <td className="text-end text-danger font-monospace">{renderAmount(totals.total_opening_credit)}</td>
                      <td className="text-end text-success font-monospace">{renderAmount(totals.total_current_debit)}</td>
                      <td className="text-end text-danger font-monospace">{renderAmount(totals.total_current_credit)}</td>
                      <td className="text-end text-success font-monospace border-bottom border-2 border-dark">{renderAmount(totals.total_closing_debit)}</td>
                      <td className="text-end text-danger font-monospace border-bottom border-2 border-dark">{renderAmount(totals.total_closing_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📱 VIEW 2: SMART MOBILE COMPACT CARD DISPLAY LAYOUT */}
            <div className="mobile-cards-container d-none">
              <div className="text-muted small mb-2 px-1 fw-bold text-uppercase">Account Parameters Ledger Rows ({rows.length})</div>
              {rows.length > 0 ? rows.map((row, index) => (
                <div key={`mob-card-${index}`} className="card border-0 shadow-sm p-3 mb-3 bg-white rounded-3">
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                    <div>
                      <div className="font-monospace text-muted small" style={{ fontSize: '11px' }}>{row.account_code}</div>
                      <div className="fw-bold text-dark" style={{ fontSize: '15px', marginTop: '1px' }}>{row.account_name}</div>
                    </div>
                    <span className="badge bg-secondary-subtle text-secondary border px-2 py-1" style={{ fontSize: '11px' }}>{row.category_name}</span>
                  </div>

                  <div className="row g-2 pt-1 text-center" style={{ fontSize: '12px' }}>
                    <div className="col-4 border-end">
                      <div className="text-muted fw-bold mb-1" style={{ fontSize: '10px' }}>OPENING</div>
                      <div className="text-success font-monospace">Dr: {renderAmount(row.opening_debit)}</div>
                      <div className="text-danger font-monospace">Cr: {renderAmount(row.opening_credit)}</div>
                    </div>
                    <div className="col-4 border-end">
                      <div className="text-muted fw-bold mb-1" style={{ fontSize: '10px' }}>PERIOD MOV</div>
                      <div className="text-success font-monospace">Dr: {renderAmount(row.current_debit)}</div>
                      <div className="text-danger font-monospace">Cr: {renderAmount(row.current_credit)}</div>
                    </div>
                    <div className="col-4 bg-light-subtle rounded py-1">
                      <div className="text-dark fw-bold mb-1" style={{ fontSize: '10px' }}>NET CLOSING</div>
                      <div className="text-success font-monospace fw-bold">Dr: {renderAmount(row.closing_debit)}</div>
                      <div className="text-danger font-monospace fw-bold">Cr: {renderAmount(row.closing_credit)}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center bg-white p-4 rounded text-muted small">No sub-ledger details available.</div>
              )}

              {/* Sticky Mobile Totals Footer Block */}
              <div className="card border-0 bg-dark text-light p-3 shadow-lg rounded-3 mt-4">
                <div className="fw-bold border-bottom border-secondary pb-2 mb-2 text-uppercase font-monospace text-center" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                  Grand Aggregate Accumulations
                </div>
                <div className="d-flex justify-content-between font-monospace py-1" style={{ fontSize: '13px' }}>
                  <span className="text-muted">Opening:</span>
                  <span>Dr: {renderAmount(totals.total_opening_debit)} | Cr: {renderAmount(totals.total_opening_credit)}</span>
                </div>
                <div className="d-flex justify-content-between font-monospace py-1" style={{ fontSize: '13px' }}>
                  <span className="text-muted">Period Trans:</span>
                  <span>Dr: {renderAmount(totals.total_current_debit)} | Cr: {renderAmount(totals.total_current_credit)}</span>
                </div>
                <div className="d-flex justify-content-between font-monospace border-top border-secondary pt-2 mt-1 fw-bold" style={{ fontSize: '14px' }}>
                  <span className="text-info">Net Closing:</span>
                  <div>
                    <span className="text-success">Dr: {renderAmount(totals.total_closing_debit)}</span>
                    <span className="text-muted mx-1">/</span>
                    <span className="text-danger">Cr: {renderAmount(totals.total_closing_credit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrialBalanceReport;