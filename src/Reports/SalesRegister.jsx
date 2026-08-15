import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../downloads-btn.css';

const SalesRegister = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // Active Tab: 'FP' (Finished Goods) | 'RM' (Raw Material)
  const [activeTab, setActiveTab] = useState('RM');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [taxableType, setTaxableType] = useState('ALL'); // 'ALL' | 'TAXABLE' | 'NON_TAXABLE'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [registerData, setRegisterData] = useState([]);

  // Fetch Sales Register Data from General Ledger Backend API
  const fetchSalesRegister = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/sales-register', {
        params: { 
          fromDate, 
          toDate, 
          taxable_type: taxableType
        }
      });

      const fullRegister = response.data?.register || [];
      
      // Filter dataset based on selected Tab
      const targetSaleType = activeTab === 'FP' ? 'Finished Goods' : 'Raw Material';
      const filteredList = fullRegister.filter(row => row.sale_type === targetSaleType);

      setRegisterData(filteredList);
    } catch (err) {
      console.error('Sales Register Fetch Error:', err);
      toast.error('Failed to load Sales Register data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesRegister();
  }, [fromDate, toDate, taxableType, activeTab]);

  // Client-side search filtering
  const filteredRegister = registerData.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    
    return (
      (row.invoice_no && row.invoice_no.toLowerCase().includes(term)) ||
      (row.customer_name && row.customer_name.toLowerCase().includes(term)) ||
      (row.customer_id && String(row.customer_id).toLowerCase().includes(term)) ||
      (row.invoice_type && row.invoice_type.toLowerCase().includes(term))
    );
  });

  // Dynamic Totals based on search/filter results
  const totals = filteredRegister.reduce((acc, row) => {
    acc.total_revenue += Number(row.revenue || 0);
    acc.total_cogs += Number(row.cogs || 0);
    acc.net_profit += Number(row.net_profit || 0);
    return acc;
  }, { total_revenue: 0, total_cogs: 0, net_profit: 0 });

  // Dynamic Navigation Link
  const getInvoiceDetailLink = (row) => {
    if (!row.invoice_no) return null;
    if (activeTab === 'RM') return `/rm-invoice/${row.invoice_no}`;
    if (activeTab === 'FP') return `/fp-invoice-detail/${row.invoice_no}`;
    return null;
  };

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    if (val < 0) {
      return `-Rs. ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Excel Export Logic
  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');

    const wb = XLSX.utils.book_new();
    const titleRow = [`${activeTab === 'RM' ? 'Raw Material' : 'Finished Goods'} Sales Register Report (${taxableType})`];
    const dateRow = [`Period: ${fromDate} to ${toDate}`];
    const emptyRow = [];

    const headers = ['Date', 'Invoice No.', 'Customer Name', 'Taxable', 'Invoice Type', 'Revenue (GL)', 'COGS (GL)', 'Net Profit'];

    const bodyRows = filteredRegister.map((row) => [
      row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      row.invoice_no || '',
      row.customer_name || 'N/A',
      row.is_taxable ? 'Taxable' : 'Non-Taxable',
      row.invoice_type || '',
      Number(row.revenue || 0),
      Number(row.cogs || 0),
      Number(row.net_profit || 0)
    ]);

    const summaryHeader = ['FINANCIAL REGISTER SUMMARY'];
    const revRow = ['TOTAL REVENUE', totals.total_revenue];
    const cogsRow = ['TOTAL COGS', totals.total_cogs];
    const profitRow = [totals.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS', totals.net_profit];

    const sheetData = [titleRow, dateRow, emptyRow, headers, ...bodyRows, emptyRow, summaryHeader, revRow, cogsRow, profitRow];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    ws['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    XLSX.writeFile(wb, `${activeTab}_Sales_Register_${today}.xlsx`);
  };

  // PDF Export Logic
  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`${activeTab === 'RM' ? 'Raw Material' : 'Finished Goods'} Sales Register (${taxableType})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);

    const tableHeaders = [['Date', 'Invoice No.', 'Customer Name', 'Taxable', 'Invoice Type', 'Revenue', 'COGS', 'Net Profit']];
    const tableData = filteredRegister.map(row => [
      row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      row.invoice_no || '',
      row.customer_name || 'N/A',
      row.is_taxable ? 'Yes' : 'No',
      row.invoice_type || '',
      `Rs. ${Number(row.revenue || 0).toFixed(2)}`,
      `Rs. ${Number(row.cogs || 0).toFixed(2)}`,
      `Rs. ${Number(row.net_profit || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });

    doc.save(`${activeTab}_Sales_Register_${today}.pdf`);
  };

  // PNG Export
  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${activeTab}_Sales_Register_${today}.png`;
      link.click();
    } catch (err) {
      console.error('PNG Export Error:', err);
      toast.error('Failed to generate PNG image.');
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f8fafc' }}>
      <MainLayout />
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} className='back-btn'><FaArrowLeft /></button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
              Sales Register ({activeTab === 'RM' ? 'Raw Material' : 'Finished Goods'})
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <input type='date' value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            <input type='date' value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            
            {/* Taxable Type Filter */}
            <select 
              value={taxableType} 
              onChange={(e) => setTaxableType(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500' }}
            >
              <option value="ALL">All Invoices</option>
              <option value="NON_TAXABLE">Non-Taxable Only</option>
              <option value="TAXABLE">Taxable Only</option>
            </select>

            {/* Search Input Box */}
            <input 
              type='text' 
              placeholder='Search Invoice/Customer...' 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
            />
            
            <button onClick={fetchSalesRegister} style={{ padding: '7px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}><FaSync /> Refresh</button>
            
            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
              <button className="download-button bg-excel" onClick={exportToExcel} title="Export Excel"><FaFileExcel size={14} /></button>
              <button className="download-button bg-pdf" onClick={exportToPDF} title="Export PDF"><FaFilePdf size={14} /></button>
              <button className="download-button bg-png" onClick={exportToImage} title="Export Image"><FaImage size={14} /></button>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => setActiveTab('RM')} 
              style={{ 
                padding: '8px 16px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                borderBottom: activeTab === 'RM' ? '3px solid #334155' : 'none', 
                color: activeTab === 'RM' ? '#1e293b' : '#64748b', 
                fontWeight: '600' 
              }}>
              Raw Material
            </button>
            <button 
              onClick={() => setActiveTab('FP')} 
              style={{ 
                padding: '8px 16px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                borderBottom: activeTab === 'FP' ? '3px solid #334155' : 'none', 
                color: activeTab === 'FP' ? '#1e293b' : '#64748b', 
                fontWeight: '600' 
              }}>
              Finished Product
            </button>
          </div>
        </div>

        {/* Printable Container */}
        <div ref={reportRef} style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          
          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <strong>Invoices Count:</strong> {filteredRegister.length}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <strong>Total Revenue:</strong> {formatCurrency(totals.total_revenue)}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <strong>Total COGS:</strong> {formatCurrency(totals.total_cogs)}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: totals.net_profit >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${totals.net_profit >= 0 ? '#bbf7d0' : '#fecaca'}`, fontSize: '13px' }}>
              <strong style={{ color: totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                {totals.net_profit >= 0 ? 'Net Profit:' : 'Net Loss:'} {formatCurrency(totals.net_profit)}
              </strong>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Sales Register...</div>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    {['Date', 'Invoice No.', 'Customer Name', 'Tax Status', 'Invoice Type', 'Revenue', 'COGS', 'Net Profit'].map(h => (
                      <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No matching sales register entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map((row, idx) => {
                      const link = getInvoiceDetailLink(row);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.date ? new Date(row.date).toISOString().split('T')[0] : ''}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600' }}>
                            {link ? <Link to={link} style={{ color: '#0284c7' }}>{row.invoice_no}</Link> : row.invoice_no || 'N/A'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.customer_name || 'N/A'}</td>
                          <td style={{ padding: '10px', fontSize: '12px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              backgroundColor: row.is_taxable ? '#e0f2fe' : '#f1f5f9',
                              color: row.is_taxable ? '#0369a1' : '#475569'
                            }}>
                              {row.is_taxable ? 'Taxable' : 'Non-Taxable'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.invoice_type}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600', color: row.revenue < 0 ? '#dc2626' : '#1e293b' }}>
                            {formatCurrency(row.revenue)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#0284c7', fontWeight: '600' }}>
                            {formatCurrency(row.cogs)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: row.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                            {formatCurrency(row.net_profit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary */}
          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '15px', background: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
              FINANCIAL REGISTER SUMMARY ({activeTab === 'RM' ? 'RAW MATERIAL' : 'FINISHED GOODS'})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL REVENUE</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>{formatCurrency(totals.total_revenue)}</span>
              </div>
              <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL COGS</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(totals.total_cogs)}</span>
              </div>
              <div style={{ 
                padding: '10px', 
                background: totals.net_profit >= 0 ? '#f0fdf4' : '#fef2f2', 
                border: `1px solid ${totals.net_profit >= 0 ? '#16a34a' : '#dc2626'}`, 
                borderRadius: '4px' 
              }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                  {totals.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                </span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                  {formatCurrency(totals.net_profit)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SalesRegister;