import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaSearch, FaFilter, FaFileExcel, FaFilePdf, FaImage } from 'react-icons/fa';
import { MdScience, MdPrecisionManufacturing } from 'react-icons/md';

// Export Libraries
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const ProductionReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(); // PNG capture ke liye reference
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('summary'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/production-report', {
        params: { fromDate, toDate, reportType }
      });
      setData(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm('');
    fetchReport();
  }, [reportType]);

  const filteredData = data.filter(item => 
    (reportType === 'summary' ? item.productName : item.materialName)
    ?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 📗 PRO EXCEL EXPORT ---
  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "4CAF50" } }, // Production Green Theme
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" },
      border: { bottom: { style: "thin", color: { rgb: "000000" } } }
    };

    const cellStyle = { alignment: { horizontal: "left" } };
    const numStyle = { alignment: { horizontal: "right" } };

    const headers = [
      { v: reportType === 'summary' ? "PRODUCT NAME" : "MATERIAL NAME", s: headerStyle },
      { v: reportType === 'summary' ? "TOTAL BATCHES" : "QTY USED", s: headerStyle },
      { v: reportType === 'summary' ? "PRODUCED QTY" : "VALUE (RS)", s: headerStyle }
    ];

    const rows = filteredData.map(row => [
      { v: reportType === 'summary' ? row.productName : row.materialName, s: cellStyle },
      { v: reportType === 'summary' ? row.batchCount : Number(row.usedQty), s: cellStyle },
      { v: Number(reportType === 'summary' ? row.totalQty : row.totalCost), s: numStyle }
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production Report");
    XLSX.writeFile(wb, `Production_${reportType}_${today}.xlsx`);
  };

  // --- 📕 PDF EXPORT ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Production Report - ${reportType.toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);

    const head = reportType === 'summary' 
      ? [['Product Name', 'Total Batches', 'Produced Qty']] 
      : [['Material Name', 'Qty Used', 'Value (Rs)']];

    const body = filteredData.map(row => [
      reportType === 'summary' ? row.productName : row.materialName,
      reportType === 'summary' ? row.batchCount : Number(row.usedQty).toFixed(2),
      Number(reportType === 'summary' ? row.totalQty : row.totalCost).toLocaleString()
    ]);

    doc.autoTable({
      startY: 30,
      head: head,
      body: body,
      headStyles: { fillColor: [76, 175, 80] } // Production Green
    });
    doc.save(`Production_Report_${today}.pdf`);
  };

  // --- 🖼️ PNG IMAGE EXPORT ---
  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Production_Analytics_${today}.png`;
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
            <button onClick={() => navigate('/reports')} className='back-btn'><FaArrowLeft /></button>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Production Analytics</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <button onClick={fetchReport} style={{ padding: '8px 15px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> <FaFilter /> Filter</button>
            
            {/* Export Buttons Section */}
            <div style={{ display: 'flex', gap: '5px', borderLeft: '1px solid #eee', paddingLeft: '10px' }}>
              <button onClick={exportToExcel} title="Excel" style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFileExcel /></button>
              <button onClick={exportToPDF} title="PDF" style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFilePdf /></button>
              <button onClick={exportToPNG} title="PNG" style={{ padding: '8px 12px', background: '#ef6c00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaImage /></button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px', maxWidth: '400px', position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '15px', top: '12px', color: '#999' }} />
          <input 
            type="text" 
            placeholder={reportType === 'summary' ? "Search Product..." : "Search Material..."} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 40px', borderRadius: '30px', border: '1px solid #ddd', outline: 'none' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button onClick={() => setReportType('summary')} style={{ padding: '12px 25px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: reportType === 'summary' ? '4px solid #4caf50' : 'none', color: reportType === 'summary' ? '#4caf50' : '#666', fontWeight: 'bold' }}><MdPrecisionManufacturing /> Summary</button>
          {/* Note: In future you can enable consumption tab here */}
        </div>

        {/* Data Table Area - Reference for PNG Export */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading Production Data...</div>
        ) : (
          <div ref={reportRef} style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>{reportType === 'summary' ? 'Product Name' : 'Material Name'}</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>{reportType === 'summary' ? 'Total Batches' : 'Qty Used'}</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>{reportType === 'summary' ? 'Produced Qty' : 'Value (Rs)'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>{reportType === 'summary' ? row.productName : row.materialName}</td>
                    <td style={{ padding: '15px' }}>{reportType === 'summary' ? row.batchCount : Number(row.usedQty).toFixed(2)}</td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                      {Number(reportType === 'summary' ? row.totalQty : row.totalCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionReport;