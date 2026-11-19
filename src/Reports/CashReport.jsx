import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { 
  FaArrowLeft, 
  FaFileExcel, 
  FaFilePdf, 
  FaImage, 
  FaSync, 
  FaWallet,
  FaListAlt,
  FaBookOpen
} from 'react-icons/fa';
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

  // Active Tab State: Default changed to 'account' (Cash / Bank Account Summary)
  const [activeTab, setActiveTab] = useState('account');

  // Common Filters
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  // --- TAB 1: ALL VOUCHERS REGISTER STATES ---
  const [voucherType, setVoucherType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerData, setRegisterData] = useState([]);
  const [apiTotals, setApiTotals] = useState({
    count: 0,
    voucher_count: 0,
    total_amount: 0,
    payable_amount: 0,
    receivable_amount: 0,
    by_type: { JV: 0, CPV: 0, CRV: 0, BPV: 0, BRV: 0 },
  });

  // --- TAB 2: SPECIFIC CASH/BANK ACCOUNT SUMMARY STATES ---
  const [cashAccounts, setCashAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [summaryData, setSummaryData] = useState({
    opening_balance: 0,
    total_expense: 0,
    total_payable: 0,
    total_receivable: 0,
    closing_balance: 0,
  });
  const [summaryDetails, setSummaryDetails] = useState({
    expense: [],
    payable: [],
    receivable: [],
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // 1. Fetch All Vouchers Report (Tab 1)
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
          payable_amount: 0,
          receivable_amount: 0,
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

  // 2. Fetch Cash/Bank Dropdown List (Tab 2)
  const fetchCashAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await api.get('/reports/cash-accounts');
      const accountsList = response.data?.accounts || response.data || [];

      if (Array.isArray(accountsList)) {
        const options = accountsList.map((acc) => ({
          value: acc.id,
          label: `${acc.account_name} (${acc.account_code || 'N/A'})`,
          ...acc,
        }));
        setCashAccounts(options);

        // Auto-select first cash/bank account if none is currently selected
        if (options.length > 0 && !selectedAccount) {
          setSelectedAccount(options[0]);
        }
      }
    } catch (err) {
      console.error('Fetch Accounts Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Cash/Bank accounts dropdown.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 3. Fetch Account Summary (Tab 2: Opening -> 3 Columns -> Closing)
  const fetchAccountSummary = async () => {
    if (!selectedAccount) return;
    setLoadingSummary(true);
    try {
      const response = await api.get('/reports/daily-cash-summary', {
        params: {
          account_id: selectedAccount.value || selectedAccount.id,
          fromDate,
          toDate,
        },
      });

      if (response.data?.success || response.data?.summary) {
        const resSum = response.data.summary || response.data;
        setSummaryData({
          opening_balance: Number(resSum.opening_balance || 0),
          total_expense: Number(resSum.total_expense || 0),
          total_payable: Number(resSum.total_payable || 0),
          total_receivable: Number(resSum.total_receivable || 0),
          closing_balance: Number(resSum.closing_balance || 0),
        });
        const det = response.data.details || {};
        setSummaryDetails({
          expense: Array.isArray(det.expense) ? det.expense : [],
          payable: Array.isArray(det.payable) ? det.payable : [],
          receivable: Array.isArray(det.receivable) ? det.receivable : [],
        });
      } else {
        setSummaryData({
          opening_balance: 0,
          total_expense: 0,
          total_payable: 0,
          total_receivable: 0,
          closing_balance: 0,
        });
        setSummaryDetails({ expense: [], payable: [], receivable: [] });
      }
    } catch (err) {
      console.error('Account Summary Fetch Error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch account summary.');
      setSummaryDetails({ expense: [], payable: [], receivable: [] });
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchCashReport();
    } else {
      fetchCashAccounts();
    }
  }, [fromDate, toDate, voucherType, activeTab]);

  useEffect(() => {
    if (activeTab === 'account' && selectedAccount) {
      fetchAccountSummary();
    }
  }, [selectedAccount, fromDate, toDate, activeTab]);

  // Tab 1 Filtering & Totals Logic
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

  const rowTouchesPayable = (row) => {
    if (row.is_payable) return true;
    return /payable/i.test(`${row.from_display || ''} ${row.to_display || ''}`);
  };

  const rowTouchesReceivable = (row) => {
    if (row.is_receivable) return true;
    return /receivable/i.test(`${row.from_display || ''} ${row.to_display || ''}`);
  };

  const totals = filteredRegister.reduce(
    (acc, row) => {
      const amt = Number(row.amount || 0);
      acc.count += 1;
      acc.total_amount += amt;
      if (rowTouchesPayable(row)) acc.payable_amount += amt;
      if (rowTouchesReceivable(row)) acc.receivable_amount += amt;
      return acc;
    },
    { count: 0, total_amount: 0, payable_amount: 0, receivable_amount: 0 }
  );

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    return `Rs. ${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const cashAccountLabel =
    selectedAccount?.account_name || selectedAccount?.label || 'Cash/Bank';

  const formatPartyLabel = (row) => {
    if (!row) return '-';
    const name = row.account_name || 'Unknown';
    if (row.entity_name) return `${name} (${row.entity_name})`;
    if (row.account_code) return `${name} (${row.account_code})`;
    return name;
  };

  const formatFromTo = (row, fromCash) => {
    const party = formatPartyLabel(row);
    return fromCash ? `${cashAccountLabel} → ${party}` : `${party} → ${cashAccountLabel}`;
  };

  const hasSummaryDetail =
    summaryDetails.expense.length > 0 ||
    summaryDetails.payable.length > 0 ||
    summaryDetails.receivable.length > 0 ||
    Number(summaryData.opening_balance) !== 0 ||
    Number(summaryData.closing_balance) !== 0;

  const canExport =
    activeTab === 'all'
      ? filteredRegister.length > 0
      : Boolean(selectedAccount) && hasSummaryDetail;

  const excelHeaderStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const excelTitleStyle = {
    font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
  };
  const excelMoneyStyle = {
    alignment: { horizontal: 'right' },
    numFmt: '#,##0.00',
  };

  const styleSheetRows = (ws, headerRowIndex, colCount) => {
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C < colCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      if (ws[addr]) ws[addr].s = excelHeaderStyle;
    }
    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        if (!ws[addr].s) ws[addr].s = {};
        if (R === 0) ws[addr].s = { ...ws[addr].s, ...excelTitleStyle };
      }
    }
  };

  // Export handlers
  const exportToExcel = () => {
    if (!canExport) {
      toast.warning('No data to export.');
      return;
    }
    const wb = XLSX.utils.book_new();

    if (activeTab === 'account') {
      const accountName = cashAccountLabel;
      const title = [[`CASH / BANK ACCOUNT SUMMARY — ${accountName}`]];
      const period = [[`Period: ${fromDate} to ${toDate}`]];
      const blank = [[]];
      const summaryHeader = [['Opening Balance', 'Total Expense', 'Total Payable', 'Total Receivable', 'Closing Balance']];
      const summaryRow = [[
        Number(summaryData.opening_balance || 0),
        Number(summaryData.total_expense || 0),
        Number(summaryData.total_payable || 0),
        Number(summaryData.total_receivable || 0),
        Number(summaryData.closing_balance || 0),
      ]];
      const detailHeader = [['Section', 'Date', 'Voucher No', 'From → To', 'Entity', 'Description', 'Amount']];
      const detailRows = [
        ...summaryDetails.expense.map((r) => [
          'Expense',
          r.date || '',
          r.voucher_no || '',
          formatFromTo(r, true),
          r.entity_name || '',
          r.description || '',
          Number(r.amount || 0),
        ]),
        ...summaryDetails.payable.map((r) => [
          'Payable',
          r.date || '',
          r.voucher_no || '',
          formatFromTo(r, true),
          r.entity_name || '',
          r.description || '',
          Number(r.amount || 0),
        ]),
        ...summaryDetails.receivable.map((r) => [
          'Receivable',
          r.date || '',
          r.voucher_no || '',
          formatFromTo(r, false),
          r.entity_name || '',
          r.description || '',
          Number(r.amount || 0),
        ]),
      ];
      const aoa = [...title, ...period, ...blank, ...summaryHeader, ...summaryRow, ...blank, ...detailHeader, ...detailRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 48 }, { wch: 18 }, { wch: 28 }, { wch: 14 },
      ];
      // style summary header (row 3) and detail header (row 6)
      for (let C = 0; C < 5; C++) {
        const addr = XLSX.utils.encode_cell({ r: 3, c: C });
        if (ws[addr]) ws[addr].s = excelHeaderStyle;
        const moneyAddr = XLSX.utils.encode_cell({ r: 4, c: C });
        if (ws[moneyAddr]) ws[moneyAddr].s = excelMoneyStyle;
      }
      styleSheetRows(ws, 6, 7);
      for (let R = 7; R < 7 + detailRows.length; R++) {
        const moneyAddr = XLSX.utils.encode_cell({ r: R, c: 6 });
        if (ws[moneyAddr]) ws[moneyAddr].s = excelMoneyStyle;
      }
      if (ws.A1) ws.A1.s = excelTitleStyle;
      XLSX.utils.book_append_sheet(wb, ws, 'Account Summary');
      XLSX.writeFile(wb, `Cash_Account_Summary_${fromDate}_to_${toDate}.xlsx`);
      return;
    }

    const titleRow = ['CASH / VOUCHER REPORT'];
    const dateRow = [
      `Period: ${fromDate} to ${toDate} | Filter: ${voucherType} | Total: ${formatCurrency(totals.total_amount)}`,
    ];
    const header = ['Date', 'Voucher No', 'Type', 'Description', 'From (Account)', 'To (Account)', 'Amount'];
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
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 28 }, { wch: 32 }, { wch: 32 }, { wch: 14 },
    ];
    styleSheetRows(ws, 3, 7);
    for (let R = 4; R < 4 + rows.length; R++) {
      const moneyAddr = XLSX.utils.encode_cell({ r: R, c: 6 });
      if (ws[moneyAddr]) ws[moneyAddr].s = excelMoneyStyle;
    }
    if (ws.A1) ws.A1.s = excelTitleStyle;
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Report');
    XLSX.writeFile(wb, `Cash_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (!canExport) {
      toast.warning('No data to export.');
      return;
    }

    const pdfMoney = (n) =>
      Number(n || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const pdfSafe = (text) =>
      String(text || '')
        .replace(/→/g, 'to')
        .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '')
        .trim();

    if (activeTab === 'account') {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const marginX = 12;
      const contentW = pageW - marginX * 2;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Cash / Bank Account Summary', marginX, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(pdfSafe(cashAccountLabel), marginX, 17);
      doc.text(`Period: ${fromDate}  to  ${toDate}`, pageW - marginX, 17, { align: 'right' });

      // Summary KPI table
      autoTable(doc, {
        startY: 28,
        margin: { left: marginX, right: marginX },
        tableWidth: contentW,
        head: [['Opening Balance', 'Total Expense', 'Total Payable', 'Total Receivable', 'Closing Balance']],
        body: [[
          `Rs. ${pdfMoney(summaryData.opening_balance)}`,
          `Rs. ${pdfMoney(summaryData.total_expense)}`,
          `Rs. ${pdfMoney(summaryData.total_payable)}`,
          `Rs. ${pdfMoney(summaryData.total_receivable)}`,
          `Rs. ${pdfMoney(summaryData.closing_balance)}`,
        ]],
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          valign: 'middle',
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        bodyStyles: {
          fontStyle: 'bold',
          halign: 'center',
          textColor: [15, 23, 42],
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: contentW / 5 },
          1: { cellWidth: contentW / 5 },
          2: { cellWidth: contentW / 5 },
          3: { cellWidth: contentW / 5 },
          4: { cellWidth: contentW / 5 },
        },
      });

      const cashShort = pdfSafe(
        selectedAccount?.account_name ||
          String(cashAccountLabel).replace(/\s*\([^)]*\)\s*$/, '') ||
          'Cash/Bank'
      );

      const mapDetail = (rows, section, fromCash) =>
        rows.map((r) => {
          const party = pdfSafe(formatPartyLabel(r));
          return [
            section,
            r.date || '',
            r.voucher_no || '',
            fromCash ? cashShort : party,
            fromCash ? party : cashShort,
            pdfSafe(r.description || '-') || '-',
            pdfMoney(r.amount),
          ];
        });

      const detailBody = [
        ...mapDetail(summaryDetails.expense, 'Expense', true),
        ...mapDetail(summaryDetails.payable, 'Payable', true),
        ...mapDetail(summaryDetails.receivable, 'Receivable', false),
      ];

      if (detailBody.length) {
        const detailStartY = (doc.lastAutoTable?.finalY || 40) + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Transaction Detail', marginX, detailStartY);

        autoTable(doc, {
          startY: detailStartY + 3,
          margin: { left: marginX, right: marginX },
          tableWidth: contentW,
          head: [['Section', 'Date', 'Voucher', 'From', 'To', 'Description', 'Amount (Rs.)']],
          body: detailBody,
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
            valign: 'middle',
            overflow: 'linebreak',
            cellWidth: 'wrap',
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
            textColor: [30, 41, 59],
          },
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            valign: 'middle',
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 24, halign: 'left', fontStyle: 'bold' },
            1: { cellWidth: 24, halign: 'center' },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 52, halign: 'left' },
            4: { cellWidth: 52, halign: 'left' },
            5: { cellWidth: contentW - 24 - 24 - 24 - 52 - 52 - 30, halign: 'left' },
            6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index !== 0) return;
            const v = String(data.cell.raw || '');
            if (v === 'Expense') data.cell.styles.textColor = [180, 83, 9];
            if (v === 'Payable') data.cell.styles.textColor = [185, 28, 28];
            if (v === 'Receivable') data.cell.styles.textColor = [21, 128, 61];
          },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, doc.internal.pageSize.getHeight() - 10, pageW - marginX, doc.internal.pageSize.getHeight() - 10);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text('AK Electrical — Cash Account Summary', marginX, doc.internal.pageSize.getHeight() - 5);
        doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
      }

      doc.save(`Cash_Account_Summary_${fromDate}_to_${toDate}.pdf`);
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 12;
    const contentW = pageW - marginX * 2;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Cash / Voucher Report', marginX, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate}  to  ${toDate}`, marginX, 17);
    doc.text(`Filter: ${voucherType}`, pageW - marginX, 17, { align: 'right' });

    autoTable(doc, {
      startY: 28,
      margin: { left: marginX, right: marginX },
      tableWidth: contentW,
      head: [['Date', 'Voucher No', 'Type', 'Description', 'From', 'To', 'Amount (Rs.)']],
      body: filteredRegister.map((r) => [
        r.transaction_date || '',
        r.invoice_no || '',
        r.voucher_type || '',
        pdfSafe(r.description || '-') || '-',
        pdfSafe(r.from_display || '-') || '-',
        pdfSafe(r.to_display || '-') || '-',
        pdfMoney(r.amount),
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
        valign: 'middle',
        overflow: 'linebreak',
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 42 },
        4: { cellWidth: 55 },
        5: { cellWidth: 55 },
        6: { cellWidth: contentW - 24 - 26 - 16 - 42 - 55 - 55, halign: 'right', fontStyle: 'bold' },
      },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, doc.internal.pageSize.getHeight() - 10, pageW - marginX, doc.internal.pageSize.getHeight() - 10);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('AK Electrical — Cash / Voucher Report', marginX, doc.internal.pageSize.getHeight() - 5);
      doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
    }

    doc.save(`Cash_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    if (!canExport) {
      toast.warning('No data to export.');
      return;
    }
    html2canvas(input, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const link = document.createElement('a');
      const prefix = activeTab === 'account' ? 'Cash_Account_Summary' : 'Cash_Report';
      link.download = `${prefix}_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const selectCustomStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: '38px',
      borderRadius: '6px',
      borderColor: '#cbd5e1',
      fontSize: '13px',
      minWidth: '280px',
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      fontSize: '13px',
    }),
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
                    All payment vouchers (JV, CPV, CRV, BPV, BRV) or specific Cash/Bank account totals.
                  </p>
                </div>
              </div>
              {canExport && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="Download PDF">
                    <FaFilePdf />
                  </button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Download Excel">
                    <FaFileExcel />
                  </button>
                  <button type="button" className="icon-button bg-png" onClick={exportToImage} title="Download Image">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            {/* TAB BUTTONS TOGGLE */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'account' ? '#0f172a' : '#f1f5f9',
                  color: activeTab === 'account' ? '#ffffff' : '#475569',
                }}
              >
                <FaBookOpen /> Cash / Bank Account Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
                  color: activeTab === 'all' ? '#ffffff' : '#475569',
                }}
              >
                <FaListAlt /> All Vouchers (Register)
              </button>
            </div>

            {/* FILTERS SECTION */}
            <div className="filter-group" style={{ marginTop: '15px' }}>
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

              {/* TAB 2 SPECIFIC SEARCHABLE DROPDOWN */}
              {activeTab === 'account' && (
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <Select
                    options={cashAccounts}
                    value={selectedAccount}
                    onChange={setSelectedAccount}
                    isLoading={loadingAccounts}
                    placeholder="Search Cash / Bank Account..."
                    isClearable
                    styles={selectCustomStyles}
                  />
                </div>
              )}

              {/* TAB 1 SPECIFIC FILTERS */}
              {activeTab === 'all' && (
                <>
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
                    placeholder="Search voucher"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </>
              )}

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
              >
                Daily
              </button>
              <button 
                type="button" 
                className="get-report-btn" 
                onClick={activeTab === 'all' ? fetchCashReport : fetchAccountSummary}
              >
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            {/* VIEW 1: SINGLE CASH / BANK ACCOUNT SUMMARY (DEFAULT VIEW) */}
            {activeTab === 'account' && (
              <>
                <div className="pl-header-section">
                  <h3 className="pl-statement-title">
                    {selectedAccount ? selectedAccount.label : 'CASH / BANK ACCOUNT SUMMARY'}
                  </h3>
                  <p className="pl-statement-subtitle">
                    Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                  </p>
                </div>

                {!selectedAccount ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    Please search and select a Cash or Bank account above to view summary.
                  </div>
                ) : loadingSummary ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Account Summary...</div>
                ) : (
                  <div style={{ marginTop: '15px', overflow: 'visible' }}>
                    {/* OPENING BALANCE BAR */}
                    <div 
                      className="pl-summary-bar" 
                      style={{ 
                        marginBottom: '15px', 
                        padding: '10px 16px', 
                        fontSize: '14px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <span><strong>Opening Balance:</strong></span>
                      <span className="pl-summary-value">{formatCurrency(summaryData.opening_balance)}</span>
                    </div>

                    {/* 3 COLUMNS TOTALS */}
                    <table className="pl-table" style={{ minWidth: 0, tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th className="text-center" style={{ width: '33.33%', whiteSpace: 'normal' }}>
                            Total Expense
                          </th>
                          <th className="text-center" style={{ width: '33.33%', whiteSpace: 'normal' }}>
                            Total Payable
                          </th>
                          <th className="text-center" style={{ width: '33.33%', whiteSpace: 'normal' }}>
                            Total Receivable
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_expense)}
                          </td>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_payable)}
                          </td>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_receivable)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '12px',
                        marginTop: '12px',
                        width: '100%',
                      }}
                    >
                      {[
                        {
                          key: 'expense',
                          title: 'Expense Detail',
                          rows: summaryDetails.expense,
                          empty: 'No expense entries',
                          fromCash: true,
                        },
                        {
                          key: 'payable',
                          title: 'Payable Detail',
                          rows: summaryDetails.payable,
                          empty: 'No payable payments',
                          fromCash: true,
                        },
                        {
                          key: 'receivable',
                          title: 'Receivable Detail',
                          rows: summaryDetails.receivable,
                          empty: 'No receivable receipts',
                          fromCash: false,
                        },
                      ].map((col) => {
                        const cashShort =
                          selectedAccount?.account_name ||
                          String(cashAccountLabel).replace(/\s*\([^)]*\)\s*$/, '') ||
                          'Cash/Bank';
                        return (
                          <div
                            key={col.key}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              background: '#fff',
                              minWidth: 0,
                              minHeight: '120px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <div
                              style={{
                                padding: '8px 12px',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#0f172a',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {col.title}
                            </div>
                            {col.rows.length === 0 ? (
                              <div
                                style={{
                                  padding: '16px 12px',
                                  color: '#94a3b8',
                                  fontSize: '13px',
                                  textAlign: 'center',
                                }}
                              >
                                {col.empty}
                              </div>
                            ) : (
                              <div style={{ padding: '4px 0', minWidth: 0 }}>
                                {col.rows.map((row, idx) => {
                                  const party = formatPartyLabel(row);
                                  return (
                                    <div
                                      key={`${col.key}-${row.voucher_no}-${idx}`}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        borderBottom:
                                          idx === col.rows.length - 1
                                            ? 'none'
                                            : '1px solid #f1f5f9',
                                        alignItems: 'start',
                                        minWidth: 0,
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <div
                                          style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'baseline',
                                            gap: '6px 10px',
                                          }}
                                        >
                                          <Link
                                            to={`/payment-transaction/${row.voucher_no}`}
                                            style={{
                                              color: '#0284c7',
                                              fontWeight: 700,
                                              fontSize: '12px',
                                              textDecoration: 'none',
                                            }}
                                          >
                                            {row.voucher_no}
                                          </Link>
                                          {row.date ? (
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                              {row.date}
                                            </span>
                                          ) : null}
                                        </div>
                                        <div
                                          style={{
                                            marginTop: 4,
                                            fontSize: '12px',
                                            color: '#0f172a',
                                            fontWeight: 600,
                                            lineHeight: 1.35,
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {party}
                                        </div>
                                        <div
                                          style={{
                                            marginTop: 2,
                                            fontSize: '11px',
                                            color: '#64748b',
                                            lineHeight: 1.35,
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {col.fromCash
                                            ? `From ${cashShort}`
                                            : `To ${cashShort}`}
                                          {row.description ? ` · ${row.description}` : ''}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: '12px',
                                          color: '#0f172a',
                                          whiteSpace: 'nowrap',
                                          textAlign: 'right',
                                          paddingTop: 2,
                                        }}
                                      >
                                        {formatCurrency(row.amount)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* CLOSING BALANCE BAR */}
                    <div 
                      className="pl-summary-bar" 
                      style={{ 
                        marginTop: '15px', 
                        padding: '10px 16px', 
                        fontSize: '14px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <span><strong>Closing Balance:</strong></span>
                      <span className="pl-summary-value">{formatCurrency(summaryData.closing_balance)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: ALL VOUCHERS REGISTER */}
            {activeTab === 'all' && (
              <>
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
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Payable:</strong>{' '}
                    <span className="pl-summary-value">{formatCurrency(totals.payable_amount)}</span>
                  </div>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Receivable:</strong>{' '}
                    <span className="pl-summary-value">{formatCurrency(totals.receivable_amount)}</span>
                  </div>
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
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CashReport;