/**
 * STRESSLAB // Concurrency Worker Script
 * OSSP S9 Hackathon - Team 7
 * CPU Stress Test Kernel & Workload Implementations
 */

let isRunning = false;
let isPaused = false;
let currentWorkload = 'primes';
let intensity = 100; // 10% to 100%
let workerId = 0;
let totalOperations = 0;
let windowOperations = 0;
let windowLatencyAccumulator = 0;
let lastTickTime = performance.now();
let tickInterval = null;

// Workload 1: Prime Search via trial division across shifting search windows
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
      if (n % d === 0) {
        isPrime = false;
        break;
      }
    }
    ops++;
  }
  const duration = performance.now() - start;
  return { ops, duration };
}

// Workload 2: Matrix Multiplication (Float64 cache pressure and FPU arithmetic)
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
    // Perturb seed slightly to prevent dead-code elimination
    matA[b % matA.length] += matC[0] * 0.000001;
    ops += (MATRIX_SIZE * MATRIX_SIZE * MATRIX_SIZE * 2); // FLOPs representation
  }
  const duration = performance.now() - start;
  return { ops, duration };
}

// Workload 3: Cryptographic Bitwise Hash Loop (Simulated SHA-256 compression function)
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
    ops += 64; // Hash rounds completed
  }
  const duration = performance.now() - start;
  return { ops, duration };
}

// Workload 4: Sort + Binary Search (L1/L2/L3 Cache Miss & Branch Latency Stress)
const SORT_ARRAY_SIZE = 1024;
const sortBuffer = new Float64Array(SORT_ARRAY_SIZE);

function runSortWorkload(batchSize = 25) {
  let ops = 0;
  const start = performance.now();
  for (let b = 0; b < batchSize; b++) {
    // Populate pseudo-random values
    for (let i = 0; i < SORT_ARRAY_SIZE; i++) {
      sortBuffer[i] = Math.sin(b + i) * 10000.0;
    }
    // Quicksort Float64Array
    sortBuffer.sort();
    // 64 Binary searches to exercise branch mispredicts
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
  const duration = performance.now() - start;
  return { ops: Math.round(ops), duration };
}

// Workload Execution Dispatcher
function executeBatch() {
  switch (currentWorkload) {
    case 'primes':
      return runPrimeWorkload(300);
    case 'matrix':
      return runMatrixWorkload(4);
    case 'hash':
      return runHashWorkload(350);
    case 'sort':
      return runSortWorkload(20);
    default:
      return runPrimeWorkload(250);
  }
}

// Duty Cycle Execution Loop
// Intensity maps 10% to 100%:
// Slice window = 40ms. If intensity = 80%, work for 32ms, sleep for 8ms.
function loop() {
  if (!isRunning || isPaused) return;

  const cycleDuration = 40; // ms
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
    // Zero-delay loop via postMessage / Promise or microtask
    if (typeof queueMicrotask === 'function' && intensity >= 99) {
      queueMicrotask(loop);
    } else {
      setTimeout(loop, 0);
    }
  }
}

// Emit telemetry every 500ms
function startTelemetry() {
  if (tickInterval) clearInterval(tickInterval);
  lastTickTime = performance.now();

  tickInterval = setInterval(() => {
    if (!isRunning) return;
    const now = performance.now();
    const dt = (now - lastTickTime) / 1000; // in seconds
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

// Message Dispatcher
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
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      self.postMessage({
        type: 'stopped',
        workerId,
        finalOps: totalOperations
      });
      break;
  }
};
