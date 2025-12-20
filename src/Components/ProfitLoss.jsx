import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api"; 

const ProfitLoss = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // ------------------------------
  // FETCH PROFIT & LOSS (Axios Version)
  // ------------------------------
  const fetchProfitLoss = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }

    setLoading(true);
    setReport(null); // Clear previous report

    try {
      // Query parameters ko clean object mein rakha hai
      const res = await api.get("/reports/profit-loss", {
        params: {
          fromDate: fromDate,
          toDate: toDate
        }
      });
      setReport(res.data);
      toast.success("Profit & Loss loaded successfully");

    } catch (error) {
      console.error("Fetch Error:", error);
      
      // Backend se aane wala exact error message dikhane ke liye
      const errorMsg = error.response?.data?.message || "Server error while fetching Profit & Loss";
      toast.error(`Failed to load Profit & Loss: ${errorMsg}`);
    } finally {
      // setLoading ko finally mein rakha hai taake success ho ya error, loading band ho jaye
      setLoading(false);
    }
  };

// ------------------------------
// EXPORT TO EXCEL (Updated for detail breakdown)
// ------------------------------
const exportToExcel = () => {
    if (!report) {
      toast.error("No data to export");
      return;
    }

    const excelData = [];
    
    // Add Income Details
    excelData.push({ Section: "REVENUE", Account: "", Amount: "" });
    // Defensive check
    if (report.details?.Income) {
        Object.values(report.details.Income).forEach(acc => {
            excelData.push({ Section: "", Account: acc.name, Amount: acc.total });
        });
    }
    excelData.push({ Section: "", Account: "TOTAL REVENUE", Amount: report.totals.totalIncome });
    
    // Add Expense Details (COGS)
    excelData.push({ Section: "EXPENSE", Account: "", Amount: ""});
    // Defensive check
    if (report.details?.Expense) {
        Object.values(report.details.Expense).forEach(acc => {
            // Show Expenses as negative for accounting clarity in Excel
            excelData.push({ Section: "", Account: acc.name, Amount: -acc.total });
        });
    }
    excelData.push({ Section: "", Account: "TOTAL COST OF SALES", Amount: -report.totals.totalExpenses });


    // Add Summary
    excelData.push({ Section: "", Account: "GROSS PROFIT", Amount: report.totals.grossProfit });
    excelData.push({ Section: "", Account: "NET PROFIT (OR LOSS)", Amount: report.totals.netProfit });


    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData, { header: ["Section", "Account", "Amount"] });
    // Add Report Title
    XLSX.utils.sheet_add_aoa(ws, [[`Profit & Loss Report (${fromDate} to ${toDate})`]], { origin: "A1" });
    
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");

    const fileName = `Profit_Loss_${fromDate}_to_${toDate}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout]), fileName);

    toast.success("Excel downloaded");
};


  // ------------------------------
  // EXPORT TO PDF
  // ------------------------------
  const exportToPDF = () => {
    if (!reportRef.current) {
      toast.error("No report found");
      return;
    }

    toast.info("Generating PDF...");

    html2canvas(reportRef.current, { scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const margin = 5;
      
      pdf.addImage(imgData, "JPEG", margin, margin, pdfWidth - (2 * margin), pdfHeight - (2 * margin));
      pdf.save(`Profit_Loss_${fromDate}_to_${toDate}.pdf`);

      toast.success("PDF downloaded");
    });
  };

  return (
    <>
      <NavigationBar />

      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/reports")} // Fixed path
        >
          <FaArrowLeft />
        </button>

        <div className="card">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
                <FaChartLine className="mr-2 text-green-600" /> Profit & Loss Statement
            </h3>

          {/* Filters */}
          <div className="gap-2 d-flex">
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

            <button className="primary-btn w-50 mb-3" onClick={fetchProfitLoss} disabled={loading}>
              {loading ? "Loading..." : "Get Report"}
            </button>

            {report && (
              <button
                className="download-pdf-button w-50 mb-3"
                onClick={exportToPDF}
              >
                <FaFilePdf /> PDF
              </button>
            )}

            {report && (
              <button
                className="excel-btn w-50 mb-3"
                onClick={exportToExcel}
              >
                <FaFileExcel /> Excel
              </button>
            )}
          </div>

          {/* REPORT DISPLAY */}
          {report && (
            <div ref={reportRef} className="container">
              <h3 className="text-xl font-semibold mb-3">
                Period: {fromDate} to {toDate}
              </h3>

              <table className="table">
                <tbody>
                    {/* --- REVENUE SECTION --- */}
                    <tr className="bg-gray-100">
                        <td className="border p-2 font-bold" colSpan="2"><b>REVENUE</b></td>
                    </tr>
                    
                    {/* Dynamic Income Accounts */}
                    {/* ⚠️ FIX: Defensive check for report.details?.Income */}
                    {report.details?.Income && Object.values(report.details.Income).map(acc => (
                        <tr key={acc.id}>
                            <td className="border p-2" style={{ paddingLeft: '20px' }}>{acc.name}</td>
                            <td className="border p-2 text-right">{Number(acc.total).toFixed(2)}</td>
                        </tr>
                    ))}

                    <tr className="font-semibold bg-green-50">
                        <td className="border p-2">TOTAL REVENUE</td>
                    <td className="border p-2 text-right">{Number(report.totals.totalIncome).toFixed(2)}</td>
                    </tr>
                    
                    {/* --- COST OF GOODS SOLD SECTION --- */}
                    <tr className="bg-gray-100">
                        <td className="border p-2 font-bold" colSpan="2"><b>EXPENSE</b></td>
                    </tr>
                    
                    {/* Dynamic Expense Accounts (COGS) */}
                    {/* ⚠️ FIX: Defensive check for report.details?.Expense */}
                    {report.details?.Expense && Object.values(report.details.Expense).map(acc => (
                        <tr key={acc.id}>
                            <td className="border p-2" style={{ paddingLeft: '20px' }}>{acc.name}</td>
                            <td className="border p-2 text-right">({Number(acc.total).toFixed(2)})</td>
                        </tr>
                    ))}

                    <tr className="font-semibold bg-red-50">
                        <td className="border p-2">TOTAL COST OF SALES</td>
                    <td className="border p-2 text-right">({Number(report.totals.totalExpenses).toFixed(2)})</td>
                    </tr>


                    {/* --- GROSS PROFIT --- */}
                  <tr className="font-bold bg-yellow-100 border-t-2 border-b-2 border-gray-500">
                    <td className="border p-2">GROSS PROFIT</td>
                    <td className="border p-2 text-right text-green-700">
                      {Number(report.totals.grossProfit).toFixed(2)}
                    </td>
                  </tr>
                    
                    {/* --- NET PROFIT --- */}
                  <tr className="font-bold bg-blue-100 border-t-2 border-b-4 border-blue-700">
                    <td className="border p-2 text-lg">NET PROFIT (OR LOSS)</td>
                    <td className="border p-2 text-right text-lg text-blue-700">
                      {Number(report.totals.netProfit).toFixed(2)}
                    </td>
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

export default ProfitLoss;