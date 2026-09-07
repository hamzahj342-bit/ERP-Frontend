import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaWallet } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const CashReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [voucherType, setVoucherType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerData, setRegisterData] = useState([]);
  const [apiTotals, setApiTotals] = useState({
    count: 0,
    voucher_count: 0,
    total_amount: 0,
    by_type: { JV: 0, CPV: 0, CRV: 0, BPV: 0, BRV: 0 },
  });

  const fetchCashReport = async () => {
    if (!fromDate || !toDate) {
      toast.warning('Please select from and to dates.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/cash-report', {
        params: {
          fromDate,
          toDate,
          voucher_type: voucherType,
        },
      });
      setRegisterData(response.data?.register || []);
      setApiTotals(
        response.data?.totals || {
          count: 0,
          voucher_count: 0,
          total_amount: 0,
          by_type: { JV: 0, CPV: 0, CRV: 0, BPV: 0, BRV: 0 },
        }
      );
    } catch (err) {
      console.error('Cash Report Fetch Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Cash Report.');
      setRegisterData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashReport();
  }, [fromDate, toDate, voucherType]);

  const filteredRegister = registerData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (row.invoice_no && row.invoice_no.toLowerCase().includes(term)) ||
      (row.voucher_type && row.voucher_type.toLowerCase().includes(term)) ||
      (row.description && row.description.toLowerCase().includes(term)) ||
      (row.from_display && row.from_display.toLowerCase().includes(term)) ||
      (row.to_display && row.to_display.toLowerCase().includes(term))
    );
  });

  const totals = filteredRegister.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.total_amount += Number(row.amount || 0);
      return acc;
    },
    { count: 0, total_amount: 0 }
  );

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    return `Rs. ${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const exportToExcel = () => {
    if (!filteredRegister.length) {
      toast.warning('No data to export.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const titleRow = ['CASH / VOUCHER REPORT'];
    const dateRow = [
      `Period: ${fromDate} to ${toDate} | Filter: ${voucherType} | Total: ${formatCurrency(totals.total_amount)}`,
    ];
    const header = [
      'Date',
      'Voucher No',
      'Type',
      'Description',
      'From (Account)',
      'To (Account)',
      'Amount',
    ];
    const rows = filteredRegister.map((r) => [
      r.transaction_date || '',
      r.invoice_no || '',
      r.voucher_type || '',
      r.description || '',
      r.from_display || '',
      r.to_display || '',
      Number(r.amount || 0),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, [], header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Report');
    XLSX.writeFile(wb, `Cash_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRegister.length) {
      toast.warning('No data to export.');
      return;
    }
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Cash / Voucher Report', 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate} | Filter: ${voucherType}`, 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Voucher No', 'Type', 'Description', 'From', 'To', 'Amount']],
      body: filteredRegister.map((r) => [
        r.transaction_date || '',
        r.invoice_no || '',
        r.voucher_type || '',
        (r.description || '').slice(0, 30),
        (r.from_display || '-').slice(0, 35),
        (r.to_display || '-').slice(0, 35),
        Number(r.amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`Cash_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Cash_Report_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button
                  type="button"
                  className="back-btn erp-back-btn"
                  onClick={() => navigate('/reports')}
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaWallet className="report-title-icon" /> Cash / Voucher Report
                  </h3>
                  <p className="report-description">
                    All payment vouchers (JV, CPV, CRV, BPV, BRV) for the selected date range.
                  </p>
                </div>
              </div>
              {filteredRegister.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF">
                    <FaFilePdf />
                  </button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel">
                    <FaFileExcel />
                  </button>
                  <button type="button" className="icon-button bg-png" onClick={exportToImage} title="PNG">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input
                type="date"
                className="date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <select
                className="date-input"
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
              >
                <option value="ALL">All Vouchers</option>
                <option value="CASH">Cash (CPV + CRV)</option>
                <option value="BANK">Bank (BPV + BRV)</option>
                <option value="JV">Journal (JV)</option>
                <option value="CPV">Cash Payment (CPV)</option>
                <option value="CRV">Cash Receipt (CRV)</option>
                <option value="BPV">Bank Payment (BPV)</option>
                <option value="BRV">Bank Receipt (BRV)</option>
              </select>
              <input
                type="text"
                className="date-input"
                placeholder=" Search voucher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="get-report-btn"
                onClick={() => {
                  const day = localToday();
                  setFromDate(day);
                  setToDate(day);
                }}
                style={
                  fromDate === toDate && fromDate === localToday()
                    ? { backgroundColor: '#0f172a', color: '#fff' }
                    : undefined
                }
                title="Show today's vouchers only"
              >
                Daily
              </button>
              <button type="button" className="get-report-btn" onClick={fetchCashReport}>
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            <div className="pl-header-section">
              <h3 className="pl-statement-title">CASH / VOUCHER REPORT</h3>
              <p className="pl-statement-subtitle">
                Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Entries:</strong>{' '}
                <span className="pl-summary-value">{totals.count}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Vouchers:</strong>{' '}
                <span className="pl-summary-value">{apiTotals.voucher_count || 0}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Total Amount:</strong>{' '}
                <span className="pl-summary-value">{formatCurrency(totals.total_amount)}</span>
              </div>
              {['JV', 'CPV', 'CRV', 'BPV', 'BRV'].map((t) => (
                <div key={t} className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>{t}:</strong>{' '}
                  <span className="pl-summary-value">{apiTotals.by_type?.[t] || 0}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Cash Report...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table">
                  <thead>
                    <tr>
                      {['Date', 'Voucher No.', 'Type', 'Description', 'From', 'To', 'Amount'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegister.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                          No vouchers found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredRegister.map((row) => (
                        <tr key={`${row.invoice_no}-${row.entry_id}`}>
                          <td>{row.transaction_date || ''}</td>
                          <td className="font-bold">
                            <Link
                              to={`/payment-transaction/${row.invoice_no}`}
                              style={{ color: '#0284c7' }}
                            >
                              {row.invoice_no}
                            </Link>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#f1f5f9',
                                color: '#0f172a',
                              }}
                            >
                              {row.voucher_type}
                            </span>
                          </td>
                          <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>
                            {row.description || '-'}
                          </td>
                          <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>
                            {row.from_display || '-'}
                          </td>
                          <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>
                            {row.to_display || '-'}
                          </td>
                          <td className="text-right font-bold">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredRegister.length > 0 && (
                    <tfoot>
                      <tr className="amount-row">
                        <td colSpan="6" className="font-bold">
                          Total
                        </td>
                        <td className="text-right font-bold">{formatCurrency(totals.total_amount)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CashReport;
