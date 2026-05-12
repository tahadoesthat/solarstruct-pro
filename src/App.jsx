import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, LayoutGrid, Sun, AlertTriangle, CheckCircle, FileText, Maximize, ArrowRightLeft, Box, HardHat, Ruler, CloudSun, Wind } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// ==========================================
// 1. LOCAL DATABASE & CONSTANTS
// ==========================================
const solarPanelDatabase = [
  { id: "jinko_tiger_neo_54", manufacturer: "Jinko Solar", model: "Tiger Neo 54HL4-V", electrical: { wattage: 440 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 22.0 },
  { id: "longi_himo_6", manufacturer: "LONGi", model: "Hi-MO 6 Explorer", electrical: { wattage: 430 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 20.8 },
  { id: "canadian_solar_hiku7", manufacturer: "Canadian Solar", model: "HiKu7 CS7N-660MS", electrical: { wattage: 660 }, physical: { length: 2384, width: 1303, thickness: 35 }, weight: 34.4 },
  { id: "ja_solar_deepblue_4", manufacturer: "JA Solar", model: "DeepBlue 4.0", electrical: { wattage: 580 }, physical: { length: 2278, width: 1134, thickness: 30 }, weight: 31.8 },
  { id: "trina_vertex_n", manufacturer: "Trina Solar", model: "Vertex N", electrical: { wattage: 580 }, physical: { length: 2384, width: 1134, thickness: 30 }, weight: 33.7 },
  { id: "sunova_tangra_pro", manufacturer: "Sunova Solar", model: "Tangra Pro", electrical: { wattage: 430 }, physical: { length: 1722, width: 1134, thickness: 30 }, weight: 21.5 },
];

const GAUGE_OPTIONS = [
  { gauge: 16, mm: 1.52, strengthRating: 1 },
  { gauge: 14, mm: 1.98, strengthRating: 2 },
  { gauge: 12, mm: 2.66, strengthRating: 3 },
  { gauge: 10, mm: 3.42, strengthRating: 5 },
  { gauge: 8,  mm: 4.17, strengthRating: 7 }
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- Helper Component for Mini Toggles ---
const UnitToggle = ({ value, onChange, opt1, opt2 }) => (
  <button 
    onClick={() => onChange(value === opt1 ? opt2 : opt1)} 
    className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-cyan-400 transition-colors border border-cyan-400/20"
  >
    <ArrowRightLeft size={8} /> {value}
  </button>
);

// ==========================================
// 2. MAIN APPLICATION COMPONENT
// ==========================================
const App = () => {
  // --- UI & STATE ---
  const [buildMode, setBuildMode] = useState('Parametric');
  
  // Individual Unit States
  const [unitGlobal, setUnitGlobal] = useState('metric'); // For 3D labels and bottom bar
  const [unitSpacing, setUnitSpacing] = useState('mm'); // 'mm' | 'in'
  const [unitElevation, setUnitElevation] = useState('m'); // 'm' | 'ft'
  const [unitProfile, setUnitProfile] = useState('in'); // 'mm' | 'in'
  
  // Array State
  const [selectedPanelId, setSelectedPanelId] = useState(solarPanelDatabase[0].id);
  const [panelRows, setPanelRows] = useState(2);
  const [panelCols, setPanelCols] = useState(5);
  const [panelAlignment, setPanelAlignment] = useState('portrait'); 
  const [panelSpacing, setPanelSpacing] = useState(20); // Internal metric (mm)
  
  // Elevation State
  const [frontHeight, setFrontHeight] = useState(1.0); // Internal metric (meters)
  const [rearHeight, setRearHeight] = useState(2.0); // Internal metric (meters)
  
  // Mounting Architecture State
  const [mountSystem, setMountSystem] = useState('custom'); 
  const [pillarType, setPillarType] = useState('pipe_round'); 
  const [beamType, setBeamType] = useState('channel'); 
  const [railType, setRailType] = useState('channel'); 
  const [bracingType, setBracingType] = useState('none'); // 'none', 'front_back', 'x_front_back', 'lateral', 'full_x'
  const [fastenerType, setFastenerType] = useState('screw'); 
  
  // Individual Sizing State (Internal metric is inches for standard pipe classification)
  const [pillarSpec, setPillarSpec] = useState({ w: 2.0, d: 2.0, g: 14 });
  const [beamSpec, setBeamSpec] = useState({ w: 2.0, d: 2.0, g: 14 });
  const [railSpec, setRailSpec] = useState({ w: 2.0, d: 2.0, g: 14 });

  // Environment & Blueprints
  const [sunHour, setSunHour] = useState(12); // 6 to 18
  const [sunMonth, setSunMonth] = useState(6); // 1 to 12
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [brightness, setBrightness] = useState(1.0);

  const [isSafe, setIsSafe] = useState(true);
  const [maxCapacity, setMaxCapacity] = useState(0);
  const [windResistance, setWindResistance] = useState(0); // km/h

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const structureGroupRef = useRef(null);
  const dirLightRef = useRef(null);

  // --- DERIVED DATA & MATH ---
  const activePanel = useMemo(() => solarPanelDatabase.find(p => p.id === selectedPanelId), [selectedPanelId]);
  const panelCount = panelRows * panelCols;
  const totalWeightBase = activePanel.weight * panelCount; 
  const totalPower = activePanel.electrical.wattage * panelCount; 

  const pWidthRaw = activePanel.physical.width / 1000; 
  const pLengthRaw = activePanel.physical.length / 1000;
  const pWidth = panelAlignment === 'portrait' ? pWidthRaw : pLengthRaw;
  const pLength = panelAlignment === 'portrait' ? pLengthRaw : pWidthRaw;
  
  const spacingMeters = panelSpacing / 1000;
  const totalArrayLength = (panelRows * pLength) + ((panelRows - 1) * spacingMeters);
  const totalArrayWidth = (panelCols * pWidth) + ((panelCols - 1) * spacingMeters);
  
  // Calculate Tilt Angle from Pillar Heights
  let tiltRad = Math.asin((rearHeight - frontHeight) / totalArrayLength);
  if (isNaN(tiltRad)) tiltRad = 0; 
  const tiltAngleDeg = THREE.MathUtils.radToDeg(tiltRad);

  // Formatters
  const formatMeters = (m) => unitGlobal === 'metric' ? `${m.toFixed(2)} m` : `${(m * 3.28084).toFixed(1)} ft`;
  const formatWeight = (kg) => unitGlobal === 'metric' ? `${kg.toFixed(0)} kg` : `${(kg * 2.20462).toFixed(0)} lbs`;
  const formatWind = (kmh) => unitGlobal === 'metric' ? `${kmh.toFixed(0)} km/h` : `${(kmh * 0.621371).toFixed(0)} mph`;
  const formatArea = (sqm) => unitGlobal === 'metric' ? `${sqm.toFixed(1)} m²` : `${(sqm * 10.7639).toFixed(1)} sq ft`;

  const baseAreaSqMeters = totalArrayWidth * (totalArrayLength * 0.9);

  // Estimated Peak Hours (Approximation)
  const estimatedPeakHours = Math.max(2, 6.5 - Math.abs(tiltAngleDeg - 30) * 0.03 + (sunMonth > 3 && sunMonth < 9 ? 1.5 : -0.5));

  // --- CAPACITY & WIND PHYSICS ALGORITHM ---
  useEffect(() => {
    const getMaterialStrength = (type) => {
        switch(type) {
            case 'pipe_round': return 250;
            case 'pipe_square': return 320;
            case 'channel': return 400;
            case 'gadar': return 800;
            case 'brick': return 3000;
            default: return 250;
        }
    };

    const calcCompCap = (type, spec, multiplier) => {
        if (type === 'brick') return 3000 * multiplier * 2; 
        const activeGauge = GAUGE_OPTIONS.find(g => g.gauge === spec.g);
        const gaugeMult = activeGauge.strengthRating / 2.0; 
        const sizeMult = ((spec.w + spec.d) / 2) / 2.0; 
        return getMaterialStrength(type) * gaugeMult * sizeMult * multiplier * 2;
    };

    const pillarCountX = Math.max(2, Math.ceil(panelCols / 2) + 1); 
    const pillarCountZ = Math.max(2, Math.ceil(totalArrayLength / 2.5) + 1);
    const totalPillars = pillarCountX * pillarCountZ;
    
    // 1. Establish Bracing Multiplier
    let braceMultiplier = 1.0;
    if (mountSystem === 'prefab_stand') {
        braceMultiplier = 1.6;
    } else {
        if (bracingType === 'front_back') braceMultiplier = 1.2;
        if (bracingType === 'x_front_back') braceMultiplier = 1.4;
        if (bracingType === 'lateral') braceMultiplier = 1.5;
        if (bracingType === 'full_x') braceMultiplier = 1.8;
    }

    let calcCapacity = 0;

    // 2. Apply Bracing Stiffening to the Bottlenecks
    if (mountSystem === 'prefab_stand') {
        calcCapacity = calcCompCap(railType, railSpec, totalPillars) * braceMultiplier;
    } else {
        // Bracing drastically increases the effective unbraced length limits (buckling) of the pillars
        const pillarCap = calcCompCap(pillarType, pillarSpec, totalPillars) * braceMultiplier;
        const beamCap = calcCompCap(beamType, beamSpec, totalPillars) * (braceMultiplier > 1 ? 1.2 : 1.0);
        const railCap = calcCompCap(railType, railSpec, (panelRows * 2) * panelCols / 2); 
        
        calcCapacity = Math.min(pillarCap, beamCap, railCap);
        if (pillarType === 'brick' && bracingType === 'none' && tiltAngleDeg > 30) calcCapacity *= 0.6; 
    }

    // 3. Wind Shear Penalty (High tilt creates massive lever arm torque on base)
    if (tiltAngleDeg > 20) {
        calcCapacity *= (1 - ((tiltAngleDeg - 20) * 0.015)); 
    }

    setMaxCapacity(Math.floor(calcCapacity));
    setIsSafe(calcCapacity >= totalWeightBase);

    // 4. Wind Shear Resistance Calculation
    // Using the true available holding capacity (which now heavily factors bracing)
    const availableCapacityLbs = (calcCapacity - totalWeightBase) * 2.20462;
    const areaSqFt = (totalArrayWidth * 3.28084) * (totalArrayLength * 3.28084);
    
    // Drag Coefficient base (ensure minimum drag even at flat angles for sheer wind)
    const Cd = Math.max(0.2, 1.2 * Math.sin(Math.max(0.1, tiltRad))); 

    let maxWindMph = 0;
    if (availableCapacityLbs > 0 && areaSqFt > 0 && Cd > 0) {
        // Velocity = sqrt( F / (0.00256 * Area * Drag) )
        maxWindMph = Math.sqrt(availableCapacityLbs / (0.00256 * areaSqFt * Cd));
    }
    
    if (maxWindMph > 220) maxWindMph = 220; // Absolute physical cap of structural material

    setWindResistance(maxWindMph * 1.60934); // Store internally as km/h
  }, [pillarSpec, beamSpec, railSpec, totalWeightBase, tiltAngleDeg, pillarType, beamType, railType, mountSystem, bracingType, panelCols, panelRows, totalArrayWidth, totalArrayLength, tiltRad]);

  // --- THREE.JS INITIALIZATION ---
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0c');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 8, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; 

    const ambientLight = new THREE.AmbientLight(0xfffaed, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const gridHelper = new THREE.GridHelper(50, 50, 0x00f0ff, 0xffffff);
    gridHelper.material.opacity = 0.08;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.6 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    const structureGroup = new THREE.Group();
    scene.add(structureGroup);
    structureGroupRef.current = structureGroup;

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- SUN PATH / HELIODON SIMULATION ---
  useEffect(() => {
    if (dirLightRef.current) {
        const hourAngle = ((sunHour - 6) / 12) * Math.PI; 
        const declination = Math.sin(((sunMonth - 3) / 12) * Math.PI * 2) * (Math.PI / 8); 
        
        const radius = 30;
        const x = radius * Math.cos(hourAngle);
        const y = radius * Math.sin(hourAngle) * Math.cos(declination);
        const z = radius * Math.sin(declination) + 5; 

        dirLightRef.current.position.set(x, Math.max(2, y), z);
        
        const baseIntensity = Math.max(0.2, Math.sin(hourAngle) * 1.8);
        dirLightRef.current.intensity = baseIntensity * brightness;

        if (sceneRef.current) {
            sceneRef.current.children.forEach(child => {
                if (child instanceof THREE.AmbientLight) {
                    child.intensity = 0.4 * brightness;
                }
            });
        }
    }
  }, [sunHour, sunMonth, brightness]);

  // --- PARAMETRIC 3D GENERATION ENGINE ---
  useEffect(() => {
    if (!structureGroupRef.current) return;
    const group = structureGroupRef.current;
    
    while(group.children.length > 0){ 
        const child = group.children[0];
        if(child.geometry) child.geometry.dispose();
        if(child.material) child.material.dispose();
        group.remove(child); 
    }

    const pThick = activePanel.physical.thickness / 1000;
    const arrayGroup = new THREE.Group();

    const panelMat = new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: 0.1, metalness: 0.9, side: THREE.DoubleSide });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8892b0, roughness: 0.4, metalness: 0.7 });
    const channelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.5 }); 
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x737373, roughness: 1.0 });
    const fastenerMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });

    const getMat = (type) => (type === 'channel' || type === 'gadar') ? channelMat : frameMat;

    // Measurement Line & Arrow Helper (FIXED: Visible Thickness and Yellow Contrast)
    const createDimension = (p1, p2, text, exactOffsetVector) => {
        if (!showMeasurements) return new THREE.Group();
        const dimGroup = new THREE.Group();
        
        // Apply exact offset to place arrows exactly where requested
        const start = p1.clone().add(exactOffsetVector);
        const end = p2.clone().add(exactOffsetVector);
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const length = start.distanceTo(end);

        // Solid Cylinder instead of WebGL Line for visible thickness
        const lineGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 8);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true });
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        lineMesh.position.copy(midPoint);
        lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        lineMesh.renderOrder = 999;
        dimGroup.add(lineMesh);

        const coneGeo = new THREE.ConeGeometry(0.08, 0.3, 8);
        coneGeo.translate(0, -0.15, 0); // pivot at base
        coneGeo.rotateX(Math.PI / 2); 
        const coneMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true });
        
        const cone1 = new THREE.Mesh(coneGeo, coneMat);
        cone1.position.copy(start);
        cone1.lookAt(start.clone().sub(dir)); 
        cone1.renderOrder = 999;
        
        const cone2 = new THREE.Mesh(coneGeo, coneMat);
        cone2.position.copy(end);
        cone2.lookAt(end.clone().add(dir)); 
        cone2.renderOrder = 999;
        
        dimGroup.add(cone1, cone2);

        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fillRect(0,0,256,64);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeRect(0,0,256,64);
        ctx.fillStyle = '#000'; ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.2, 0.3, 1);
        sprite.renderOrder = 999;
        
        const up = new THREE.Vector3(0, 1, 0);
        let cross = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(0.3);
        if (cross.lengthSq() < 0.01) cross = new THREE.Vector3(1,0,0).multiplyScalar(0.3); 
        sprite.position.copy(midPoint).add(cross);
        
        dimGroup.add(sprite);
        return dimGroup;
    };

    // --- GEOMETRY GENERATOR ---
    const createProfile = (type, length, axis = 'Y', spec) => {
      const wMeters = (spec.w * 0.0254); 
      const dMeters = (spec.d * 0.0254);
      const radius = wMeters / 2;
      const activeGaugeMm = GAUGE_OPTIONS.find(g => g.gauge === spec.g).mm;
      const thicknessMeters = activeGaugeMm / 1000;

      let geo;
      if (type === 'pipe_round') {
        geo = new THREE.CylinderGeometry(radius, radius, length, 16);
      } else if (type === 'pipe_square') {
        geo = new THREE.BoxGeometry(wMeters, length, dMeters);
      } else {
        const shape = new THREE.Shape();
        const w = wMeters, d = dMeters;
        const t = Math.max(0.005, thicknessMeters); 

        if (type === 'gadar') {
          shape.moveTo(-w/2, -d/2); shape.lineTo(w/2, -d/2); shape.lineTo(w/2, -d/2+t); shape.lineTo(t/2, -d/2+t);
          shape.lineTo(t/2, d/2-t); shape.lineTo(w/2, d/2-t); shape.lineTo(w/2, d/2); shape.lineTo(-w/2, d/2); 
          shape.lineTo(-w/2, d/2-t); shape.lineTo(-t/2, d/2-t); shape.lineTo(-t/2, -d/2+t); shape.lineTo(-w/2, -d/2+t);
        } else if (type === 'channel') {
          shape.moveTo(-w/2, -d/2); shape.lineTo(w/2, -d/2); shape.lineTo(w/2, -d/2+t); shape.lineTo(-w/2+t, -d/2+t);
          shape.lineTo(-w/2+t, d/2-t); shape.lineTo(w/2, d/2-t); shape.lineTo(w/2, d/2); shape.lineTo(-w/2, d/2);
        }
        geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
        geo.center(); geo.rotateX(Math.PI / 2); 
      }

      if (axis === 'X') { geo.rotateZ(Math.PI / 2); if (type === 'channel' || type === 'gadar') geo.rotateX(-Math.PI / 2); } 
      else if (axis === 'Z') { geo.rotateX(Math.PI / 2); }
      return geo;
    };

    const OFFSET_2_5_INCHES = 2.5 * 0.0254; // Exact conversion from inches to meters

    // 1. Draw Panels
    for (let r = 0; r < panelRows; r++) {
      for (let c = 0; c < panelCols; c++) {
        const xPos = (c * (pWidth + spacingMeters)) - (totalArrayWidth / 2) + (pWidth / 2);
        const zPos = (r * (pLength + spacingMeters)) - (totalArrayLength / 2) + (pLength / 2);

        const panelMesh = new THREE.Mesh(new THREE.BoxGeometry(pWidth, pThick, pLength), panelMat);
        panelMesh.position.set(xPos, 0, zPos);
        panelMesh.castShadow = true;
        
        const edges = new THREE.EdgesGeometry(panelMesh.geometry);
        panelMesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15 })));
        arrayGroup.add(panelMesh);
      }
    }

    // 2. Draw Horizontal Rails (2 Per Row)
    const railDMeters = railSpec.d * 0.0254;
    const railYOffset = -(pThick / 2) - (railDMeters / 2); 
    
    for (let r = 0; r < panelRows; r++) {
      const rowZ = (r * (pLength + spacingMeters)) - (totalArrayLength / 2) + (pLength / 2);
      const railOffsets = [-pLength * 0.25, pLength * 0.25];

      railOffsets.forEach((offset, idx) => {
        const railZ = rowZ + offset;
        const rail = new THREE.Mesh(createProfile(railType, totalArrayWidth, 'X', railSpec), getMat(railType));
        rail.position.set(0, railYOffset, railZ);
        rail.castShadow = true;
        arrayGroup.add(rail);

        if (r === 0 && idx === 1) { // Show on Front Rail for visibility
            const p1 = new THREE.Vector3(-totalArrayWidth/2, railYOffset, railZ);
            const p2 = new THREE.Vector3(totalArrayWidth/2, railYOffset, railZ);
            const railOffsetZ = (railSpec.d * 0.0254 / 2) + OFFSET_2_5_INCHES;
            arrayGroup.add(createDimension(p1, p2, formatMeters(totalArrayWidth), new THREE.Vector3(0, 0, railOffsetZ)));
        }

        if (fastenerType !== 'none') {
          const isUHook = fastenerType === 'uhook';
          const fastGeo = isUHook 
            ? new THREE.TorusGeometry(railDMeters/2 + 0.005, 0.004, 8, 16, Math.PI) 
            : new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6); 
          
          for (let c = 0; c < panelCols; c++) {
            const pX = (c * (pWidth + spacingMeters)) - (totalArrayWidth / 2) + (pWidth / 2);
            [-pWidth*0.4, pWidth*0.4].forEach(xOff => {
                const fastener = new THREE.Mesh(fastGeo, fastenerMat);
                if (isUHook) { fastener.rotation.x = Math.PI / 2; fastener.position.set(pX + xOff, railYOffset, railZ); } 
                else { fastener.position.set(pX + xOff, railYOffset + (railDMeters/2), railZ); }
                arrayGroup.add(fastener);
            });
          }
        }
      });
    }

    // 3. Draw Main Sloped Beams
    const beamDMeters = beamSpec.d * 0.0254;
    const beamYOffset = railYOffset - (railDMeters/2) - (beamDMeters/2); 
    const pillarCount = Math.max(2, Math.ceil(panelCols / 2) + 1); 
    const pillarPositionsX = [];

    for (let i = 0; i < pillarCount; i++) {
        const t = pillarCount > 1 ? i / (pillarCount - 1) : 0.5;
        const xPosLocal = - (totalArrayWidth / 2) + (t * totalArrayWidth);
        pillarPositionsX.push(xPosLocal);

        const beam = new THREE.Mesh(createProfile(beamType, totalArrayLength, 'Z', beamSpec), getMat(beamType));
        beam.position.set(xPosLocal, beamYOffset, 0);
        beam.castShadow = true;
        arrayGroup.add(beam);

        if (i === 0) {
            const p1 = new THREE.Vector3(xPosLocal, beamYOffset, -totalArrayLength/2);
            const p2 = new THREE.Vector3(xPosLocal, beamYOffset, totalArrayLength/2);
            const beamOffsetX = (beamSpec.w * 0.0254 / 2) + OFFSET_2_5_INCHES;
            arrayGroup.add(createDimension(p1, p2, formatMeters(totalArrayLength), new THREE.Vector3(-beamOffsetX, 0, 0)));
        }
    }

    // Apply Exact Tilt & Position Array
    arrayGroup.rotation.x = tiltRad;
    const dropOffset = (totalArrayLength / 2) * Math.sin(tiltRad);
    arrayGroup.position.set(0, frontHeight + dropOffset, 0);
    group.add(arrayGroup);
    arrayGroup.updateMatrixWorld(true);

    // 4. Base Structures (Pillars Grid)
    const fPoints = [], bPoints = []; 
    const pillarCountX = Math.max(2, Math.ceil(panelCols / 2) + 1); 
    const pillarCountZ = Math.max(2, Math.ceil(totalArrayLength / 2.5) + 1);
    
    const pillarGrid = []; // For bracing calculations

    for (let i = 0; i < pillarCountX; i++) {
        const tx = pillarCountX > 1 ? i / (pillarCountX - 1) : 0.5;
        const xPosLocal = - (totalArrayWidth / 2) + (tx * totalArrayWidth);
        const colPoints = [];

        for (let j = 0; j < pillarCountZ; j++) {
            const tz = pillarCountZ > 1 ? j / (pillarCountZ - 1) : 0.5;
            const beamFrontZ = totalArrayLength * 0.45; 
            const beamBackZ = -totalArrayLength * 0.45;
            const zRange = beamFrontZ - beamBackZ;
            const zPosLocal = beamFrontZ - (tz * zRange);

            const beamLocal = new THREE.Vector3(xPosLocal, beamYOffset - beamDMeters/2, zPosLocal);
            const pWorld = arrayGroup.localToWorld(beamLocal.clone());

            colPoints.push({ top: pWorld.clone(), bottom: new THREE.Vector3(pWorld.x, 0, pWorld.z) });

            if (mountSystem === 'prefab_stand') {
                const backLegHeight = pWorld.y;
                const standBaseLength = Math.min(backLegHeight * 0.8, 2.0); 
                
                const standBase = new THREE.Mesh(createProfile(railType, standBaseLength, 'Z', railSpec), channelMat);
                standBase.position.set(pWorld.x, railDMeters/2, pWorld.z - standBaseLength/2 + 0.1);
                standBase.castShadow = true;
                group.add(standBase);

                const backLeg = new THREE.Mesh(createProfile(railType, backLegHeight, 'Y', railSpec), channelMat);
                backLeg.position.set(pWorld.x, backLegHeight/2, pWorld.z);
                backLeg.castShadow = true;
                group.add(backLeg);

                const hypoLength = Math.hypot(standBaseLength, backLegHeight);
                const hypo = new THREE.Mesh(createProfile(railType, hypoLength, 'Y', railSpec), channelMat);
                hypo.position.set(pWorld.x, backLegHeight/2, pWorld.z - standBaseLength/2);
                hypo.lookAt(pWorld.x, backLegHeight, pWorld.z);
                hypo.rotateX(Math.PI/2);
                hypo.castShadow = true;
                group.add(hypo);
                
                if (i === 0 && j === pillarCountZ - 1) { 
                    const p1 = new THREE.Vector3(pWorld.x, 0, pWorld.z);
                    const p2 = new THREE.Vector3(pWorld.x, backLegHeight, pWorld.z);
                    const legOffsetX = (railSpec.w * 0.0254 / 2) + OFFSET_2_5_INCHES;
                    group.add(createDimension(p1, p2, formatMeters(backLegHeight), new THREE.Vector3(-legOffsetX, 0, 0)));
                }
            } else {
                // CUSTOM STRUCTURE
                if (pillarType === 'brick') {
                  const brickSize = 0.33;
                  const pMesh = new THREE.Mesh(new THREE.BoxGeometry(brickSize, pWorld.y, brickSize), brickMat);
                  pMesh.position.set(pWorld.x, pWorld.y / 2, pWorld.z);
                  pMesh.castShadow = true;
                  
                  const capGeo = new THREE.BoxGeometry(brickSize + 0.05, 0.05, brickSize + 0.05);
                  const pCap = new THREE.Mesh(capGeo, concreteMat);
                  pCap.position.set(pWorld.x, pWorld.y, pWorld.z);
                  
                  group.add(pMesh, pCap);
                } else {
                  const pMesh = new THREE.Mesh(createProfile(pillarType, pWorld.y, 'Y', pillarSpec), getMat(pillarType));
                  pMesh.position.set(pWorld.x, pWorld.y / 2, pWorld.z);
                  pMesh.castShadow = true;
                  
                  const padGeo = new THREE.BoxGeometry(0.3, 0.05, 0.3);
                  const pPad = new THREE.Mesh(padGeo, concreteMat);
                  pPad.position.set(pWorld.x, 0.025, pWorld.z);
                  
                  group.add(pMesh, pPad);
                }

                if (i === 0 && (j === 0 || j === pillarCountZ - 1)) {
                    const p1 = new THREE.Vector3(pWorld.x, 0, pWorld.z);
                    const p2 = new THREE.Vector3(pWorld.x, pWorld.y, pWorld.z);
                    const pillarOffsetX = (pillarSpec.w * 0.0254 / 2) + OFFSET_2_5_INCHES;
                    group.add(createDimension(p1, p2, formatMeters(pWorld.y), new THREE.Vector3(-pillarOffsetX, 0, 0)));
                }
            }
        }
        pillarGrid.push(colPoints);
    }

    // 5. Advanced Bracing Engine (Grid Iteration)
    if (mountSystem === 'custom' && bracingType !== 'none') {
        const drawBrace = (p1, p2) => {
            const len = p1.distanceTo(p2);
            const brace = new THREE.Mesh(createProfile(railType, len, 'Y', railSpec), getMat(railType));
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            brace.position.copy(mid);
            brace.lookAt(p2);
            brace.rotateX(Math.PI/2);
            brace.castShadow = true;
            group.add(brace);
        };

        for (let i = 0; i < pillarCountX; i++) {
            for (let j = 0; j < pillarCountZ; j++) {
                const current = pillarGrid[i][j];

                // Front-Back Bracing
                if (j < pillarCountZ - 1 && (bracingType === 'front_back' || bracingType === 'x_front_back' || bracingType === 'full_x')) {
                    const nextZ = pillarGrid[i][j+1];
                    drawBrace(current.bottom, nextZ.top);
                    if (bracingType === 'x_front_back' || bracingType === 'full_x') {
                        drawBrace(current.top, nextZ.bottom);
                    }
                }
                
                // Lateral Bracing
                if (i < pillarCountX - 1 && (bracingType === 'lateral' || bracingType === 'full_x')) {
                    const nextX = pillarGrid[i+1][j];
                    drawBrace(current.bottom, nextX.top);
                    drawBrace(current.top, nextX.bottom);
                }
            }
        }
    }

  }, [panelRows, panelCols, panelSpacing, pillarSpec, beamSpec, railSpec, frontHeight, rearHeight, tiltRad, activePanel, pillarType, railType, beamType, mountSystem, fastenerType, bracingType, panelAlignment, showMeasurements, unitGlobal]);

  // --- STYLES ---
  const customStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap');
    :root { --accent-cyan: #00f0ff; --bg-dark: #0a0a0c; }
    body { font-family: 'Montserrat', sans-serif; background-color: var(--bg-dark); margin: 0; overflow: hidden; }
    .glass-panel { background: rgba(12, 12, 16, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6); }
    .liquid-toggle { transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1); }
    .liquid-active { background: var(--accent-cyan); color: #000; font-weight: 600; border-radius: 8px 16px 8px 16px; box-shadow: 0 4px 15px rgba(0, 240, 255, 0.3); }
    
    input[type=number] { -moz-appearance: textfield; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 6px; outline: none; transition: border-color 0.2s; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { opacity: 1; filter: invert(1); cursor: pointer; }
    input[type=number]:focus { border-color: var(--accent-cyan); }
    
    select { 
      -webkit-appearance: none; -moz-appearance: none; appearance: none; 
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300f0ff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); 
      background-repeat: no-repeat; background-position: right .7rem top 50%; background-size: .65rem auto; 
    }
    
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.2); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.5); }
    .vignette { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, transparent 30%, #0a0a0c 100%); z-index: 10; pointer-events: none; }
  `;

  return (
    <div className="relative w-screen h-screen overflow-hidden text-slate-200 select-none">
      <style>{customStyles}</style>

      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 z-0"></div>
      <div className="vignette"></div>

      {/* TOP NAV */}
      <nav className="glass-panel absolute top-4 left-4 right-4 h-14 rounded-xl flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2 font-bold text-lg tracking-wide">
          <Sun className="text-[#00f0ff]" size={20} />
          <span>SolarStruct <span className="text-[#00f0ff]">Pro</span></span>
        </div>
        <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
          <button className={`liquid-toggle px-5 py-1.5 rounded-full text-xs flex items-center gap-2 ${buildMode === 'Parametric' ? 'liquid-active' : 'text-slate-400 hover:text-white'}`} onClick={() => setBuildMode('Parametric')}>
            <Settings size={14} /> Parametric
          </button>
          <button className={`liquid-toggle px-5 py-1.5 rounded-full text-xs flex items-center gap-2 ${buildMode === 'LEGO' ? 'liquid-active' : 'text-slate-400 hover:text-white'}`} onClick={() => setBuildMode('LEGO')}>
            <LayoutGrid size={14} /> LEGO Mode
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5" title="Scene Brightness">
            <Sun size={14} className="text-slate-400" />
            <input type="range" min="0.2" max="3.0" step="0.1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-20" />
          </div>
          <button onClick={() => setShowMeasurements(!showMeasurements)} className={`flex items-center gap-2 px-4 py-1.5 border rounded-lg transition-colors text-xs font-semibold ${showMeasurements ? 'bg-[#00f0ff] text-black border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.4)]' : 'border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff]/10'}`}>
            <Ruler size={14} /> Blueprints
          </button>
        </div>
      </nav>

      {/* LEFT SIDEBAR: HUD */}
      <aside className="glass-panel absolute top-24 left-4 w-[380px] rounded-xl p-5 flex flex-col gap-4 z-20 h-[calc(100vh-180px)] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <HardHat size={14} /> Configuration
          </h3>
          <UnitToggle value={unitGlobal} onChange={setUnitGlobal} opt1="metric" opt2="imperial" />
        </div>

        {/* 1. ARRAY MATRIX & SPACING */}
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Array Matrix ({panelCount} Panels)</h4>
            <UnitToggle value={unitSpacing} onChange={setUnitSpacing} opt1="mm" opt2="in" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Rows (Vertical)</label>
              <input type="number" min="1" max="10" step="1" value={panelRows} onChange={(e) => setPanelRows(Number(e.target.value))} className="w-full text-xs font-bold font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Columns (Horizontal)</label>
              <input type="number" min="1" max="20" step="1" value={panelCols} onChange={(e) => setPanelCols(Number(e.target.value))} className="w-full text-xs font-bold font-mono" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] text-slate-400">Airflow Gap ({unitSpacing})</label>
            <input type="number" min="0" max={unitSpacing === 'mm' ? 100 : 4} step={unitSpacing === 'mm' ? 5 : 0.25} value={unitSpacing === 'mm' ? panelSpacing : Number((panelSpacing / 25.4).toFixed(2))} onChange={(e) => setPanelSpacing(unitSpacing === 'mm' ? Number(e.target.value) : Number(e.target.value) * 25.4)} className="w-20 text-right text-xs font-bold font-mono" />
          </div>
          
          <div className="flex bg-black/40 p-1 rounded-md">
            <button className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all ${panelAlignment === 'portrait' ? 'bg-[#00f0ff] text-black' : 'text-slate-400 hover:text-white'}`} onClick={() => setPanelAlignment('portrait')}>Portrait</button>
            <button className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all ${panelAlignment === 'landscape' ? 'bg-[#00f0ff] text-black' : 'text-slate-400 hover:text-white'}`} onClick={() => setPanelAlignment('landscape')}>Landscape</button>
          </div>
        </div>

        {/* 2. ELEVATION & TILT */}
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Elevation Height</h4>
            <div className="flex items-center gap-2">
              <span className="text-[#00f0ff] text-[10px] font-bold bg-[#00f0ff]/10 px-1.5 py-0.5 rounded border border-[#00f0ff]/20">Tilt: {tiltAngleDeg.toFixed(1)}°</span>
              <UnitToggle value={unitElevation} onChange={setUnitElevation} opt1="m" opt2="ft" />
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] text-slate-400">Front Clearance ({unitElevation})</label>
            <input type="number" min="0" step={unitElevation === 'm' ? 0.1 : 0.5} value={unitElevation === 'm' ? Number(frontHeight.toFixed(2)) : Number((frontHeight * 3.28084).toFixed(2))} onChange={(e) => setFrontHeight(unitElevation === 'm' ? Number(e.target.value) : Number(e.target.value) / 3.28084)} className="w-20 text-right text-xs font-bold font-mono" />
          </div>

          <div className="flex justify-between items-center">
            <label className="text-[10px] text-slate-400">Rear Clearance ({unitElevation})</label>
            <input type="number" min="0" step={unitElevation === 'm' ? 0.1 : 0.5} value={unitElevation === 'm' ? Number(rearHeight.toFixed(2)) : Number((rearHeight * 3.28084).toFixed(2))} onChange={(e) => setRearHeight(unitElevation === 'm' ? Number(e.target.value) : Number(e.target.value) / 3.28084)} className="w-20 text-right text-xs font-bold font-mono" />
          </div>
        </div>

        {/* 3. COMPONENT ARCHITECTURE & INDIVIDUAL SIZING */}
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Structural Profiles</h4>
            <UnitToggle value={unitProfile} onChange={setUnitProfile} opt1="in" opt2="mm" />
          </div>
          
          <div className="flex bg-black/40 p-1 rounded-md mb-1">
            <button className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all ${mountSystem === 'custom' ? 'bg-[#00f0ff] text-black' : 'text-slate-400 hover:text-white'}`} onClick={() => setMountSystem('custom')}>Custom Structure</button>
            <button className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all ${mountSystem === 'prefab_stand' ? 'bg-[#00f0ff] text-black' : 'text-slate-400 hover:text-white'}`} onClick={() => setMountSystem('prefab_stand')}>Pre-fab (L-Stands)</button>
          </div>

          {(() => {
            const renderSpecRow = (label, typeState, setTypeState, specState, setSpecState, isBrick = false) => (
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 shadow-inner">
                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">{label}</label>
                
                <select className="w-full bg-black/50 border border-white/10 text-white p-2 rounded outline-none focus:border-[#00f0ff] text-xs mb-2" value={typeState} onChange={(e) => setTypeState(e.target.value)}>
                  {!isBrick && <option value="channel">C-Channel</option>}
                  {!isBrick && <option value="pipe_square">Square Pipe</option>}
                  {!isBrick && <option value="pipe_round">Round Pipe</option>}
                  <option value="gadar">Gadar (I-Beam)</option>
                  {isBrick && <option value="brick">Concrete Filled Brick</option>}
                </select>

                {typeState !== 'brick' && (
                  <div className="flex gap-1.5">
                    <input type="number" title={`Width (${unitProfile})`} step={unitProfile==='mm'?1:0.25} min="1.0" className="w-1/3 text-[10px] text-center font-mono font-bold" value={unitProfile==='mm'?Number((specState.w*25.4).toFixed(0)):specState.w} onChange={(e)=>setSpecState({...specState, w: unitProfile==='mm'?Number(e.target.value)/25.4:Number(e.target.value)})} />
                    <input type="number" title={`Depth (${unitProfile})`} step={unitProfile==='mm'?1:0.25} min="1.0" className="w-1/3 text-[10px] text-center font-mono font-bold" value={unitProfile==='mm'?Number((specState.d*25.4).toFixed(0)):specState.d} onChange={(e)=>setSpecState({...specState, d: unitProfile==='mm'?Number(e.target.value)/25.4:Number(e.target.value)})} />
                    <select className="w-1/3 bg-black/50 border border-white/10 text-white rounded outline-none text-[10px] font-bold pl-1" value={specState.g} onChange={(e)=>setSpecState({...specState, g: Number(e.target.value)})}>
                      {GAUGE_OPTIONS.map(g => (<option key={g.gauge} value={g.gauge}>{g.gauge}G</option>))}
                    </select>
                  </div>
                )}
              </div>
            );

            return (
              <>
                {mountSystem === 'custom' && renderSpecRow("1. Pillar / Foundation", pillarType, setPillarType, pillarSpec, setPillarSpec, true)}
                {renderSpecRow("2. Main Sloped Beams", beamType, setBeamType, beamSpec, setBeamSpec)}
                {renderSpecRow("3. Horizontal Panel Rails", railType, setRailType, railSpec, setRailSpec)}
              </>
            )
          })()}

          {/* ADVANCED BRACING */}
          {mountSystem === 'custom' && (
            <div className="bg-black/30 p-2 rounded-lg border border-white/5 shadow-inner mt-1">
              <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">Structural Bracing Strategy</label>
              <select className="w-full bg-black/50 border border-white/10 text-white p-2 rounded outline-none focus:border-[#00f0ff] text-xs" value={bracingType} onChange={(e) => setBracingType(e.target.value)}>
                <option value="none">No Bracing</option>
                <option value="front_back">Single Diagonal (Front to Back)</option>
                <option value="x_front_back">X-Brace (Front to Back)</option>
                <option value="lateral">Lateral X-Brace (Rear Side-to-Side)</option>
                <option value="full_x">Full Maximum Stability (All X-Bracing)</option>
              </select>
            </div>
          )}
        </div>

        {/* 4. HARDWARE & HELIODON */}
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Hardware & Fasteners</label>
          <select className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-md outline-none focus:border-[#00f0ff] text-xs appearance-none mb-4" value={fastenerType} onChange={(e) => setFastenerType(e.target.value)}>
            <option value="none">Hidden / None</option>
            <option value="uhook">U-Hooks (Best for Pipes)</option>
            <option value="screw">Hex Screws (Best for Channels)</option>
          </select>

          <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2"><CloudSun size={12}/> Heliodon Simulator</div>
            <span className="text-[#00f0ff] text-[9px] bg-[#00f0ff]/10 px-1.5 py-0.5 rounded border border-[#00f0ff]/20">Peak: {estimatedPeakHours.toFixed(1)} h/day</span>
          </h4>
          
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] text-slate-400">Time of Day</label>
            <input type="number" min="6" max="18" step="1" value={sunHour} onChange={(e) => setSunHour(Number(e.target.value))} className="w-16 text-right text-xs font-mono font-bold" />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-slate-400">Month (Season)</label>
            <select className="w-28 bg-black/50 border border-white/10 text-white p-1 rounded-md outline-none focus:border-[#00f0ff] text-xs text-right font-bold" value={sunMonth} onChange={(e) => setSunMonth(Number(e.target.value))}>
              {MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
            </select>
          </div>
        </div>

        {!isSafe && (
          <div className="flex items-start gap-2 mt-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            <AlertTriangle size={16} className="shrink-0" />
            <span>CRITICAL: Structural Capacity ({formatWeight(maxCapacity)}) exceeded by Dead Load ({formatWeight(totalWeightBase)}). Upgrade gauges, use heavier profiles, or add cross-bracing.</span>
          </div>
        )}
      </aside>

      {/* BOTTOM BAR: LIVE DATA */}
      <footer className="glass-panel absolute bottom-4 left-4 right-4 h-14 rounded-xl flex items-center justify-between px-6 z-20">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle size={14} className={isSafe ? "text-[#00f0ff]" : "text-amber-500"} />
            <span className="text-slate-300">Yield: <strong className="text-white font-mono">{(totalPower / 1000).toFixed(2)} kW</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-white/10 pl-6">
            <LayoutGrid size={14} className="text-slate-400" />
            <span className="text-slate-300">Base Area: <strong className="text-white font-mono">{formatArea(baseAreaSqMeters)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-white/10 pl-6">
            <Box size={14} className="text-slate-400" />
            <span className="text-slate-300">Dead Load: <strong className={`font-mono ${isSafe ? "text-white" : "text-red-400"}`}>{formatWeight(totalWeightBase)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-white/10 pl-6">
            <HardHat size={14} className="text-slate-400" />
            <span className="text-slate-300">Max Capacity: <strong className="text-[#00f0ff] font-mono">{formatWeight(maxCapacity)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs border-l border-white/10 pl-6">
            <Wind size={14} className={windResistance > 120 ? "text-[#00f0ff]" : "text-amber-400"} />
            <span className="text-slate-300">Wind Resist: <strong className={windResistance > 120 ? "text-white font-mono" : "text-amber-400 font-mono"}>{formatWind(windResistance)}</strong></span>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <FileText size={14} /> View BOM
        </button>
      </footer>
    </div>
  );
};

export default App;
