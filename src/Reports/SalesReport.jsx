import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaUserFriends, FaBoxOpen, FaFilter, FaFileInvoiceDollar, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage } from 'react-icons/fa';
import { MdScience } from 'react-icons/md';
import '../Profitloss.css';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const SalesReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(); // For PNG export
  const today = localToday();
  const firstDay = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('customer'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [customerData, setCustomerData] = useState([]);
  const [itemData, setItemData] = useState({ finishedProducts: [], rawMaterials: [] });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/sales-report', {
        params: { fromDate, toDate, reportType }
      });
      
      if (reportType === 'customer') {
        setCustomerData(Array.isArray(response.data) ? response.data : []);
      } else {
        setItemData(response.data || { finishedProducts: [], rawMaterials: [] });
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      alert("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  // Safe Customer Filter (Fixes Uncaught TypeError)
  const filterCustomer = customerData.filter(c => {
    const customerName = c?.customerName || c?.name || '';
    return customerName.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  // Safe Item Filters
  const filteredFP = (itemData?.finishedProducts || []).filter(item => {
    const itemName = item?.itemName || '';
    return itemName.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  const filteredRM = (itemData?.rawMaterials || []).filter(item => {
    const itemName = item?.itemName || '';
    return itemName.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  // --- EXPORT FUNCTIONS ---

  // --- 📗 PROFESSIONAL EXCEL EXPORT ---
  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } }, // Blue Background
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const subHeaderStyle = {
      fill: { fgColor: { rgb: "E3F2FD" } },
      font: { bold: true, color: { rgb: "000000" } },
      border: { bottom: { style: "thin" } }
    };

    const cellStyle = {
      alignment: { horizontal: "left" },
      border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } }
    };

    const amountStyle = {
      alignment: { horizontal: "right" },
      numFmt: "#,##0.00",
      border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } }
    };

    let wb = XLSX.utils.book_new();
    let ws;

    if (reportType === 'customer') {
      // Headers for Customer Breakdown
      const headers = [
        { v: "CUSTOMER NAME", s: headerStyle },
        { v: "FP SALE (RS)", s: headerStyle },
        { v: "RM SALE (RS)", s: headerStyle },
        { v: "NET TOTAL SALE (RS)", s: headerStyle }
      ];
      
      const rows = filterCustomer.map(c => [
        { v: c.customerName || c.name || 'Unknown', s: cellStyle },
        { v: Number(c.fpAmount || 0), s: amountStyle },
        { v: Number(c.rmAmount || 0), s: amountStyle },
        { v: Number(c.netTotalAmount || c.total || 0), s: amountStyle }
      ]);

      ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 25 }];
    } else {
      // Item Wise Logic (RM & FP)
      const dataRows = [
        // FP Section
        [{ v: "FINISHED PRODUCT SALES", s: subHeaderStyle }, { v: "", s: subHeaderStyle }, { v: "", s: subHeaderStyle }],
        [{ v: "Item Name", s: headerStyle }, { v: "Qty", s: headerStyle }, { v: "Amount", s: headerStyle }],
        ...filteredFP.map(f => [
          { v: f.itemName, s: cellStyle },
          { v: f.qty, s: cellStyle },
          { v: Number(f.total), s: amountStyle }
        ]),
        [], // Blank Row Separator
        // RM Section
        [{ v: "RAW MATERIAL SALES", s: subHeaderStyle }, { v: "", s: subHeaderStyle }, { v: "", s: subHeaderStyle }],
        [{ v: "Material Name", s: headerStyle }, { v: "Qty", s: headerStyle }, { v: "Amount", s: headerStyle }],
        ...filteredRM.map(r => [
          { v: r.itemName, s: cellStyle },
          { v: r.qty, s: cellStyle },
          { v: Number(r.total), s: amountStyle }
        ])
      ];
      ws = XLSX.utils.aoa_to_sheet(dataRows);
      ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 20 }];
    }

    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `Sales_Report_${today}.xlsx`);
  };
  
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const reportTitle = `Sales Report - ${reportType === 'customer' ? 'Customer Wise' : 'Item Wise'}`;
      
      // Header Section
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text(reportTitle, 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
      doc.text(`Generated on: ${today}`, 14, 27);

      if (reportType === 'customer') {
        const bodyData = filterCustomer.map(c => [
          c.customerName || c.name || 'Unknown', 
          Number(c.fpAmount || 0).toLocaleString(),
          Number(c.rmAmount || 0).toLocaleString(),
          Number(c.netTotalAmount || c.total || 0).toLocaleString()
        ]);

        // Grand Totals calculation
        const grandTotalFP = filterCustomer.reduce((sum, row) => sum + Number(row.fpAmount || 0), 0);
        const grandTotalRM = filterCustomer.reduce((sum, row) => sum + Number(row.rmAmount || 0), 0);
        const grandNetTotal = filterCustomer.reduce((sum, row) => sum + Number(row.netTotalAmount || row.total || 0), 0);

        bodyData.push([
          { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: grandTotalFP.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: grandTotalRM.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: grandNetTotal.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Customer Name', 'FP Sale (Rs)', 'RM Sale (Rs)', 'Net Total (Rs)']],
          body: bodyData,
          headStyles: { fillColor: [33, 150, 243] }, // Blue Theme
          theme: 'grid'
        });

      } else {
        // --- Finished Products Table ---
        doc.setFontSize(14);
        doc.setTextColor(229, 57, 53); // Red color for FP
        doc.text("Finished Product Sales", 14, 35);

        const fpBody = filteredFP.map(f => [f.itemName, f.qty, Number(f.total).toLocaleString()]);
        const fpTotalAmount = filteredFP.reduce((s, i) => s + Number(i.total || 0), 0);
        
        fpBody.push([
          { content: 'FP TOTAL', styles: { fontStyle: 'bold', fillColor: [255, 235, 238] } },
          '',
          { content: fpTotalAmount.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [255, 235, 238] } }
        ]);

        autoTable(doc, {
          startY: 40,
          head: [['Finished Product', 'Qty', 'Amount']],
          body: fpBody,
          headStyles: { fillColor: [229, 57, 53] },
          theme: 'grid'
        });

        // --- Raw Materials Table ---
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(67, 160, 71); // Green color for RM
        doc.text("Raw Material Sales", 14, finalY);

        const rmBody = filteredRM.map(r => [r.itemName, r.qty, Number(r.total).toLocaleString()]);
        const rmTotalAmount = filteredRM.reduce((s, i) => s + Number(i.total || 0), 0);

        rmBody.push([
          { content: 'RM TOTAL', styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } },
          '',
          { content: rmTotalAmount.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } }
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [['Raw Material', 'Qty', 'Amount']],
          body: rmBody,
          headStyles: { fillColor: [67, 160, 71] },
          theme: 'grid'
        });
      }

      doc.save(`Sales_Report_${today}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Check console logs.");
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Sales_Report_${today}.png`;
      link.click();
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/reports")}>
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaFileInvoiceDollar className="report-title-icon" /> Sales Analytics Report
                  </h3>
                  <p className="report-description">Analyze sales by customer or item breakdown (FP & RM).</p>
                </div>
              </div>
              {(filterCustomer.length > 0 || filteredFP.length > 0 || filteredRM.length > 0) && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="text" className="date-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ minWidth: '150px' }} />
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span>to</span>
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchReport}>
                <FaFilter /> Filter
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginTop: '8px' }}>
              <button type="button" onClick={() => setReportType('customer')} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'customer' ? '3px solid #334155' : 'none', color: reportType === 'customer' ? '#334155' : '#94a3b8', fontWeight: '600', fontSize: '12px' }}>
                <FaUserFriends /> Customer Wise
              </button>
              <button type="button" onClick={() => setReportType('item')} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'item' ? '3px solid #334155' : 'none', color: reportType === 'item' ? '#334155' : '#94a3b8', fontWeight: '600', fontSize: '12px' }}>
                <FaBoxOpen /> Item Wise (RM & FP)
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading Analytics Data...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              {reportType === 'customer' && (
                <>
                  <div className="pl-header-section">
                    <h3 className="pl-statement-title">Customer Wise Sales Summary</h3>
                    <p className="pl-statement-subtitle">FP & RM Breakdown | {fromDate} to {toDate}</p>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th className="text-right">FP Sale (Rs)</th>
                        <th className="text-right">RM Sale (Rs)</th>
                        <th className="text-right">Net Combined Sale (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterCustomer.map((row, index) => (
                        <tr key={index}>
                          <td>{row.customerName || row.name || 'Unknown'}</td>
                          <td className="text-right">{Number(row.fpAmount || 0).toLocaleString()}</td>
                          <td className="text-right">{Number(row.rmAmount || 0).toLocaleString()}</td>
                          <td className="text-right font-bold">{Number(row.netTotalAmount || row.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td>Grand Total</td>
                        <td className="text-right">{filterCustomer.reduce((sum, row) => sum + Number(row.fpAmount || 0), 0).toLocaleString()}</td>
                        <td className="text-right">{filterCustomer.reduce((sum, row) => sum + Number(row.rmAmount || 0), 0).toLocaleString()}</td>
                        <td className="text-right">{filterCustomer.reduce((sum, row) => sum + Number(row.netTotalAmount || row.total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}

              {reportType === 'item' && (
                <>
                  <div className="pl-header-section">
                    <h3 className="pl-statement-title">Item Wise Sales Report</h3>
                    <p className="pl-statement-subtitle">Finished Products & Raw Materials | {fromDate} to {toDate}</p>
                  </div>

                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#e53935', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><FaFileInvoiceDollar /> Finished Product Sales</h4>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFP.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.itemName}</td>
                          <td className="text-right">{item.qty}</td>
                          <td className="text-right">{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td>FP Total</td>
                        <td className="text-right">{filteredFP.reduce((s, i) => s + Number(i.qty || 0), 0)}</td>
                        <td className="text-right">{filteredFP.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#43a047', margin: '20px 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><MdScience /> Raw Material Sales</h4>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>Material Name</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRM.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.itemName}</td>
                          <td className="text-right">{item.qty}</td>
                          <td className="text-right">{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td>RM Total</td>
                        <td className="text-right">{filteredRM.reduce((s, i) => s + Number(i.qty || 0), 0)}</td>
                        <td className="text-right">{filteredRM.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SalesReport;