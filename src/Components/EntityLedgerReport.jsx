import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaArrowLeft, FaFileExcel, FaFilePdf } from "react-icons/fa";
// 🚨 PDF Libraries
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// 🚨 Custom Components (Ensure these paths are correct)
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
// Assuming navigate is available or imported (e.g., from react-router-dom)
// Agar navigate import nahi hai, toh ye line hata dein ya import karein.
// import { useNavigate } from "react-router-dom"; 
// const navigate = useNavigate(); // Ya phir function ke andar use karein

const EntityLedgerReport = () => {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = React.useRef(null); // Ref to target the report section for PDF

 

  // Load Entities
  useEffect(() => {
    fetch("http://localhost:5000/api/entities")
      .then((res) => res.json())
      .then((data) => setEntities(data))
      .catch(() => toast.error("Failed to load entities"));
  }, []);

  // Fetch Report
  const fetchLedger = async () => {
    if (!selectedEntity || !fromDate || !toDate) {
      toast.error("Please select entity and date range");
      return;
    }

    setLoading(true);

    try {
      const url = `http://localhost:5000/api/reports/entity-ledger?entity_id=${selectedEntity}&fromDate=${fromDate}&toDate=${toDate}`;

      const res = await fetch(url);
      if (!res.ok) {
        toast.error("Failed to fetch ledger");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setReport(data);
      toast.success("Ledger loaded successfully");
    } catch (err) {
      toast.error("Server error fetching ledger");
    }

    setLoading(false);
  };

  // Running Balance
  const calculateRunningBalance = (index, items, openingBalance) => {
    if (index === 0) {
      return openingBalance + (items[0].debit - items[0].credit);
    }
    return (
      items[index - 1].runningBalance +
      (items[index].debit - items[index].credit)
    );
  };

  // ------------------------------
  // EXPORT TO EXCEL
  // ------------------------------
  const exportToExcel = () => {
    if (!report) {
      toast.error("No data to export");
      return;
    }

    // Ensure running balance is calculated for export
    const excelData = report.transactions.map((t, index) => {
        // Calculate running balance locally for export consistency
        const runningBalance = calculateRunningBalance(index, report.transactions, report.openingBalance);
        
        return {
          Date: t.transaction_date, // Correct field name
          Description: t.description,
          Debit: t.debit,
          Credit: t.credit,
          Running_Balance: runningBalance,
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    XLSX.utils.book_append_sheet(wb, ws, "Ledger");

    const fileName = `${report.entity.name}_Ledger_${fromDate}_to_${toDate}.xlsx`;

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success("Excel file downloaded");
  };

  // ------------------------------
  // EXPORT TO PDF
  // ------------------------------
  const exportToPDF = () => {
    if (!report || !reportRef.current) {
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

      const fileName = `${report.entity.name}_Ledger_${fromDate}_to_${toDate}.pdf`;
      pdf.save(fileName);
      toast.success("PDF downloaded successfully!");
    });
  };


const navigate = useNavigate();
  return (
    <>
    <NavigationBar />
    <div className="rm-page">
         <button
                  className="back-btn"
                  style={{ marginTop: "30px" }}
                  onClick={() => navigate("reports")}
                >
                  <FaArrowLeft />
                </button>
                <div className="card">
      <h3 className="text-2xl font-bold mb-4">Entity Ledger Report</h3>

      {/* Filters */}
      <div className="gap-2  d-flex">
        <select
          className="input"
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
        >
          <option value="">Select Entity</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.type})
            </option>
          ))}
        </select>

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
       
        <button
          className="primary-btn w-50 mb-3"
          onClick={fetchLedger}
        >
          {loading ? "Loading..." : "Get Report"}
        </button>

        {/* PDF Button */}
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

      {/* Result */}
      {report && (
        <div ref={reportRef} className="container">
          <h3 className="text-xl font-semibold mb-2">
            Ledger: {report.entity.name}
          </h3>

          <p className="text-lg mb-3">
            <strong>Opening Balance:</strong>{" "}
            <span className="text-blue-700">{report.openingBalance}</span>
          </p>

          {/* Ledger Table */}
          <table className="table">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Date</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Debit</th>
                <th className="border p-2">Credit</th>
                <th className="border p-2">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.transactions.map((t, index) => {
                t.runningBalance = calculateRunningBalance(
                  index,
                  report.transactions,
                  report.openingBalance
                );

                return (
                  <tr key={t.id} className="text-center">
                    <td className="border p-2">{t.transaction_date}</td>
<td className="border p-2">{t.description}</td>
<td className="border p-2">{t.debit}</td>
<td className="border p-2">{t.credit}</td>
                    <td className="border p-2 font-bold">
                      {t.runningBalance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="text-xl mt-4">
            <strong>Closing Balance:</strong>{" "}
            <span className="text-green-700">{report.closingBalance}</span>
          </p>
        </div>
      )}
      </div>
    </div>
    <Footer />
    </>
  );
};

export default EntityLedgerReport;
