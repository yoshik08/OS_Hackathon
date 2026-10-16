# STRESSLAB // Controlled CPU & Memory Stress Testing Suite
### OSSP S9 Hackathon — October 17, 2026
**Assigned Topic:** CPU and Memory Stress Testing Tool  
**Problem Statement:** Build a controlled workload generator that stresses CPU and memory and measures system performance under different loads.

---

## 👥 Team 07 Identification & Roles

| Member Name | Student Roll No | Hackathon Engineering Role | Live Demo Speaking Specialty |
| :--- | :--- | :--- | :--- |
| **Kairav Vashi** | `2520030582` | **Systems Architecture & Worker Concurrency** | Dedicated Web Workers, multi-threaded CPU saturation, duty-cycle intensity throttling, and compute algorithms. |
| **Sai Harshith Reddy** | `2520030375` | **Memory Virtualization & Safety Protocols** | Demand-paged TypedArray allocations, 4KB page touching, deterministic memory release (0 MB proof), and emergency halt interlocks. |
| **A. Yoshik** | `2520030574` | **Telemetry Engine, Visualizations & UX Architecture** | Real-time 500ms sampling, Canvas 2D oscilloscopes, mathematical Stability Scoring ($CV$-based), benchmark exports, and lab UI design. |

---

## 🔬 System Architecture & Engineering Principles

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MAIN BROWSER UI THREAD (Always 60 FPS — Zero Freezing, Dedicated Event Loop)                     │
│  [Control Deck] ──> [State Manager] ──> [2x Canvas 2D Oscilloscopes] ──> [Safety Watchdog Bus]  │
└────────────────┬───────────────────────────────────────┬─────────────────────────────────────────┘
                 │ postMessage({type: 'start'})          │ new ArrayBuffer(chunkSize)
                 ▼                                       ▼
┌──────────────────────────────────────┐   ┌───────────────────────────────────────────────────────┐
│ WEB WORKER KERNEL POOL (1..N Cores)  │   │ PHYSICAL MEMORY SATURATION ENGINE                     │
│  ├── Core 1: Prime Sieve Loop        │   │  ├── Sequential / Random / R-W Mixed Paging           │
│  ├── Core 2: Float64 Tensor Multiply │   │  ├── 4KB Page Boundary Touch (view[i += 4096] = byte) │
│  ├── Core 3: SHA-256 Bitwise Digest  │   │  ├── Stepwise Heap Projection                         │
│  └── Core N: Quicksort & Branch Probes│  │  └── Deterministic Deallocation (buffer = null; 0MB)  │
└────────────────┬─────────────────────┘   └───────────────────────────────────────────────────────┘
                 │ postMessage({type: 'tick', ops, latency}) @ 500ms
                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TELEMETRY & STABILITY ENGINE: S = 100 - (CV(Throughput) * 90) - LatencyPenalties                 │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10-Line Technical Architecture Summary
1. **Isolated Concurrency:** Heavy computation is completely offloaded from the browser's main UI thread to dedicated Web Workers running on separate OS kernel threads.
2. **Zero-CORS Blob URL Loading:** Workers are instantiated using in-memory Blob URLs, allowing the entire suite to run directly via double-clicking `index.html` (`file:///`) or over standard HTTP servers without origin security restrictions.
3. **Time-Sliced Duty-Cycle Throttling:** Concurrency intensity (10% to 100%) is achieved by time-slicing execution windows (e.g., 40ms intervals with proportional micro-sleeps) to accurately throttle core power and heat.
4. **Microarchitectural Algorithmic Stress:** Features 4 compute kernels: Integer ALU prime sieve, Float64 tensor matrix multiplication, bitwise SHA-256 compression rounds, and L1/L2/L3 cache-miss-heavy quicksorting.
5. **Demand-Paged Memory Pressure:** Bypasses virtual memory lazy copy-on-write zero-page optimizations by touching every 4096-byte memory page, forcing the OS kernel to commit real physical RAM frames.
6. **Configurable Allocation Patterns:** Supports Sequential writes, Random scatter paging, and Read-Write verification loops across 16MB, 64MB, or 256MB chunks up to 2048MB.
7. **Deterministic Zero-Leak Release:** On test completion or manual stop, all ArrayBuffer references are explicitly set to null and truncated, immediately freeing memory and proving 0 MB retention.
8. **Real-Time 500ms Instrumentation:** Gathers live throughput, cumulative operations, latency per cycle, and memory growth without synthetic interpolation.
9. **Empirical Stability Index:** Formulates an algorithmic stability score ($0-100$) based on the statistical Coefficient of Variation ($CV = \sigma / \mu$) of operations/second and latency spikes.
10. **Triple-Layer Safety Interlocks:** Incorporates hard allocation caps, mandatory confirmation modals for $>1536$ MB, a 10s tab-inactivity watchdog, and an instant Emergency Stop bus that terminates all threads and releases memory in under 5ms.

---

## 🎨 Design System & UI/UX Concept

Unlike standard "AI slop" or generic SaaS dashboard templates characterized by purple/blue gradients and bloated card grids, **STRESSLAB** is styled as a **high-precision dark scientific laboratory instrument**. It uses a purposeful high-contrast palette: **Paper Off-White (`#EDEAE3`)**, **Deep Ink Black (`#111110`)**, **Signal Orange (`#FF4D00`)**, and **Acid Lime (`#D9FF3D`)**. 

Typography pairs massive editorial bold serif headlines (**Fraunces**) with technical body sans (**Space Grotesk**) and tabular monospaced readouts (**JetBrains Mono**). The interface incorporates brutalist chamfered borders, graph paper millimeter grid overlays, subtle grain noise (`feTurbulence`), dual 60 FPS Canvas 2D oscilloscopes, an interactive magnetic custom cursor, and smooth inertia scrolling via Lenis.

---

## 🚀 Execution & Setup Instructions

### Zero Dependencies — No Build Step Required
STRESSLAB requires **no npm install**, **no node build**, and **no external compilation**.

#### Option A: Direct Browser Launch (Fastest)
1. Navigate to the project directory.
2. Double-click [index.html](file:///c:/os/index.html) or right-click &rarr; *Open With* &rarr; Google Chrome / Microsoft Edge / Brave / Firefox.
3. The application will initialize immediately with full hardware detection.

#### Option B: Local HTTP Server (Optional)
If running inside a developer sandbox:
```bash
# Using Python
python -m http.server 8000

# Or using Node
npx serve .
```
Open `http://localhost:8000` in your browser.

---

## 🧪 Standardized Test Scenarios for Demonstration

| Scenario | Concurrency | Target RAM | Duration | Primary Vector | Expected Result & Judge Checkpoint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01. Light** | 2 Workers | 256 MB | 30s | Prime Search (ALU) | Linear throughput, ~95-100 stability score, 0 dropped frames. |
| **02. Medium** | 4 Workers | 512 MB | 60s | Matrix Mult (FPU) | Moderate saturation, smooth step memory curve, consistent throughput. |
| **03. Heavy** | 8 Workers | 1024 MB | 60s | SHA-256 Loop | High CPU utilization, audible cooling fan spin-up, stability ~75-85. |
| **04. Extreme** | Max Cores | 2048 MB | 120s | Sort + Search | Triggers safety confirmation modal; tests physical RAM compression limits. |
| **05. Safety Halt** | 8 Workers | 1024 MB | 60s | Emergency Stop | Press "Emergency Stop" mid-run; all workers terminate instantly, RAM drops to 0 MB immediately. |

---

## 🛡️ Responsible Implementation & Safety Measures
- **Sandboxed Execution:** Confined strictly within browser process boundaries. No privileged kernel drivers or system-wide disruption.
- **Hardware Concurrency Caps:** Thread counts dynamically clamped to `navigator.hardwareConcurrency`.
- **Memory Safeguards:** Memory slider displays warning at 1024 MB and locks behind an explicit confirmation dialog above 1536 MB.
- **Tab Inactivity Watchdog:** Uses the Page Visibility API (`document.visibilityState`); if the tab is hidden for $>10$ seconds during an active test, workloads are automatically halted.
- **Instant Emergency Stop:** Decoupled master halt button issues synchronous `.terminate()` calls to all workers and severs buffer pointers within 5ms.

---

## 📊 Export Formats
1. **JSON Diagnostic Report:** Complete time-series data points of both CPU throughput and memory allocation, system hardware parameters, and stability indices.
2. **CSV History Matrix:** Columnar table of all historical runs for spreadsheet and statistical evaluation.
3. **Markdown Executive Summary:** Quick copy-to-clipboard format for documentation and presentation slides.
