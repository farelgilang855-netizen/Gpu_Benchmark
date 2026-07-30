import { startEngine, stopEngine, resizeEngine, getGpuInfo } from './engine.js';

// DOM Elements
const gpuInfoBadge = document.getElementById('gpu-info-badge');
const phaseStart = document.getElementById('phase-start');
const phaseRunning = document.getElementById('phase-running');
const phaseResult = document.getElementById('phase-result');

const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const modeButtons = document.querySelectorAll('.mode-btn');

const metricFps = document.getElementById('metric-fps');
const metricObjects = document.getElementById('metric-objects');
const metricTime = document.getElementById('metric-time');
const progressBar = document.getElementById('progress-bar');

const resultScore = document.getElementById('result-score');
const resultAvgFps = document.getElementById('result-avg-fps');
const resultRating = document.getElementById('result-rating');

// Benchmark configuration
const BENCHMARK_DURATION = 30; // seconds
let benchmarkTimer = null;
let startTime = 0;
let isRunning = false;
let fpsHistory = [];
let currentObjects = 0;
let currentMode = 'medium';

// Setup Event Listeners
btnStart.addEventListener('click', startBenchmark);
btnRestart.addEventListener('click', resetBenchmark);
window.addEventListener('resize', resizeEngine);

// Mode Selection
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all
    modeButtons.forEach(b => b.classList.remove('active'));
    // Add to clicked
    btn.classList.add('active');
    // Set mode
    currentMode = btn.dataset.mode;
  });
});

// Set GPU Info
if (gpuInfoBadge) {
  // Give it a small delay to ensure WebGL context is fully ready
  setTimeout(() => {
    gpuInfoBadge.textContent = getGpuInfo();
  }, 100);
}

function showPhase(phase) {
  phaseStart.classList.remove('active');
  phaseRunning.classList.remove('active');
  phaseResult.classList.remove('active');
  phase.classList.add('active');
}

function startBenchmark() {
  showPhase(phaseRunning);
  isRunning = true;
  startTime = performance.now();
  fpsHistory = [];
  
  // Start the 3D Engine with selected mode
  startEngine(currentMode, updateStats);
  
  // Start the timer loop
  requestAnimationFrame(benchmarkLoop);
}

function updateStats(fps, objects) {
  if (!isRunning) return;
  metricFps.textContent = Math.round(fps);
  metricObjects.textContent = objects.toLocaleString();
  currentObjects = objects;
  fpsHistory.push(fps);
}

function benchmarkLoop(time) {
  if (!isRunning) return;
  
  const elapsed = (time - startTime) / 1000;
  const remaining = Math.max(0, BENCHMARK_DURATION - elapsed);
  
  // Update Time UI
  metricTime.textContent = Math.ceil(remaining) + 's';
  
  // Update Progress Bar
  const progress = (elapsed / BENCHMARK_DURATION) * 100;
  progressBar.style.width = `${Math.min(100, progress)}%`;
  
  if (elapsed >= BENCHMARK_DURATION) {
    endBenchmark();
  } else {
    requestAnimationFrame(benchmarkLoop);
  }
}

function endBenchmark() {
  isRunning = false;
  stopEngine();
  
  // Calculate results
  // Remove first 2 seconds of FPS to avoid initial stutter skewing results (assume ~4 updates per second)
  const validFpsHistory = fpsHistory.slice(8);
  const avgFps = validFpsHistory.length > 0 
    ? validFpsHistory.reduce((a, b) => a + b, 0) / validFpsHistory.length 
    : 0;
    
  // Formula for score: (AvgFPS * FinalObjects) / 100
  const score = Math.round((avgFps * currentObjects) / 100);
  
  // Determine Rating
  let rating = 'POOR';
  let ratingColor = '#ff4d4d';
  
  if (score > 150000) {
    rating = 'ELITE';
    ratingColor = '#a64dff';
  } else if (score > 75000) {
    rating = 'EXCELLENT';
    ratingColor = '#00f2fe';
  } else if (score > 35000) {
    rating = 'GOOD';
    ratingColor = '#4caf50';
  } else if (score > 10000) {
    rating = 'AVERAGE';
    ratingColor = '#ff9800';
  }

  // Update Result UI
  resultScore.textContent = score.toLocaleString();
  resultAvgFps.textContent = Math.round(avgFps);
  resultRating.textContent = rating;
  resultRating.style.color = ratingColor;
  resultRating.style.borderColor = ratingColor;
  
  showPhase(phaseResult);
}

function resetBenchmark() {
  showPhase(phaseStart);
}
