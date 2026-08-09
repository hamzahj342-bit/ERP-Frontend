import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
    FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine, FaImage, FaCalendarAlt 
} from 'react-icons/fa';

import MainLayout from "../Layout/MainLayout"; 

import api from "../../api"; 

const SegmentedProfitLossReport = () => {
    const navigate = useNavigate();
    const reportRef = useRef(null);

    const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    const loadReportData = async () => {
        if (!fromDate || !toDate) {
            toast.error("Please select date range");
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/reports/segmented-profit-loss', {
                params: { from_date: fromDate, to_date: toDate }
            });
            if (res.data.success) {
                setReport(res.data.data);
                toast.dismiss();
                toast.success("Segmented Report loaded successfully");
            } else {
                toast.error(res.data.message || "Failed to load data");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Server error executing matrices";
            toast.error(`Failed: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (fromDate && toDate) {
            const delayCall = setTimeout(() => {
                if (isMounted) {
                    loadReportData();
                }
            }, 50);

            return () => {
                isMounted = false;
                clearTimeout(delayCall);
            };
        }
    }, [fromDate, toDate]);

    const formatCurr = (v) => {
        const num = Number(v || 0);
        if (num === 0) return '-';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    const calcMarginRatio = (gp, sales) => sales > 0 ? ((gp / sales) * 100).toFixed(1) + '%' : '0.0%';

    // ────────────────────────────────────────────────────────────────────────
    // 📗 FIXED EXCEL EXPORT (MATH SIGN FIX)
    // ────────────────────────────────────────────────────────────────────────
    const downloadExcel = () => {
        if (!report) return;

        const titleStyle = {
            font: { name: "Calibri", bold: true, sz: 16, color: { rgb: "1A202C" } },
            alignment: { horizontal: "left" }
        };

        const durationStyle = {
            font: { name: "Calibri", italic: true, sz: 11, color: { rgb: "718096" } },
            alignment: { horizontal: "left" }
        };

        const headerStyle = {
            fill: { fgColor: { rgb: "1A202C" } },
            font: { name: "Calibri", color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const sectionStyle = {
            fill: { fgColor: { rgb: "F8FAFC" } },
            font: { name: "Calibri", bold: true, sz: 10, color: { rgb: "4A5568" } },
            border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } }
        };

        const amountStyle = { font: { name: "Calibri", sz: 10 }, alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
        const totalStyle = { font: { name: "Calibri", bold: true, sz: 11 }, fill: { fgColor: { rgb: "E2E8F0" } }, border: { top: { style: "thin" }, bottom: { style: "double" } } };

        const rmRatio = calcMarginRatio(report.segments.raw_material.gross_profit, report.segments.raw_material.net_sales);
        const fpRatio = calcMarginRatio(report.segments.finished_product.gross_profit, report.segments.finished_product.net_sales);
        const totalRatio = calcMarginRatio(report.totals.total_gross_profit, report.totals.total_sales);

        const rows = [
            [{ v: "SEGMENTED PROFIT & LOSS REPORT", s: titleStyle }],
            [{ v: `Duration Timeline: ${fromDate} to ${toDate}`, s: durationStyle }],
            [],
            [{ v: "Financial Line Elements", s: headerStyle }, { v: "Raw Material (RM)", s: headerStyle }, { v: "Finished Goods (FP)", s: headerStyle }, { v: "Consolidated Total", s: headerStyle }],
            [{ v: "Operational Revenue", s: sectionStyle }, "", "", ""],
            [{ v: "Gross Sales Revenue" }, { v: Number(report.segments.raw_material.sales), s: amountStyle }, { v: Number(report.segments.finished_product.sales), s: amountStyle }, { v: Number(report.segments.raw_material.sales + report.segments.finished_product.sales), s: amountStyle }],
            
            // 🌟 Math Signs aligned to mirror accounting formatting standards
            [{ v: "Less: Sales Returns" }, { v: Number(report.segments.raw_material.returns) * -1, s: amountStyle }, { v: Number(report.segments.finished_product.returns) * -1, s: amountStyle }, { v: Number(report.segments.raw_material.returns + report.segments.finished_product.returns) * -1, s: amountStyle }],
            
            [{ v: "Total Net Revenue", s: totalStyle }, { v: Number(report.segments.raw_material.net_sales), s: amountStyle }, { v: Number(report.segments.finished_product.net_sales), s: amountStyle }, { v: Number(report.totals.total_sales), s: totalStyle }],
            [{ v: "Direct Costs Breakdown", s: sectionStyle }, "", "", ""],
            [{ v: "Less: Cost of Goods Sold (COGS)" }, { v: Number(report.segments.raw_material.cogs) * -1, s: amountStyle }, { v: Number(report.segments.finished_product.cogs) * -1, s: amountStyle }, { v: Number(report.totals.total_cogs) * -1, s: amountStyle }],
            [{ v: "Gross Profit Margin", s: totalStyle }, { v: Number(report.segments.raw_material.gross_profit), s: amountStyle }, { v: Number(report.segments.finished_product.gross_profit), s: amountStyle }, { v: Number(report.totals.total_gross_profit), s: totalStyle }],
            [{ v: "Gross Profit Margin Ratio (%)" }, { v: rmRatio }, { v: fpRatio }, { v: totalRatio }],
            [{ v: "Indirect Overheads & Adjustments", s: sectionStyle }, "", "", ""],
            [{ v: "Add: Inventory System Adjustment Profit" }, "", "", { v: Number(report.totals.inventory_adjustment_revenue), s: amountStyle }],
            
            // 🌟 FIXED: Multiplication by -1 makes sure Excel prints negative format natively
            [{ v: "Less: General Expenses & Wastages" }, "", "", { v: Number(report.totals.other_expenses) * -1, s: amountStyle }],
            
            [{ v: "Consolidated Net Profit", s: totalStyle }, "", "", { v: Number(report.totals.actual_net_profit), s: totalStyle }]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        wb.SheetNames.push("Segmented_P_L");
        wb.Sheets["Segmented_P_L"] = ws;
        XLSX.writeFile(wb, `Segmented_Profit_Loss_${fromDate}_to_${toDate}.xlsx`);
        toast.success("Excel Report Exported");
    };

    // ────────────────────────────────────────────────────────────────────────
    // 📸 IMAGE EXPORT
    // ────────────────────────────────────────────────────────────────────────
    const downloadImage = async () => {
        if (!reportRef.current) {
            toast.error("Report reference element not found");
            return;
        }
        try {
            const canvas = await html2canvas(reportRef.current, { 
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = `Segmented_Profit_Loss_${fromDate}_to_${toDate}.png`;
            link.click();
            toast.success("Image exported successfully");
        } catch (error) {
            toast.error("Failed to export Image");
            console.error(error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // 📄 PDF EXPORT
    // ────────────────────────────────────────────────────────────────────────
    const downloadPDF = () => {
        if (!reportRef.current) {
            toast.error("Report reference element not found");
            return;
        }
        
        toast.info("Generating PDF format...");
        
        html2canvas(reportRef.current, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: "#ffffff"
        }).then((canvas) => {
            const imgData = canvas.toDataURL("image/jpeg", 1.0);
            const pdf = new jsPDF("p", "mm", "a4");
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const contentWidth = canvas.width;
            const contentHeight = canvas.height;
            
            const ratio = Math.min((pdfWidth - 10) / contentWidth, (pdfHeight - 10) / contentHeight);
            
            const imgWidth = contentWidth * ratio;
            const imgHeight = contentHeight * ratio;
            
            const pageX = (pdfWidth - imgWidth) / 2;
            const pageY = 6; 

            pdf.addImage(imgData, "JPEG", pageX, pageY, imgWidth, imgHeight);
            pdf.save(`Segmented_Profit_Loss_${fromDate}_to_${toDate}.pdf`);
            toast.success("PDF exported successfully");
        }).catch((err) => {
            toast.error("Failed to generate PDF document");
            console.error(err);
        });
    };

    return (
        <>
        <MainLayout />
            <div className="p-2 p-md-4 mx-auto" style={{ width: '98%' }}>
                
                {/* TOP LAYOUT PANEL */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-2 gap-md-3">
                        <button onClick={() => navigate(-1)} className='back-btn'>
                            <FaArrowLeft className="text-secondary" /> 
                        </button>
                        <h2 className="m-0 fw-bold text-dark h5 d-flex align-items-center gap-2">
                            <FaChartLine className="text-secondary" /> Segmented Profit & Loss Statement
                        </h2>
                    </div>
                    
                    {/* Controls Filters Grid */}
                    <div className="d-flex gap-2 gap-md-3 align-items-center bg-white p-2 rounded shadow-sm flex-wrap border">
                        <div className="d-flex align-items-center gap-2 justify-content-between">
                            <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>From:</span>
                            <div className="position-relative d-flex align-items-center">
                                <FaCalendarAlt className="position-absolute text-muted d-none d-sm-block" style={{ left: '12px', pointerEvents: 'none' }} />
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="form-control form-control-sm bg-light border-0 ps-2 ps-sm-5 text-dark fw-semibold"
                                    style={{ width: '150px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <div className="text-muted opacity-50 px-1 d-none d-md-block">|</div>

                        <div className="d-flex align-items-center gap-2 justify-content-between">
                            <span className="text-dark fw-normal m-0" style={{ fontSize: '15px' }}>To:</span>
                            <div className="position-relative d-flex align-items-center">
                                <FaCalendarAlt className="position-absolute text-muted d-none d-sm-block" style={{ left: '12px', pointerEvents: 'none' }} />
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="form-control form-control-sm bg-light border-0 ps-2 ps-sm-5 text-dark fw-semibold"
                                    style={{ width: '150px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <button className="btn btn-success btn-sm px-3 fw-semibold" style={{ height: '36px', borderRadius: '6px' }} onClick={loadReportData} disabled={loading}>
                            {loading ? "Syncing..." : "Get Report"}
                        </button>

                        {report && (
                            <div className="d-flex gap-2 justify-content-end border-start ps-2">
                                <button onClick={downloadPDF} title="Export PDF" className="btn btn-danger d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FaFilePdf /></button>
                                <button onClick={downloadExcel} title="Export Excel" className="btn btn-success d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><FaFileExcel /></button>
                                <button onClick={downloadImage} title="Export Image" className="btn d-flex align-items-center justify-content-center p-0 border-0 text-white shadow-sm" style={{ width: '36px', height: '36px', backgroundColor: '#ff9100', borderRadius: '8px' }}><FaImage /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CONDITIONAL RENDER AREA */}
                {loading ? (
                    <div className="text-center bg-white rounded shadow-sm p-5 text-muted small border">
                        <div className="spinner-border text-secondary spinner-border-sm me-2" role="status"></div>
                        Syncing profit & loss records...
                    </div>
                ) : report && (
                    <div ref={reportRef} className="bg-white rounded shadow-sm p-4 border">
                        <div className="table-responsive">
                            <table className="table table-bordered align-middle m-0">
                                <thead className="table-dark">
                                    <tr className="text-center">
                                        <th className="align-middle text-start py-3" style={{ width: '40%', fontSize: '13.5px', fontWeight: '600' }}>Financial Line Elements</th>
                                        <th className="align-middle py-3" style={{ width: '20%', fontSize: '13.5px', fontWeight: '600' }}>Raw Materials (RM)</th>
                                        <th className="align-middle py-3" style={{ width: '20%', fontSize: '13.5px', fontWeight: '600' }}>Finished Goods (FP)</th>
                                        <th className="align-middle py-3" style={{ width: '20%', fontSize: '13.5px', fontWeight: '600', backgroundColor: '#2d3748' }}>Consolidated Total</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '14px' }}>
                                    
                                    {/* OPERATIONAL REVENUE */}
                                    <tr className="table-light fw-bold text-secondary border-bottom">
                                        <td colSpan="4" className="ps-3 py-2 text-dark" style={{ fontSize: '13px' }}>Operational Revenue</td>
                                    </tr>
                                    <tr>
                                        <td className="ps-4 text-success ">Sales Revenue</td>
                                        <td className="text-end text-success">{formatCurr(report.segments.raw_material.sales)}</td>
                                        <td className="text-end text-success">{formatCurr(report.segments.finished_product.sales)}</td>
                                        <td className="text-end text-success fw-bold">{formatCurr(report.segments.raw_material.sales + report.segments.finished_product.sales)}</td>
                                    </tr>
                                    <tr>
                                        <td className="ps-4 text-danger">Sales Returns</td>
                                        <td className="text-end text-danger">({formatCurr(report.segments.raw_material.returns)})</td>
                                        <td className="text-end text-danger">({formatCurr(report.segments.finished_product.returns)})</td>
                                        <td className="text-end text-danger">({formatCurr(report.segments.raw_material.returns + report.segments.finished_product.returns)})</td>
                                    </tr>
                                    <tr className="table-secondary fw-bold">
                                        <td className="ps-3 text-dark fw-bold">Total Net Revenue</td>
                                        <td className="text-end text-dark">{formatCurr(report.segments.raw_material.net_sales)}</td>
                                        <td className="text-end text-dark">{formatCurr(report.segments.finished_product.net_sales)}</td>
                                        <td className="text-end text-success border-bottom border-2 border-dark">{formatCurr(report.totals.total_sales)}</td>
                                    </tr>

                                    {/* DIRECT COSTS */}
                                    <tr className="table-light fw-bold text-secondary border-bottom">
                                        <td colSpan="4" className="ps-3 py-2 text-dark" style={{ fontSize: '13px' }}>Direct Costs Breakdown</td>
                                    </tr>
                                    <tr>
                                        <td className="ps-4 text-danger">Cost of Goods Sold (COGS)</td>
                                        <td className="text-end text-danger">({formatCurr(report.segments.raw_material.cogs)})</td>
                                        <td className="text-end text-danger">({formatCurr(report.segments.finished_product.cogs)})</td>
                                        <td className="text-end text-danger fw-bold">({formatCurr(report.totals.total_cogs)})</td>
                                    </tr>

                                    {/* GROSS MARGINS */}
                                    <tr className="table-secondary fw-bold">
                                        <td className="ps-3 text-dark fw-bold">Gross Profit Margin</td>
                                        <td className={`text-end ${Number(report.segments.raw_material.gross_profit) < 0 ? 'text-danger' : 'text-success'}`}>
                                            {formatCurr(report.segments.raw_material.gross_profit)}
                                        </td>
                                        <td className={`text-end ${Number(report.segments.finished_product.gross_profit) < 0 ? 'text-danger' : 'text-success'}`}>
                                            {formatCurr(report.segments.finished_product.gross_profit)}
                                        </td>
                                        <td className={`text-end border-bottom border-2 border-dark ${Number(report.totals.total_gross_profit) < 0 ? 'text-danger' : 'text-success'} fw-bold`}>
                                            {formatCurr(report.totals.total_gross_profit)}
                                        </td>
                                    </tr>
                                    <tr className="text-muted" style={{ fontSize: '12.5px', backgroundColor: '#fafafa' }}>
                                        <td className="ps-4 ">Gross Profit Margin Ratio (%)</td>
                                        <td className="text-end fw-bold text-dark">{calcMarginRatio(report.segments.raw_material.gross_profit, report.segments.raw_material.net_sales)}</td>
                                        <td className="text-end fw-bold text-dark">{calcMarginRatio(report.segments.finished_product.gross_profit, report.segments.finished_product.net_sales)}</td>
                                        <td className="text-end fw-bold text-dark">{calcMarginRatio(report.totals.total_gross_profit, report.totals.total_sales)}</td>
                                    </tr>

                                    {/* INDIRECT OVERHEADS */}
                                    <tr className="table-light fw-bold text-secondary border-bottom">
                                        <td colSpan="4" className="ps-3 py-2 text-dark" style={{ fontSize: '13px' }}>Indirect Overheads & Adjustments</td>
                                    </tr>
                                    <tr>
                                        <td className="ps-4 text-success">Add: Inventory System Adjustment Profit</td>
                                        <td className="text-end text-muted">-</td>
                                        <td className="text-end text-muted">-</td>
                                        <td className="text-end text-success">+{formatCurr(report.totals.inventory_adjustment_revenue)}</td>
                                    </tr>
                                    <tr>
                                        <td className="ps-4 text-danger">Less: General Expenses & Wastages</td>
                                        <td className="text-end text-muted">-</td>
                                        <td className="text-end text-muted">-</td>
                                        <td className="text-end text-danger">({formatCurr(report.totals.other_expenses)})</td>
                                    </tr>

                                    {/* CONSOLIDATED NET PROFIT */}
                                   {(() => {
    const netProfitVal = Number(report.totals.actual_net_profit || 0);
    const isLoss = netProfitVal < 0;

    return (
        <tr className="table-secondary fw-bold" style={{ fontSize: '15px' }}>
            <td className="ps-3 text-dark fw-bold text-uppercase">
                {isLoss ? 'Net Loss' : 'Net Profit'}
            </td>
            <td className="text-end text-muted">-</td>
            <td className="text-end text-muted">-</td>
            <td className={`text-end border-bottom border-double border-dark fw-bolder ${isLoss ? 'text-danger' : 'text-success'}`}>
               Rs {isLoss ? `(${formatCurr(Math.abs(netProfitVal))})` : `${formatCurr(netProfitVal)}`}
            </td>
        </tr>
    );
})()}

                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            
            </div>
        </>
    );
};

export default SegmentedProfitLossReport;