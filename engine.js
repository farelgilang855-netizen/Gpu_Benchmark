import * as THREE from 'three';

let scene, camera, renderer;
let instancedMesh;
let dummy = new THREE.Object3D();
let isRunning = false;
let animationId;

// Stats
let frames = 0;
let lastTime = 0;
let currentFps = 0;
let currentCount = 0;

const MAX_INSTANCES = 500000;
const INITIAL_INSTANCES = 10000;
let incrementPerSecond = 15000;

let material;

let onUpdateCallback = null;
let startTime = 0;

export function getGpuInfo() {
  if (!renderer) return 'Unknown GPU';
  const gl = renderer.getContext();
  if (!gl) return 'WebGL Context Lost';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  }
  return 'Unknown GPU';
}

export function initEngine() {
  try {
    const canvas = document.getElementById('bg-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030305, 0.002);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;
  
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x030305);
  
  canvas.addEventListener('webglcontextlost', function(e) {
    e.preventDefault();
    alert("CRASH! GPU Anda kelebihan beban dan di-reset oleh sistem. Refresh halaman untuk memulihkan.");
    if(isRunning) stopBenchmark();
  }, false);
  
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);
  
  const dirLight1 = new THREE.DirectionalLight(0xff0055, 1);
  dirLight1.position.set(10, 20, 10);
  scene.add(dirLight1);
  
  const dirLight2 = new THREE.DirectionalLight(0x00f2fe, 1);
  dirLight2.position.set(-10, -20, -10);
  scene.add(dirLight2);

  setupMesh('medium');
  
  requestAnimationFrame(idleLoop);
}

function setupMesh(mode) {
  if (instancedMesh) {
    scene.remove(instancedMesh);
    instancedMesh.geometry.dispose();
    instancedMesh.dispose();
  }
  
  if (!material) {
    material = new THREE.MeshPhongMaterial({
      color: 0x00f2fe,
      emissive: 0x003366,
      specular: 0xffffff,
      shininess: 100,
      flatShading: true
    });
  }

  let geometry;
  if (mode === 'low') {
    geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    incrementPerSecond = 5000;
  } else if (mode === 'medium') {
    geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
    incrementPerSecond = 10000;
  } else {
    // high
    // Mengurangi detail sedikit agar tidak langsung crash dalam 5 detik
    geometry = new THREE.TorusKnotGeometry(0.3, 0.1, 32, 8);
    incrementPerSecond = 8000;
  }

  instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  
  for (let i = 0; i < MAX_INSTANCES; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.updateMatrix();
    
    instancedMesh.setMatrixAt(i, dummy.matrix);
    
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5);
    instancedMesh.setColorAt(i, color);
  }
  
  instancedMesh.count = 2000;
  scene.add(instancedMesh);
}

function idleLoop() {
  if (!isRunning) {
    scene.rotation.y += 0.001;
    scene.rotation.x += 0.0005;
    renderer.render(scene, camera);
    requestAnimationFrame(idleLoop);
  }
}

export function startBenchmark(mode, callback) {
  if (!scene) initEngine();
  
  setupMesh(mode);
  
  isRunning = true;
  onUpdateCallback = callback;
  
  currentCount = INITIAL_INSTANCES;
  instancedMesh.count = currentCount;
  
  frames = 0;
  lastTime = performance.now();
  startTime = lastTime;
  
  renderLoop();
}

function renderLoop() {
  if (!isRunning) return;
  
  const time = performance.now();
  frames++;
  
  if (time - lastTime >= 250) {
    currentFps = (frames * 1000) / (time - lastTime);
    frames = 0;
    lastTime = time;
    
    if (onUpdateCallback) {
      onUpdateCallback(currentFps, currentCount);
    }
  }
  
  const elapsedSeconds = (time - startTime) / 1000;
  const targetCount = INITIAL_INSTANCES + (elapsedSeconds * incrementPerSecond * (1 + elapsedSeconds/15));
  
  currentCount = Math.min(MAX_INSTANCES, Math.floor(targetCount));
  instancedMesh.count = currentCount;
  
  scene.rotation.y = time * 0.0005;
  scene.rotation.x = time * 0.0002;
  
  renderer.render(scene, camera);
  animationId = requestAnimationFrame(renderLoop);
}

export function stopBenchmark() {
  isRunning = false;
  cancelAnimationFrame(animationId);
  if (instancedMesh) {
    instancedMesh.count = 2000;
  }
  requestAnimationFrame(idleLoop);
}

export function resizeEngine() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export const startEngine = startBenchmark;
export const stopEngine = stopBenchmark;

initEngine();
