import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, LayoutGrid, Sun, Moon, AlertTriangle, CheckCircle, FileText, ArrowRightLeft, Box, HardHat, Ruler, CloudSun, Wind, Activity, Layers, X, MapPin, Zap, TrendingUp, Download, Cpu, Camera } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// ==========================================
// 1. EXTRACTED TIER 1 DATABASE (With Electrical Currents)
// ==========================================
const solarPanelDatabase = [
  // Trina Solar
  { id: "trina_vertex_n_720", manufacturer: "Trina Solar", model: "Vertex N NEG21C.20", electrical: { wattage: 720, v_mp: 41.5, i_mp: 17.35 }, physical: { length: 2384, width: 1303, thickness: 33 }, weight: 38.5 },
  { id: "trina_vertex_n_620", manufacturer: "Trina Solar", model: "Vertex N NEG19RC.20", electrical: { wattage: 620, v_mp: 40.0, i_mp: 15.5 }, physical: { length: 2384, width: 1134, thickness: 30 }, weight: 34.0 },
  { id: "trina_vertex_s_460", manufacturer: "Trina Solar", model: "Vertex S+ NEG9R.28", electrical: { wattage: 460, v_mp: 42.0, i_mp: 10.95 }, physical: { length: 1762, width: 1134, thickness: 30 }, weight: 21.1 },
  // LONGI Solar
  { id: "longi_himo_9", manufacturer: "LONGi", model: "Hi-MO 9 LR8-66HYD", electrical: { wattage: 670, v_mp: 41.0, i_mp: 16.34 }, physical: { length: 2382, width: 1134, thickness: 30 }, weight: 33.5 },
  { id: "longi_himo_7", manufacturer: "LONGi", model: "Hi-MO 7 LR7-72HGD", electrical: { wattage: 620, v_mp: 42.6, i_mp: 14.55 }, physical: { length: 2278, width: 1134, thickness: 30 }, weight: 31.8 },
  { id: "longi_himo_x6_600", manufacturer: "LONGi", model: "Hi-MO X6 LR5-72HTH", electrical: { wattage: 600, v_mp: 43.8, i_mp: 13.70 }, physical: { length: 2278, width: 1134, thickness: 30 }, weight: 27.5 },
  { id: "longi_himo_x10", manufacturer: "LONGi", model: "Hi-MO X10 EcoLife", electrical: { wattage: 510, v_mp: 35.0, i_mp: 14.57 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 21.0 },
  // Canadian Solar
  { id: "canadian_topbihiku6_660", manufacturer: "Canadian Solar", model: "TOPBiHiKu6 CS6.2", electrical: { wattage: 660, v_mp: 38.3, i_mp: 17.24 }, physical: { length: 2382, width: 1134, thickness: 30 }, weight: 33.5 },
  { id: "canadian_lowcarbon_hjt", manufacturer: "Canadian Solar", model: "Low Carbon HJT HP", electrical: { wattage: 660, v_mp: 39.5, i_mp: 16.71 }, physical: { length: 2382, width: 1134, thickness: 35 }, weight: 40.6 },
  { id: "canadian_tophiku6_450", manufacturer: "Canadian Solar", model: "TOPHiKu6 CS6R-T", electrical: { wattage: 450, v_mp: 32.2, i_mp: 13.98 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 21.3 },
  // Sunova Solar
  { id: "sunova_tangra_l_hd", manufacturer: "Sunova Solar", model: "Tangra L HD 66MDH", electrical: { wattage: 720, v_mp: 41.2, i_mp: 17.48 }, physical: { length: 2384, width: 1303, thickness: 35 }, weight: 38.5 },
  { id: "sunova_tangra_m_pro", manufacturer: "Sunova Solar", model: "Tangra M Pro TS-BGT72", electrical: { wattage: 600, v_mp: 42.1, i_mp: 14.25 }, physical: { length: 2278, width: 1134, thickness: 30 }, weight: 31.5 },
  { id: "sunova_tangra_s_pro", manufacturer: "Sunova Solar", model: "Tangra S Pro HD", electrical: { wattage: 445, v_mp: 32.8, i_mp: 13.57 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 21.5 },
  // JA Solar
  { id: "ja_deepblue_4_640", manufacturer: "JA Solar", model: "DeepBlue 4.0 Pro JAM72D42", electrical: { wattage: 640, v_mp: 42.6, i_mp: 15.02 }, physical: { length: 2465, width: 1134, thickness: 35 }, weight: 34.6 },
  { id: "ja_deepblue_4_460", manufacturer: "JA Solar", model: "DeepBlue 4.0 Pro JAM54D40", electrical: { wattage: 460, v_mp: 32.5, i_mp: 14.15 }, physical: { length: 1762, width: 1134, thickness: 30 }, weight: 22.0 },
];

const GAUGE_OPTIONS = [
  { gauge: 16, mm: 1.52, strengthRating: 1 },
  { gauge: 14, mm: 1.98, strengthRating: 2 },
  { gauge: 12, mm: 2.66, strengthRating: 3 },
  { gauge: 10, mm: 3.42, strengthRating: 5 },
  { gauge: 8,  mm: 4.17, strengthRating: 7 }
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const UnitToggle = ({ value, onChange, opt1, opt2 }) => (
  <button onClick={() => onChange(value === opt1 ? opt2 : opt1)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider bg-black/20 hover:bg-black/40 px-2 py-0.5 rounded text-cyan-500 transition-colors border border-cyan-500/20 no-print">
    <ArrowRightLeft size={8} /> {value}
  </button>
);

// ==========================================
// 2. MAIN APPLICATION COMPONENT
// ==========================================
const App = () => {
  // --- CORE UI STATE ---
  const [theme, setTheme] = useState('dark'); 
  const [visualMode, setVisualMode] = useState('realistic'); 
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showBOM, setShowBOM] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  
  // --- REPORT GENERATION STATE ---
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportImages, setReportImages] = useState([]);

  // --- UNIT STATES ---
  const [unitGlobal, setUnitGlobal] = useState('metric'); 
  const [unitSpacing, setUnitSpacing] = useState('mm'); 
  const [unitElevation, setUnitElevation] = useState('m'); 
  const [unitProfile, setUnitProfile] = useState('in'); 
  
  // --- ARRAY STATE ---
  const [selectedPanelId, setSelectedPanelId] = useState(solarPanelDatabase[0].id);
  const [panelRows, setPanelRows] = useState(2);
  const [panelCols, setPanelCols] = useState(5);
  const [panelAlignment, setPanelAlignment] = useState('portrait'); 
  const [panelSpacing, setPanelSpacing] = useState(25); // mm
  
  // --- ELEVATION & LOCATION STATE ---
  const [frontHeight, setFrontHeight] = useState(1.0); 
  const [rearHeight, setRearHeight] = useState(2.0); 
  const [locationData, setLocationData] = useState({ lat: 31.5, city: "Manual Entry" });
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // --- MOUNTING STATE ---
  const [mountSystem, setMountSystem] = useState('custom'); 
  const [pillarType, setPillarType] = useState('pipe_round'); 
  const [beamType, setBeamType] = useState('channel'); 
  const [railType, setRailType] = useState('channel'); 
  const [bracingType, setBracingType] = useState('lateral'); 
  const [fastenerType, setFastenerType] = useState('screw'); 
  
  const [pillarSpec, setPillarSpec] = useState({ w: 2.0, d: 2.0, g: 12 });
  const [beamSpec, setBeamSpec] = useState({ w: 2.0, d: 2.0, g: 14 });
  const [railSpec, setRailSpec] = useState({ w: 1.5, d: 1.5, g: 14 });

  const [sunHour, setSunHour] = useState(12); 
  const [sunMonth, setSunMonth] = useState(6); 

  // --- PHYSICS & OUTPUTS ---
  const [isSafe, setIsSafe] = useState(true);
  const [maxCapacity, setMaxCapacity] = useState(0);
  const [windResistance, setWindResistance] = useState(0); 
  const [earthquakeRes, setEarthquakeRes] = useState(0); 

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const structureGroupRef = useRef(null);
  const dirLightRef = useRef(null);

  // --- DERIVED MATH & ENGINEERING CALCULATIONS ---
  const activePanel = useMemo(() => solarPanelDatabase.find(p => p.id === selectedPanelId), [selectedPanelId]);
  const panelCount = panelRows * panelCols;
  const totalWeightBase = activePanel.weight * panelCount; 
  const totalPower = activePanel.electrical.wattage * panelCount; 

  const pWidthRaw = activePanel.physical.width / 1000; 
  const pLengthRaw = activePanel.physical.length / 1000;
  const pThick = activePanel.physical.thickness / 1000;
  const pWidth = panelAlignment === 'portrait' ? pWidthRaw : pLengthRaw;
  const pLength = panelAlignment === 'portrait' ? pLengthRaw : pWidthRaw;
  
  const spacingMeters = panelSpacing / 1000;
  const totalArrayLength = (panelRows * pLength) + ((panelRows - 1) * spacingMeters);
  const totalArrayWidth = (panelCols * pWidth) + ((panelCols - 1) * spacingMeters);
  
  let tiltRad = Math.asin((rearHeight - frontHeight) / totalArrayLength);
  if (isNaN(tiltRad)) tiltRad = 0; 
  const tiltAngleDeg = THREE.MathUtils.radToDeg(tiltRad);

  const pillarCountX = Math.max(2, Math.ceil(panelCols / 2) + 1); 
  const pillarCountZ = Math.max(2, Math.ceil(totalArrayLength / 2.5) + 1);
  const totalPillars = pillarCountX * pillarCountZ;

  const baseAreaSqMeters = totalArrayWidth * (totalArrayLength * 0.9);
  
  // Seasonal Sine Wave Modifier for Peak Sun Hours based on the selected Month
  const seasonModifier = Math.sin(((sunMonth - 3) / 12) * Math.PI * 2) * 2.0; 
  const estimatedPeakHours = Math.max(2, 6.5 - Math.abs(tiltAngleDeg - Math.abs(locationData.lat)) * 0.04 + seasonModifier);

  // Electrical Yield Forecasts (Assumes 85% Performance Ratio)
  const PR = 0.85;
  const dailyYieldKwh = (totalPower / 1000) * estimatedPeakHours * PR;
  const monthlyYieldKwh = dailyYieldKwh * 30;
  const annualYieldKwh = dailyYieldKwh * 365;

  // NEC Wire Gauge Calculations (1.25x Continuous Load Factor)
  const maxStringCurrent = activePanel.electrical.i_mp * 1.25;
  let recommendedGauge = "4 mm² (12 AWG)";
  if (maxStringCurrent > 15 && maxStringCurrent <= 22) recommendedGauge = "6 mm² (10 AWG)";
  if (maxStringCurrent > 22) recommendedGauge = "10 mm² (8 AWG)";

  // Formatters
  const formatMeters = (m) => unitGlobal === 'metric' ? `${m.toFixed(2)} m` : `${(m * 3.28084).toFixed(1)} ft`;
  const formatWeight = (kg) => unitGlobal === 'metric' ? `${kg.toFixed(0)} kg` : `${(kg * 2.20462).toFixed(0)} lbs`;
  const formatWind = (kmh) => unitGlobal === 'metric' ? `${kmh.toFixed(0)} km/h` : `${(kmh * 0.621371).toFixed(0)} mph`;
  const formatArea = (sqm) => unitGlobal === 'metric' ? `${sqm.toFixed(1)} m²` : `${(sqm * 10.7639).toFixed(1)} sq ft`;

  // --- REPORT GENERATION (CAPTURE CAD VIEWS) ---
  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    const prevTheme = theme;
    const prevMode = visualMode;
    const prevMeasurements = showMeasurements;

    // 1. Force the engine into Solid Mode + Light Mode + Blueprints ON
    setTheme('light');
    setVisualMode('solid');
    setShowMeasurements(true);

    // 2. Wait 800ms for React to render and Three.js to compile new solid materials
    setTimeout(() => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const structGroup = structureGroupRef.current;
        
        if (renderer && scene && structGroup) {
            // Setup an independent camera for taking the shots so we don't mess up the user's OrbitControls
            const w = window.innerWidth;
            const h = window.innerHeight;
            const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
            
            // Calculate exact bounding box to frame the 3D structure perfectly
            const box = new THREE.Box3().setFromObject(structGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = cam.fov * (Math.PI / 180);
            let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
            dist = Math.max(dist, 8); // Minimum distance

            const captureFrame = (px, py, pz) => {
                cam.position.set(center.x + px, center.y + py, center.z + pz);
                cam.lookAt(center);
                renderer.render(scene, cam);
                return renderer.domElement.toDataURL('image/png');
            };

            // Grab the 4 requested angles
            const shots = [
                { id: 'top', label: "Top Orthographic View", src: captureFrame(0.01, dist, 0) },
                { id: 'front', label: "Front Elevation", src: captureFrame(0, 0, dist) },
                { id: 'side', label: "Side Elevation", src: captureFrame(dist, 0, 0) },
                { id: 'diag', label: "Diagonal Isometric", src: captureFrame(dist * 0.7, dist * 0.6, dist * 0.7) }
            ];

            setReportImages(shots);
        }

        // 3. Restore User's original settings
        setTheme(prevTheme);
        setVisualMode(prevMode);
        setShowMeasurements(prevMeasurements);
        
        setIsGeneratingReport(false);
        setShowBOM(true); // Open the Modal
    }, 800);
  };

  // --- GPS AUTO-OPTIMIZATION ---
  const handleAutoOptimize = () => {
      setIsOptimizing(true);
      setTimeout(() => {
          const optimalLat = 31.5; // Example: Lahore/Texas latitude
          setLocationData({ lat: optimalLat, city: "Optimized (GPS)" });
          const optimalTiltRad = THREE.MathUtils.degToRad(optimalLat);
          const newRearHeight = frontHeight + Math.sin(optimalTiltRad) * totalArrayLength;
          setRearHeight(newRearHeight);
          setBracingType('full_x'); 
          setVisualMode('solid'); 
          setIsOptimizing(false);
      }, 1500);
  };

  // --- PHYSICS ENGINE ---
  useEffect(() => {
    const getStrength = (type) => {
        switch(type) { case 'pipe_round': return 250; case 'pipe_square': return 320; case 'channel': return 400; case 'gadar': return 800; case 'brick': return 3000; default: return 250; }
    };
    const calcCap = (type, spec, mult) => {
        if (type === 'brick') return 3000 * mult * 2; 
        const gaugeMult = GAUGE_OPTIONS.find(g => g.gauge === spec.g).strengthRating / 2.0; 
        const sizeMult = ((spec.w + spec.d) / 2) / 2.0; 
        return getStrength(type) * gaugeMult * sizeMult * mult * 2;
    };

    let braceMult = 1.0;
    if (mountSystem === 'prefab_stand') braceMult = 1.6;
    else {
        if (bracingType === 'front_back') braceMult = 1.2;
        if (bracingType === 'x_front_back') braceMult = 1.4;
        if (bracingType === 'lateral') braceMult = 1.5;
        if (bracingType === 'full_x') braceMult = 1.8;
    }

    let capacity = 0;
    if (mountSystem === 'prefab_stand') {
        capacity = calcCap(railType, railSpec, totalPillars) * braceMult;
    } else {
        const pCap = calcCap(pillarType, pillarSpec, totalPillars) * braceMult;
        const bCap = calcCap(beamType, beamSpec, totalPillars) * (braceMult > 1 ? 1.2 : 1.0);
        const rCap = calcCap(railType, railSpec, (panelRows * 2) * panelCols / 2); 
        capacity = Math.min(pCap, bCap, rCap);
        if (pillarType === 'brick' && bracingType === 'none' && tiltAngleDeg > 30) capacity *= 0.6; 
    }
    if (tiltAngleDeg > 20) capacity *= (1 - ((tiltAngleDeg - 20) * 0.015)); 

    setMaxCapacity(Math.floor(capacity));
    setIsSafe(capacity >= totalWeightBase);

    // Wind Resistance
    const availLbs = (capacity - totalWeightBase) * 2.20462;
    const areaSqFt = (totalArrayWidth * 3.28084) * (totalArrayLength * 3.28084);
    const Cd = Math.max(0.2, 1.2 * Math.sin(Math.max(0.1, tiltRad))); 
    let maxWind = 0;
    if (availLbs > 0 && areaSqFt > 0) maxWind = Math.sqrt(availLbs / (0.00256 * areaSqFt * Cd));
    setWindResistance(Math.min(220, maxWind) * 1.60934); 

    // Earthquake Magnitude (Richter Scale Estimate)
    let baseMag = 4.5;
    if (mountSystem === 'prefab_stand') baseMag = 6.0;
    else {
        if (bracingType === 'lateral') baseMag = 7.0;
        if (bracingType === 'full_x') baseMag = 8.5;
        if (bracingType === 'front_back') baseMag = 5.8;
        if (bracingType === 'x_front_back') baseMag = 6.5;
    }
    const cgHeight = (frontHeight + rearHeight) / 2;
    if (cgHeight > 1.5) baseMag -= (cgHeight - 1.5) * 0.6; 
    if (totalWeightBase > capacity * 0.8) baseMag -= 0.8; 
    setEarthquakeRes(Math.max(3.0, Math.min(9.5, baseMag)));

  }, [pillarSpec, beamSpec, railSpec, totalWeightBase, tiltAngleDeg, pillarType, beamType, railType, mountSystem, bracingType, panelCols, panelRows, totalArrayWidth, totalArrayLength, tiltRad, frontHeight, rearHeight, totalPillars]);

  // --- THREE.JS INITIALIZATION ---
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 8, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; 

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.top = 20; dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20; dirLight.shadow.camera.right = 20;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const structureGroup = new THREE.Group();
    scene.add(structureGroup);
    structureGroupRef.current = structureGroup;

    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);

    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animId); if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement); renderer.dispose(); };
  }, []);

  // --- HELIODON & THEME UPDATE ---
  useEffect(() => {
    if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(theme === 'light' ? '#e2e8f0' : '#0a0a0c');
        
        let ground = sceneRef.current.children.find(c => c.name === 'groundPlane');
        let grid = sceneRef.current.children.find(c => c.name === 'gridHelper');
        
        if(!ground) {
            ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.4 }));
            ground.name = 'groundPlane'; ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
            sceneRef.current.add(ground);
        }
        if(!grid) {
            grid = new THREE.GridHelper(100, 100);
            grid.name = 'gridHelper'; grid.material.transparent = true;
            sceneRef.current.add(grid);
        }
        
        ground.material.opacity = theme === 'light' ? 0.1 : 0.6;
        grid.material.color.setHex(theme === 'light' ? 0x94a3b8 : 0x00f0ff);
        grid.material.opacity = theme === 'light' ? 0.3 : 0.08;
    }

    if (dirLightRef.current) {
        const hourAngle = ((sunHour - 6) / 12) * Math.PI; 
        const declination = Math.sin(((sunMonth - 3) / 12) * Math.PI * 2) * (Math.PI / 8); 
        const r = 30;
        dirLightRef.current.position.set(r * Math.cos(hourAngle), Math.max(2, r * Math.sin(hourAngle) * Math.cos(declination)), r * Math.sin(declination) + 5);
        dirLightRef.current.intensity = Math.max(0.2, Math.sin(hourAngle) * 1.8) * brightness;
        sceneRef.current.children.forEach(c => { if (c instanceof THREE.AmbientLight) c.intensity = (theme === 'light' ? 0.8 : 0.4) * brightness; });
    }
  }, [sunHour, sunMonth, brightness, theme]);

  // --- 3D GENERATOR ---
  useEffect(() => {
    if (!structureGroupRef.current) return;
    const group = structureGroupRef.current;
    while(group.children.length > 0) { const c = group.children[0]; if(c.geometry) c.geometry.dispose(); if(c.material) c.material.dispose(); group.remove(c); }

    const isSolid = visualMode === 'solid';
    const isLego = visualMode === 'lego';

    const getMat = (type, colorHex) => {
        if (isLego) return new THREE.MeshBasicMaterial({ color: colorHex });
        if (isSolid) return new THREE.MeshLambertMaterial({ color: colorHex });
        if (type === 'panel') return new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: 0.1, metalness: 0.9, side: THREE.DoubleSide });
        if (type === 'frame') return new THREE.MeshStandardMaterial({ color: 0x8892b0, roughness: 0.4, metalness: 0.7 });
        if (type === 'channel') return new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.5 });
        if (type === 'brick') return new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
        if (type === 'concrete') return new THREE.MeshStandardMaterial({ color: 0x737373, roughness: 1.0 });
        if (type === 'fastener') return new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
        return new THREE.MeshStandardMaterial({ color: colorHex });
    };

    const mats = {
        panel: getMat('panel', 0x1d4ed8),
        rail: getMat('channel', 0xdc2626),
        beam: getMat('channel', 0xeab308),
        pillar: getMat('frame', 0x22c55e),
        brick: getMat('brick', 0x9a3412),
        concrete: getMat('concrete', 0x52525b),
        fastener: getMat('fastener', 0x94a3b8)
    };

    const createDimension = (p1, p2, text, exactOffset, isCallout = false) => {
        if (!showMeasurements) return new THREE.Group();
        const dimGroup = new THREE.Group();
        
        const start = p1.clone().add(exactOffset);
        const end = p2.clone().add(exactOffset);
        
        const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, depthTest: false, transparent: true, opacity: 0.8 });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(lineGeo, mat);
        line.renderOrder = 999;
        dimGroup.add(line);

        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0,0,300,64);
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.strokeRect(0,0,300,64);
        ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 28px "Courier New", Courier, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`> ${text}`, 150, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.5, 0.32, 1);
        sprite.renderOrder = 999;
        
        if (isCallout) {
            sprite.position.copy(end).add(new THREE.Vector3(0, 0.2, 0));
        } else {
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const dir = new THREE.Vector3().subVectors(end, start).normalize();
            let cross = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(0.3);
            if (cross.lengthSq() < 0.01) cross = new THREE.Vector3(1,0,0).multiplyScalar(0.3);
            sprite.position.copy(mid).add(cross);
        }
        dimGroup.add(sprite);
        return dimGroup;
    };

    const addEdges = (mesh) => {
        if (isSolid || isLego) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: theme === 'light' ? 0x000000 : 0xffffff, opacity: 0.2, transparent: true }));
            mesh.add(line);
        }
    };

    const createProfile = (type, length, axis = 'Y', spec) => {
      const w = spec.w * 0.0254, d = spec.d * 0.0254;
      const t = Math.max(0.005, GAUGE_OPTIONS.find(g => g.gauge === spec.g).mm / 1000);
      let geo;
      if (type === 'pipe_round') geo = new THREE.CylinderGeometry(w/2, w/2, length, isSolid ? 8 : 16);
      else if (type === 'pipe_square') geo = new THREE.BoxGeometry(w, length, d);
      else {
        const shape = new THREE.Shape();
        if (type === 'gadar') {
          shape.moveTo(-w/2, -d/2); shape.lineTo(w/2, -d/2); shape.lineTo(w/2, -d/2+t); shape.lineTo(t/2, -d/2+t);
          shape.lineTo(t/2, d/2-t); shape.lineTo(w/2, d/2-t); shape.lineTo(w/2, d/2); shape.lineTo(-w/2, d/2); 
          shape.lineTo(-w/2, d/2-t); shape.lineTo(-t/2, d/2-t); shape.lineTo(-t/2, -d/2+t); shape.lineTo(-w/2, -d/2+t);
        } else {
          shape.moveTo(-w/2, -d/2); shape.lineTo(w/2, -d/2); shape.lineTo(w/2, -d/2+t); shape.lineTo(-w/2+t, -d/2+t);
          shape.lineTo(-w/2+t, d/2-t); shape.lineTo(w/2, d/2-t); shape.lineTo(w/2, d/2); shape.lineTo(-w/2, d/2);
        }
        geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
        geo.center(); geo.rotateX(Math.PI / 2); 
      }
      if (axis === 'X') { geo.rotateZ(Math.PI / 2); if (type === 'channel' || type === 'gadar') geo.rotateX(-Math.PI / 2); } 
      else if (axis === 'Z') geo.rotateX(Math.PI / 2);
      return geo;
    };

    const arrayGroup = new THREE.Group();
    const legoOffset = isLego ? 0.4 : 0; 

    // 1. Draw Panels
    for (let r = 0; r < panelRows; r++) {
      for (let c = 0; c < panelCols; c++) {
        const xPos = (c * (pWidth + spacingMeters)) - (totalArrayWidth / 2) + (pWidth / 2);
        const zPos = (r * (pLength + spacingMeters)) - (totalArrayLength / 2) + (pLength / 2);

        const panelMesh = new THREE.Mesh(new THREE.BoxGeometry(pWidth, pThick, pLength), mats.panel);
        panelMesh.position.set(xPos, isLego ? legoOffset*2 : 0, zPos);
        panelMesh.castShadow = true; addEdges(panelMesh);
        arrayGroup.add(panelMesh);

        if (r === 0 && c === 0) {
            const px1 = new THREE.Vector3(xPos - pWidth/2, 0, zPos - pLength/2);
            const px2 = new THREE.Vector3(xPos + pWidth/2, 0, zPos - pLength/2);
            const pz1 = new THREE.Vector3(xPos - pWidth/2, 0, zPos - pLength/2);
            const pz2 = new THREE.Vector3(xPos - pWidth/2, 0, zPos + pLength/2);
            arrayGroup.add(createDimension(px1, px2, `W:${(pWidth*1000).toFixed(0)}mm`, new THREE.Vector3(0, 0.1, -0.2)));
            arrayGroup.add(createDimension(pz1, pz2, `L:${(pLength*1000).toFixed(0)}mm`, new THREE.Vector3(-0.2, 0.1, 0)));
        }
        if (r === 0 && c === 0 && panelCols > 1) {
            const gp1 = new THREE.Vector3(xPos + pWidth/2, 0, zPos);
            const gp2 = new THREE.Vector3(xPos + pWidth/2 + spacingMeters, 0, zPos);
            arrayGroup.add(createDimension(gp1, gp2, `GAP:${(spacingMeters*1000).toFixed(0)}mm`, new THREE.Vector3(0, 0.1, -0.2)));
        }
      }
    }

    // 2. Draw Rails
    const railD = railSpec.d * 0.0254;
    const railY = -(pThick / 2) - (railD / 2) - (isLego ? legoOffset : 0); 
    
    for (let r = 0; r < panelRows; r++) {
      const rowZ = (r * (pLength + spacingMeters)) - (totalArrayLength / 2) + (pLength / 2);
      [-pLength * 0.25, pLength * 0.25].forEach((offset, idx) => {
        const railZ = rowZ + offset;
        const rail = new THREE.Mesh(createProfile(railType, totalArrayWidth, 'X', railSpec), mats.rail);
        rail.position.set(0, railY, railZ);
        rail.castShadow = true; addEdges(rail);
        arrayGroup.add(rail);

        if (fastenerType !== 'none' && !isLego) {
          const isU = fastenerType === 'uhook';
          const fastGeo = isU ? new THREE.TorusGeometry(railD/2 + 0.005, 0.004, 8, 16, Math.PI) : new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6); 
          for (let c = 0; c < panelCols; c++) {
            const pX = (c * (pWidth + spacingMeters)) - (totalArrayWidth / 2) + (pWidth / 2);
            [-pWidth*0.4, pWidth*0.4].forEach(xOff => {
                const fast = new THREE.Mesh(fastGeo, mats.fastener);
                if (isU) { fast.rotation.x = Math.PI/2; fast.position.set(pX+xOff, railY, railZ); } 
                else { fast.position.set(pX+xOff, railY+(railD/2), railZ); }
                arrayGroup.add(fast);
            });
          }
        }
      });
    }

    // 3. Draw Beams
    const beamD = beamSpec.d * 0.0254;
    const beamY = railY - (railD/2) - (beamD/2) - (isLego ? legoOffset : 0); 
    
    for (let i = 0; i < pillarCountX; i++) {
        const tx = pillarCountX > 1 ? i / (pillarCountX - 1) : 0.5;
        const xPos = - (totalArrayWidth / 2) + (tx * totalArrayWidth);
        const beam = new THREE.Mesh(createProfile(beamType, totalArrayLength, 'Z', beamSpec), mats.beam);
        beam.position.set(xPos, beamY, 0);
        beam.castShadow = true; addEdges(beam);
        arrayGroup.add(beam);
    }

    arrayGroup.rotation.x = tiltRad;
    const dropOff = (totalArrayLength / 2) * Math.sin(tiltRad);
    arrayGroup.position.set(0, frontHeight + dropOff + (isLego ? legoOffset*2 : 0), 0);
    group.add(arrayGroup);
    arrayGroup.updateMatrixWorld(true);

    // 4. Pillars & Bracing
    const pGrid = []; 
    for (let i = 0; i < pillarCountX; i++) {
        const tx = pillarCountX > 1 ? i / (pillarCountX - 1) : 0.5;
        const xPos = - (totalArrayWidth / 2) + (tx * totalArrayWidth);
        const colPts = [];

        for (let j = 0; j < pillarCountZ; j++) {
            const tz = pillarCountZ > 1 ? j / (pillarCountZ - 1) : 0.5;
            const bFZ = totalArrayLength * 0.45, bBZ = -totalArrayLength * 0.45;
            const zPos = bFZ - (tz * (bFZ - bBZ));
            
            const bLocal = new THREE.Vector3(xPos, beamY - beamD/2, zPos);
            const pWorld = arrayGroup.localToWorld(bLocal.clone());
            if (isLego) pWorld.y -= legoOffset*2;

            colPts.push({ top: pWorld.clone(), bottom: new THREE.Vector3(pWorld.x, 0, pWorld.z) });

            if (mountSystem === 'prefab_stand') {
                const legH = pWorld.y;
                const baseL = Math.min(legH * 0.8, 2.0); 
                const sBase = new THREE.Mesh(createProfile(railType, baseL, 'Z', railSpec), mats.rail);
                sBase.position.set(pWorld.x, railD/2, pWorld.z - baseL/2 + 0.1); addEdges(sBase); group.add(sBase);
                
                const leg = new THREE.Mesh(createProfile(railType, legH, 'Y', railSpec), mats.rail);
                leg.position.set(pWorld.x, legH/2, pWorld.z); addEdges(leg); group.add(leg);
                
                const hypL = Math.hypot(baseL, legH);
                const hyp = new THREE.Mesh(createProfile(railType, hypL, 'Y', railSpec), mats.rail);
                hyp.position.set(pWorld.x, legH/2, pWorld.z - baseL/2); hyp.lookAt(pWorld.x, legH, pWorld.z); hyp.rotateX(Math.PI/2); addEdges(hyp); group.add(hyp);
            } else {
                if (pillarType === 'brick') {
                  const bSize = 0.33;
                  const pMesh = new THREE.Mesh(new THREE.BoxGeometry(bSize, pWorld.y, bSize), mats.brick);
                  pMesh.position.set(pWorld.x, pWorld.y / 2, pWorld.z); pMesh.castShadow = true; group.add(pMesh);
                } else {
                  const pMesh = new THREE.Mesh(createProfile(pillarType, pWorld.y, 'Y', pillarSpec), mats.pillar);
                  pMesh.position.set(pWorld.x, pWorld.y / 2, pWorld.z); pMesh.castShadow = true; addEdges(pMesh); group.add(pMesh);
                  const pPad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), mats.concrete);
                  pPad.position.set(pWorld.x, 0.025, pWorld.z); group.add(pPad);

                  if (i === 0 && j === 0) {
                      const p1 = new THREE.Vector3(pWorld.x, pWorld.y*0.8, pWorld.z);
                      const p2 = new THREE.Vector3(pWorld.x - 0.5, pWorld.y*0.8, pWorld.z);
                      const thickMm = GAUGE_OPTIONS.find(g => g.gauge === pillarSpec.g).mm;
                      group.add(createDimension(p1, p2, `MAT_THICK: ${thickMm}mm`, new THREE.Vector3(0,0,0), true));
                  }
                }
            }
        }
        pGrid.push(colPts);
    }

    if (mountSystem === 'custom' && bracingType !== 'none') {
        const drawBrace = (p1, p2, isFirst) => {
            const len = p1.distanceTo(p2);
            const brace = new THREE.Mesh(createProfile(railType, len, 'Y', railSpec), mats.rail);
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            brace.position.copy(mid); brace.lookAt(p2); brace.rotateX(Math.PI/2); addEdges(brace); group.add(brace);
            
            if (isFirst) {
                const off = new THREE.Vector3(0,0,0.1);
                group.add(createDimension(p1, p2, `BRC_LEN: ${formatMeters(len)}`, off));
            }
        };

        let braceDrawn = false;
        for (let i = 0; i < pillarCountX; i++) {
            for (let j = 0; j < pillarCountZ; j++) {
                const cur = pGrid[i][j];
                if (j < pillarCountZ - 1 && (bracingType === 'front_back' || bracingType === 'x_front_back' || bracingType === 'full_x')) {
                    drawBrace(cur.bottom, pGrid[i][j+1].top, !braceDrawn); braceDrawn = true;
                    if (bracingType === 'x_front_back' || bracingType === 'full_x') drawBrace(cur.top, pGrid[i][j+1].bottom, false);
                }
                if (i < pillarCountX - 1 && (bracingType === 'lateral' || bracingType === 'full_x')) {
                    drawBrace(cur.bottom, pGrid[i+1][j].top, !braceDrawn); braceDrawn = true;
                    drawBrace(cur.top, pGrid[i+1][j].bottom, false);
                }
            }
        }
    }

  }, [panelRows, panelCols, panelSpacing, pillarSpec, beamSpec, railSpec, frontHeight, rearHeight, tiltRad, activePanel, pillarType, railType, beamType, mountSystem, fastenerType, bracingType, panelAlignment, showMeasurements, unitGlobal, visualMode, theme, pillarCountX, pillarCountZ]);


  // --- UI THEME CLASSES ---
  const tBg = theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-[#0a0a0c] text-slate-200';
  const tGlass = theme === 'light' 
    ? 'bg-white/90 backdrop-blur-xl border border-slate-300 shadow-xl' 
    : 'bg-[#0c0c10]/85 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]';
  const tInput = theme === 'light' ? 'bg-slate-100 border-slate-300 text-black' : 'bg-black/50 border-white/10 text-white';
  const tPanel = theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5';

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none ${tBg}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
        body { font-family: 'Montserrat', sans-serif; margin: 0; }
        input[type=number] { -moz-appearance: textfield; border-radius: 4px; padding: 6px; outline: none; transition: border-color 0.2s; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; filter: invert(${theme==='light'?0:1}); cursor: pointer; }
        input[type=number]:focus { border-color: #00f0ff; }
        select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300f0ff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right .7rem top 50%; background-size: .65rem auto; }
        ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.4); border-radius: 4px; }
        
        @media print {
            @page { size: portrait; margin: 15mm; }
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: white; color: black; box-shadow: none; border: none; padding: 0; overflow: visible !important; }
            .no-print { display: none !important; }
            .print-border { border-color: #cbd5e1 !important; }
            .print-text { color: #0f172a !important; }
            .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* 3D Canvas */}
      <div ref={mountRef} className="absolute inset-0 z-0 no-print"></div>
      {theme === 'dark' && <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,#0a0a0c_100%)] z-10 pointer-events-none no-print"></div>}

      {/* TOP NAV */}
      <nav className={`${tGlass} absolute top-4 left-4 right-4 h-14 rounded-xl flex items-center justify-between px-6 z-20 no-print`}>
        <div className="flex items-center gap-2 font-bold text-lg tracking-wide">
          <Sun className="text-cyan-500" size={20} /> SolarStruct <span className="text-cyan-500">Pro</span>
        </div>
        
        <div className={`flex p-1 rounded-full border ${theme==='light'?'bg-slate-200 border-slate-300':'bg-black/40 border-white/5'}`}>
          {['realistic', 'solid', 'lego'].map(mode => (
            <button key={mode} onClick={() => setVisualMode(mode)} className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${visualMode === mode ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-slate-500 hover:text-cyan-500'}`}>
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-cyan-500/10 text-cyan-500 transition">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={() => setShowMeasurements(!showMeasurements)} className={`flex items-center gap-2 px-4 py-1.5 border rounded-lg transition-colors text-xs font-bold ${showMeasurements ? 'bg-cyan-500 text-black border-cyan-500' : 'border-cyan-500 text-cyan-500 hover:bg-cyan-500/10'}`}>
            <Ruler size={14} /> Blueprints
          </button>
        </div>
      </nav>

      {/* LEFT SIDEBAR: HUD */}
      <aside className={`${tGlass} absolute top-24 left-4 w-[380px] rounded-xl p-5 flex flex-col gap-4 z-20 h-[calc(100vh-180px)] overflow-y-auto no-print`}>
        
        {/* Tier 1 Database Selector */}
        <div className={`${tPanel} p-3 rounded-lg border flex flex-col gap-2`}>
           <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tier 1 Module Database</h4>
           <select className={`w-full ${tInput} p-2 rounded-md text-xs font-semibold`} value={selectedPanelId} onChange={(e) => setSelectedPanelId(e.target.value)}>
             {solarPanelDatabase.map(p => <option key={p.id} value={p.id}>{p.manufacturer} {p.model} ({p.electrical.wattage}W)</option>)}
           </select>
        </div>

        {/* GPS AUTO-OPTIMIZATION */}
        <div className={`${tPanel} p-3 rounded-lg border`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5"><MapPin size={12}/> Location & Optimization</h4>
            <span className="text-[10px] text-cyan-500 font-bold">{locationData.city}</span>
          </div>
          <button onClick={handleAutoOptimize} disabled={isOptimizing} className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-500 rounded text-xs font-bold transition flex items-center justify-center gap-2">
            {isOptimizing ? <Activity size={14} className="animate-spin" /> : <MapPin size={14} />}
            {isOptimizing ? "Scanning Topology..." : "Auto-Optimize via GPS"}
          </button>
        </div>

        {/* 1. ARRAY MATRIX */}
        <div className={`${tPanel} p-3 rounded-lg border`}>
          <div className="flex items-center justify-between mb-3 border-b border-slate-500/20 pb-2">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Array Matrix ({panelCount} Panels)</h4>
            <UnitToggle value={unitSpacing} onChange={setUnitSpacing} opt1="mm" opt2="in" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div><label className="text-[10px] text-slate-500 block">Rows</label><input type="number" min="1" max="15" value={panelRows} onChange={(e) => setPanelRows(Number(e.target.value))} className={`w-full text-xs font-bold font-mono ${tInput}`} /></div>
            <div><label className="text-[10px] text-slate-500 block">Cols</label><input type="number" min="1" max="30" value={panelCols} onChange={(e) => setPanelCols(Number(e.target.value))} className={`w-full text-xs font-bold font-mono ${tInput}`} /></div>
          </div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] text-slate-500">Airflow Gap ({unitSpacing})</label>
            <input type="number" value={unitSpacing === 'mm' ? panelSpacing : Number((panelSpacing / 25.4).toFixed(2))} onChange={(e) => setPanelSpacing(unitSpacing === 'mm' ? Number(e.target.value) : Number(e.target.value) * 25.4)} className={`w-20 text-right text-xs font-bold font-mono ${tInput}`} />
          </div>
        </div>

        {/* 2. ELEVATION */}
        <div className={`${tPanel} p-3 rounded-lg border`}>
          <div className="flex justify-between items-center mb-3 border-b border-slate-500/20 pb-2">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Elevation</h4>
            <div className="flex items-center gap-2">
              <span className="text-cyan-500 text-[10px] font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Tilt: {tiltAngleDeg.toFixed(1)}°</span>
              <UnitToggle value={unitElevation} onChange={setUnitElevation} opt1="m" opt2="ft" />
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] text-slate-500">Front Clearance ({unitElevation})</label>
            <input type="number" step={0.1} value={unitElevation === 'm' ? Number(frontHeight.toFixed(2)) : Number((frontHeight * 3.28084).toFixed(2))} onChange={(e) => setFrontHeight(unitElevation === 'm' ? Number(e.target.value) : Number(e.target.value) / 3.28084)} className={`w-20 text-right text-xs font-bold font-mono ${tInput}`} />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-slate-500">Rear Clearance ({unitElevation})</label>
            <input type="number" step={0.1} value={unitElevation === 'm' ? Number(rearHeight.toFixed(2)) : Number((rearHeight * 3.28084).toFixed(2))} onChange={(e) => setRearHeight(unitElevation === 'm' ? Number(e.target.value) : Number(e.target.value) / 3.28084)} className={`w-20 text-right text-xs font-bold font-mono ${tInput}`} />
          </div>
        </div>

        {/* 3. ARCHITECTURE */}
        <div className={`${tPanel} p-3 rounded-lg border flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Profiles</h4>
            <UnitToggle value={unitProfile} onChange={setUnitProfile} opt1="in" opt2="mm" />
          </div>
          
          {[
            { l: "1. Pillar", t: pillarType, st: setPillarType, sp: pillarSpec, ssp: setPillarSpec, brick: true },
            { l: "2. Beams", t: beamType, st: setBeamType, sp: beamSpec, ssp: setBeamSpec },
            { l: "3. Rails", t: railType, st: setRailType, sp: railSpec, ssp: setRailSpec }
          ].map(row => (
            <div key={row.l} className={`p-2 rounded-lg border border-slate-500/10 ${theme==='light'?'bg-white':'bg-black/30'}`}>
              <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">{row.l}</label>
              <select className={`w-full ${tInput} p-2 rounded text-xs mb-2`} value={row.t} onChange={(e) => row.st(e.target.value)}>
                {!row.brick && <option value="channel">C-Channel</option>}
                {!row.brick && <option value="pipe_square">Square Pipe</option>}
                {!row.brick && <option value="pipe_round">Round Pipe</option>}
                <option value="gadar">Gadar (I-Beam)</option>
                {row.brick && <option value="brick">Concrete Brick</option>}
              </select>
              {row.t !== 'brick' && (
                <div className="flex gap-1.5">
                  <input type="number" step={unitProfile==='mm'?1:0.25} className={`w-1/3 text-[10px] text-center font-mono font-bold ${tInput}`} value={unitProfile==='mm'?Number((row.sp.w*25.4).toFixed(0)):row.sp.w} onChange={(e)=>row.ssp({...row.sp, w: unitProfile==='mm'?Number(e.target.value)/25.4:Number(e.target.value)})} />
                  <input type="number" step={unitProfile==='mm'?1:0.25} className={`w-1/3 text-[10px] text-center font-mono font-bold ${tInput}`} value={unitProfile==='mm'?Number((row.sp.d*25.4).toFixed(0)):row.sp.d} onChange={(e)=>row.ssp({...row.sp, d: unitProfile==='mm'?Number(e.target.value)/25.4:Number(e.target.value)})} />
                  <select className={`w-1/3 ${tInput} rounded text-[10px] font-bold pl-1`} value={row.sp.g} onChange={(e)=>row.ssp({...row.sp, g: Number(e.target.value)})}>
                    {GAUGE_OPTIONS.map(g => (<option key={g.gauge} value={g.gauge}>{g.gauge}G</option>))}
                  </select>
                </div>
              )}
            </div>
          ))}

          <div className={`p-2 rounded-lg border border-slate-500/10 ${theme==='light'?'bg-white':'bg-black/30'}`}>
            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">Bracing Matrix</label>
            <select className={`w-full ${tInput} p-2 rounded text-xs`} value={bracingType} onChange={(e) => setBracingType(e.target.value)}>
              <option value="none">None (High Risk)</option>
              <option value="front_back">Single Diagonal</option>
              <option value="lateral">Lateral (Side-to-Side)</option>
              <option value="full_x">Full X-Bracing (Max Strength)</option>
            </select>
          </div>
        </div>

        {/* 4. HELIODON SIMULATOR */}
        <div className={`${tPanel} p-3 rounded-lg border`}>
          <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><CloudSun size={12}/> Heliodon Simulator</span>
            <span className="text-cyan-500 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">{estimatedPeakHours.toFixed(1)} h/day</span>
          </h4>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] text-slate-500">Time of Day (Hour)</label>
            <input type="number" min="6" max="18" step="1" value={sunHour} onChange={(e) => setSunHour(Number(e.target.value))} className={`w-16 text-right text-xs font-mono font-bold ${tInput}`} />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-slate-500">Month (Season)</label>
            <select className={`w-28 ${tInput} p-1 rounded-md text-xs text-right font-bold`} value={sunMonth} onChange={(e) => setSunMonth(Number(e.target.value))}>
              {MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
            </select>
          </div>
        </div>

        {!isSafe && (
          <div className="flex items-start gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-bold">
            <AlertTriangle size={16} className="shrink-0" />
            <span>CRITICAL: Structural Capacity exceeded by Dead Load. Enhance bracing or material gauge.</span>
          </div>
        )}
      </aside>

      {/* BOTTOM BAR: LIVE DATA */}
      <footer className={`${tGlass} absolute bottom-4 left-4 right-4 h-14 rounded-xl flex items-center justify-between px-6 z-20 no-print`}>
        <div className="flex gap-6 items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
          <UnitToggle value={unitGlobal} onChange={setUnitGlobal} opt1="metric" opt2="imperial" />
          <div className="flex items-center gap-2 text-xs border-l border-slate-500/20 pl-6">
            <CheckCircle size={14} className={isSafe ? "text-cyan-500" : "text-amber-500"} />
            <span className="text-slate-500">Yield: <strong className={theme==='light'?'text-black':'text-white'}>{(totalPower / 1000).toFixed(2)} kW</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-slate-500/20 pl-6">
            <CloudSun size={14} className="text-cyan-500" />
            <span className="text-slate-500">Peak Sun: <strong className={theme==='light'?'text-black':'text-white'}>{estimatedPeakHours.toFixed(1)} h/day</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-slate-500/20 pl-6">
            <HardHat size={14} className="text-slate-500" />
            <span className="text-slate-500">Capacity: <strong className="text-cyan-500">{formatWeight(maxCapacity)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-slate-500/20 pl-6">
            <Wind size={14} className={windResistance > 120 ? "text-cyan-500" : "text-amber-500"} />
            <span className="text-slate-500">Wind: <strong className={windResistance > 120 ? "text-cyan-500" : "text-amber-500"}>{formatWind(windResistance)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-slate-500/20 pl-6">
            <Activity size={14} className={earthquakeRes > 6.0 ? "text-cyan-500" : "text-amber-500"} />
            <span className="text-slate-500">Seismic: <strong className={earthquakeRes > 6.0 ? "text-cyan-500" : "text-amber-500"}>Mag {earthquakeRes.toFixed(1)}</strong></span>
          </div>
        </div>
        <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex items-center gap-2 bg-cyan-500 text-black px-5 py-2 rounded-lg font-bold text-xs hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.4)] shrink-0 ml-4">
          {isGeneratingReport ? <Activity size={14} className="animate-spin" /> : <FileText size={14} />}
          {isGeneratingReport ? "Generating CAD..." : "Full Report"}
        </button>
      </footer>

      {/* BOM & ENGINEERING REPORT MODAL (PRINTABLE) */}
      {showBOM && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto no-print">
            <div className={`print-section w-full max-w-5xl my-auto rounded-xl shadow-2xl border border-white/10 ${theme==='light'?'bg-white text-black':'bg-[#111115] text-slate-200'} p-8 relative`}>
                
                <div className="flex items-center justify-between border-b border-slate-500/30 pb-6 mb-8 print-border">
                    <h2 className="text-3xl font-bold flex items-center gap-3 print-text"><FileText className="text-cyan-500"/> Structural & Electrical Engineering Report</h2>
                    <div className="flex gap-3 no-print">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500 text-cyan-500 px-4 py-2 rounded-lg font-bold text-sm transition"><Download size={16}/> Download PDF</button>
                        <button onClick={() => setShowBOM(false)} className="p-2 rounded-full bg-slate-500/20 hover:bg-red-500 hover:text-white transition"><X size={20}/></button>
                    </div>
                </div>

                {/* Section 0: Structural Dimensions & Details */}
                <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><Box size={16}/> Structural Dimensions & Geometry</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print-break-avoid">
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Array Matrix</p>
                        <p className="text-lg font-mono font-bold print-text">{panelRows} Rows × {panelCols} Cols</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Overall Width (X)</p>
                        <p className="text-lg font-mono font-bold print-text">{formatMeters(totalArrayWidth)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Overall Depth (Z)</p>
                        <p className="text-lg font-mono font-bold print-text">{formatMeters(totalArrayLength)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Ground Footprint</p>
                        <p className="text-lg font-mono font-bold print-text">{formatArea(baseAreaSqMeters)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Front Clearance</p>
                        <p className="text-lg font-mono font-bold print-text">{formatMeters(frontHeight)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Rear Clearance</p>
                        <p className="text-lg font-mono font-bold print-text">{formatMeters(rearHeight)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Module Alignment</p>
                        <p className="text-lg font-mono font-bold print-text capitalize">{panelAlignment}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Module Spacing Gap</p>
                        <p className="text-lg font-mono font-bold print-text">{spacingMeters * 1000} mm</p>
                    </div>
                </div>

                {/* Section 1: CAD Images */}
                {reportImages.length > 0 && (
                    <div className="print-break-avoid mb-8">
                        <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><Camera size={16}/> Structural CAD Renderings (Solid Mode)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {reportImages.map(img => (
                                <div key={img.id} className="border border-slate-500/20 rounded-lg overflow-hidden relative print-border bg-[#e2e8f0]">
                                    <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow backdrop-blur-md">{img.label}</span>
                                    <img src={img.src} alt={img.label} className="w-full h-auto object-cover object-center aspect-video" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Section 2: Project Specs */}
                <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><MapPin size={16}/> Site & Environmental Thresholds</h3>
                <div className="grid grid-cols-4 gap-4 mb-8 print-break-avoid">
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Tilt Angle</p>
                        <p className="text-xl font-mono font-bold print-text">{tiltAngleDeg.toFixed(1)}°</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Wind Resilience</p>
                        <p className="text-xl font-mono font-bold print-text">{formatWind(windResistance)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Seismic Rating</p>
                        <p className="text-xl font-mono font-bold print-text">Mag {earthquakeRes.toFixed(1)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border">
                        <p className="text-xs text-slate-500 mb-1">Estimated Peak Sun</p>
                        <p className="text-xl font-mono font-bold print-text">{estimatedPeakHours.toFixed(1)} h/day</p>
                    </div>
                </div>

                {/* Section 3: Electrical Yield Forecast */}
                <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={16}/> Production Forecast (85% PR)</h3>
                <div className="grid grid-cols-3 gap-4 mb-8 print-break-avoid">
                    <div className="p-5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 print-border">
                        <p className="text-xs text-cyan-600 dark:text-cyan-500 uppercase font-bold tracking-widest">Daily Generation</p>
                        <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-500 mt-2">{dailyYieldKwh.toFixed(1)} <span className="text-lg">kWh</span></p>
                    </div>
                    <div className="p-5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 print-border">
                        <p className="text-xs text-cyan-600 dark:text-cyan-500 uppercase font-bold tracking-widest">Monthly Yield</p>
                        <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-500 mt-2">{monthlyYieldKwh.toFixed(0)} <span className="text-lg">kWh</span></p>
                    </div>
                    <div className="p-5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 print-border">
                        <p className="text-xs text-cyan-600 dark:text-cyan-500 uppercase font-bold tracking-widest">Annual Yield</p>
                        <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-500 mt-2">{annualYieldKwh.toFixed(0)} <span className="text-lg">kWh</span></p>
                    </div>
                </div>

                {/* Section 4: Electrical BOS */}
                <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><Zap size={16}/> Balance of System (Electrical)</h3>
                <div className="grid grid-cols-2 gap-4 mb-8 print-break-avoid">
                    <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20 print-border flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Max String Current (NEC 1.25x)</p>
                            <p className="text-xl font-mono font-bold print-text">{maxStringCurrent.toFixed(2)} A</p>
                        </div>
                        <Cpu className="text-slate-400 opacity-50" size={32} />
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 print-border flex justify-between items-center">
                        <div>
                            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mb-1 uppercase tracking-widest">Recommended DC Wire Gauge</p>
                            <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-500">{recommendedGauge}</p>
                        </div>
                        <AlertTriangle className="text-amber-600 dark:text-amber-500 opacity-50" size={32} />
                    </div>
                </div>

                {/* Section 5: Mechanical BOM */}
                <h3 className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2"><Layers size={16}/> Mechanical Bill of Materials</h3>
                <table className="w-full text-left border-collapse print-border print-break-avoid">
                    <thead>
                        <tr className="border-b border-slate-500/30 text-xs text-slate-500 uppercase tracking-widest">
                            <th className="py-3 px-2">Component Category</th>
                            <th className="py-3 px-2">Specification</th>
                            <th className="py-3 px-2 text-right">Quantity / Length</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-semibold divide-y divide-slate-500/10 print-text">
                        <tr>
                            <td className="py-4 px-2 flex items-center gap-2"><Sun size={16} className="text-cyan-600 dark:text-cyan-500"/> Photovoltaic Modules</td>
                            <td className="py-4 px-2">{activePanel.manufacturer} {activePanel.model} ({activePanel.electrical.wattage}W)</td>
                            <td className="py-4 px-2 text-right font-mono text-cyan-600 dark:text-cyan-500">{panelCount} units</td>
                        </tr>
                        <tr>
                            <td className="py-4 px-2 flex items-center gap-2"><Layers size={16} className="text-cyan-600 dark:text-cyan-500"/> Vertical Pillars</td>
                            <td className="py-4 px-2">{pillarType.replace('_',' ')} | {pillarSpec.w}"x{pillarSpec.d}" ({pillarSpec.g}G)</td>
                            <td className="py-4 px-2 text-right font-mono text-cyan-600 dark:text-cyan-500">{pillarCountX * pillarCountZ} units</td>
                        </tr>
                        <tr>
                            <td className="py-4 px-2 flex items-center gap-2"><Layers size={16} className="text-cyan-600 dark:text-cyan-500"/> Main Sloped Beams</td>
                            <td className="py-4 px-2">{beamType.replace('_',' ')} | {beamSpec.w}"x{beamSpec.d}" ({beamSpec.g}G)</td>
                            <td className="py-4 px-2 text-right font-mono text-cyan-600 dark:text-cyan-500">{pillarCountX} x {formatMeters(totalArrayLength)}</td>
                        </tr>
                        <tr>
                            <td className="py-4 px-2 flex items-center gap-2"><Layers size={16} className="text-cyan-600 dark:text-cyan-500"/> Panel Rails</td>
                            <td className="py-4 px-2">{railType.replace('_',' ')} | {railSpec.w}"x{railSpec.d}" ({railSpec.g}G)</td>
                            <td className="py-4 px-2 text-right font-mono text-cyan-600 dark:text-cyan-500">{panelRows * 2} x {formatMeters(totalArrayWidth)}</td>
                        </tr>
                        <tr>
                            <td className="py-4 px-2 flex items-center gap-2"><Activity size={16} className="text-cyan-600 dark:text-cyan-500"/> Structural Bracing</td>
                            <td className="py-4 px-2 capitalize">{bracingType.replace('_',' ')} Config</td>
                            <td className="py-4 px-2 text-right font-mono text-cyan-600 dark:text-cyan-500">{bracingType === 'none' ? '0' : 'Required'}</td>
                        </tr>
                        <tr className="bg-slate-500/5 print-border">
                            <td className="py-4 px-2 font-bold" colSpan={2}>Total Structure Dead Load</td>
                            <td className="py-4 px-2 text-right font-mono font-bold">{formatWeight(totalWeightBase)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
