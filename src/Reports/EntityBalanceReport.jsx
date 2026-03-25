import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaUserFriends, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSearch, FaUserTie, FaTruckLoading } from 'react-icons/fa';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const EntityBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = new Date().toISOString().split('T')[0];

  const [reportType, setReportType] = useState('customer'); // customer, supplier, employee
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      // Backend route jo humne discuss kiya tha
      const response = await api.get('/reports/entity-balance', {
        params: { type: reportType }
      });
      setData(response.data);
    } catch (err) {
      console.error("Error fetching balances:", err);
      alert("Failed to fetch balance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [reportType]);

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- EXPORT FUNCTIONS (Exactly like your Sales Report) ---

  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, bottom: { style: "thin" } }
    };

    const cellStyle = { alignment: { horizontal: "left" }, border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { bottom: { style: "thin" } } };

    let wb = XLSX.utils.book_new();
    const headers = [
      { v: "SR #", s: headerStyle },
      { v: "NAME", s: headerStyle },
      { v: "CLOSING BALANCE (RS)", s: headerStyle }
    ];

    const rows = filteredData.map((item, idx) => [
      { v: idx + 1, s: cellStyle },
      { v: item.name, s: cellStyle },
      { v: Number(item.balance), s: amountStyle }
    ]);

    let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Balances");
    XLSX.writeFile(wb, `${reportType}_Balances_${today}.xlsx`);
  };

  const exportToPDF = () => {
  try {
    const doc = new jsPDF();

    // 1. Header Section
    doc.setFontSize(18);
    doc.text(`${reportType.toUpperCase()} BALANCE REPORT`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${today}`, 14, 22);

    // 2. Data Prepare Karein (Check ke data khali na ho)
    const tableData = filteredData.map((item, idx) => [
      idx + 1,
      item.name || 'N/A',
      { 
        content: Number(item.balance || 0).toLocaleString(), 
        styles: { halign: 'right' } 
      }
    ]);

    // 3. Grand Total Calculation
    const totalAmount = filteredData.reduce((sum, row) => sum + Number(row.balance || 0), 0);

    // 4. AutoTable Call (Naya Syntax)
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Entity Name', 'Balance (Rs)']],
      body: tableData,
      foot: [[
        { content: 'Grand Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: totalAmount.toLocaleString(), styles: { halign: 'right', fontStyle: 'bold' } }
      ]],
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243] },
      footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] }
    });

    // 5. Save File
    doc.save(`${reportType}_Balance_Report.pdf`);
    
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("PDF banane mein masla aya hai. Console check karein.");
  }
};
  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `${reportType}_Balances_${today}.png`;
      link.click();
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f4f7f6' }}>
      <MainLayout />
      
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate(-1)} className='back-btn'>
              <FaArrowLeft />
            </button>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>Financial Balances Summary</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <FaSearch style={{ position: 'absolute', left: '10px', color: '#999' }} />
                <input 
                   type="text" 
                   placeholder="Search Name..." 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   style={{ padding: '8px 8px 8px 35px', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }} 
                />
            </div>

            <div style={{ display: 'flex', gap: '5px', borderLeft: '1px solid #eee', paddingLeft: '10px' }}>
               <button onClick={exportToExcel} title="Excel" style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFileExcel /></button>
               <button onClick={exportToPDF} title="PDF" style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFilePdf /></button>
               <button onClick={exportToPNG} title="PNG" style={{ padding: '8px 12px', background: '#ef6c00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaImage /></button>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button 
            onClick={() => setReportType('customer')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'customer' ? '4px solid #2196f3' : 'none', color: reportType === 'customer' ? '#2196f3' : '#666', fontWeight: '600' }}
          >
            <FaUserFriends /> Customers
          </button>
          <button 
            onClick={() => setReportType('supplier')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'supplier' ? '4px solid #43a047' : 'none', color: reportType === 'supplier' ? '#43a047' : '#666', fontWeight: '600' }}
          >
            <FaTruckLoading /> Suppliers
          </button>
          {/* <button 
            onClick={() => setReportType('employee')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'employee' ? '4px solid #ef6c00' : 'none', color: reportType === 'employee' ? '#ef6c00' : '#666', fontWeight: '600' }}
          >
            <FaUserTie /> Employees
          </button> */}
        </div>

        {/* Content Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>Loading Balances...</div>
        ) : (
          <div ref={reportRef} style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '20px', textTransform: 'capitalize' }}>{reportType} Wise Closing Balances</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', width: '80px' }}>#</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Name</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Closing Balance (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', color: '#7f8c8d' }}>{index + 1}</td>
                    <td style={{ padding: '15px', fontWeight: '500' }}>{row.name}</td>
                    <td style={{ 
                        padding: '15px', 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: row.balance >= 0 ? '#2e7d32' : '#c62828' 
                    }}>
                      {Math.abs(row.balance).toLocaleString()} 
                      <span style={{ fontSize: '10px', marginLeft: '5px' }}>{row.balance >= 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: '#f1f8ff', fontWeight: 'bold' }}>
                <tr>
                  <td colSpan="2" style={{ padding: '15px', borderTop: '2px solid #2196f3' }}>Grand Total</td>
                  <td style={{ padding: '15px', textAlign: 'right', borderTop: '2px solid #2196f3', color: '#1565c0', fontSize: '1.1rem' }}>
                    {filteredData.reduce((sum, row) => sum + row.balance, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityBalanceReport;