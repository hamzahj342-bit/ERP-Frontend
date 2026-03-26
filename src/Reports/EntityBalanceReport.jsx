import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaUserFriends, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSearch, FaUserTie, FaTruckLoading } from 'react-icons/fa';
import Pagination from '../Components/Pagination'; // Pagination component import kiya
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const EntityBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = new Date().toISOString().split('T')[0];

  const [reportType, setReportType] = useState('customer'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(""); 
  const [data, setData] = useState([]);
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // --- 🔍 Native Debounce Logic ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Nayi search par page 1 par reset karein
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/entity-balance', {
        params: { 
          type: reportType,
          page: page,
          limit: 50,
          search: debouncedSearch
        }
      });
      
      // Backend response structure ke mutabiq data set karein
      setData(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (err) {
      console.error("Error fetching balances:", err);
      toast.error("Failed to fetch balance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [reportType, page, debouncedSearch]);

  // --- EXPORT FUNCTIONS ---

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

    const rows = data.map((item, idx) => [
      { v: (page - 1) * 50 + (idx + 1), s: cellStyle },
      { v: item.name, s: cellStyle },
      { v: Number(item.balance), s: amountStyle }
    ]);

    let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Balances");
    XLSX.writeFile(wb, `${reportType}_Balances_Page${page}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${reportType.toUpperCase()} BALANCE REPORT`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Page: ${page} | Generated on: ${today}`, 14, 22);

      const tableData = data.map((item, idx) => [
        (page - 1) * 50 + (idx + 1),
        item.name || 'N/A',
        { content: Number(item.balance || 0).toLocaleString(), styles: { halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['#', 'Entity Name', 'Balance (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] }
      });

      doc.save(`${reportType}_Balance_Page${page}.pdf`);
    } catch (error) {
      toast.error("PDF Export failed");
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `${reportType}_Balances_Page${page}.png`;
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
          {['customer', 'supplier'].map((type) => (
            <button 
              key={type}
              onClick={() => { setReportType(type); setPage(1); }}
              style={{ 
                padding: '12px 25px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                borderBottom: reportType === type ? `4px solid ${type === 'customer' ? '#2196f3' : '#43a047'}` : 'none', 
                color: reportType === type ? (type === 'customer' ? '#2196f3' : '#43a047') : '#666', 
                fontWeight: '600',
                textTransform: 'capitalize'
              }}
            >
              {type === 'customer' ? <FaUserFriends /> : <FaTruckLoading />} {type}s
            </button>
          ))}
        </div>

        {/* Content Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>Loading Balances...</div>
        ) : (
          <div ref={reportRef} style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{reportType} Wise Closing Balances</h3>
                <span style={{ fontSize: '14px', color: '#666' }}>Showing {data.length} of {totalItems} records</span>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', width: '80px' }}>#</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Name</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Closing Balance (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? data.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', color: '#7f8c8d' }}>{(page - 1) * 50 + (index + 1)}</td>
                    <td style={{ padding: '15px', fontWeight: '500' }}>{row.name}</td>
                    <td style={{ 
                        padding: '15px', 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: row.balance >= 0 ? '#2e7d32' : '#c62828' 
                    }}>
                      {Math.abs(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                      <span style={{ fontSize: '11px', marginLeft: '5px' }}>{row.balance >= 0 ? '(Dr)' : '(Cr)'}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center' }}>No records found.</td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination Component */}
            <div style={{ marginTop: '30px' }}>
                <Pagination 
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => setPage(newPage)}
                />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityBalanceReport;