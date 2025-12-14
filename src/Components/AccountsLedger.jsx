import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
// --- Excel Dependencies ---
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
// --- PDF Dependencies ---
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// --- Icons & Components ---
import { FaArrowLeft, FaBook, FaFileExcel, FaFilePdf } from "react-icons/fa";
import NavigationBar from "./NavigationBar"; // Adjust path as needed
import Footer from "./Footer"; // Adjust path as needed


// Helper function for currency formatting (assuming INR/local currency format)
const formatCurrency = (amount) => {
    // Ensure amount is treated as a number
    const numAmount = parseFloat(amount) || 0; 
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
};


const AccountLedger = () => {
  const navigate = useNavigate();
  
  // State for filter inputs
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  // State for data fetching
  const [accounts, setAccounts] = useState([]);
  const [ledgerReport, setLedgerReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null); // Ref to target the report section for PDF

  // --- 1. Fetch Account List (For Dropdown) ---
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/accounts"); 
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
        toast.error("Failed to load account list.");
      }
    };
    fetchAccounts();
  }, []);


  // --- 2. Fetch Ledger Report ---
  const fetchLedger = async () => {
    if (!selectedAccountId || !fromDate || !toDate) {
      toast.error("Please select an Account and a date range.");
      return;
    }

    setLoading(true);
    setLedgerReport(null);

    try {
      const url = `http://localhost:5000/api/reports/ledger?accountId=${selectedAccountId}&fromDate=${fromDate}&toDate=${toDate}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(`Failed to load Ledger: ${errorData.message || "Server Error"}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setLedgerReport(data);
      toast.success("Ledger loaded successfully.");

    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Server error while fetching Ledger.");
    }

    setLoading(false);
  };


    // ------------------------------------------
    // EXPORT LOGIC (Adapted from EntityLedger)
    // ------------------------------------------

    // Function to prepare data for export (Excel needs a flat array)
    const prepareExportData = () => {
        if (!ledgerReport) return [];

        const naturalDebitCategories = ['Assets', 'Expense'];
        const isDebitNatural = naturalDebitCategories.includes(ledgerReport.categoryName);
        
        let currentBalance = ledgerReport.openingBalance;

        // 1. Start with Opening Balance row
        const exportArray = [{
            Date: ledgerReport.period.fromDate,
            Description: "OPENING BALANCE",
            Debit: "",
            Credit: "",
            Balance: currentBalance,
        }];

        // 2. Add Transaction rows
        ledgerReport.ledger.forEach(t => {
            const debit = Number(t.debit) || 0;
            const credit = Number(t.credit) || 0;

            // Recalculate running balance
            if (isDebitNatural) {
                currentBalance += (debit - credit);
            } else {
                currentBalance += (credit - debit);
            }

            exportArray.push({
                Date: t.date.split('T')[0],
                Description: t.narration,
                Debit: debit,
                Credit: credit,
                Balance: currentBalance,
            });
        });
        
        // 3. Add Totals and Closing Balance row
        exportArray.push({
            Date: ledgerReport.period.toDate,
            Description: "TOTAL ACTIVITY",
            Debit: ledgerReport.totalDebit,
            Credit: ledgerReport.totalCredit,
            Balance: "" // Blank balance for total row
        });
        
        exportArray.push({
            Date: "",
            Description: "CLOSING BALANCE",
            Debit: "",
            Credit: "",
            Balance: ledgerReport.closingBalance,
        });

        return exportArray;
    };


    // EXPORT TO EXCEL
    const exportToExcel = () => {
      if (!ledgerReport) {
        toast.error("No data to export");
        return;
      }

      const excelData = prepareExportData();

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      XLSX.utils.book_append_sheet(wb, ws, "Account_Ledger");

      const fileName = `${ledgerReport.accountName.replace(/\s/g, '_')}_Ledger_${fromDate}_to_${toDate}.xlsx`;

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

      toast.success("Excel file downloaded");
    };

    // EXPORT TO PDF
    const exportToPDF = () => {
      if (!ledgerReport || !reportRef.current) {
        toast.error("No report data or element found for PDF export.");
        return;
      }

      const input = reportRef.current;
      
      toast.info("Generating PDF...");

      html2canvas(input, { scale: 2, logging: false }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add image/page 1
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // If content height is more than one page, add more pages
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `${ledgerReport.accountName.replace(/\s/g, '_')}_Ledger_${fromDate}_to_${toDate}.pdf`;
        pdf.save(fileName);
        toast.success("PDF downloaded successfully!");
      });
    };


    // Calculate running balance on the fly for display
    const calculateDisplayRunningBalance = () => {
        if (!ledgerReport || !ledgerReport.ledger) return [];

        const naturalDebitCategories = ['Assets', 'Expense'];
        const isDebitNatural = naturalDebitCategories.includes(ledgerReport.categoryName);
        
        let runningBalance = ledgerReport.openingBalance;

        // Map over the ledger transactions and calculate the running balance for display
        return ledgerReport.ledger.map(t => {
            const debit = Number(t.debit) || 0;
            const credit = Number(t.credit) || 0;

            if (isDebitNatural) {
                // Assets/Expense: Debit increases, Credit decreases
                runningBalance += (debit - credit);
            } else {
                // Liabilities/Income: Credit increases, Debit decreases
                runningBalance += (credit - debit);
            }

            return {
                ...t,
                displayBalance: runningBalance
            };
        });
    }

    const transactionsWithRunningBalance = calculateDisplayRunningBalance();


  return (
    <>
      <NavigationBar />

      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/reports")}
        >
          <FaArrowLeft />
        </button>

        <div className="card">
          <h3 className="text-2xl font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <FaBook className="mr-2 text-blue-600" /> Account Ledger
                </span>

                {/* --- EXPORT BUTTONS (Entity Ledger Style) --- */}
                {ledgerReport && (
                    // Using d-flex and gap-2 for styling consistent with provided code
                    <div className="d-flex gap-2"> 
                       
                    </div>
                )}
            </h3>

          {/* Filters */}
          <div className="gap-2 d-flex mb-4">
                {/* Account Dropdown */}
            <select
              className="input w-100"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">--- Select Account ---</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.category_name})
                </option>
              ))}
            </select>
                
                {/* Date Inputs */}
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <button className="primary-btn w-50 mb-3" onClick={fetchLedger} disabled={loading}>
              {loading ? "Loading..." : "Get Report"}
            </button>

             <button
                            className="download-pdf-button  mb-3 w-50"
                            onClick={exportToPDF}
                        >
                            <FaFilePdf className="mr-1" /> PDF
                        </button>
                        <button
                            className="excel-btn mb-3 w-50"
                            onClick={exportToExcel}
                        >
                            <FaFileExcel className="mr-1" /> Excel
                        </button>
          </div>

          {/* LEDGER REPORT DISPLAY */}
          {ledgerReport && (
            <div ref={reportRef} className="container p-0"> {/* reportRef added for PDF */}
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold">{ledgerReport.accountName}</h4>
                <p className="text-sm text-gray-500">({ledgerReport.categoryName})</p>
                <p className="text-sm">Period: {ledgerReport.period.fromDate} to {ledgerReport.period.toDate}</p>
              </div>

              <table className="table">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2 w-10">Date</th>
                    <th className="border p-2 w-40">Narration</th>
                    <th className="border p-2 text-right w-15">Debit</th>
                    <th className="border p-2 text-right w-15">Credit</th>
                    <th className="border p-2 text-right w-20">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="font-semibold bg-yellow-50">
                    <td className="border p-2" colSpan="4">OPENING BALANCE</td>
                    <td className="border p-2 text-right">{formatCurrency(ledgerReport.openingBalance)}</td>
                  </tr>

                  {/* Transaction Details */}
                  {transactionsWithRunningBalance.map((t) => (
                    <tr key={t.id}>
                      <td className="border p-2">{t.date.split('T')[0]}</td>
                      <td className="border p-2">{t.narration}</td>
                      <td className="border p-2 text-right">{t.debit > 0 ? formatCurrency(t.debit) : ''}</td>
                      <td className="border p-2 text-right">{t.credit > 0 ? formatCurrency(t.credit) : ''}</td>
                      <td className="border p-2 text-right font-medium">{formatCurrency(t.displayBalance)}</td>
                    </tr>
                  ))}

                  {/* Totals and Closing Balance Row */}
                  <tr className="font-bold bg-blue-100 border-t-2 border-b-4 border-blue-700">
                    <td className="border p-2" colSpan="2">TOTAL ACTIVITY / CLOSING BALANCE</td>
                    <td className="border p-2 text-right">{formatCurrency(ledgerReport.totalDebit)}</td>
                    <td className="border p-2 text-right">{formatCurrency(ledgerReport.totalCredit)}</td>
                    <td className="border p-2 text-right text-lg">{formatCurrency(ledgerReport.closingBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AccountLedger;