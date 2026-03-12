import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from "../../api"; 

const AddMaterial = () => {
  const navigate = useNavigate();

  const [rawMaterial, setRawMaterial] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    uom_id: '',
    unit_quantity: '',
  });
  const [uoms, setUoms] = useState([]);

  const fetchMaterials = async () => {
      try {
        const res = await api.get('/add-materials');
        const data = res.data;
        // Aapki original data structure logic
        const materials = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
        setRawMaterial(materials);
      } catch (error) {
        toast.error('Failed to fetch materials');
      }
    };

  // 2. Fetch all UOMs (GET)
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
    fetchUoms();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

   const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));


  // 3. Create new material (POST)
  const handleCreateMaterial = async (e) => {
    e.preventDefault();

     if (!user || !user.company_id) {
          toast.error("User session expired or Company not selected. Please login again.");
          return;
        }

    if (!formData.name || !formData.uom_id) {
      toast.error("Please fill all required fields!");
      return;
    }

    const selectedUom = uoms.find((u) => u.id == formData.uom_id)?.name;
    if (["Bag", "Drum", "Piece", "Bottle Piece", "Cap Piece"].includes(selectedUom) && !formData.unit_quantity) {
      toast.error("Please enter Unit Weight for this UOM!");
      return;
    }
       
    const payload = {
      ...formData,
      company_id: user.company_id,
      created_by: user ? user.id : null,
    };
    try {
      // api.post handles headers and JSON stringify automatically
      await api.post("/add-materials", payload);
      
      fetchMaterials(); 
      setFormData({ name: "", uom_id: "", unit_quantity: "" });
      toast.success("Raw Material Added Successfully!");
    } catch (error) {
      const msg = error.response?.data?.error || "Failed to add material!";
      toast.error(msg);
    }
  };

  
  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          style={{ marginTop: '30px' }}
          onClick={() => navigate('/materials-list')}
        >
          <FaArrowLeft />
        </button>

        {/* Create Material */}
        <div className="card">
          <h2>Create Raw Material</h2>
          <form onSubmit={handleCreateMaterial} className="form">
            <input
              type="text"
              name="name"
              placeholder="Material Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />

            <select
              className="form"
              name="uom_id"
              value={formData.uom_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select UOM</option>
              {uoms.map((uom) => (
                <option key={uom.id} value={uom.id}>
                  {uom.name}
                </option>
              ))}
            </select>

            {/* Conditional input for Bag, Drum, Piece */}
            {['Bag', 'Drum', 'Piece', 'Bottle Piece', 'Cap Piece'].includes(
              uoms.find((u) => u.id == formData.uom_id)?.name
            ) && (
              <input
                type="number"
                name="unit_quantity"
                placeholder="Enter Weight per unit"
                value={formData.unit_quantity}
                onChange={handleInputChange}
                required // Added required if conditional is true
              />
            )}

            <button className="primary-btn" type="submit">
              Add Raw Material
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AddMaterial;