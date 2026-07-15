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
          itemId: selectedItem?.value
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
  }, [activeTab, fromDate, toDate, selectedItem]);

  const handleSearch = () => {
    fetchHistoryReport();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // --- Dynamic Summary Aggregates ---
  const rmSummary = {
    totalPurchase: reportData
      .filter((r) => r.transaction_type === 'Purchase')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    totalPurchaseReturn: reportData
      .filter((r) => r.transaction_type === 'Purchase Return')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    totalSale: reportData
      .filter((r) => r.transaction_type === 'Sale')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    totalSaleReturn: reportData
      .filter((r) => r.transaction_type === 'Sale Return')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
  };

  const fpSummary = {
    totalProduction: reportData
      .filter((r) => r.transaction_type === 'Production')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    totalSale: reportData
   
      .filter((r) => r.transaction_type?.includes('Sale') && !r.transaction_type?.includes('Return'))
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    totalSaleReturn: reportData
      .filter((r) => r.transaction_type?.includes('Sale') && r.transaction_type?.includes('Return'))
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
  };
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
      if (row.transaction_type?.includes('Sale') || row.transaction_type?.includes('Return')) {
        return `/fp-invoice-detail/${invoiceNo}`;
      }
      return null;
    }
    return null;
  };

  const exportToExcel = () => {
    if (!reportData.length) {
      toast.error('No data available to export!');
      return;
    }

    const wb = XLSX.utils.book_new();
    const headers = ['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Price', 'Total'];

    const headerRow = headers.map((h) => ({
      v: h,
      s: { fill: { fgColor: { rgb: '475569' } }, font: { color: { rgb: 'FFFFFF' }, bold: true }, alignment: { horizontal: 'center' } }
    }));
    const bodyRows = reportData.map((row) => [
      row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : '',
      row.item_name || '',
      row.transaction_type || '',
      row.reference_no || '',
      row.entity_name || '',
      Number(row.quantity || 0),
      Number(row.unit_price || 0).toFixed(2),
      Number(row.total_price || 0).toFixed(2)
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'History Report');
    XLSX.writeFile(wb, `History_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData.length) {
      toast.error('No data available to export!');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `History Report - ${activeTab === 'RM' ? 'Raw Material' : 'Finished Product'}`;

    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 21);
    doc.text(`Generated: ${today}`, 14, 26);

    const body = reportData.map((r) => [
      r.transaction_date ? new Date(r.transaction_date).toISOString().split('T')[0] : '',
      r.item_name || '',
      r.transaction_type || '',
      r.reference_no || '',
      r.entity_name || '',
      Number(r.quantity || 0).toLocaleString(),
      Number(r.unit_price || 0).toFixed(2),
      Number(r.total_price || 0).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Price', 'Total']],
      body,
      headStyles: { fillColor: [71, 85, 105], halign: 'center' }, // Slate-600
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 45 },
        5: { cellWidth: 20 },
        6: { cellWidth: 25 },
        7: { cellWidth: 25 }
      }
    });

    doc.save(`History_Report_${today}.pdf`);
  };

  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `History_Report_${today}.png`;
    link.click();
  };

  // Custom Select Style for ERP consistency
  const selectCustomStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: '#cbd5e1',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#94a3b8'
      }
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999 })
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f8fafc' }}>
      <MainLayout />
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} className='back-btn' >
              <FaArrowLeft />
            </button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>FP & RM History Report</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {/* Date Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>From:</span>
              <input type='date' value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>To:</span>
              <input type='date' value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155' }} />
            </div>

            <input
              type='text'
              placeholder='Search party, ref no...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', minWidth: '180px', fontSize: '13px', color: '#334155' }}
            />
            
            <button onClick={handleSearch} style={{ padding: '7px 14px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaSearch size={12} /> Search
            </button>
            
            <button onClick={() => fetchHistoryReport()} style={{ padding: '7px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaSync size={12} /> Refresh
            </button>
            
            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', alignItems: 'center' }}>
              <button className="download-button bg-excel" onClick={exportToExcel} title="Export Excel"><FaFileExcel size={14} /></button>
              <button className="download-button bg-pdf" onClick={exportToPDF} title="Export PDF"><FaFilePdf size={14} /></button>
              <button className="download-button bg-png" onClick={exportToPNG} title="Export PNG"><FaImage size={14} /></button>
            </div>
          </div>
        </div>

        {/* Muted Tab Navigation */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '1px solid #cbd5e1' }}>
          <button
            onClick={() => handleTabChange('RM')}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'RM' ? '3px solid #334155' : 'none', color: activeTab === 'RM' ? '#1e293b' : '#64748b', fontWeight: '600', fontSize: '14px' }}
          >
            Raw Material History
          </button>
          <button
            onClick={() => handleTabChange('FP')}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'FP' ? '3px solid #334155' : 'none', color: activeTab === 'FP' ? '#1e293b' : '#64748b', fontWeight: '600', fontSize: '14px' }}
          >
            Finished Product History
          </button>
        </div>

        {/* Paper Container */}
        <div ref={reportRef} style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          
          {/* Dropdown & Dynamic Metric Widgets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '280px', flex: '1 1 280px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Filter by Item</label>
              <Select
                options={itemOptions}
                value={selectedItem}
                onChange={setSelectedItem}
                placeholder={activeTab === 'RM' ? 'Select Raw Material...' : 'Select Finished Product...'}
                isClearable
                isSearchable
                styles={selectCustomStyles}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Total Items</label>
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', minWidth: '100px', fontWeight: '700', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px', color: '#1e293b' }}>{uniqueItemsCount}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Total Qty</label>
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', minWidth: '100px', fontWeight: '700', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px', color: '#1e293b' }}>{totalQuantity.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Total Value</label>
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', minWidth: '120px', fontWeight: '700', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '13px', color: '#1e293b' }}>{totalValue.toFixed(2)}</div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '14px' }}>Loading history report...</div>
          ) : reportData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>No Transactions Found</div>
          ) : (
            <>
              {/* Data Table */}
              <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                      {['Date', 'Item Name', 'Type', 'Ref No.', 'Party', 'Qty', 'Price', 'Total'].map(header => (
                        <th key={header} style={{ padding: '10px 12px', textAlign: 'left', color: '#334155', fontWeight: '600', fontSize: '13px' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, index) => {
                      const refLink = getReferenceLink(row);
                      return (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '10px 12px', color: '#334155', fontSize: '13px' }}>{row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : ''}</td>
                          <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '500', fontSize: '13px' }}>{row.item_name || 'N/A'}</td>
                          <td style={{ padding: '10px 12px', color: '#475569', fontSize: '13px' }}>{row.transaction_type || ''}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                            {refLink ? (
                              <Link to={refLink} style={{ color: '#0284c7', textDecoration: 'none', borderBottom: '1px dashed #0284c7', fontWeight: '500' }}>
                                {row.reference_no || 'N/A'}
                              </Link>
                            ) : (
                              <span style={{ color: '#475569' }}>{row.reference_no || 'N/A'}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569', fontSize: '13px' }}>{row.entity_name || ''}</td>
                          <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '600', fontSize: '13px' }}>{Number(row.quantity || 0).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', color: '#334155', fontSize: '13px' }}>{Number(row.unit_price || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: '600', fontSize: '13px' }}>{Number(row.total_price || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Minimal / Gray Professional ERP Bottom Summary cards */}
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary Totals</h4>
                
                {activeTab === 'RM' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #64748b' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Purchase</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {rmSummary.totalPurchase.toFixed(2)}</span>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #94a3b8' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Purchase Return</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {rmSummary.totalPurchaseReturn.toFixed(2)}</span>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #475569' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Sale</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {rmSummary.totalSale.toFixed(2)}</span>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #334155' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Sale Return</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {rmSummary.totalSaleReturn.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #64748b' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Production</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {fpSummary.totalProduction.toFixed(2)}</span>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #475569' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Sale</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {fpSummary.totalSale.toFixed(2)}</span>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #334155' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Total Sale Return</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Rs. {fpSummary.totalSaleReturn.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Product_HistoryReport;