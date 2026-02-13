import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaArrowLeft, FaSearch, FaFilter } from 'react-icons/fa';
import { MdScience, MdPrecisionManufacturing } from 'react-icons/md';

const ProductionReport = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('summary'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/production-report', {
        params: { fromDate, toDate, reportType }
      });
      setData(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm('');
    fetchReport();
  }, [reportType]);

  const filteredData = data.filter(item => 
    (reportType === 'summary' ? item.productName : item.materialName)
    ?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f4f7f6' }}>
      <MainLayout />
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate('/reports')} className='back-btn'><FaArrowLeft /></button>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Production Analytics</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <button onClick={fetchReport} style={{ padding: '8px 15px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> <FaFilter /> Filter</button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px', maxWidth: '400px', position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '15px', top: '15px', color: '#999' }} />
          <input 
            type="text" 
            placeholder={reportType === 'summary' ? "Search Product..." : "Search Material..."} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 40px', borderRadius: '30px', border: '1px solid #ddd', outline: 'none' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button onClick={() => setReportType('summary')} style={{ padding: '12px 25px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: reportType === 'summary' ? '4px solid #4caf50' : 'none', color: reportType === 'summary' ? '#4caf50' : '#666', fontWeight: 'bold' }}><MdPrecisionManufacturing /> Summary</button>
          {/* <button onClick={() => setReportType('consumption')} style={{ padding: '12px 25px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: reportType === 'consumption' ? '4px solid #ff9800' : 'none', color: reportType === 'consumption' ? '#ff9800' : '#666', fontWeight: 'bold' }}><MdScience /> Consumption</button> */}
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading Production Data...</div>
        ) : (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>{reportType === 'summary' ? 'Product Name' : 'Material Name'}</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>{reportType === 'summary' ? 'Total Batches' : 'Qty Used'}</th>
                  <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>{reportType === 'summary' ? 'Produced Qty' : 'Value (Rs)'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>{reportType === 'summary' ? row.productName : row.materialName}</td>
                    <td style={{ padding: '15px' }}>{reportType === 'summary' ? row.batchCount : Number(row.usedQty).toFixed(2)}</td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                      {Number(reportType === 'summary' ? row.totalQty : row.totalCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionReport;