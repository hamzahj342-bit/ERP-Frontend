import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaUserFriends, FaBoxOpen, FaFilter, FaFileInvoiceDollar, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage } from 'react-icons/fa';
import { MdScience } from 'react-icons/md';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const SalesReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(); // For PNG export
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

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
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f4f7f6' }}>
      <MainLayout />
      
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate('/reports')} className='back-btn'>
              <FaArrowLeft />
            </button>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>Sales Analytics Report</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
            <input 
               type="text" 
               placeholder="Search..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }} 
            />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <span>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <button onClick={fetchReport} style={{ padding: '8px 15px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> 
              <FaFilter /> Filter
            </button>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '5px', borderLeft: '1px solid #eee', paddingLeft: '10px' }}>
               <button onClick={exportToExcel} title="Excel" style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFileExcel /></button>
               <button onClick={exportToPDF} title="PDF" style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFilePdf /></button>
               <button onClick={exportToPNG} title="PNG" style={{ padding: '8px 12px', background: '#ef6c00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaImage /></button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button 
            onClick={() => setReportType('customer')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'customer' ? '4px solid #2196f3' : 'none', color: reportType === 'customer' ? '#2196f3' : '#666', fontWeight: '600', transition: '0.3s' }}
          >
            <FaUserFriends /> Customer Wise
          </button>
          <button 
            onClick={() => setReportType('item')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'item' ? '4px solid #2196f3' : 'none', color: reportType === 'item' ? '#2196f3' : '#666', fontWeight: '600', transition: '0.3s' }}
          >
            <FaBoxOpen /> Item Wise (RM & FP)
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>
             Loading Analytics Data...
          </div>
        ) : (
          <div ref={reportRef} className="report-content" style={{ width: '100%' }}>
            
            {reportType === 'customer' && (
              <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '20px' }}>Customer Wise Sales Summary (FP & RM Breakdown)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Customer Name</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>FP Sale (Rs)</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>RM Sale (Rs)</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Net Combined Sale (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterCustomer.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px' }}>{row.customerName || row.name || 'Unknown'}</td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '500' }}>
                          {Number(row.fpAmount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '500' }}>
                          {Number(row.rmAmount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2c3e50' }}>
                          {Number(row.netTotalAmount || row.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f1f8ff', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ padding: '15px', borderTop: '2px solid #2196f3' }}>Grand Total</td>
                      <td style={{ padding: '15px', textAlign: 'right', borderTop: '2px solid #2196f3',  }}>
                        {filterCustomer.reduce((sum, row) => sum + Number(row.fpAmount || 0), 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', borderTop: '2px solid #2196f3', }}>
                        {filterCustomer.reduce((sum, row) => sum + Number(row.rmAmount || 0), 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', borderTop: '2px solid #2196f3', color: '#1565c0', fontSize: '1.1rem' }}>
                        {filterCustomer.reduce((sum, row) => sum + Number(row.netTotalAmount || row.total || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {reportType === 'item' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px' }}>
                
                {/* Finished Products Table */}
                <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: '10px' }}> <FaFileInvoiceDollar /> Finished Product Sales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                      <tr style={{ background: '#fff5f5', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Item Name</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFP.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{item.itemName}</td>
                          <td>{item.qty}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#fff5f5', fontWeight: 'bold' }}>
                      <tr>
                        <td style={{ padding: '12px', borderTop: '2px solid #e53935' }}>Grand Total</td>
                        <td style={{ borderTop: '2px solid #e53935' }}>{filteredFP.reduce((s, i) => s + Number(i.qty || 0), 0)}</td>
                        <td style={{ textAlign: 'right', borderTop: '2px solid #e53935' }}>{filteredFP.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Raw Materials Table */}
                <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#43a047', display: 'flex', alignItems: 'center', gap: '10px' }}> <MdScience /> Raw Material Sales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                      <tr style={{ background: '#f1f8e9', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Material Name</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRM.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{item.itemName}</td>
                          <td>{item.qty}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f1f8e9', fontWeight: 'bold', borderTop: '2px solid #43a047' }}>
                      <tr>
                        <td style={{ padding: '12px' }}>Grand Total</td>
                        <td>{filteredRM.reduce((s, i) => s + Number(i.qty || 0), 0)}</td>
                        <td style={{ textAlign: 'right' }}>{filteredRM.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;