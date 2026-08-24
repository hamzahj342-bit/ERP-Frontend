import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaSearch } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../downloads-btn.css';

const ReceivableRegister = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  
  // React-Select Customer Option
  const [selectedCustomerOption, setSelectedCustomerOption] = useState({ value: 'ALL', label: 'All Customers' });
  const [customerOptions, setCustomerOptions] = useState([{ value: 'ALL', label: 'All Customers' }]);
  
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL'); // ALL, FP, RM
  const [taxTypeFilter, setTaxTypeFilter] = useState('ALL');
  const [agingBucketFilter, setAgingBucketFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [registerData, setRegisterData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Customers from `/entities/customer` for React-Select Dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/entities/customer');
        const rawList = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.customers || res.data?.data || []);

        const uniqueCustomers = new Map();
        rawList.forEach(c => {
          const id = c.id || c.customer_id || c._id;
          const name = c.name || c.customer_name || c.company_name || 'Unknown Customer';
          if (id && !uniqueCustomers.has(id)) {
            uniqueCustomers.set(id, { value: id, label: name });
          }
        });

        setCustomerOptions([
          { value: 'ALL', label: 'All Customers' },
          ...Array.from(uniqueCustomers.values())
        ]);
      } catch (err) {
        console.error('Failed to fetch customers list:', err);
        toast.error('Could not load customers list.');
      }
    };
    fetchCustomers();
  }, []);

  // Fetch Customer Receivables Report Data
  const fetchReceivablesReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/receivable-register', {
        params: { 
          fromDate, 
          toDate, 
          customer_id: selectedCustomerOption?.value || 'ALL',
          item_type: itemTypeFilter,
          tax_type: taxTypeFilter 
        }
      });
      const data = response.data?.register || response.data?.data || response.data || [];
      setRegisterData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Customer Receivables Fetch Error:', err);
      toast.error('Failed to load Receivables Report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivablesReport();
  }, [fromDate, toDate, selectedCustomerOption, itemTypeFilter, taxTypeFilter]);

  // Client-Side Search & Filter
  const filteredRegister = registerData.filter(row => {
    if (agingBucketFilter !== 'ALL' && row.aging_bucket !== agingBucketFilter) return false;
    if (paymentStatusFilter !== 'ALL' && row.payment_status !== paymentStatusFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    const docNo = String(row.doc_no || '').toLowerCase();
    const invNo = String(row.invoice_no || '').toLowerCase();
    const custName = String(row.customer_name || '').toLowerCase();
    const status = String(row.payment_status || '').toLowerCase();

    return docNo.includes(term) || invNo.includes(term) || custName.includes(term) || status.includes(term);
  });

  // Calculate Financial Totals
  const totals = filteredRegister.reduce((acc, row) => {
    acc.taxable += Number(row.taxable_amount || 0);
    acc.tax += Number(row.tax_amount || 0);
    acc.freight += Number(row.freight_amount || 0);
    acc.net += Number(row.net_amount || 0);
    acc.paid += Number(row.paid_amount || 0);
    acc.balance += Number(row.balance_amount || 0);
    if (Number(row.aging_days || 0) > 60 && row.payment_status !== 'Paid') acc.overdueCount += 1;
    return acc;
  }, { taxable: 0, tax: 0, freight: 0, net: 0, paid: 0, balance: 0, overdueCount: 0 });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    if (num < 0) {
      return `-Rs. ${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAgingBadge = (bucket, days) => {
    if (bucket === 'Paid') return { bg: '#dcfce7', text: '#15803d', label: 'Paid' };
    const d = Number(days || 0);
    if (d > 90) return { bg: '#fef2f2', text: '#dc2626', label: '90+ Days' };
    if (d > 60) return { bg: '#fff7ed', text: '#c2410c', label: '61-90 Days' };
    if (d > 30) return { bg: '#fefce8', text: '#a16207', label: '31-60 Days' };
    return { bg: '#f0fdf4', text: '#15803d', label: '0-30 Days' };
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid': return { bg: '#dcfce7', text: '#16a34a' };
      case 'Partial': return { bg: '#fefce8', text: '#ca8a04' };
      default: return { bg: '#fef2f2', text: '#dc2626' };
    }
  };

  // Custom react-select styling
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '33px',
      height: '33px',
      fontSize: '13px',
      minWidth: '180px',
      borderColor: '#cbd5e1'
    }),
    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    indicatorsContainer: (base) => ({ ...base, height: '31px' })
  };

  // Exports
  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const wb = XLSX.utils.book_new();
    const titleRow = ['CUSTOMER RECEIVABLES REPORT'];
    const dateRow = [`Period: ${fromDate} to ${toDate} | Item Type: ${itemTypeFilter}`];
    const headers = ['Date', 'Doc No', 'Invoice No', 'Type', 'Customer Name', 'Tax Type', 'Taxable Amt', 'Tax Amt', 'Freight', 'Net Amount', 'Paid Amt', 'Balance Amt', 'Status', 'Aging (Days)', 'Bucket'];

    const bodyRows = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.doc_no || 'N/A',
      r.invoice_no || 'N/A',
      r.item_type || 'N/A',
      r.customer_name || 'N/A',
      r.is_taxable || 'N/A',
      Number(r.taxable_amount || 0),
      Number(r.tax_amount || 0),
      Number(r.freight_amount || 0),
      Number(r.net_amount || 0),
      Number(r.paid_amount || 0),
      Number(r.balance_amount || 0),
      r.payment_status || 'Unpaid',
      Number(r.aging_days || 0),
      r.aging_bucket || '0-30 Days'
    ]);

    const sheetData = [titleRow, dateRow, [], headers, ...bodyRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = Array(15).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Receivables');
    XLSX.writeFile(wb, `Receivables_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Customer Receivables Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate} | Type: ${itemTypeFilter}`, 14, 21);

    const headers = [['Date', 'Doc No', 'Invoice', 'Type', 'Customer Name', 'Net Amount', 'Paid', 'Balance', 'Status', 'Aging']];
    const body = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.doc_no || 'N/A',
      r.invoice_no || 'N/A',
      r.item_type || 'N/A',
      r.customer_name || 'N/A',
      `Rs. ${Number(r.net_amount || 0).toFixed(2)}`,
      `Rs. ${Number(r.paid_amount || 0).toFixed(2)}`,
      `Rs. ${Number(r.balance_amount || 0).toFixed(2)}`,
      r.payment_status || 'Unpaid',
      `${r.aging_days || 0} Days`
    ]);

    autoTable(doc, { head: headers, body: body, startY: 26, theme: 'grid', headStyles: { fillColor: [51, 65, 85] }, styles: { fontSize: 8 } });
    doc.save(`Receivables_Report_${today}.pdf`);
  };

  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Receivables_Report_${today}.png`;
      link.click();
    } catch (err) {
      console.error('PNG Export Error:', err);
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f8fafc' }}>
      <MainLayout />
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>

        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} className="back-btn"><FaArrowLeft /></button>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
                Customer Receivables & Aging Report
              </h2>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap', width: '100%' }}>
            <input 
              type='date' 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />
            <input 
              type='date' 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />

            {/* React Select Customer Dropdown */}
            <div style={{ width: '180px' }}>
              <Select
                options={customerOptions}
                value={selectedCustomerOption}
                onChange={(option) => setSelectedCustomerOption(option)}
                placeholder="Search Customer..."
                styles={customSelectStyles}
                isSearchable
              />
            </div>

            {/* FP / RM Filter */}
            <select 
              value={itemTypeFilter} 
              onChange={(e) => setItemTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              <option value="ALL">All Items</option>
              <option value="FP">Finished Goods</option>
              <option value="RM">Raw Material</option>
            </select>

            {/* Tax Filter */}
            <select 
              value={taxTypeFilter} 
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500' }}
            >
              <option value="ALL">All Tax Types</option>
              <option value="Taxable">Taxable</option>
              <option value="Non-Taxable">Non-Taxable</option>
            </select>

            {/* Payment Filter */}
            <select 
              value={paymentStatusFilter} 
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500' }}
            >
              <option value="ALL">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>

            {/* Aging Bucket Filter */}
            <select 
              value={agingBucketFilter} 
              onChange={(e) => setAgingBucketFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500' }}
            >
              <option value="ALL">All Aging Buckets</option>
              <option value="Paid">Paid</option>
              <option value="0-30 Days">0-30 Days</option>
              <option value="31-60 Days">31-60 Days</option>
              <option value="61-90 Days">61-90 Days</option>
              <option value="90+ Days">90+ Days (Overdue)</option>
            </select>

            {/* Search Box */}
            <div style={{ position: 'relative'}}>
              <input 
                type='text' 
                placeholder='Doc, Customer, Invoice...' 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ padding: '6px 10px 6px 28px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
              />
              <FaSearch style={{ position: 'absolute', left: '8px', top: '9px', color: '#94a3b8', fontSize: '11px' }} />
            </div>

            {/* <button onClick={fetchReceivablesReport} style={{ padding: '7px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaSync />
            </button> */}
            
            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px' }}>
              <button className="download-button bg-excel" onClick={exportToExcel} title="Export Excel"><FaFileExcel size={14} /></button>
              <button className="download-button bg-pdf" onClick={exportToPDF} title="Export PDF"><FaFilePdf size={14} /></button>
              <button className="download-button bg-png" onClick={exportToImage} title="Export Image"><FaImage size={14} /></button>
            </div>
          </div>
        </div>

        {/* Report Canvas */}
        <div ref={reportRef} style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <strong>Invoices Count:</strong> {filteredRegister.length}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <strong>Taxable Total:</strong> {formatCurrency(totals.taxable)}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '13px' }}>
              <strong style={{ color: '#16a34a' }}>Net Sales: {formatCurrency(totals.net)}</strong>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '13px' }}>
              <strong style={{ color: '#15803d' }}>Total Received: {formatCurrency(totals.paid)}</strong>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: totals.balance > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${totals.balance > 0 ? '#fecaca' : '#cbd5e1'}`, fontSize: '13px' }}>
              <strong style={{ color: totals.balance > 0 ? '#dc2626' : '#16a34a' }}>Outstanding Balance: {formatCurrency(totals.balance)}</strong>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '4px', background: totals.overdueCount > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${totals.overdueCount > 0 ? '#fecaca' : '#cbd5e1'}`, fontSize: '13px' }}>
              <strong style={{ color: totals.overdueCount > 0 ? '#dc2626' : '#475569' }}>
                Overdue (&gt;60 Days): {totals.overdueCount} Invoices
              </strong>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <FaSync className="spin" style={{ marginBottom: '8px', fontSize: '18px' }} />
              <div>Fetching Receivables Register...</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>Doc No.</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>Invoice No.</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>Item Type</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>Customer Name</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>Tax Type</th>
                    {/* <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#334155' }}>Taxable</th> */}
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#334155' }}>Net Amount</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#334155' }}>Received</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#334155' }}>Balance</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>Aging</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan="13" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No receivable records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map((row, idx) => {
                      const badge = getAgingBadge(row.aging_bucket, row.aging_days);
                      const statusBadge = getPaymentStatusBadge(row.payment_status);

                      return (
                        <tr key={row.master_id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '10px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#0284c7' }}>
                            {row.doc_no}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600' }}>
                            {row.invoice_no !== 'N/A' ? (
                              <Link 
                                to={row.item_type === 'FP' ? `/sale-invoice/${encodeURIComponent(row.invoice_no)}` : `/rm-sale-invoice/${encodeURIComponent(row.invoice_no)}`} 
                                style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: '600' }}
                              >
                                {row.invoice_no}
                              </Link>
                            ) : (
                              <span style={{ color: '#475569' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: row.item_type === 'FP' ? '#e0e7ff' : '#fef3c7',
                              color: row.item_type === 'FP' ? '#3730a3' : '#92400e'
                            }}>
                              {row.item_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{row.customer_name || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: row.is_taxable === 'Taxable' ? '#e0f2fe' : '#f1f5f9',
                              color: row.is_taxable === 'Taxable' ? '#0369a1' : '#64748b'
                            }}>
                              {row.is_taxable}
                            </span>
                          </td>
                          {/* <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right' }}>{formatCurrency(row.taxable_amount)}</td> */}
                          <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', fontWeight: '700', color: row.net_amount < 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(row.net_amount)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', color: '#15803d', fontWeight: '600' }}>
                            {formatCurrency(row.paid_amount)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', color: row.balance_amount > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                            {formatCurrency(row.balance_amount)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                            <span style={{
                              background: statusBadge.bg,
                              color: statusBadge.text,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {row.payment_status || 'Unpaid'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                            {row.aging_days ? `${row.aging_days} Days` : '0 Days'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              background: badge.bg, 
                              color: badge.text, 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '600',
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

          {/* Financial Summary Footer */}
          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '15px', background: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
              RECEIVABLES SUMMARY
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {/* <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL TAXABLE AMOUNT</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0284c7' }}>{formatCurrency(totals.taxable)}</span>
              </div> */}
              <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL OUTPUT TAX</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#d97706' }}>{formatCurrency(totals.tax)}</span>
              </div>
              <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL NET SALES</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{formatCurrency(totals.net)}</span>
              </div>
              <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #15803d', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL RECEIVED</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#15803d' }}>{formatCurrency(totals.paid)}</span>
              </div>
              <div style={{ padding: '10px', background: totals.balance > 0 ? '#fef2f2' : '#fff', border: `1px solid ${totals.balance > 0 ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>OUTSTANDING RECEIVABLES</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: totals.balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(totals.balance)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReceivableRegister;