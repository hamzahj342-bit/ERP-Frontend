import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import Select from 'react-select';
import { FaArrowLeft, FaSearch, FaFileExcel, FaFilePdf, FaImage, FaSync, FaHistory } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const Product_HistoryReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

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

  const selectStyles = {
    control: (p) => ({ ...p, minHeight: "32px", height: "32px", borderRadius: "6px", borderColor: "#e2e8f0", boxShadow: "none", fontSize: "12px" }),
    valueContainer: (p) => ({ ...p, padding: "0 8px", height: "30px" }),
    indicatorsContainer: (p) => ({ ...p, height: "30px" }),
    input: (p) => ({ ...p, margin: 0, padding: 0 }),
    singleValue: (p) => ({ ...p, fontSize: "12px", color: "#334155" }),
    placeholder: (p) => ({ ...p, fontSize: "12px", color: "#94a3b8" }),
    menu: (p) => ({ ...p, zIndex: 9999, fontSize: "12px" }),
    option: (p) => ({ ...p, fontSize: "12px", padding: "6px 10px" })
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
                    <FaHistory className="report-title-icon" /> FP & RM History & Profit Report
                  </h3>
                  <p className="report-description">View transaction history and profitability analysis for raw materials and finished products.</p>
                </div>
              </div>
              {reportData.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToImage} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <input type="text" className="date-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="react-select-shell">
                <Select options={itemOptions} value={selectedItem} onChange={setSelectedItem} placeholder="Select Item..." isClearable isSearchable styles={selectStyles} />
              </div>
              <button type="button" className="get-report-btn" onClick={fetchHistoryReport}>
                <FaSearch /> Search
              </button>
            </div>

            <div className="filter-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="button" onClick={() => setActiveTab('RM')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'RM' ? '3px solid #334155' : 'none', color: activeTab === 'RM' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Raw Material</button>
                <button type="button" onClick={() => setActiveTab('FP')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'FP' ? '3px solid #334155' : 'none', color: activeTab === 'FP' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Finished Product</button>
              </div>
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <button type="button" onClick={() => setTxGroup('ALL')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'ALL' ? '#334155' : 'transparent', color: txGroup === 'ALL' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>All Types</button>
                <button type="button" onClick={() => setTxGroup('PURCHASE')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'PURCHASE' ? '#0284c7' : 'transparent', color: txGroup === 'PURCHASE' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                  {activeTab === 'FP' ? 'Production / Batch' : 'Purchase / Return'}
                </button>
                <button type="button" onClick={() => setTxGroup('SALE')} style={{ padding: '6px 14px', border: 'none', borderRadius: '4px', background: txGroup === 'SALE' ? '#16a34a' : 'transparent', color: txGroup === 'SALE' ? '#fff' : '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Sale / Return</button>
              </div>
            </div>
          </div>

          {reportData.length > 0 && (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">{activeTab === 'RM' ? 'RAW MATERIAL' : 'FINISHED PRODUCT'} HISTORY & PROFIT REPORT</h3>
                <p className="pl-statement-subtitle">Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong></p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Items:</strong> <span className="pl-summary-value">{uniqueItemsCount}</span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Total Qty:</strong> <span className="pl-summary-value">{totalQuantity.toLocaleString()}</span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Total Value:</strong> <span className="pl-summary-value">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading report data...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        {['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Selling/Tx Price', 'Avg Cost Price', 'Total Value'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center" style={{ padding: '20px', color: '#64748b' }}>No transactions found for the selected filters.</td>
                        </tr>
                      ) : (
                        reportData.map((row, idx) => {
                          const refLink = getReferenceLink(row);
                          return (
                            <tr key={idx}>
                              <td>{row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : ''}</td>
                              <td className="font-bold">{row.item_name}</td>
                              <td>{row.transaction_type}</td>
                              <td>
                                {refLink ? <Link to={refLink} style={{ color: '#0284c7' }}>{row.reference_no}</Link> : row.reference_no || 'N/A'}
                              </td>
                              <td>{row.entity_name}</td>
                              <td className="text-right font-bold">{Number(row.quantity || 0).toLocaleString()}</td>
                              <td className="text-right">{formatCurrency(row.unit_price)}</td>
                              <td className="text-right font-bold" style={{ color: '#0284c7' }}>{formatCurrency(row.unit_cost)}</td>
                              <td className="text-right font-bold">{formatCurrency(row.total_price)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(txGroup === 'SALE' || txGroup === 'ALL') && (
                <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '15px', background: '#f8fafc', padding: '15px', borderRadius: '6px', marginTop: '15px' }}>
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
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Product_HistoryReport;