import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Pagination from "../Components/Pagination";
import api from '../../api';

const MaterialsList = () => {
    const navigate = useNavigate();
    
    // States
    const [rawMaterial, setRawMaterial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uoms, setUoms] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Edit Modal States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        rm_id: null,
        name: '',
        uom_id: '',
        unit_quantity: '',
    });

    // ✅ Native Debounce Logic (As per FinishedProductList)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // ✅ Fetch Materials with 50 limit
    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.get('/add-materials', {
                params: {
                    page: page,
                    limit: 50,
                    search: debouncedSearch
                }
            });
            const data = res.data;
            setRawMaterial(data.data || []);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            toast.error('Failed to fetch materials');
        } finally {
            setLoading(false);
        }
    };

    const fetchUoms = async () => {
        try {
            const res = await api.get('/uoms');
            setUoms(res.data);
        } catch (error) {
            toast.error('Failed to fetch UOMs');
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchUoms();
    }, []);

    // Handlers
    const handleDelete = async (rm_id, name) => {
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to delete material: ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/add-materials/${rm_id}`);
                    Swal.fire('Deleted!', `Material has been deleted.`, 'success');
                    fetchMaterials();
                } catch (error) {
                    Swal.fire('Error!', 'Failed to delete material.', 'error');
                }
            }
        });
    };

    const openEditModal = (material) => {
        setEditData({
            rm_id: material.rm_id,
            name: material.name,
            uom_id: material.uom_id,
            unit_quantity: material.unit_quantity || '',
        });
        setEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        const selectedUom = uoms.find((u) => u.id == editData.uom_id)?.name;
        if (['Bag', 'Drum', 'Piece'].includes(selectedUom) && !editData.unit_quantity) {
            toast.error('Please fill Unit Quantity for Bag, Drum, or Piece.');
            return;
        }

        try {
            await api.put(`/add-materials/${editData.rm_id}`, editData);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: `Material ${editData.name} has been updated.`,
                showConfirmButton: false,
                timer: 1500
            });
            fetchMaterials(); 
            setEditModalOpen(false);
        } catch (error) {
            toast.error('Error updating material');
        }
    };

    return (
        <>
            <NavigationBar />
            <div className="page-container">
                <button className="back-btn" style={{ marginTop: '30px' }} onClick={() => navigate('/dashboard')}>
                    <FaArrowLeft />
                </button>

                <div className="card">
                    <button className="add-sale-btn" onClick={() => navigate("/add-materials")}>
                        Add New
                    </button>
                    <h2>Raw Material List</h2>

                    {/* ✅ Search Bar added here (Same style as your FP List) */}
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Filter by Material..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='input'
                        />
                    </div>

                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>UOM</th>
                                <th>Unit Weight</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center">Loading...</td></tr>
                            ) : rawMaterial.map((m) => (
                                <tr key={m.rm_id}>
                                    <td>{m.rm_id}</td>
                                    <td>{m.name}</td>
                                    <td>{m.uom?.name}</td>
                                    <td>{m.unit_quantity ? parseFloat(m.unit_quantity) : '-'}</td>
                                    <td>
                                        <button onClick={() => openEditModal(m)} className="edit-btn">Edit</button>
                                        <button onClick={() => handleDelete(m.rm_id, m.name)} className="delete-btn">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ✅ Pagination (FP List Style) */}
                    <div style={{ marginTop: '20px' }}>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(newPage) => setPage(newPage)}
                        />
                    </div>
                </div>

                {/* Edit Modal (Keeping your original design) */}
                {editModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '300px' }}>
                            <h3>Edit Raw Material</h3>
                            <form onSubmit={handleUpdateMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input className='input' type="text" name="name" value={editData.name} onChange={handleEditChange} required />
                                <select className='form' name="uom_id" value={editData.uom_id} onChange={handleEditChange} required>
                                    <option value="">Select UOM</option>
                                    {uoms.map((uom) => <option key={uom.id} value={uom.id}>{uom.name}</option>)}
                                </select>
                                {['Bag', 'Drum', 'Piece'].includes(uoms.find((u) => u.id == editData.uom_id)?.name) && (
                                    <input className='input' type="number" name="unit_quantity" placeholder="Unit Weight" value={editData.unit_quantity} onChange={handleEditChange} required />
                                )}
                                <button type="submit" className="primary-btn">Update</button>
                                <button type="button" onClick={() => setEditModalOpen(false)} className="primary-btn" style={{ backgroundColor: '#666' }}>Cancel</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default MaterialsList;