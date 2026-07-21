import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { toast } from 'react-toastify';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaBox, FaWarehouse, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync } from 'react-icons/fa';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';

const StockReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = new Date().toISOString().split('T')[0];

  const [reportType, setReportType] = useState('rm'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [rmData, setRmData] = useState([]);
  const [fgData, setFgData] = useState([]);
  const [hasPackSizes, setHasPackSizes] = useState(false);

  const fetchStockReport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/stock-report?type=${reportType}`);
      if (reportType === 'rm') {
        setRmData(response.data.rawMaterials || []);
        setHasPackSizes(Boolean(response.data.has_pack_sizes));
      } else {
        setFgData(response.data.finishedGoods || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockReport();
  }, [reportType]);

  // Filter Logic
  const filteredRM = rmData.filter(item => 
    (item['RawMaterial.name'] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFG = fgData.filter(item => 
    (item['product.name'] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show Pack Stock only when at least one RM has a pack size defined
  const showPackStock = hasPackSizes || rmData.some(
    (item) => Array.isArray(item.pack_breakdown) && item.pack_breakdown.length > 0
  );

  // Calculate Totals for Footer
  const totalRMStock = filteredRM.reduce((acc, i) => acc + Number(i.total_current_stock), 0);
  const totalRMValue = filteredRM.reduce((acc, i) => acc + Number(i.total_stock_price), 0);
  const totalRMConsumed = filteredRM.reduce((acc, i) => acc + Number(i.total_consumed), 0);

  const totalFGQty = filteredFG.reduce((acc, i) => acc + Number(i.total_qty_remaining), 0);
  const totalFGValue = filteredFG.reduce((acc, i) => acc + (Number(i.unit_cost) * Number(i.total_qty_remaining)), 0);
  const totalFGConsumed = filteredFG.reduce((acc, i) => acc + Number(i.total_consumed), 0);

  // --- EXPORT FUNCTIONS ---
  const exportToExcel = () => {
    let wb = XLSX.utils.book_new();
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    if (reportType === 'rm') {
      const headerLabels = showPackStock
        ? ["Material Name", "Base Stock", "Pack Stock", "Stock Value", "Avg Cost", "Consumed"]
        : ["Material Name", "Base Stock", "Stock Value", "Avg Cost", "Consumed"];
      const headers = headerLabels.map(h => ({ v: h, s: headerStyle }));
      const rows = filteredRM.map(i => {
        const row = [
          i['RawMaterial.name'],
          `${Number(i.total_current_stock).toLocaleString()}${i.base_uom_name ? ` ${i.base_uom_name}` : ''}`,
        ];
        if (showPackStock) row.push(i.pack_stock_display || '-');
        row.push(
          Number(i.total_stock_price),
          Number(i.average_unit_cost),
          Number(i.total_consumed)
        );
        return row;
      });
      const emptyCols = showPackStock ? ["", "", "", "", "", ""] : ["", "", "", "", ""];
      const totalRow = showPackStock
        ? [{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalRMStock, "", totalRMValue, "", ""]
        : [{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalRMStock, totalRMValue, "", ""];
      rows.push(emptyCols);
      rows.push(totalRow);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Raw Materials");
    } else {
      const headers = ["Product Name", "Remaining Qty", "Unit Cost", "Total Value"].map(h => ({ v: h, s: headerStyle }));
      const rows = filteredFG.map(i => [i['product.name'], Number(i.total_qty_remaining), Number(i.unit_cost), (Number(i.unit_cost) * Number(i.total_qty_remaining))]);
      rows.push(["", "", "", ""]);
      rows.push([{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalFGQty, "", totalFGValue]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Finished Goods");
    }
    XLSX.writeFile(wb, `Stock_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    const currentData = reportType === 'rm' ? filteredRM : filteredFG;
    
    if (!currentData || currentData.length === 0) {
      toast.error("No data available to export!");
      return;
    }

    const loadingToast = toast.loading("Generating PDF..."); 
    
    try {
      const doc = new jsPDF();
      const title = `Stock Report - ${reportType === 'rm' ? 'Raw Materials' : 'Finished Goods'}`;
      
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Date: ${today}`, 14, 22);
      
      if (reportType === 'rm') {
        const bodyData = filteredRM.map(i => {
          const row = [
            i['RawMaterial.name'] || 'N/A',
            `${Number(i.total_current_stock).toLocaleString()}${i.base_uom_name ? ` ${i.base_uom_name}` : ''}`,
          ];
          if (showPackStock) row.push(i.pack_stock_display || '-');
          row.push(
            Number(i.total_stock_price).toLocaleString(),
            Number(i.average_unit_cost).toFixed(2),
            Number(i.total_consumed || 0).toLocaleString()
          );
          return row;
        });
        
        const totalRow = [
          { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
          { content: totalRMStock.toLocaleString(), styles: { fontStyle: 'bold' } }, 
        ];
        if (showPackStock) totalRow.push("");
        totalRow.push(
          { content: totalRMValue.toLocaleString(), styles: { fontStyle: 'bold' } }, 
          "", 
          { content: totalRMConsumed.toLocaleString(), styles: { fontStyle: 'bold' } }
        );
        bodyData.push(totalRow);

        autoTable(doc, {
          startY: 28,
          head: [showPackStock
            ? ['Material Name', 'Base Stock', 'Pack Stock', 'Value', 'Avg Cost', 'Consumed']
            : ['Material Name', 'Base Stock', 'Value', 'Avg Cost', 'Consumed']],
          body: bodyData,
          headStyles: { fillColor: [46, 125, 50] },
          theme: 'grid'
        });
      } else {
        const bodyData = filteredFG.map(i => [
          i['product.name'] || 'N/A', 
          Number(i.total_qty_remaining).toLocaleString(), 
          Number(i.unit_cost).toFixed(2), 
          (Number(i.unit_cost) * Number(i.total_qty_remaining)).toLocaleString(),
          Number(i.total_consumed || 0).toLocaleString() // Consumed Column
        ]);

        // Grand Total Row with Consumed Total
        bodyData.push([
          { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
          { content: totalFGQty.toLocaleString(), styles: { fontStyle: 'bold' } }, 
          "", 
          { content: totalFGValue.toLocaleString(), styles: { fontStyle: 'bold' } },
          { content: totalFGConsumed.toLocaleString(), styles: { fontStyle: 'bold' } } // Yahan total add kiya
        ]);

        autoTable(doc, {
          startY: 28,
          head: [['Product Name', 'Qty Remaining', 'Unit Cost', 'Total Value', 'Consumed']],
          body: bodyData,
          headStyles: { fillColor: [21, 101, 192] },
          theme: 'grid'
        });
      }

      doc.save(`Stock_Report_${today}.pdf`);
      toast.success("PDF Downloaded Successfully!", { id: loadingToast });

    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF!", { id: loadingToast });
    }
  };
  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Stock_Report_${today}.png`;
      link.click();
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f4f7f6' }}>
      <MainLayout />
      
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate(-1)} className='back-btn'>
              <FaArrowLeft />
            </button>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>Inventory Analytics</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }} 
            />
            <button onClick={fetchStockReport} style={{ padding: '8px 15px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> 
              <FaSync /> Refresh
            </button>

            <div style={{ display: 'flex', gap: '5px', borderLeft: '1px solid #eee', paddingLeft: '10px' }}>
               <button onClick={exportToExcel} style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFileExcel /></button>
               <button onClick={exportToPDF} style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaFilePdf /></button>
               <button onClick={exportToPNG} style={{ padding: '8px 12px', background: '#ef6c00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaImage /></button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button 
            onClick={() => setReportType('rm')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'rm' ? '4px solid #43a047' : 'none', color: reportType === 'rm' ? '#43a047' : '#666', fontWeight: '600' }}
          >
            <FaWarehouse /> Raw Material Stock
          </button>
          <button 
            onClick={() => setReportType('fg')}
            style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'fg' ? '4px solid #e53935' : 'none', color: reportType === 'fg' ? '#e53935' : '#666', fontWeight: '600' }}
          >
            <FaBox /> Finished Goods (Batches)
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>Loading Inventory Data...</div>
        ) : (
          <div ref={reportRef} style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            
            {reportType === 'rm' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#444' }}>Material Name</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Base Stock</th>
                    {showPackStock && (
                      <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Pack Stock</th>
                    )}
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Stock Value</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Avg Cost</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRM.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '18px 15px', fontWeight: '600', color: '#2c3e50' }}>{row['RawMaterial.name']}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: '#2e7d32', background: '#e8f5e9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em', fontWeight: 'bold' }}>
                          {Number(row.total_current_stock).toLocaleString()}{row.base_uom_name ? ` ${row.base_uom_name}` : ''}
                        </span>
                      </td>
                      {showPackStock && (
                        <td style={{ textAlign: 'center', fontWeight: '500', color: '#1565c0' }}>
                          {row.pack_stock_display || '-'}
                        </td>
                      )}
                      <td style={{ textAlign: 'center', fontWeight: '500' }}>{Number(row.total_stock_price).toLocaleString()}</td>
                      <td style={{ textAlign: 'center', color: '#666' }}>{Number(row.average_unit_cost).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: '#2196f3', background: '#ebf3ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em', fontWeight: 'bold' }}>
                          {row.total_consumed}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ padding: '15px' }}>GRAND TOTAL</td>
                    <td style={{ textAlign: 'center', color: '#2e7d32' }}>{totalRMStock.toLocaleString()}</td>
                    {showPackStock && <td></td>}
                    <td style={{ textAlign: 'center' }}>{totalRMValue.toLocaleString()}</td>
                    <td></td>
                    <td style={{ textAlign: 'center', color: '#2196f3'}}>{totalRMConsumed.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#444' }}>Product Name</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Qty Remaining</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Unit Cost (Avg)</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Total Value</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#444' }}>Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFG.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '18px 15px', fontWeight: '600', color: '#2c3e50' }}>{row['product.name']}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: '#2e7d32', background: '#e8f5e9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em', fontWeight: 'bold' }}>
                          {Number(row.total_qty_remaining).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: '#666', fontWeight: '600' }}>{Number(row.unit_cost).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: '#2196f3', background: '#ebf3ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em', fontWeight: 'bold' }}>
                          {(Number(row.unit_cost) * Number(row.total_qty_remaining)).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
  <span style={{ color: '#ff9800', background: '#fff3e0', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
    {Number(row.total_consumed || 0).toLocaleString()}
  </span>
</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ padding: '15px' }}>GRAND TOTAL</td>
                    <td style={{ textAlign: 'center', color: '#2e7d32' }}>{totalFGQty.toLocaleString()}</td>
                    <td></td>
                    <td style={{ textAlign: 'center', color: '#2196f3' }}>{totalFGValue.toLocaleString()}</td>
                    <td style={{ textAlign: 'center', color: '#ff9800' }}>{totalFGConsumed.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReport;