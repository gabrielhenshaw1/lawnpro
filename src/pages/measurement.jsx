import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { db } from '../firebase.js';
import { doc, updateDoc } from "firebase/firestore";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default Leaflet marker icons in React
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- DATA: SERVICE PRICING ---
const SERVICES = [
  { id: "mowing", title: "Mowing & Trimming", rate: 50, unit: "acre", label: "$50 / acre" },
  { id: "weed_control", title: "Weed Control", rate: 60, unit: "acre", label: "$60 / acre" },
  { id: "fertilization", title: "Fertilization", rate: 60, unit: "acre", label: "$60 / acre" },
  { id: "aeration", title: "Aeration", rate: 100, unit: "acre", label: "$100 / acre" },
  { id: "overseeding", title: "Overseeding", rate: 60, unit: "acre", label: "$60 / acre" },
  { id: "dethatching", title: "Dethatching", rate: 120, unit: "acre", label: "$120 / acre" },
  { id: "leaf_removal", title: "Leaf Removal", rate: 50, unit: "acre", label: "$50 / acre" },
  { id: "mulching", title: "Mulching (Install)", rate: 160, unit: "acre", label: "$160 / acre" },
  { id: "pressure_wash", title: "Pressure Washing", rate: 5, unit: "1k_sqft", label: "$5 / 1k sq ft" },
];

// --- HELPER: Calculate Area ---
const calculateArea = (latLngs) => {
  if (latLngs.length < 3) return 0;
  const earthRadius = 6378137;
  const points = latLngs.map(p => ({ lat: p.lat * Math.PI / 180, lng: p.lng * Math.PI / 180 }));

  let area = 0;
  if (points.length > 2) {
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += (points[j].lng - points[i].lng) * (2 + Math.sin(points[i].lat) + Math.sin(points[j].lat));
    }
    area = Math.abs(area * earthRadius * earthRadius / 2.0);
  }
  return area * 10.7639; // Convert to sq ft
};

// --- SUB-COMPONENT: Drawing Controller ---
function DrawingController({ points, setPoints }) {
  useMapEvents({
    click(e) {
      setPoints([...points, e.latlng]);
    },
  });
  return null;
}

// --- SUB-COMPONENT: Map Updater ---
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Zoom 20 is excellent for house-level detail
      map.setView(center, 20);
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [center, map]);
  return null;
}

export default function MeasurementPage({ initialData, onNavigate }) {
  // Detailed Address State
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('KY');
  const [zip, setZip] = useState('');

  const [center, setCenter] = useState([37.69, -87.91]); // Default Morganfield
  const [points, setPoints] = useState([]);
  const [sqFt, setSqFt] = useState(0);
  const [loading, setLoading] = useState(false);

  // Quote Logic
  const [selectedServiceId, setSelectedServiceId] = useState('mowing');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [sending, setSending] = useState(false);

  // --- 1. AUTO-FILL & SEARCH ---
  useEffect(() => {
    if (initialData) {
      // Basic parsing of address string "123 Main St, City, State Zip"
      const parts = initialData.address.split(',');
      if(parts[0]) setStreet(parts[0].trim());
      if(parts[1]) setCity(parts[1].trim());

      // Auto-select service if passed
      if (initialData.serviceId) {
        const match = SERVICES.find(s => s.title === initialData.serviceId || s.id === initialData.serviceId);
        if (match) setSelectedServiceId(match.id);
      }
      // Trigger search if address is present
      if(parts[0]) {
        setTimeout(() => executeSearch(parts[0].trim(), parts[1]?.trim() || '', 'KY', ''), 500);
      }
    }
  }, [initialData]);

  const executeSearch = async (str, cty, st, zp) => {
    setLoading(true);
    try {
      // FIX: Using ArcGIS Geocoding Service.
      const fullAddress = `${str}, ${cty}, ${st} ${zp}`;
      const response = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(fullAddress)}&f=json&outSR=4326&maxLocations=1`);

      const data = await response.json();

      if (data && data.candidates && data.candidates.length > 0) {
        const location = data.candidates[0].location;
        // ArcGIS returns x (lon), y (lat)
        setCenter([location.y, location.x]);
        setPoints([]);
        setSqFt(0);
      } else {
        alert("Address not found. Please verify the details.");
      }
    } catch (error) {
      console.error("Search failed", error);
      alert("Error searching address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if(!street || !city || !state) return alert("Please enter Street, City, and State.");
    executeSearch(street, city, state, zip);
  };

  const handleUndo = () => {
    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
  };

  const handleReset = () => {
    setPoints([]);
    setSqFt(0);
  };

  // Recalculate Area & Price whenever points or service changes
  useEffect(() => {
    const area = calculateArea(points);
    setSqFt(area);
    const service = SERVICES.find(s => s.id === selectedServiceId);
    if (service) {
      let price = 0;
      if (service.unit === 'acre') {
        const acres = area / 43560;
        price = acres * service.rate;
      } else if (service.unit === '1k_sqft') {
        price = (area / 1000) * service.rate;
      }

      // Minimum pricing
      if (price < 40 && price > 0) price = 40;
      // --- ROUNDING LOGIC: Nearest 5 ---
      price = Math.round(price / 5) * 5;

      setEstimatedPrice(price);
    }
  }, [points, selectedServiceId]);

  // --- 3. SEND QUOTE TO CUSTOMER ---
  const handleSendQuote = async () => {
    if (!initialData || !initialData.bookingId) return alert("No booking linked to this estimate.");
    if (estimatedPrice <= 0) return alert("Please generate an estimate first.");

    setSending(true);
    try {
      await updateDoc(doc(db, "bookings", initialData.bookingId), {
        status: "quote_received",
        quoteAmount: estimatedPrice,
        proNotes: `Estimate based on measured area: ${Math.round(sqFt).toLocaleString()} sq ft.`
      });
      alert(`Quote of $${estimatedPrice} sent to ${initialData.customerName}!`);
      
      // FIX: Redirect back to requests page to prevent duplicate sends
      if (onNavigate) {
        onNavigate('Requests');
      }
      
    } catch (error) {
      console.error("Error sending quote:", error);
      alert("Failed to send quote.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">

        {/* CONTROL PANEL */}
        <div className="w-full md:w-2/3 grid gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Estimate Tool</h1>
            {initialData && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">Linked: {initialData.customerName}</span>}
          </div>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
              <input type="text" placeholder="1207 N Adams St" className="w-full p-2 border rounded text-sm" value={street} onChange={e => setStreet(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
              <input type="text" placeholder="Sturgis" className="w-full p-2 border rounded text-sm" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
              <input type="text" placeholder="KY" className="w-full p-2 border rounded text-sm" value={state} onChange={e => setState(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zip</label>
              <input type="text" placeholder="42459" className="w-full p-2 border rounded text-sm" value={zip} onChange={e => setZip(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 text-sm h-[38px]">
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </form>

          {/* QUOTE CALCULATOR */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Select Service to Quote</label>
              <select
                className="w-full p-2 border rounded text-sm bg-white"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
              >
                {SERVICES.map(s => (
                  <option key={s.id} value={s.id}>{s.title} ({s.label})</option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-blue-800 uppercase">Auto-Quote</div>
              <div className="text-3xl font-bold text-green-600">
                ${estimatedPrice.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600">Based on measured area</div>
            </div>
            {/* Only show send button if linked to a booking */}
            {initialData && initialData.bookingId && (
              <button onClick={handleSendQuote} disabled={sending || estimatedPrice === 0} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Quote'}
              </button>
            )}
          </div>
        </div>

        {/* AREA RESULTS */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 min-w-[200px] w-full md:w-auto">
          <div className="text-xs text-gray-500 uppercase font-bold">Measured Area</div>
          <div className="text-3xl font-bold text-gray-800">
            {Math.round(sqFt).toLocaleString()} <span className="text-sm text-gray-400 font-normal">sq ft</span>
          </div>
          <div className="text-sm text-gray-600 font-medium mb-2">
            {(sqFt / 43560).toFixed(3)} acres
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleUndo} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200 border">Undo</button>
            <button onClick={handleReset} className="flex-1 bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-100 border border-red-200">Clear</button>
          </div>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="w-full rounded-xl overflow-hidden border border-gray-300 shadow-inner relative bg-gray-200" style={{ height: '600px' }}>
        <MapContainer center={center} zoom={18} maxZoom={22} style={{ height: '100%', width: '100%' }}>

          {/* LAYER: GOOGLE HYBRID (Satellite + Streets + Labels) */}
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
            maxZoom={22}
          />

          <MapController center={center} />
          <DrawingController points={points} setPoints={setPoints} />

          {/* Polygon Drawing */}
          {points.length > 0 && (
            <>
              <Polygon positions={points} pathOptions={{ color: '#39ff14', weight: 3, fillColor: '#39ff14', fillOpacity: 0.2 }} />
              {points.map((p, idx) => (
                <Marker key={idx} position={p} />
              ))}
            </>
          )}
        </MapContainer>
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur p-2 rounded text-xs text-gray-600 shadow">
          Click points on map to measure area.
        </div>
      </div>
    </div>
  );
}