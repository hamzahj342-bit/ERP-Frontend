import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';
import { FaUserFriends, FaBoxOpen, FaFilter, FaFileInvoiceDollar, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { MdScience } from 'react-icons/md';

const SalesReport = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('customer'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // 🔍 New State
  
  const [customerData, setCustomerData] = useState([]);
  const [itemData, setItemData] = useState({ finishedProducts: [], rawMaterials: [] });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/sales-report', {
        params: { fromDate, toDate, reportType }
      });
      if (reportType === 'customer') {
        setCustomerData(response.data);
      } else {
        setItemData(response.data);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm(''); // Clear search when switching tabs
    fetchReport();
  }, [reportType]);

  // Filtering Logic
  const filteredCustomers = customerData.filter(row => 
    row.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFP = itemData.finishedProducts.filter(item => 
    item.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredRM = itemData.rawMaterials.filter(item => 
    item.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f4f7f6' }}>
      <MainLayout />
      
      <div style={{ padding: '20px', width: '98%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate('/reports')} className='back-btn'><FaArrowLeft /></button>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>Sales Analytics Report</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <span>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <button onClick={fetchReport} style={{ padding: '8px 15px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> <FaFilter /> Filter</button>
          </div>
        </div>

        {/* 🔍 Dynamic Search Bar */}
        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input 
                type="text" 
                placeholder={reportType === 'customer' ? "Search Customer Name..." : "Search Item/Material Name..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '30px', border: '1px solid #ddd', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button onClick={() => setReportType('customer')} style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'customer' ? '4px solid #2196f3' : 'none', color: reportType === 'customer' ? '#2196f3' : '#666', fontWeight: '600' }}><FaUserFriends /> Customer Wise</button>
          <button onClick={() => setReportType('item')} style={{ padding: '12px 25px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: reportType === 'item' ? '4px solid #2196f3' : 'none', color: reportType === 'item' ? '#2196f3' : '#666', fontWeight: '600' }}><FaBoxOpen /> Item Wise (RM & FP)</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>Loading Analytics Data...</div>
        ) : (
          <div className="report-content" style={{ width: '100%' }}>
            
            {/* 👤 CUSTOMER VIEW */}
            {reportType === 'customer' && (
              <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '20px' }}>Total Sales by Customer</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Customer Name</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Total Combined Sale (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px' }}>{row.name}</td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '500' }}>{Number(row.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f1f8ff', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ padding: '15px', borderTop: '2px solid #2196f3' }}>Grand Total</td>
                      <td style={{ padding: '15px', textAlign: 'right', borderTop: '2px solid #2196f3', color: '#1565c0' }}>
                        {filteredCustomers.reduce((sum, row) => sum + Number(row.total || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 📦 ITEM VIEW */}
            {reportType === 'item' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#e53935' }}><FaFileInvoiceDollar /> Finished Product Sales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead><tr style={{ background: '#fff5f5' }}><th style={{ padding: '12px' }}>Item Name</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                    <tbody>
                      {filteredFP.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{item.itemName}</td>
                          <td>{item.qty}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#43a047' }}><MdScience /> Raw Material Sales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead><tr style={{ background: '#f1f8e9' }}><th style={{ padding: '12px' }}>Material Name</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                    <tbody>
                      {filteredRM.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{item.itemName}</td>
                          <td>{item.qty}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;