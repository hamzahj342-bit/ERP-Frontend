import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { 
  FaArrowLeft, 
  FaFileExcel, 
  FaFilePdf, 
  FaSync, 
  FaSearch, 
  FaFilter,
  FaFileInvoiceDollar,
  FaBoxes,
  FaExclamationTriangle,
  FaMoneyBillWave
} from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

const PurchaseRegister = () => {
  const navigate = useNavigate();

  // Initialize date range defaults
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // Component States
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [agingBucketFilter, setAgingBucketFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [suppliersList, setSuppliersList] = useState([]);
  const [registerData, setRegisterData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Suppliers List
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/entities/suppliers');
        setSuppliersList(res.data || []);
      } catch (err) {
        console.error('Failed to fetch suppliers list:', err);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch Purchase Register Data
  const fetchPurchaseRegister = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/purchase-register', {
        params: { 
          fromDate, 
          toDate, 
          supplier_id: selectedSupplier 
        }
      });
      setRegisterData(response.data?.register || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Purchase Register data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseRegister();
  }, [fromDate, toDate, selectedSupplier]);

  // Client-Side Filtering
  const filteredRegister = registerData.filter(row => {
    if (agingBucketFilter !== 'ALL' && row.aging_bucket !== agingBucketFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    return (
      (row.grn_no && row.grn_no.toLowerCase().includes(term)) ||
      (row.supplier_invoice_no && row.supplier_invoice_no.toLowerCase().includes(term)) ||
      (row.supplier_name && row.supplier_name.toLowerCase().includes(term)) ||
      (row.supplier_ntn && row.supplier_ntn.toLowerCase().includes(term))
    );
  });

  // Calculate Totals
  const totals = filteredRegister.reduce((acc, row) => {
    acc.taxable += Number(row.taxable_amount || 0);
    acc.tax += Number(row.tax_amount || 0);
    acc.freight += Number(row.freight_amount || 0);
    acc.net += Number(row.net_amount || 0);
    if (row.aging_days > 60) acc.overdueCount += 1;
    return acc;
  }, { taxable: 0, tax: 0, freight: 0, net: 0, overdueCount: 0 });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAgingBadge = (days) => {
    if (days > 90) return { bg: '#fef2f2', text: '#dc2626', label: '90+ Days' };
    if (days > 60) return { bg: '#fff7ed', text: '#c2410c', label: '61-90 Days' };
    if (days > 30) return { bg: '#fefce8', text: '#a16207', label: '31-60 Days' };
    return { bg: '#f0fdf4', text: '#15803d', label: '0-30 Days' };
  };

  // Excel Export
  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');

    const wb = XLSX.utils.book_new();
    const titleRow = [`PURCHASE REGISTER REPORT`];
    const dateRow = [`Period: ${fromDate} to ${toDate} | Supplier: ${selectedSupplier === 'ALL' ? 'All Suppliers' : 'Selected Supplier'}`];
    const emptyRow = [];

    const headers = ['Date', 'GRN No.', 'Supplier Invoice', 'Supplier Name', 'NTN/GST', 'Type', 'Taxable Amt', 'Tax Amt', 'Freight', 'Net Amount', 'Aging (Days)', 'Bucket'];

    const bodyRows = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.grn_no,
      r.supplier_invoice_no,
      r.supplier_name,
      r.supplier_ntn,
      r.type,
      r.taxable_amount,
      r.tax_amount,
      r.freight_amount,
      r.net_amount,
      r.aging_days,
      r.aging_bucket
    ]);

    const summaryRow = ['TOTALS', '', '', '', '', '', totals.taxable, totals.tax, totals.freight, totals.net, '', ''];

    const sheetData = [titleRow, dateRow, emptyRow, headers, ...bodyRows, emptyRow, summaryRow];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    ws['!cols'] = Array(12).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register');
    XLSX.writeFile(wb, `Purchase_Register_${today}.xlsx`);
  };

  // PDF Export
  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('PURCHASE REGISTER REPORT', 14, 15);
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 21);

    const headers = [['Date', 'GRN No.', 'Supp. Invoice', 'Supplier Name', 'Type', 'Taxable', 'Tax', 'Net Amount', 'Aging']];
    const body = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.grn_no,
      r.supplier_invoice_no,
      r.supplier_name,
      r.type,
      `Rs. ${r.taxable_amount.toFixed(2)}`,
      `Rs. ${r.tax_amount.toFixed(2)}`,
      `Rs. ${r.net_amount.toFixed(2)}`,
      `${r.aging_days} Days`
    ]);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 26,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save(`Purchase_Register_${today}.pdf`);
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      <MainLayout />
      <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>

        {/* Header Bar */}
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '15px',
          background: '#fff',
          padding: '16px 20px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => navigate(-1)} 
              style={{
                border: 'none',
                background: '#f1f5f9',
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center'
              }}>
              <FaArrowLeft />
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                Purchase Register & Aging Report
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Track purchases, supplier bills, input tax, and payables aging
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={exportToExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}>
              <FaFileExcel /> Excel
            </button>
            <button 
              onClick={exportToPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}>
              <FaFilePdf /> PDF
            </button>
            <button 
              onClick={fetchPurchaseRegister}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}>
              <FaSync /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Toolbar Panel */}
        <div style={{ 
          background: '#fff', 
          padding: '18px 20px', 
          borderRadius: '10px', 
          marginBottom: '20px', 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
              SUPPLIER FILTER
            </label>
            <select 
              value={selectedSupplier} 
              onChange={e => setSelectedSupplier(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
              <option value="ALL">All Suppliers</option>
              {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
              FROM DATE
            </label>
            <input 
              type='date' 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
              TO DATE
            </label>
            <input 
              type='date' 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
              AGING BUCKET
            </label>
            <select 
              value={agingBucketFilter} 
              onChange={e => setAgingBucketFilter(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
              <option value="ALL">All Aging Buckets</option>
              <option value="0-30 Days">0-30 Days</option>
              <option value="31-60 Days">31-60 Days</option>
              <option value="61-90 Days">61-90 Days</option>
              <option value="90+ Days">90+ Days (Overdue)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
              SEARCH RECORDS
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type='text' 
                placeholder='GRN, Supplier, NTN...' 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
              />
              <FaSearch style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8', fontSize: '12px' }} />
            </div>
          </div>
        </div>

        {/* Dashboard Dynamic Metric Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '15px', 
          marginBottom: '20px' 
        }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>INVOICES COUNT</span>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{filteredRegister.length}</div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TOTAL TAXABLE AMOUNT</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>{formatCurrency(totals.taxable)}</div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #eab308', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>INPUT TAX (PAID)</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{formatCurrency(totals.tax)}</div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>NET PURCHASES TOTAL</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{formatCurrency(totals.net)}</div>
          </div>

          <div style={{ 
            background: totals.overdueCount > 0 ? '#fef2f2' : '#fff', 
            padding: '16px', 
            borderRadius: '10px', 
            borderLeft: `4px solid ${totals.overdueCount > 0 ? '#dc2626' : '#cbd5e1'}`, 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: totals.overdueCount > 0 ? '#dc2626' : '#64748b' }}>OVERDUE BILLS (&gt;60 DAYS)</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: totals.overdueCount > 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>{totals.overdueCount} Bills</div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
              <FaSync className="spin" style={{ marginBottom: '10px', fontSize: '20px' }} />
              <div>Fetching Purchase Register...</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Date</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>GRN No.</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Supp. Inv No.</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Supplier Name</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Type</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: '700' }}>Taxable</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: '700' }}>Tax</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: '700' }}>Freight</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: '700' }}>Net Amount</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontWeight: '700' }}>Aging</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontWeight: '700' }}>Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No purchase records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map((row, idx) => {
                      const badge = getAgingBadge(row.aging_days);
                      return (
                        <tr 
                          key={row.master_id || idx} 
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            background: idx % 2 === 0 ? '#fff' : '#f8fafc' 
                          }}>
                          <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                            {row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: '700', color: '#0284c7' }}>{row.grn_no}</td>
                          <td style={{ padding: '12px 10px' }}>{row.supplier_invoice_no}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{row.supplier_name}</div>
                            {row.supplier_ntn !== 'N/A' && <small style={{ color: '#94a3b8', fontSize: '10px' }}>NTN: {row.supplier_ntn}</small>}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: row.type === 'PurchaseReturn' ? '#fef2f2' : '#f0fdf4',
                              color: row.type === 'PurchaseReturn' ? '#dc2626' : '#16a34a'
                            }}>
                              {row.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>{formatCurrency(row.taxable_amount)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#d97706' }}>{formatCurrency(row.tax_amount)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b' }}>{formatCurrency(row.freight_amount)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: row.net_amount < 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(row.net_amount)}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>{row.aging_days} Days</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span style={{ 
                              background: badge.bg, 
                              color: badge.text, 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '700',
                              display: 'inline-block'
                            }}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PurchaseRegister;