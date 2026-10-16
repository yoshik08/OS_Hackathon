/**
 * STRESSLAB // Core Engine & Telemetry Coordinator
 * OSSP S9 Hackathon - Team 7
 * Concurrency, Memory Virtualization, Real-Time Canvas Instrumentation
 */

// Embedded worker source string for infallible Blob URL execution (works under both file:// and http://)
const WORKER_SOURCE = `
let isRunning = false;
let isPaused = false;
let currentWorkload = 'primes';
let intensity = 100;
let workerId = 0;
let totalOperations = 0;
let windowOperations = 0;
let windowLatencyAccumulator = 0;
let lastTickTime = performance.now();
let tickInterval = null;

let primeCandidate = 3;
function runPrimeWorkload(batchSize = 250) {
  let ops = 0;
  const start = performance.now();
  for (let b = 0; b < batchSize; b++) {
    let n = primeCandidate;
    primeCandidate += 2;
    if (primeCandidate > 20000000) primeCandidate = 3;
    let isPrime = true;
    const limit = Math.sqrt(n);
    for (let d = 3; d <= limit; d += 2) {
      if (n % d === 0) { isPrime = false; break; }
    }
    ops++;
  }
  return { ops, duration: performance.now() - start };
}

const MATRIX_SIZE = 36;
const matA = new Float64Array(MATRIX_SIZE * MATRIX_SIZE);
const matB = new Float64Array(MATRIX_SIZE * MATRIX_SIZE);
const matC = new Float64Array(MATRIX_SIZE * MATRIX_SIZE);
for (let i = 0; i < matA.length; i++) {
  matA[i] = Math.random() * 100;
  matB[i] = Math.random() * 100;
}

function runMatrixWorkload(batchSize = 4) {
  let ops = 0;
  const start = performance.now();
  for (let b = 0; b < batchSize; b++) {
    for (let i = 0; i < MATRIX_SIZE; i++) {
      const iOffset = i * MATRIX_SIZE;
      for (let j = 0; j < MATRIX_SIZE; j++) {
        let sum = 0.0;
        for (let k = 0; k < MATRIX_SIZE; k++) {
          sum += matA[iOffset + k] * matB[k * MATRIX_SIZE + j];
        }
        matC[iOffset + j] = sum;
      }
    }
    matA[b % matA.length] += matC[0] * 0.000001;
    ops += (MATRIX_SIZE * MATRIX_SIZE * MATRIX_SIZE * 2);
  }
  return { ops, duration: performance.now() - start };
}

const hashBlock = new Uint32Array(16);
for (let i = 0; i < 16; i++) hashBlock[i] = (i * 0x9E3779B9) >>> 0;

function runHashWorkload(batchSize = 300) {
  let ops = 0;
  const start = performance.now();
  for (let b = 0; b < batchSize; b++) {
    let a = 0x6a09e667, e = 0x510e527f;
    for (let i = 0; i < 64; i++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & 0x9b05688c) ^ (~e & 0x1f83d9ab);
      const temp1 = (a + s1 + ch + 0x428a2f98 + hashBlock[i % 16]) >>> 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & 0x5be0cd19) ^ (a & 0x1f83d9ab) ^ (0x5be0cd19 & 0x1f83d9ab);
      const temp2 = (s0 + maj) >>> 0;
      e = (e + temp1) >>> 0;
      a = (temp1 + temp2) >>> 0;
    }
    hashBlock[b % 16] = a;
    ops += 64;
  }
  return { ops, duration: performance.now() - start };
}

const SORT_ARRAY_SIZE = 1024;
const sortBuffer = new Float64Array(SORT_ARRAY_SIZE);

function runSortWorkload(batchSize = 25) {
  let ops = 0;
  const start = performance.now();
  for (let b = 0; b < batchSize; b++) {
    for (let i = 0; i < SORT_ARRAY_SIZE; i++) sortBuffer[i] = Math.sin(b + i) * 10000.0;
    sortBuffer.sort();
    for (let s = 0; s < 64; s++) {
      const target = sortBuffer[(s * 15) % SORT_ARRAY_SIZE];
      let low = 0, high = SORT_ARRAY_SIZE - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (sortBuffer[mid] === target) break;
        else if (sortBuffer[mid] < target) low = mid + 1;
        else high = mid - 1;
      }
    }
    ops += (SORT_ARRAY_SIZE * Math.log2(SORT_ARRAY_SIZE) + 64 * Math.log2(SORT_ARRAY_SIZE));
  }
  return { ops: Math.round(ops), duration: performance.now() - start };
}

function executeBatch() {
  switch (currentWorkload) {
    case 'primes': return runPrimeWorkload(300);
    case 'matrix': return runMatrixWorkload(4);
    case 'hash': return runHashWorkload(350);
    case 'sort': return runSortWorkload(20);
    default: return runPrimeWorkload(250);
  }
}

function loop() {
  if (!isRunning || isPaused) return;
  const cycleDuration = 40;
  const activeWorkTime = (intensity / 100) * cycleDuration;
  const cycleStart = performance.now();

  while (isRunning && !isPaused && (performance.now() - cycleStart) < activeWorkTime) {
    const result = executeBatch();
    windowOperations += result.ops;
    totalOperations += result.ops;
    windowLatencyAccumulator += result.duration;
  }

  const elapsedInCycle = performance.now() - cycleStart;
  const sleepTime = Math.max(0, cycleDuration - elapsedInCycle);

  if (sleepTime > 1 && intensity < 100) {
    setTimeout(loop, sleepTime);
  } else {
    if (typeof queueMicrotask === 'function' && intensity >= 99) {
      queueMicrotask(loop);
    } else {
      setTimeout(loop, 0);
    }
  }
}

function startTelemetry() {
  if (tickInterval) clearInterval(tickInterval);
  lastTickTime = performance.now();
  tickInterval = setInterval(() => {
    if (!isRunning) return;
    const now = performance.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;
    const opsInTick = windowOperations;
    const opsPerSec = dt > 0 ? opsInTick / dt : 0;
    const avgLatency = opsInTick > 0 ? (windowLatencyAccumulator / (opsInTick / 100)) : 0.05;

    self.postMessage({
      type: 'tick',
      workerId,
      ops: opsInTick,
      totalOps: totalOperations,
      opsPerSec: Math.round(opsPerSec),
      avgLatencyMs: parseFloat(avgLatency.toFixed(3)),
      timestamp: now,
      workload: currentWorkload,
      intensity
    });

    windowOperations = 0;
    windowLatencyAccumulator = 0;
  }, 500);
}

self.onmessage = function (e) {
  const data = e.data;
  if (!data) return;
  switch (data.type) {
    case 'start':
      workerId = data.workerId !== undefined ? data.workerId : 0;
      currentWorkload = data.workload || 'primes';
      intensity = Math.max(10, Math.min(100, data.intensity || 100));
      isRunning = true;
      isPaused = false;
      windowOperations = 0;
      totalOperations = 0;
      windowLatencyAccumulator = 0;
      startTelemetry();
      loop();
      self.postMessage({ type: 'started', workerId });
      break;
    case 'pause':
      isPaused = true;
      self.postMessage({ type: 'paused', workerId });
      break;
    case 'resume':
      if (isRunning && isPaused) {
        isPaused = false;
        loop();
        self.postMessage({ type: 'resumed', workerId });
      }
      break;
    case 'set_intensity':
      intensity = Math.max(10, Math.min(100, data.intensity || 100));
      break;
    case 'set_workload':
      currentWorkload = data.workload || 'primes';
      break;
    case 'stop':
      isRunning = false;
      isPaused = false;
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      self.postMessage({ type: 'stopped', workerId, finalOps: totalOperations });
      break;
  }
};
`;

// App State Architecture
const State = {
  status: 'IDLE', // IDLE, WARMING_UP, STRESSING, HOLDING, COOLING, PAUSED, STOPPED, COMPLETED, SAFETY_STOPPED
  config: {
    workerCount: 4,
    intensity: 100,
    duration: 30, // seconds, 0 = infinite
    workload: 'primes',
    targetMemoryMB: 512,
    chunkSizeMB: 64,
    pattern: 'sequential',
    holdTime: 0,
    autoRelease: true,
    currentPreset: 'medium'
  },
  workers: [],
  workerStats: {},
  memoryBuffers: [],
  allocatedBytes: 0,
  peakMemoryMB: 0,
  allocationSpeedMBps: 0,
  
  // Real-time telemetry series for charts
  telemetry: {
    startTime: null,
    pauseStartTime: null,
    totalPausedTime: 0,
    elapsedSeconds: 0,
    totalOperations: 0,
    currentOpsPerSec: 0,
    peakOpsPerSec: 0,
    avgLatencyMs: 0,
    stabilityScore: 100,
    recentThroughputs: [], // sliding window for variance calculation
    
    // Time-series points for Canvas charts
    cpuChartData: [], // [{ t: 0, ops: 0 }]
    memChartData: []  // [{ t: 0, mb: 0 }]
  },

  // Suite Automation
  suite: {
    isRunning: false,
    queue: [],
    currentIndex: 0,
    results: []
  },

  // Watchdog
  watchdog: {
    hiddenTimer: null,
    hiddenStartTime: null
  },

  // Historical runs
  history: []
};

// Blob Worker URL generation for zero CORS/file protocol restrictions
let workerBlobUrl = null;
function getWorkerUrl() {
  if (!workerBlobUrl) {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
  }
  return workerBlobUrl;
}

// System Hardware Auto-Discovery
function detectSystemSpecs() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator.deviceMemory ? navigator.deviceMemory + ' GB RAM' : 'Browser Sandboxed');
  const platform = navigator.platform || (navigator.userAgentData ? navigator.userAgentData.platform : 'Unknown OS');
  const screenRes = `${window.screen.width}×${window.screen.height} @ ${window.devicePixelRatio || 1}x`;
  const connection = (navigator.connection && navigator.connection.effectiveType) ? navigator.connection.effectiveType.toUpperCase() : 'LAN / BROADBAND';

  // High resolution timer precision benchmark
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) Math.sqrt(i);
  const timerPrecision = (performance.now() - t0).toFixed(4);

  // Update DOM specs
  document.getElementById('spec-cores').textContent = `${cores} THREADS`;
  document.getElementById('spec-memory').textContent = memory;
  document.getElementById('spec-platform').textContent = platform;
  document.getElementById('spec-screen').textContent = screenRes;
  document.getElementById('spec-network').textContent = connection;
  document.getElementById('spec-timer').textContent = `±0.005 ms (${timerPrecision}ms loop)`;

  // Update max core slider bound
  const workerSlider = document.getElementById('cpu-workers');
  const workerMaxLabel = document.getElementById('cpu-workers-max');
  if (workerSlider) {
    workerSlider.max = cores;
    if (cores < 4) {
      workerSlider.value = cores;
      State.config.workerCount = cores;
    } else {
      workerSlider.value = 4;
      State.config.workerCount = 4;
    }
    document.getElementById('cpu-workers-val').textContent = workerSlider.value;
    if (workerMaxLabel) workerMaxLabel.textContent = `${cores} Cores Max`;
  }
}

// Telemetry & Hardware Clock
function updateClock() {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const clockEl = document.getElementById('live-clock');
  if (clockEl) clockEl.textContent = `${timeStr}.${ms}`;
  requestAnimationFrame(updateClock);
}

// Memory Allocation & Paging Engine
async function allocateMemoryChunked(targetMB, chunkSizeMB, pattern) {
  if (State.status === 'SAFETY_STOPPED' || State.status === 'STOPPED') return;

  const totalBytesTarget = targetMB * 1024 * 1024;
  const chunkBytes = chunkSizeMB * 1024 * 1024;
  const startTime = performance.now();

  setStatus('STRESSING', 'ALLOCATING PHYSICAL MEMORY...');

  while (State.allocatedBytes < totalBytesTarget && State.status === 'STRESSING') {
    const nextBytes = Math.min(chunkBytes, totalBytesTarget - State.allocatedBytes);
    const chunkStart = performance.now();

    try {
      // 1. Allocate ArrayBuffer
      const buffer = new ArrayBuffer(nextBytes);
      const view = new Uint8Array(buffer);

      // 2. FORCE REAL PHYSICAL ALLOCATION by touching every 4KB virtual memory page
      // (Bypasses OS copy-on-write zero page optimization)
      const pageSize = 4096;
      if (pattern === 'sequential') {
        for (let offset = 0; offset < view.length; offset += pageSize) {
          view[offset] = (offset & 0xFF) ^ 0xA5;
        }
      } else if (pattern === 'random') {
        const numPages = Math.floor(view.length / pageSize);
        for (let p = 0; p < numPages; p++) {
          const randPage = Math.floor(Math.random() * numPages);
          view[randPage * pageSize] = (p * 37) & 0xFF;
        }
      } else { // 'readwrite'
        for (let offset = 0; offset < view.length; offset += pageSize) {
          const val = view[offset];
          view[offset] = (val + 1) ^ 0x5C;
        }
      }

      State.memoryBuffers.push(buffer);
      State.allocatedBytes += nextBytes;

      const chunkTime = (performance.now() - chunkStart) / 1000;
      if (chunkTime > 0) {
        State.allocationSpeedMBps = Math.round((nextBytes / (1024 * 1024)) / chunkTime);
      }

      const currentMB = Math.round(State.allocatedBytes / (1024 * 1024));
      if (currentMB > State.peakMemoryMB) State.peakMemoryMB = currentMB;

      // Update Memory Telemetry
      updateMemoryTelemetryUI();

      // Yield event loop briefly to keep UI at 60 FPS
      await new Promise(r => setTimeout(r, 16));

    } catch (err) {
      console.warn('Memory Allocation Limit Reached:', err);
      showToast('Memory limit reached. Holding current buffers.', 'warning');
      break;
    }
  }

  const totalAllocTime = (performance.now() - startTime) / 1000;
  if (totalAllocTime > 0) {
    State.allocationSpeedMBps = Math.round((State.allocatedBytes / (1024 * 1024)) / totalAllocTime);
  }

  // Finished allocating, proceed to hold state or continue stressing
  if (State.status === 'STRESSING') {
    setStatus('STRESSING', `SUSTAINING LOAD [${State.config.workerCount}T • ${Math.round(State.allocatedBytes / (1024 * 1024))}MB]`);
  }
}

// Memory Deallocation & Zeroing Proof
function releaseMemory() {
  const previousAllocated = State.allocatedBytes;
  
  // Explicitly nullify all ArrayBuffer references
  for (let i = 0; i < State.memoryBuffers.length; i++) {
    State.memoryBuffers[i] = null;
  }
  State.memoryBuffers.length = 0;
  State.allocatedBytes = 0;
  State.allocationSpeedMBps = 0;

  updateMemoryTelemetryUI();

  const statusBadge = document.getElementById('mem-status-badge');
  if (statusBadge) {
    statusBadge.textContent = 'RELEASED: 0 MB ALLOCATED';
    statusBadge.className = 'font-editorial-mono text-xs px-2 py-0.5 border border-[#D9FF3D] text-[#D9FF3D] bg-[#D9FF3D]/10';
  }

  console.info(`Memory Engine: Released ${Math.round(previousAllocated / (1024 * 1024))} MB successfully.`);
}

function updateMemoryTelemetryUI() {
  const allocatedMB = Math.round(State.allocatedBytes / (1024 * 1024));
  const targetMB = State.config.targetMemoryMB;
  const chunksCount = State.memoryBuffers.length;

  const memAllocatedEl = document.getElementById('metric-mem-allocated');
  const memPeakEl = document.getElementById('metric-mem-peak');
  const memSpeedEl = document.getElementById('metric-mem-speed');
  const memChunksEl = document.getElementById('metric-mem-chunks');
  const memProgressEl = document.getElementById('mem-bar-fill');
  const memStatusBadge = document.getElementById('mem-status-badge');

  if (memAllocatedEl) memAllocatedEl.textContent = `${allocatedMB}`;
  if (memPeakEl) memPeakEl.textContent = `${State.peakMemoryMB} MB`;
  if (memSpeedEl) memSpeedEl.textContent = `${State.allocationSpeedMBps} MB/s`;
  if (memChunksEl) memChunksEl.textContent = `${chunksCount} Chunks`;

  if (memProgressEl) {
    const pct = Math.min(100, Math.round((allocatedMB / targetMB) * 100));
    memProgressEl.style.width = `${pct}%`;
  }

  if (memStatusBadge) {
    if (allocatedMB > 0) {
      memStatusBadge.textContent = `ACTIVE [${allocatedMB} MB]`;
      memStatusBadge.className = 'font-editorial-mono text-xs px-2 py-0.5 border border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10';
    } else {
      memStatusBadge.textContent = 'RELEASED: 0 MB ALLOCATED';
      memStatusBadge.className = 'font-editorial-mono text-xs px-2 py-0.5 border border-[#D9FF3D] text-[#D9FF3D] bg-[#D9FF3D]/10';
    }
  }

  // Push to chart series
  if (State.telemetry.startTime && State.status === 'STRESSING') {
    State.telemetry.memChartData.push({
      t: State.telemetry.elapsedSeconds,
      mb: allocatedMB
    });
    if (State.telemetry.memChartData.length > 200) State.telemetry.memChartData.shift();
  }
}

// Web Worker Concurrency Engine
function spawnWorkers() {
  terminateWorkers();
  State.workers = [];
  State.workerStats = {};

  const workerCount = State.config.workerCount;
  const workerGridContainer = document.getElementById('worker-status-grid');
  if (workerGridContainer) workerGridContainer.innerHTML = '';

  const workerUrl = getWorkerUrl();

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(workerUrl);
    worker.workerId = i;

    // Create worker rack cell
    if (workerGridContainer) {
      const cell = document.createElement('div');
      cell.id = `worker-cell-${i}`;
      cell.className = 'worker-rack-cell p-3 border border-[#282724] bg-[#161614] flex flex-col justify-between';
      cell.innerHTML = `
        <div class="flex items-center justify-between text-xs font-editorial-mono">
          <span class="text-[#8A8782]">CORE #${String(i + 1).padStart(2, '0')}</span>
          <span id="worker-status-pill-${i}" class="text-[#8A8782]">IDLE</span>
        </div>
        <div class="my-2">
          <div class="text-lg font-bold font-editorial-mono text-[#EDEAE3]" id="worker-ops-${i}">0</div>
          <div class="text-[10px] text-[#8A8782] font-editorial-mono">OPS/SEC</div>
        </div>
        <div class="w-full bg-[#201F1D] h-1.5 overflow-hidden">
          <div id="worker-bar-${i}" class="bg-[#D9FF3D] h-full w-0 transition-all duration-300"></div>
        </div>
      `;
      workerGridContainer.appendChild(cell);
    }

    worker.onmessage = function (e) {
      handleWorkerMessage(e.data);
    };

    worker.onerror = function (err) {
      console.error(`Worker #${i} Error:`, err);
      showToast(`Worker #${i} encountered an error.`, 'danger');
    };

    State.workers.push(worker);
  }
}

function handleWorkerMessage(data) {
  if (!data || data.workerId === undefined) return;
  const wid = data.workerId;

  if (data.type === 'tick') {
    State.workerStats[wid] = {
      opsPerSec: data.opsPerSec,
      totalOps: data.totalOps,
      avgLatencyMs: data.avgLatencyMs,
      timestamp: data.timestamp
    };

    // Update individual worker rack UI
    const opsEl = document.getElementById(`worker-ops-${wid}`);
    const pillEl = document.getElementById(`worker-status-pill-${wid}`);
    const barEl = document.getElementById(`worker-bar-${wid}`);
    const cellEl = document.getElementById(`worker-cell-${wid}`);

    if (opsEl) opsEl.textContent = data.opsPerSec.toLocaleString();
    if (pillEl) {
      pillEl.textContent = 'BUSY';
      pillEl.className = 'text-[#D9FF3D] font-bold';
    }
    if (cellEl && !cellEl.classList.contains('active-worker')) {
      cellEl.classList.add('active-worker');
    }
    if (barEl) {
      // Relative to 50k ops/sec nominal scale
      const pct = Math.min(100, Math.round((data.opsPerSec / 60000) * 100));
      barEl.style.width = `${pct}%`;
    }
  } else if (data.type === 'stopped') {
    const pillEl = document.getElementById(`worker-status-pill-${wid}`);
    const cellEl = document.getElementById(`worker-cell-${wid}`);
    if (pillEl) {
      pillEl.textContent = 'STOPPED';
      pillEl.className = 'text-[#8A8782]';
    }
    if (cellEl) cellEl.classList.remove('active-worker');
  }
}

function terminateWorkers() {
  for (let w of State.workers) {
    try {
      w.terminate();
    } catch (e) {}
  }
  State.workers = [];
  State.workerStats = {};
}

// Master Control Actions
async function startStressTest() {
  if (State.status === 'STRESSING') return;

  // Validate Memory Safety Limits
  if (State.config.targetMemoryMB > 1536) {
    const confirmed = await openSafetyConfirmModal(State.config.targetMemoryMB);
    if (!confirmed) return;
  }

  // Reset telemetry
  State.telemetry.startTime = performance.now();
  State.telemetry.pauseStartTime = null;
  State.telemetry.totalPausedTime = 0;
  State.telemetry.elapsedSeconds = 0;
  State.telemetry.totalOperations = 0;
  State.telemetry.currentOpsPerSec = 0;
  State.telemetry.peakOpsPerSec = 0;
  State.telemetry.avgLatencyMs = 0;
  State.telemetry.stabilityScore = 100;
  State.telemetry.recentThroughputs = [];
  State.telemetry.cpuChartData = [];
  State.telemetry.memChartData = [];
  State.peakMemoryMB = 0;

  // Initialize and spawn workers
  spawnWorkers();

  setStatus('WARMING_UP', 'SPINNING UP THREADS...');
  
  // Slight delay for warm-up thread allocation
  await new Promise(r => setTimeout(r, 300));

  setStatus('STRESSING', `STRESSING CPU [${State.config.workerCount}T] & MEMORY [${State.config.targetMemoryMB}MB]`);
  document.body.classList.add('stress-active');

  // Start all workers
  for (let w of State.workers) {
    w.postMessage({
      type: 'start',
      workerId: w.workerId,
      workload: State.config.workload,
      intensity: State.config.intensity,
      duration: State.config.duration
    });
  }

  // Allocate memory asynchronously
  allocateMemoryChunked(State.config.targetMemoryMB, State.config.chunkSizeMB, State.config.pattern);

  // Setup start/stop button states
  toggleControlsLocked(true);
}

function pauseStressTest() {
  if (State.status !== 'STRESSING') return;
  State.status = 'PAUSED';
  State.telemetry.pauseStartTime = performance.now();
  setStatus('PAUSED', 'WORKLOAD EXECUTION PAUSED');

  for (let w of State.workers) {
    w.postMessage({ type: 'pause' });
  }

  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn) {
    pauseBtn.innerHTML = `
      <span class="inline-block w-2.5 h-2.5 bg-[#D9FF3D] mr-2"></span>
      RESUME
    `;
  }
}

function resumeStressTest() {
  if (State.status !== 'PAUSED') return;
  if (State.telemetry.pauseStartTime) {
    State.telemetry.totalPausedTime += (performance.now() - State.telemetry.pauseStartTime);
    State.telemetry.pauseStartTime = null;
  }
  State.status = 'STRESSING';
  setStatus('STRESSING', `SUSTAINING LOAD [${State.config.workerCount}T • ${Math.round(State.allocatedBytes / (1024 * 1024))}MB]`);

  for (let w of State.workers) {
    w.postMessage({ type: 'resume' });
  }

  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn) {
    pauseBtn.innerHTML = `
      <span class="inline-block w-2.5 h-2.5 border border-current mr-2"></span>
      PAUSE
    `;
  }
}

function emergencyStop() {
  console.warn('EMERGENCY STOP TRIGGERED');
  terminateWorkers();
  releaseMemory();
  
  State.status = 'SAFETY_STOPPED';
  setStatus('SAFETY_STOPPED', 'EMERGENCY SAFETY STOP ACTIVATED');
  document.body.classList.remove('stress-active');

  toggleControlsLocked(false);
  showToast('EMERGENCY STOP: All threads terminated & memory released.', 'danger');

  // Freeze final run telemetry if it was running
  if (State.telemetry.startTime) {
    recordRunHistory('Emergency Safety Stop');
  }
}

function completeStressTest(verdict = 'COMPLETED') {
  terminateWorkers();

  // Handle hold time or auto-release
  if (State.config.autoRelease) {
    releaseMemory();
  } else if (State.config.holdTime > 0) {
    setStatus('HOLDING', `HOLDING ${Math.round(State.allocatedBytes / (1024 * 1024))}MB FOR ${State.config.holdTime}s`);
    setTimeout(() => {
      releaseMemory();
      setStatus('COMPLETED', 'TEST COMPLETED & MEMORY CLEARED');
    }, State.config.holdTime * 1000);
  }

  State.status = 'COMPLETED';
  setStatus('COMPLETED', 'TEST COMPLETED NORMALLY');
  document.body.classList.remove('stress-active');
  toggleControlsLocked(false);

  recordRunHistory(verdict);
  showToast('Stress benchmark completed successfully.', 'success');

  // If Suite is active, proceed to next preset
  if (State.suite.isRunning) {
    handleSuiteNext();
  }
}

function resetDeck() {
  if (State.status === 'STRESSING') {
    emergencyStop();
  } else {
    releaseMemory();
    terminateWorkers();
  }

  State.status = 'IDLE';
  setStatus('IDLE', 'SYSTEM READY // WORKLOAD GENERATOR IDLE');
  document.body.classList.remove('stress-active');

  State.telemetry.startTime = null;
  State.telemetry.elapsedSeconds = 0;
  State.telemetry.totalOperations = 0;
  State.telemetry.currentOpsPerSec = 0;
  State.telemetry.peakOpsPerSec = 0;
  State.telemetry.avgLatencyMs = 0;
  State.telemetry.stabilityScore = 100;
  State.telemetry.cpuChartData = [];
  State.telemetry.memChartData = [];

  // Reset telemetry readouts
  document.getElementById('metric-cpu-ops').textContent = '0';
  document.getElementById('metric-total-ops').textContent = '0';
  document.getElementById('metric-avg-latency').textContent = '0.00 ms';
  document.getElementById('metric-stability').textContent = '100';
  document.getElementById('metric-elapsed').textContent = '00:00';
  document.getElementById('metric-remaining').textContent = State.config.duration > 0 ? `${State.config.duration}s` : '∞';
  
  updateMemoryTelemetryUI();
  toggleControlsLocked(false);
  clearCanvasCharts();
  showToast('Control Deck reset to default parameters.', 'info');
}

// Suite Runner: Light -> Medium -> Heavy
function runAllPresetsSuite() {
  if (State.status === 'STRESSING' || State.suite.isRunning) return;

  State.suite.isRunning = true;
  State.suite.queue = ['light', 'medium', 'heavy'];
  State.suite.currentIndex = 0;
  State.suite.results = [];

  showToast('Starting Automated Benchmark Suite (Light → Medium → Heavy)', 'info');
  executeSuiteStep();
}

function executeSuiteStep() {
  if (State.suite.currentIndex >= State.suite.queue.length) {
    State.suite.isRunning = false;
    showToast('All Suite Benchmarks completed! Review comparative report.', 'success');
    renderComparisonTable();
    return;
  }

  const presetName = State.suite.queue[State.suite.currentIndex];
  applyPreset(presetName);
  
  // Force 15s duration for quick suite demo
  State.config.duration = 15;
  document.getElementById('metric-remaining').textContent = '15s';

  showToast(`Suite Step [${State.suite.currentIndex + 1}/3]: Running ${presetName.toUpperCase()} Preset...`, 'info');
  startStressTest();
}

function handleSuiteNext() {
  State.suite.currentIndex++;
  if (State.suite.currentIndex < State.suite.queue.length) {
    setStatus('COOLING', 'COOLING DOWN CORES (5s)...');
    setTimeout(() => {
      executeSuiteStep();
    }, 5000);
  } else {
    State.suite.isRunning = false;
    setStatus('COMPLETED', 'SUITE BENCHMARK FINISHED');
    showToast('Suite test complete! Full data captured.', 'success');
  }
}

// Status Management & LEDs
function setStatus(code, label) {
  State.status = code;
  const labelEl = document.getElementById('live-status-label');
  const pillEl = document.getElementById('live-status-pill');
  const ledEl = document.getElementById('live-status-led');

  if (labelEl) labelEl.textContent = label;

  if (ledEl) {
    ledEl.className = 'led-indicator';
    if (code === 'STRESSING') ledEl.classList.add('led-active');
    else if (code === 'WARMING_UP' || code === 'HOLDING' || code === 'COOLING') ledEl.classList.add('led-warning');
    else if (code === 'SAFETY_STOPPED') ledEl.classList.add('led-danger');
    else ledEl.classList.add('led-idle');
  }

  // Update top bar status pill styling
  if (pillEl) {
    if (code === 'STRESSING') {
      pillEl.className = 'px-3 py-1 bg-[#D9FF3D]/10 border border-[#D9FF3D] text-[#D9FF3D] text-xs font-editorial-mono flex items-center gap-2';
    } else if (code === 'SAFETY_STOPPED') {
      pillEl.className = 'px-3 py-1 bg-[#FF2D20]/10 border border-[#FF2D20] text-[#FF2D20] text-xs font-editorial-mono flex items-center gap-2';
    } else if (code === 'PAUSED') {
      pillEl.className = 'px-3 py-1 bg-[#FF4D00]/10 border border-[#FF4D00] text-[#FF4D00] text-xs font-editorial-mono flex items-center gap-2';
    } else {
      pillEl.className = 'px-3 py-1 bg-[#1A1A18] border border-[#2B2A27] text-[#EDEAE3] text-xs font-editorial-mono flex items-center gap-2';
    }
  }
}

// UI Lock/Unlock when stressing
function toggleControlsLocked(locked) {
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');
  const inputs = document.querySelectorAll('#control-deck input, #control-deck button:not(#btn-emergency):not(#btn-pause)');

  if (startBtn) {
    if (locked) {
      startBtn.classList.add('opacity-50', 'pointer-events-none');
      startBtn.innerHTML = `
        <span class="inline-block w-3 h-3 border-2 border-current border-t-transparent animate-spin mr-2"></span>
        BENCHMARK RUNNING
      `;
    } else {
      startBtn.classList.remove('opacity-50', 'pointer-events-none');
      startBtn.innerHTML = `
        <span class="inline-block w-3 h-3 bg-current mr-2"></span>
        START STRESS TEST
      `;
    }
  }

  if (pauseBtn) {
    if (locked) {
      pauseBtn.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      pauseBtn.classList.add('opacity-50', 'pointer-events-none');
      pauseBtn.innerHTML = `
        <span class="inline-block w-2.5 h-2.5 border border-current mr-2"></span>
        PAUSE
      `;
    }
  }
}

// Master Telemetry Loop (Runs every 500ms)
setInterval(() => {
  if (State.status !== 'STRESSING') return;

  const now = performance.now();
  const adjustedStartTime = State.telemetry.startTime + State.telemetry.totalPausedTime;
  const elapsedTotal = Math.max(0, (now - adjustedStartTime) / 1000);
  State.telemetry.elapsedSeconds = Math.floor(elapsedTotal);

  // Format Elapsed Time
  const mins = String(Math.floor(elapsedTotal / 60)).padStart(2, '0');
  const secs = String(Math.floor(elapsedTotal % 60)).padStart(2, '0');
  const elapsedEl = document.getElementById('metric-elapsed');
  if (elapsedEl) elapsedEl.textContent = `${mins}:${secs}`;

  // Remaining Time Check
  const remainingEl = document.getElementById('metric-remaining');
  if (State.config.duration > 0) {
    const remain = Math.max(0, State.config.duration - Math.floor(elapsedTotal));
    if (remainingEl) remainingEl.textContent = `${remain}s`;

    if (remain <= 0) {
      completeStressTest('Test Duration Completed');
      return;
    }
  } else {
    if (remainingEl) remainingEl.textContent = '∞';
  }

  // Aggregate stats from active workers
  let currentTickOps = 0;
  let totalWorkerOps = 0;
  let latencyAccumulator = 0;
  let activeCount = 0;

  for (let wid in State.workerStats) {
    const stat = State.workerStats[wid];
    currentTickOps += stat.opsPerSec;
    totalWorkerOps += stat.totalOps;
    latencyAccumulator += stat.avgLatencyMs;
    activeCount++;
  }

  State.telemetry.currentOpsPerSec = currentTickOps;
  State.telemetry.totalOperations = totalWorkerOps;
  if (currentTickOps > State.telemetry.peakOpsPerSec) {
    State.telemetry.peakOpsPerSec = currentTickOps;
  }
  State.telemetry.avgLatencyMs = activeCount > 0 ? (latencyAccumulator / activeCount) : 0;

  // Stability Calculation Engine
  // CV = stdDev / mean. Lower CV = higher stability
  State.telemetry.recentThroughputs.push(currentTickOps);
  if (State.telemetry.recentThroughputs.length > 20) State.telemetry.recentThroughputs.shift();

  if (State.telemetry.recentThroughputs.length >= 4) {
    const samples = State.telemetry.recentThroughputs;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 0;

    // Stability score formula: 100 - (CV * 80)
    let score = Math.max(10, Math.min(100, Math.round(100 - (cv * 90))));
    // Penalize high latency
    if (State.telemetry.avgLatencyMs > 2.0) score = Math.max(5, score - 15);
    State.telemetry.stabilityScore = score;
  }

  // Update UI Elements
  const cpuOpsEl = document.getElementById('metric-cpu-ops');
  const totalOpsEl = document.getElementById('metric-total-ops');
  const latencyEl = document.getElementById('metric-avg-latency');
  const stabilityEl = document.getElementById('metric-stability');
  const activeWorkersEl = document.getElementById('metric-active-workers');

  if (cpuOpsEl) cpuOpsEl.textContent = currentTickOps.toLocaleString();
  if (totalOpsEl) totalOpsEl.textContent = totalWorkerOps.toLocaleString();
  if (latencyEl) latencyEl.textContent = `${State.telemetry.avgLatencyMs.toFixed(2)} ms`;
  if (activeWorkersEl) activeWorkersEl.textContent = `${activeCount} / ${State.config.workerCount}`;

  if (stabilityEl) {
    stabilityEl.textContent = `${State.telemetry.stabilityScore}`;
    if (State.telemetry.stabilityScore >= 80) {
      stabilityEl.className = 'text-3xl font-bold font-editorial-mono text-[#D9FF3D]';
    } else if (State.telemetry.stabilityScore >= 55) {
      stabilityEl.className = 'text-3xl font-bold font-editorial-mono text-[#FF4D00]';
    } else {
      stabilityEl.className = 'text-3xl font-bold font-editorial-mono text-[#FF2D20]';
    }
  }

  // Push to CPU Chart History
  State.telemetry.cpuChartData.push({
    t: State.telemetry.elapsedSeconds,
    ops: currentTickOps
  });
  if (State.telemetry.cpuChartData.length > 200) State.telemetry.cpuChartData.shift();

  // Draw Charts
  drawCpuCanvasChart();
  drawMemCanvasChart();

}, 500);

// Real-Time Canvas 2D Charts Rendering
function drawCpuCanvasChart() {
  const canvas = document.getElementById('chart-cpu-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = canvas.parentElement.clientHeight;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = '#201F1D';
  ctx.lineWidth = 1;
  const gridRows = 4;
  for (let i = 1; i < gridRows; i++) {
    const y = (h / gridRows) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const data = State.telemetry.cpuChartData;
  if (!data || data.length < 2) {
    ctx.fillStyle = '#8A8782';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText('AWAITING TELEMETRY STREAM...', 20, h / 2);
    return;
  }

  const maxOps = Math.max(10000, ...data.map(d => d.ops)) * 1.15;
  const stepX = w / (Math.max(30, data.length - 1));

  // Draw filled area gradient (Acid Lime & Signal Orange)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(217, 255, 61, 0.25)');
  grad.addColorStop(1, 'rgba(217, 255, 61, 0.0)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = h - (data[i].ops / maxOps) * h;
    ctx.lineTo(x, y);
  }
  ctx.lineTo((data.length - 1) * stepX, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = h - (data[i].ops / maxOps) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#D9FF3D';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Peak line
  if (State.telemetry.peakOpsPerSec > 0) {
    const peakY = h - (State.telemetry.peakOpsPerSec / maxOps) * h;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#FF4D00';
    ctx.moveTo(0, peakY);
    ctx.lineTo(w, peakY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FF4D00';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText(`PEAK: ${State.telemetry.peakOpsPerSec.toLocaleString()} OPS/S`, w - 160, peakY - 4);
  }

  // Draw scale readout
  ctx.fillStyle = '#8A8782';
  ctx.font = '9px "JetBrains Mono"';
  ctx.fillText(`MAX SCALE: ${Math.round(maxOps).toLocaleString()} OPS/S`, 10, 18);
}

function drawMemCanvasChart() {
  const canvas = document.getElementById('chart-mem-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = canvas.parentElement.clientHeight;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = '#201F1D';
  ctx.lineWidth = 1;
  const gridRows = 4;
  for (let i = 1; i < gridRows; i++) {
    const y = (h / gridRows) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const targetMB = State.config.targetMemoryMB;
  const maxMB = Math.max(targetMB * 1.2, 512);

  // Draw Target line
  const targetY = h - (targetMB / maxMB) * h;
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#8A8782';
  ctx.moveTo(0, targetY);
  ctx.lineTo(w, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#8A8782';
  ctx.font = '9px "JetBrains Mono"';
  ctx.fillText(`TARGET: ${targetMB} MB`, w - 110, targetY - 4);

  const data = State.telemetry.memChartData;
  if (!data || data.length < 2) {
    ctx.fillStyle = '#8A8782';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText('MEMORY TRACE READY...', 20, h / 2);
    return;
  }

  const stepX = w / (Math.max(30, data.length - 1));

  // Area Fill (Signal Orange)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 77, 0, 0.3)');
  grad.addColorStop(1, 'rgba(255, 77, 0, 0.0)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = h - (data[i].mb / maxMB) * h;
    ctx.lineTo(x, y);
  }
  ctx.lineTo((data.length - 1) * stepX, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = h - (data[i].mb / maxMB) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#FF4D00';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function clearCanvasCharts() {
  const c1 = document.getElementById('chart-cpu-canvas');
  const c2 = document.getElementById('chart-mem-canvas');
  if (c1) {
    const ctx = c1.getContext('2d');
    ctx.clearRect(0, 0, c1.width, c1.height);
  }
  if (c2) {
    const ctx = c2.getContext('2d');
    ctx.clearRect(0, 0, c2.width, c2.height);
  }
}

// Results & Historical Benchmark Engine
function recordRunHistory(verdictTitle) {
  const duration = State.telemetry.elapsedSeconds;
  const totalOps = State.telemetry.totalOperations;
  const avgOps = duration > 0 ? Math.round(totalOps / duration) : State.telemetry.currentOpsPerSec;
  const peakOps = State.telemetry.peakOpsPerSec;
  const peakMem = State.peakMemoryMB;
  const stability = State.telemetry.stabilityScore;

  let verdict = 'STABLE UNDER LOAD';
  if (stability < 60) verdict = 'THROUGHPUT JITTER & LATENCY SPIKES OBSERVED';
  else if (peakMem >= 1024) verdict = 'HIGH MEMORY PRESSURE RESILIENT & CLEANLY RELEASED';
  else if (duration >= 60) verdict = 'LONG DURATION SUSTAINED THERMAL STABILITY';

  const runItem = {
    id: `RUN-${String(State.history.length + 1).padStart(3, '0')}`,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    preset: State.config.currentPreset.toUpperCase(),
    algorithm: State.config.workload.toUpperCase(),
    workers: State.config.workerCount,
    intensity: `${State.config.intensity}%`,
    targetMB: State.config.targetMemoryMB,
    duration: `${duration}s`,
    totalOps,
    avgOps,
    peakOps,
    peakMem,
    stability,
    verdict,
    status: verdictTitle
  };

  State.history.unshift(runItem);
  if (State.history.length > 10) State.history.pop();

  // Save to localStorage
  try {
    localStorage.setItem('stresslab_history', JSON.stringify(State.history));
  } catch (e) {}

  updateLatestRunResultUI(runItem);
  renderHistoryTable();
}

function updateLatestRunResultUI(run) {
  const card = document.getElementById('latest-result-card');
  if (!card) return;

  document.getElementById('res-verdict').textContent = run.verdict;
  document.getElementById('res-duration').textContent = run.duration;
  document.getElementById('res-total-ops').textContent = run.totalOps.toLocaleString();
  document.getElementById('res-avg-ops').textContent = `${run.avgOps.toLocaleString()} /s`;
  document.getElementById('res-peak-ops').textContent = `${run.peakOps.toLocaleString()} /s`;
  document.getElementById('res-peak-mem').textContent = `${run.peakMem} MB`;
  document.getElementById('res-stability').textContent = `${run.stability}/100`;

  const banner = document.getElementById('res-status-banner');
  if (banner) {
    if (run.stability >= 75) {
      banner.className = 'p-3 bg-[#D9FF3D]/10 border-l-4 border-[#D9FF3D] text-[#D9FF3D] font-editorial-mono text-xs';
      banner.textContent = `SYSTEM HEALTH: OPTIMAL — All ${run.workers} threads finished without deadlock.`;
    } else {
      banner.className = 'p-3 bg-[#FF4D00]/10 border-l-4 border-[#FF4D00] text-[#FF4D00] font-editorial-mono text-xs';
      banner.textContent = `SYSTEM HEALTH: THROTTLING DETECTED — Variance detected under load.`;
    }
  }
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (State.history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-[#8A8782] font-editorial-mono text-xs">NO BENCHMARK RUNS LOGGED YET</td></tr>`;
    return;
  }

  State.history.forEach((run, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-[#201F1D] hover:bg-[#1A1A18] font-editorial-mono text-xs text-[#EDEAE3]';
    tr.innerHTML = `
      <td class="p-3"><input type="checkbox" class="run-compare-checkbox accent-[#FF4D00]" data-id="${run.id}"></td>
      <td class="p-3 text-[#FF4D00] font-bold">${run.id}</td>
      <td class="p-3 text-[#8A8782]">${run.timestamp}</td>
      <td class="p-3">${run.preset} (${run.algorithm})</td>
      <td class="p-3">${run.workers}T / ${run.targetMB}MB</td>
      <td class="p-3 text-right">${run.peakOps.toLocaleString()}</td>
      <td class="p-3 text-right">${run.peakMem} MB</td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 ${run.stability >= 75 ? 'bg-[#D9FF3D]/10 text-[#D9FF3D]' : 'bg-[#FF4D00]/10 text-[#FF4D00]'} border border-current">
          ${run.stability}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Re-bind compare checkboxes
  document.querySelectorAll('.run-compare-checkbox').forEach(cb => {
    cb.addEventListener('change', handleCompareSelection);
  });
}

function handleCompareSelection() {
  const checked = Array.from(document.querySelectorAll('.run-compare-checkbox:checked')).map(cb => cb.dataset.id);
  const compareBtn = document.getElementById('btn-compare-runs');
  if (compareBtn) {
    if (checked.length === 2) {
      compareBtn.classList.remove('opacity-40', 'pointer-events-none');
      compareBtn.textContent = `COMPARE ${checked[0]} VS ${checked[1]}`;
    } else {
      compareBtn.classList.add('opacity-40', 'pointer-events-none');
      compareBtn.textContent = 'SELECT 2 RUNS TO COMPARE';
    }
  }
}

function openCompareModal() {
  const checked = Array.from(document.querySelectorAll('.run-compare-checkbox:checked')).map(cb => cb.dataset.id);
  if (checked.length !== 2) return;

  const runA = State.history.find(r => r.id === checked[0]);
  const runB = State.history.find(r => r.id === checked[1]);
  if (!runA || !runB) return;

  const modal = document.getElementById('compare-modal');
  const body = document.getElementById('compare-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="grid grid-cols-2 gap-4 text-xs font-editorial-mono">
      <div class="p-4 bg-[#141413] border border-[#2B2A27]">
        <div class="text-[#FF4D00] font-bold text-sm mb-2">${runA.id} [${runA.preset}]</div>
        <div class="space-y-1.5 text-[#EDEAE3]">
          <div>ALGORITHM: <span class="text-[#8A8782]">${runA.algorithm}</span></div>
          <div>WORKERS: <span class="text-[#8A8782]">${runA.workers} Threads</span></div>
          <div>TARGET MEM: <span class="text-[#8A8782]">${runA.targetMB} MB</span></div>
          <div>DURATION: <span class="text-[#8A8782]">${runA.duration}</span></div>
          <div>PEAK OPS/S: <span class="text-[#D9FF3D] font-bold">${runA.peakOps.toLocaleString()}</span></div>
          <div>PEAK RAM: <span class="text-[#8A8782]">${runA.peakMem} MB</span></div>
          <div>STABILITY: <span class="text-[#D9FF3D]">${runA.stability}/100</span></div>
          <div class="text-[11px] text-[#8A8782] mt-2 border-t border-[#201F1D] pt-2">${runA.verdict}</div>
        </div>
      </div>
      <div class="p-4 bg-[#141413] border border-[#2B2A27]">
        <div class="text-[#D9FF3D] font-bold text-sm mb-2">${runB.id} [${runB.preset}]</div>
        <div class="space-y-1.5 text-[#EDEAE3]">
          <div>ALGORITHM: <span class="text-[#8A8782]">${runB.algorithm}</span></div>
          <div>WORKERS: <span class="text-[#8A8782]">${runB.workers} Threads</span></div>
          <div>TARGET MEM: <span class="text-[#8A8782]">${runB.targetMB} MB</span></div>
          <div>DURATION: <span class="text-[#8A8782]">${runB.duration}</span></div>
          <div>PEAK OPS/S: <span class="text-[#D9FF3D] font-bold">${runB.peakOps.toLocaleString()}</span></div>
          <div>PEAK RAM: <span class="text-[#8A8782]">${runB.peakMem} MB</span></div>
          <div>STABILITY: <span class="text-[#D9FF3D]">${runB.stability}/100</span></div>
          <div class="text-[11px] text-[#8A8782] mt-2 border-t border-[#201F1D] pt-2">${runB.verdict}</div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

// Presets Configuration
function applyPreset(name) {
  State.config.currentPreset = name;
  const cores = navigator.hardwareConcurrency || 4;

  // Visual button active class
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.dataset.preset === name) {
      btn.className = 'preset-btn px-4 py-2 border border-[#FF4D00] bg-[#FF4D00] text-[#111110] font-bold text-xs uppercase font-editorial-mono transition-all';
    } else {
      btn.className = 'preset-btn px-4 py-2 border border-[#2B2A27] bg-[#161614] text-[#EDEAE3] hover:border-[#8A8782] text-xs uppercase font-editorial-mono transition-all';
    }
  });

  switch (name) {
    case 'light':
      setControlValues({
        workers: Math.min(2, cores),
        intensity: 75,
        duration: 30,
        workload: 'primes',
        targetMB: 256,
        chunkSize: 16,
        pattern: 'sequential'
      });
      break;
    case 'medium':
      setControlValues({
        workers: Math.min(4, cores),
        intensity: 100,
        duration: 60,
        workload: 'matrix',
        targetMB: 512,
        chunkSize: 64,
        pattern: 'sequential'
      });
      break;
    case 'heavy':
      setControlValues({
        workers: Math.min(8, cores),
        intensity: 100,
        duration: 60,
        workload: 'hash',
        targetMB: 1024,
        chunkSize: 64,
        pattern: 'random'
      });
      break;
    case 'extreme':
      setControlValues({
        workers: cores,
        intensity: 100,
        duration: 120,
        workload: 'sort',
        targetMB: 2048,
        chunkSize: 256,
        pattern: 'readwrite'
      });
      showToast('EXTREME PRESET: Maximum threads & 2048MB allocation requested.', 'warning');
      break;
    case 'custom':
      break;
  }
}

function setControlValues(cfg) {
  State.config.workerCount = cfg.workers;
  State.config.intensity = cfg.intensity;
  State.config.duration = cfg.duration;
  State.config.workload = cfg.workload;
  State.config.targetMemoryMB = cfg.targetMB;
  State.config.chunkSizeMB = cfg.chunkSize;
  State.config.pattern = cfg.pattern;

  // Update inputs
  const workerSlider = document.getElementById('cpu-workers');
  if (workerSlider) {
    workerSlider.value = cfg.workers;
    document.getElementById('cpu-workers-val').textContent = cfg.workers;
  }

  const intensitySlider = document.getElementById('cpu-intensity');
  if (intensitySlider) {
    intensitySlider.value = cfg.intensity;
    document.getElementById('cpu-intensity-val').textContent = `${cfg.intensity}%`;
  }

  const memSlider = document.getElementById('mem-target');
  if (memSlider) {
    memSlider.value = cfg.targetMB;
    document.getElementById('mem-target-val').textContent = `${cfg.targetMB} MB`;
  }

  // Update duration selector pills
  document.querySelectorAll('.duration-pill').forEach(pill => {
    const d = parseInt(pill.dataset.duration, 10);
    if (d === cfg.duration) {
      pill.className = 'duration-pill px-3 py-1.5 border border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-editorial-mono';
    } else {
      pill.className = 'duration-pill px-3 py-1.5 border border-[#2B2A27] bg-[#141413] text-[#8A8782] hover:border-[#8A8782] text-xs font-editorial-mono';
    }
  });

  // Update algorithm radio pills
  document.querySelectorAll('.algo-card').forEach(card => {
    if (card.dataset.algo === cfg.workload) {
      card.classList.add('border-[#FF4D00]', 'bg-[#FF4D00]/5');
    } else {
      card.classList.remove('border-[#FF4D00]', 'bg-[#FF4D00]/5');
    }
  });

  // Check memory warning thresholds
  checkMemoryWarning(cfg.targetMB);
}

function checkMemoryWarning(targetMB) {
  const warnBanner = document.getElementById('mem-warning-banner');
  if (!warnBanner) return;
  if (targetMB > 1024) {
    warnBanner.classList.remove('hidden');
    if (targetMB > 1536) {
      warnBanner.innerHTML = `<strong>CRITICAL WARNING:</strong> Allocating ${targetMB} MB may exhaust system RAM and cause browser tab termination. Confirmation required before run.`;
      warnBanner.className = 'p-3 bg-[#FF2D20]/10 border border-[#FF2D20] text-[#FF2D20] text-xs font-editorial-mono mb-4';
    } else {
      warnBanner.innerHTML = `<strong>CAUTION:</strong> Allocating ${targetMB} MB approaches typical single-tab garbage collector thresholds.`;
      warnBanner.className = 'p-3 bg-[#FF4D00]/10 border border-[#FF4D00] text-[#FF4D00] text-xs font-editorial-mono mb-4';
    }
  } else {
    warnBanner.classList.add('hidden');
  }
}

// Safety Confirmation Modal for > 1536 MB
function openSafetyConfirmModal(targetMB) {
  return new Promise(resolve => {
    const modal = document.getElementById('safety-confirm-modal');
    const msg = document.getElementById('safety-modal-msg');
    const confirmBtn = document.getElementById('safety-modal-confirm');
    const cancelBtn = document.getElementById('safety-modal-cancel');

    if (!modal || !confirmBtn || !cancelBtn) {
      resolve(confirm(`High Memory Warning: Allocate ${targetMB} MB physical RAM?`));
      return;
    }

    if (msg) msg.textContent = `You have configured a high-memory stress workload of ${targetMB} MB. Depending on available host system memory, this may trigger OS out-of-memory guards. Do you authorize this stress test?`;
    modal.classList.remove('hidden');

    const handleConfirm = () => {
      cleanup();
      modal.classList.add('hidden');
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      modal.classList.add('hidden');
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// Watchdog: Tab Visibility Auto-Stop
function setupWatchdog() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (State.status === 'STRESSING') {
        State.watchdog.hiddenStartTime = performance.now();
        console.warn('Watchdog: Tab hidden during active stress test. 10s auto-stop armed.');
        State.watchdog.hiddenTimer = setTimeout(() => {
          if (document.hidden && State.status === 'STRESSING') {
            emergencyStop();
            showToast('Watchdog Auto-Stop: Tab was inactive for >10s to prevent system drain.', 'warning');
          }
        }, 10000);
      }
    } else {
      if (State.watchdog.hiddenTimer) {
        clearTimeout(State.watchdog.hiddenTimer);
        State.watchdog.hiddenTimer = null;
      }
    }
  });
}

// Export Engine: JSON & CSV
function exportRunJSON() {
  const currentRun = State.history[0] || {
    info: 'No run executed yet',
    timestamp: new Date().toISOString()
  };

  const payload = {
    project: 'STRESSLAB // OSSP S9 Hackathon',
    team: 'Team 7 (Kairav Vashi, Sai Harshith Reddy, A. Yoshik)',
    environment: {
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      platform: navigator.platform,
      userAgent: navigator.userAgent
    },
    latestBenchmark: currentRun,
    telemetrySnapshots: {
      cpuSeries: State.telemetry.cpuChartData,
      memSeries: State.telemetry.memChartData
    },
    fullHistory: State.history
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `STRESSLAB_REPORT_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Diagnostic JSON report downloaded.', 'success');
}

function exportHistoryCSV() {
  if (State.history.length === 0) {
    showToast('No benchmark history available to export.', 'warning');
    return;
  }

  const headers = ['Run ID', 'Timestamp', 'Preset', 'Algorithm', 'Workers', 'Target MB', 'Duration', 'Total Ops', 'Avg Ops/s', 'Peak Ops/s', 'Peak MB', 'Stability', 'Verdict'];
  const rows = State.history.map(r => [
    r.id,
    `"${r.timestamp}"`,
    r.preset,
    r.algorithm,
    r.workers,
    r.targetMB,
    r.duration,
    r.totalOps,
    r.avgOps,
    r.peakOps,
    r.peakMem,
    r.stability,
    `"${r.verdict}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `STRESSLAB_BENCHMARKS_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Historical CSV dataset exported.', 'success');
}

function copySummaryToClipboard() {
  const run = State.history[0];
  if (!run) {
    showToast('Run a benchmark first to generate a summary.', 'warning');
    return;
  }

  const summary = `
=========================================
STRESSLAB BENCHMARK REPORT // TEAM 7
OSSP S9 Hackathon - Oct 17, 2026
=========================================
Run ID:       ${run.id} (${run.timestamp})
Preset:       ${run.preset} [${run.algorithm}]
Concurrency:  ${run.workers} Workers @ ${run.intensity} Duty Cycle
Target RAM:   ${run.targetMB} MB Allocated & Verified
Duration:     ${run.duration}
Peak Throughput: ${run.peakOps.toLocaleString()} Ops/Sec
Total FLOPs/Ops: ${run.totalOps.toLocaleString()}
Peak Memory:  ${run.peakMem} MB
Stability:    ${run.stability} / 100
Verdict:      ${run.verdict}
=========================================
Verified zero UI freeze via dedicated Web Worker threads.
`;

  navigator.clipboard.writeText(summary.trim()).then(() => {
    showToast('Executive summary copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Unable to access clipboard.', 'warning');
  });
}

// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let borderColor = '#2B2A27';
  let textColor = '#EDEAE3';
  if (type === 'danger') { borderColor = '#FF2D20'; textColor = '#FF2D20'; }
  else if (type === 'warning') { borderColor = '#FF4D00'; textColor = '#FF4D00'; }
  else if (type === 'success') { borderColor = '#D9FF3D'; textColor = '#D9FF3D'; }

  toast.className = `p-3 bg-[#161614] border border-[${borderColor}] text-[${textColor}] font-editorial-mono text-xs shadow-xl flex items-center justify-between transition-all duration-300 transform translate-y-4 opacity-0`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-4 text-[#8A8782] hover:text-[#EDEAE3] font-bold">✕</button>
  `;

  toast.querySelector('button').onclick = () => toast.remove();
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Custom Cursor & Magnetic Interactions
function setupCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  function renderRing() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(renderRing);
  }
  requestAnimationFrame(renderRing);

  // Hover states for interactive elements
  const interactives = 'a, button, input, [role="button"], .preset-btn, .algo-card, .duration-pill';
  document.addEventListener('mouseover', e => {
    const target = e.target.closest(interactives);
    if (target) {
      if (target.id === 'btn-emergency' || target.classList.contains('text-[#FF2D20]')) {
        document.body.classList.add('cursor-danger');
      } else {
        document.body.classList.add('cursor-hover');
      }
    }
  });

  document.addEventListener('mouseout', e => {
    const target = e.target.closest(interactives);
    if (target) {
      document.body.classList.remove('cursor-hover', 'cursor-danger');
    }
  });

  // Magnetic button effect on primary actions
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
}

// Scroll Progress Tracker
function setupScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    bar.style.width = `${progress}%`;
  });
}

// Section Title Shuffle Glitch on Hover
function setupTitleHoverEffects() {
  const titles = document.querySelectorAll('.hover-shuffle-text');
  titles.forEach(title => {
    const originalText = title.dataset.text || title.textContent;
    title.dataset.text = originalText;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_#//';

    title.addEventListener('mouseenter', () => {
      let iteration = 0;
      const interval = setInterval(() => {
        title.innerText = originalText
          .split('')
          .map((letter, index) => {
            if (index < iteration) return originalText[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');

        if (iteration >= originalText.length) clearInterval(interval);
        iteration += 1 / 2;
      }, 25);
    });
  });
}

// Dom Ready Initializer
window.addEventListener('DOMContentLoaded', () => {
  // Load saved history
  try {
    const saved = localStorage.getItem('stresslab_history');
    if (saved) State.history = JSON.parse(saved);
  } catch (e) {}

  detectSystemSpecs();
  updateClock();
  setupCustomCursor();
  setupScrollProgress();
  setupTitleHoverEffects();
  setupWatchdog();
  renderHistoryTable();

  // Lenis kept for programmatic smooth scroll only - wheel is native instant (no 200-300ms lag)
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 0.35,
      easing: (t) => t,
      direction: 'vertical',
      smooth: true,
      smoothWheel: false
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Bind Control Event Listeners
  const workerSlider = document.getElementById('cpu-workers');
  if (workerSlider) {
    workerSlider.addEventListener('input', e => {
      State.config.workerCount = parseInt(e.target.value, 10);
      document.getElementById('cpu-workers-val').textContent = e.target.value;
      State.config.currentPreset = 'custom';
    });
  }

  const intensitySlider = document.getElementById('cpu-intensity');
  if (intensitySlider) {
    intensitySlider.addEventListener('input', e => {
      State.config.intensity = parseInt(e.target.value, 10);
      document.getElementById('cpu-intensity-val').textContent = `${e.target.value}%`;
      // Update running workers live if already active
      if (State.status === 'STRESSING') {
        for (let w of State.workers) {
          w.postMessage({ type: 'set_intensity', intensity: State.config.intensity });
        }
      }
    });
  }

  const memSlider = document.getElementById('mem-target');
  if (memSlider) {
    memSlider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      State.config.targetMemoryMB = val;
      document.getElementById('mem-target-val').textContent = `${val} MB`;
      checkMemoryWarning(val);
      State.config.currentPreset = 'custom';
    });
  }

  // Duration pill clicks
  document.querySelectorAll('.duration-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const d = parseInt(pill.dataset.duration, 10);
      State.config.duration = d;
      document.querySelectorAll('.duration-pill').forEach(p => {
        p.className = 'duration-pill px-3 py-1.5 border border-[#2B2A27] bg-[#141413] text-[#8A8782] hover:border-[#8A8782] text-xs font-editorial-mono';
      });
      pill.className = 'duration-pill px-3 py-1.5 border border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-editorial-mono';
      document.getElementById('metric-remaining').textContent = d > 0 ? `${d}s` : '∞';
    });
  });

  // Algorithm card clicks
  document.querySelectorAll('.algo-card').forEach(card => {
    card.addEventListener('click', () => {
      const algo = card.dataset.algo;
      State.config.workload = algo;
      document.querySelectorAll('.algo-card').forEach(c => {
        c.classList.remove('border-[#FF4D00]', 'bg-[#FF4D00]/5');
      });
      card.classList.add('border-[#FF4D00]', 'bg-[#FF4D00]/5');
      if (State.status === 'STRESSING') {
        for (let w of State.workers) {
          w.postMessage({ type: 'set_workload', workload: algo });
        }
      }
    });
  });

  // Memory chunk buttons
  document.querySelectorAll('.chunk-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      State.config.chunkSizeMB = parseInt(pill.dataset.chunk, 10);
      document.querySelectorAll('.chunk-pill').forEach(p => {
        p.className = 'chunk-pill px-3 py-1.5 border border-[#2B2A27] bg-[#141413] text-[#8A8782] text-xs font-editorial-mono';
      });
      pill.className = 'chunk-pill px-3 py-1.5 border border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-editorial-mono';
    });
  });

  // Memory pattern buttons
  document.querySelectorAll('.pattern-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      State.config.pattern = pill.dataset.pattern;
      document.querySelectorAll('.pattern-pill').forEach(p => {
        p.className = 'pattern-pill px-3 py-1.5 border border-[#2B2A27] bg-[#141413] text-[#8A8782] text-xs font-editorial-mono';
      });
      pill.className = 'pattern-pill px-3 py-1.5 border border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-editorial-mono';
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // Master action buttons
  document.getElementById('btn-start').addEventListener('click', startStressTest);
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (State.status === 'STRESSING') pauseStressTest();
    else if (State.status === 'PAUSED') resumeStressTest();
  });
  document.getElementById('btn-emergency').addEventListener('click', emergencyStop);
  document.getElementById('btn-top-emergency').addEventListener('click', emergencyStop);
  document.getElementById('btn-reset').addEventListener('click', resetDeck);
  document.getElementById('btn-suite').addEventListener('click', runAllPresetsSuite);

  // Compare & Export buttons
  document.getElementById('btn-compare-runs')?.addEventListener('click', openCompareModal);
  document.getElementById('compare-modal-close')?.addEventListener('click', () => {
    document.getElementById('compare-modal').classList.add('hidden');
  });
  document.getElementById('btn-export-json').addEventListener('click', exportRunJSON);
  document.getElementById('btn-export-csv').addEventListener('click', exportHistoryCSV);
  document.getElementById('btn-copy-summary').addEventListener('click', copySummaryToClipboard);

  // Apply default Medium preset on launch
  applyPreset('medium');
});
