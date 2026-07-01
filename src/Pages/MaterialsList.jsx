import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEdit, FaPlus, FaSearch, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Pagination from "../Components/Pagination";
import api from '../../api';
import '../css/RM/MaterialList.css'; // Importing New CSS

const MaterialsList = () => {
    const navigate = useNavigate();
    
    const [rawMaterial, setRawMaterial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uoms, setUoms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        rm_id: null,
        name: '',
        uom_id: '',
        unit_quantity: '',
    });

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.get('/add-materials/with-filters', {
                params: { page, limit: 50, search: debouncedSearch }
            });
            setRawMaterial(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) {
            toast.error('Failed to fetch materials');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [page, debouncedSearch]);

    useEffect(() => {
        const fetchUoms = async () => {
            try {
                const res = await api.get('/uoms');
                setUoms(res.data);
            } catch (error) { toast.error('Failed to fetch UOMs'); }
        };
        const fetchCategories = async () => {
            try { const res = await api.get('/material-categories'); setCategories(res.data); } catch (err) { toast.error('Failed to fetch categories'); }
        };
        fetchUoms();
        fetchCategories();
    }, []);

    const handleDelete = async (rm_id, name) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/add-materials/${rm_id}`);
                Swal.fire('Deleted!', 'Material removed.', 'success');
                fetchMaterials();
            } catch (error) { Swal.fire('Error!', 'Failed to delete.', 'error'); }
        }
    };

    const openEditModal = (material) => {
        setEditData({
            rm_id: material.rm_id,
            name: material.name,
            uom_id: material.uom_id,
            unit_quantity: material.unit_quantity || '',
            material_category_id: material.material_category_id || (material.material_category?.id || ''),
        });
        setEditModalOpen(true);
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/add-materials/${editData.rm_id}`, editData);
            toast.success('Updated successfully');
            fetchMaterials(); 
            setEditModalOpen(false);
        } catch (error) { toast.error('Update failed'); }
    };

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <div className="materials-wrapper">
                <div className="materials-container">
                    
                    <div className="materials-header">
                        <div className="header-left" style={{marginTop: '30px'}}>
                            <button className="back-btn" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <div className="materials-title">
                                <h2>Raw Materials</h2>
                            </div>
                        </div>
                    </div>

                    <div className="actions-bar">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Search material name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button className="add-sale-btn" onClick={() => navigate("/add-materials")}>
                            <FaPlus /> Add New Material
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="materials-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>UOM</th>
                                    <th>Unit Weight</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{textAlign:'center'}}>Loading...</td></tr>
                                ) : rawMaterial.map((m) => (
                                    <tr key={m.rm_id}>
                                        <td data-label="ID">#{m.rm_id}</td>
                                        <td data-label="Name" style={{fontWeight:'600'}}>{m.name}</td>
                                        <td data-label="Category">{m.material_category?.name || '-'}</td>
                                        <td data-label="UOM">{m.uom?.name}</td>
                                        <td data-label="Weight">{m.unit_quantity || '-'}</td>
                                        <td data-label="Actions">
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(m)} className="edit-btn-action"><FaEdit /></button>
                                                <button onClick={() => handleDelete(m.rm_id, m.name)} className="delete-btn"><FaTrashAlt /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                </div>

                {/* Edit Modal */}
                {editModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Edit Material</h3>
                            <form onSubmit={handleUpdateMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Material Name</label>
                                <input className='search-input' type="text" value={editData.name} onChange={(e)=>setEditData({...editData, name:e.target.value})} required />
                                
                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Select UOM</label>
                                <select className='search-input' value={editData.uom_id} onChange={(e)=>setEditData({...editData, uom_id:e.target.value})} required>
                                    <option value="">Select UOM</option>
                                    {uoms.map((uom) => <option key={uom.id} value={uom.id}>{uom.name}</option>)}
                                </select>

                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Select Category</label>
                                <select className='search-input' value={editData.material_category_id} onChange={(e)=>setEditData({...editData, material_category_id:e.target.value})} >
                                    <option value="">Select Category</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                <button type="submit" className="btn-add">Update Material</button>
                                <button type="button" onClick={() => setEditModalOpen(false)} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancel</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default MaterialsList;