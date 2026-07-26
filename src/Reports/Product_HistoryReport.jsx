import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import Select from 'react-select';
import { FaArrowLeft, FaSearch, FaFileExcel, FaFilePdf, FaImage, FaSync } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../downloads-btn.css';

const Product_HistoryReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState('RM');
  const [txGroup, setTxGroup] = useState('ALL'); // ALL | PURCHASE | SALE
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOptions, setItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const fetchItems = async (tab) => {
    try {
      const endpoint = tab === 'RM' ? '/add-materials' : '/product-batches';
      const params = tab === 'RM' ? {} : { type: 'summary' };
      const res = await api.get(endpoint, { params });
      const responseData = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const uniqueItems = new Map();
      responseData.forEach((item) => {
        if (tab === 'RM') {
          const key = item.rm_id;
          const label = item.name || item.rm_name || `Material ${key}`;
          if (key && !uniqueItems.has(key)) {
            uniqueItems.set(key, { value: key, label });
          }
          return;
        }

        const productId = item.product_master_id || item.product?.id || item.id;
        const label = item.product?.name || item.name || item.product_name || `Product ${productId}`;
        if (productId && !uniqueItems.has(productId)) {
          uniqueItems.set(productId, { value: productId, label });
        }
      });

      setItemOptions(Array.from(uniqueItems.values()));
    } catch (err) {
      console.error('Item list fetch error:', err);
      setItemOptions([]);
    }
  };

  const fetchHistoryReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/history', {
        params: {
          fromDate,
          toDate,
          search: searchTerm,
          tab: activeTab,
          itemId: selectedItem?.value,
          txGroup
        }
      });
      setReportData(response.data.data || []);
    } catch (err) {
      console.error('History Fetch Error:', err);
      toast.error('Unable to fetch history report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeTab = async () => {
      await fetchItems(activeTab);
      setSelectedItem(null);
      setSearchTerm('');
    };
    initializeTab();
  }, [activeTab]);

  useEffect(() => {
    fetchHistoryReport();
  }, [activeTab, txGroup, fromDate, toDate, selectedItem]);

  // --- Fixed Sale & Profit Calculations ---
  const isSaleRow = (type = '') => {
    const t = (type || '').toLowerCase();
    return t.includes('sale') || t.includes('invoice') || t.includes('dispatch');
  };

  const isReturnRow = (type = '') => {
    const t = (type || '').toLowerCase();
    return t.includes('return');
  };

  const getSignedValueByQuantity = (row, fieldName) => {
    const rawValue = Number(row?.[fieldName] || 0);
    const qtySign = Math.sign(Number(row?.quantity || 0));
    if (qtySign === 0) {
      return isReturnRow(row?.transaction_type) ? -Math.abs(rawValue) : Math.abs(rawValue);
    }
    return Math.abs(rawValue) * qtySign;
  };

  const saleRows = reportData.filter(r => isSaleRow(r.transaction_type));
  const netSaleQty = saleRows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  const netSaleRevenue = saleRows.reduce((sum, r) => sum + getSignedValueByQuantity(r, 'total_price'), 0);

  const totalSaleCost = saleRows.reduce((sum, r) => {
    const signedQty = Number(r.quantity || 0);
    return sum + signedQty * Number(r.unit_cost || 0);
  }, 0);

  const netProfit = netSaleRevenue - totalSaleCost;

  const totalQuantity = reportData.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalValue = reportData.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
  const uniqueItemsCount = new Set(reportData.map((row) => row.item_id)).size;

  const getReferenceLink = (row) => {
    const invoiceNo = row.reference_no;
    if (!invoiceNo) return null;

    if (row.item_type === 'Raw Material') {
      return `/rm-invoice/${invoiceNo}`;
    }
    if (row.item_type === 'Finished Product') {
      if (isSaleRow(row.transaction_type)) {
        return `/fp-invoice-detail/${invoiceNo}`;
      }
      return null;
    }
    return null;
  };

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    if (val < 0) {
      return `-Rs. ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    if (!reportData.length) return toast.error('No data available to export!');

    const wb = XLSX.utils.book_new();

    // 1. Title & Meta Rows
    const titleRow = [`${activeTab === 'RM' ? 'Raw Material' : 'Finished Product'} History & Profit Report`];
    const dateRow = [`Date Range: ${fromDate} to ${toDate}`];
    const emptyRow = [];

    // 2. Table Headers
    const headers = [
      'Date',
      'Item Name',
      'Type',
      'Ref No.',
      'Party',
      'Qty',
      'Selling/Tx Price',
      'Avg Cost Price',
      'Total Value'
    ];

    // 3. Table Data
    const bodyRows = reportData.map((row) => [
      row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : '',
      row.item_name || '',
      row.transaction_type || '',
      row.reference_no || '',
      row.entity_name || '',
      Number(row.quantity || 0),
      Number(row.unit_price || 0),
      Number(row.unit_cost || 0),
      Number(row.total_price || 0)
    ]);

    // 4. Combined Sheet Data
    const sheetData = [titleRow, dateRow, emptyRow, headers, ...bodyRows];

    // 5. Profitability Summary Rows (agar SALE/ALL filter active ho)
    if (txGroup === 'SALE' || txGroup === 'ALL') {
      sheetData.push(emptyRow);
      sheetData.push(['PROFITABILITY ANALYSIS SUMMARY']);
      sheetData.push(['NET SALE QTY (Sale - Return)', netSaleQty]);
      sheetData.push(['NET REVENUE (Sale - Return)', netSaleRevenue]);
      sheetData.push(['TOTAL COST OF GOODS SOLD', totalSaleCost]);
      sheetData.push([netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', netProfit]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // --- STYLING LOGIC ---
    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };

    // Style Header Row (Row Index 3)
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 3, c: C });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '334155' } }, // Slate Dark Header
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderStyle
        };
      }
    }

    // Style Title (Row 0)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: '1E293B' } }
      };
    }

    // Auto-fit Column Widths
    const colWidths = [
      { wch: 14 }, // Date
      { wch: 25 }, // Item Name
      { wch: 18 }, // Type
      { wch: 16 }, // Ref No.
      { wch: 22 }, // Party
      { wch: 10 }, // Qty
      { wch: 16 }, // Price
      { wch: 16 }, // Cost
      { wch: 16 }  // Total
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'History Report');
    XLSX.writeFile(wb, `${activeTab}_History_Report_${today}.xlsx`);
  };
  const exportToPDF = () => {
    if (!reportData.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`${activeTab === 'RM' ? 'Raw Material' : 'Finished Product'} History & Profit Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 22);

    const tableHeaders = [['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Unit Price', 'Cost Price', 'Total']];
    const tableData = reportData.map(row => [
      row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : '',
      row.item_name || '',
      row.transaction_type || '',
      row.reference_no || '',
      row.entity_name || '',
      Number(row.quantity || 0).toLocaleString(),
      `Rs. ${Number(row.unit_price || 0).toFixed(2)}`,
      `Rs. ${Number(row.unit_cost || 0).toFixed(2)}`,
      `Rs. ${Number(row.total_price || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });

    doc.save(`${activeTab}_History_Report_${today}.pdf`);
  };

  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${activeTab}_History_Report_${today}.png`;
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
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} className='back-btn'><FaArrowLeft /></button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>FP & RM History & Profit Report</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <input type='date' value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            <input type='date' value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            <input type='text' placeholder='Search...' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
            
            <button onClick={fetchHistoryReport} style={{ padding: '7px 14px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}><FaSearch /> Search</button>
            <button onClick={fetchHistoryReport} style={{ padding: '7px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}><FaSync /> Refresh</button>
            
            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
              <button className="download-button bg-excel" onClick={exportToExcel} title="Export Excel"><FaFileExcel size={14} /></button>
              <button className="download-button bg-pdf" onClick={exportToPDF} title="Export PDF"><FaFilePdf size={14} /></button>
              <button className="download-button bg-png" onClick={exportToImage} title="Export Image"><FaImage size={14} /></button>
            </div>
          </div>
        </div>

        {/* Tab & Transaction Type Filter Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setActiveTab('RM')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'RM' ? '3px solid #334155' : 'none', color: activeTab === 'RM' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Raw Material</button>
            <button onClick={() => setActiveTab('FP')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'FP' ? '3px solid #334155' : 'none', color: activeTab === 'FP' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Finished Product</button>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <button onClick={() => setTxGroup('ALL')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'ALL' ? '#334155' : 'transparent', color: txGroup === 'ALL' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>All Types</button>
            <button onClick={() => setTxGroup('PURCHASE')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'PURCHASE' ? '#0284c7' : 'transparent', color: txGroup === 'PURCHASE' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              {activeTab === 'FP' ? 'Production / Batch' : 'Purchase / Return'}
            </button>
            <button onClick={() => setTxGroup('SALE')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'SALE' ? '#16a34a' : 'transparent', color: txGroup === 'SALE' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Sale / Return</button>
          </div>
        </div>

        {/* Paper Container */}
        <div ref={reportRef} style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '280px', flex: '1 1 280px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Filter by Item</label>
              <Select options={itemOptions} value={selectedItem} onChange={setSelectedItem} placeholder='Select Item...' isClearable isSearchable />
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }}>
              <strong>Items:</strong> {uniqueItemsCount}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }}>
              <strong>Total Qty:</strong> {totalQuantity.toLocaleString()}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px' }}>
              <strong>Total Value:</strong> {formatCurrency(totalValue)}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading report data...</div>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    {['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Selling/Tx Price', 'Avg Cost Price', 'Total Value'].map(h => (
                      <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No transactions found for the selected filters.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => {
                      const refLink = getReferenceLink(row);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : ''}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>{row.item_name}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.transaction_type}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>
                            {refLink ? <Link to={refLink} style={{ color: '#0284c7' }}>{row.reference_no}</Link> : row.reference_no || 'N/A'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.entity_name}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600' }}>{Number(row.quantity || 0).toLocaleString()}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{formatCurrency(row.unit_price)}</td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#0284c7', fontWeight: '600' }}>{formatCurrency(row.unit_cost)}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600' }}>{formatCurrency(row.total_price)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Profitability Summary Section */}
          {(txGroup === 'SALE' || txGroup === 'ALL') && (
            <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '15px', background: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>PROFITABILITY ANALYSIS SUMMARY</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>NET SALE QTY (Sale - Return)</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{netSaleQty.toLocaleString()}</span>
                </div>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>NET REVENUE (Sale - Return)</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>{formatCurrency(netSaleRevenue)}</span>
                </div>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL COST OF GOODS SOLD</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(totalSaleCost)}</span>
                </div>
                <div style={{ 
                  padding: '10px', 
                  background: netProfit >= 0 ? '#f0fdf4' : '#fef2f2', 
                  border: `1px solid ${netProfit >= 0 ? '#16a34a' : '#dc2626'}`, 
                  borderRadius: '4px' 
                }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                    {netProfit >= 0 ? 'NET PROFIT / MARGIN' : 'NET LOSS / MARGIN'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Product_HistoryReport;