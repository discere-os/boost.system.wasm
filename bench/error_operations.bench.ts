/**
 * Performance benchmarks for Boost.System WASM error operations
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

import BoostSystem, { ErrorCategory } from "../src/lib/index.ts"

let system: BoostSystem

// Setup before benchmarks
await (async () => {
  system = new BoostSystem({ simdOptimizations: true })
  await system.initialize()
})()

// Benchmark data
const smallArray = Array.from({ length: 100 }, (_, i) => i)
const mediumArray = Array.from({ length: 1000 }, (_, i) => i)
const largeArray = Array.from({ length: 10000 }, (_, i) => i)

const targetArray = Array.from({ length: 1000 }, (_, i) => i + 1)

Deno.bench("Error code creation (single)", () => {
  system.createErrorCode(404, ErrorCategory.Network)
})

Deno.bench("Error code creation (bulk - 100 items)", () => {
  system.createErrorCodesBulk(smallArray, ErrorCategory.System)
})

Deno.bench("Error code creation (bulk - 1000 items)", () => {
  system.createErrorCodesBulk(mediumArray, ErrorCategory.System)
})

Deno.bench("Error code comparison (scalar - 100 pairs)", () => {
  system.compareErrorCodesBulk(smallArray, smallArray, { enableSIMD: false })
})

Deno.bench("Error code comparison (SIMD - 100 pairs)", () => {
  system.compareErrorCodesBulk(smallArray, smallArray, { enableSIMD: true })
})

Deno.bench("Error code comparison (scalar - 1000 pairs)", () => {
  system.compareErrorCodesBulk(mediumArray, targetArray, { enableSIMD: false })
})

Deno.bench("Error code comparison (SIMD - 1000 pairs)", () => {
  system.compareErrorCodesBulk(mediumArray, targetArray, { enableSIMD: true })
})

Deno.bench("Error code comparison (SIMD - 10000 pairs)", () => {
  system.compareErrorCodesBulk(largeArray, largeArray, { enableSIMD: true })
})

Deno.bench("Error code validation (100 items)", () => {
  system.validateErrorCodes(smallArray, 0, 999)
})

Deno.bench("Error code validation (1000 items)", () => {
  system.validateErrorCodes(mediumArray, 0, 999)
})

Deno.bench("Error code validation (10000 items)", () => {
  system.validateErrorCodes(largeArray, 0, 999)
})

Deno.bench("Error code search (linear - 100 items)", () => {
  system.findErrorCode(smallArray, 50)
})

Deno.bench("Error code search (SIMD - 1000 items)", () => {
  system.findErrorCode(mediumArray, 500)
})

Deno.bench("Error code search (SIMD - 10000 items)", () => {
  system.findErrorCode(largeArray, 5000)
})

Deno.bench("Result pattern creation (success)", () => {
  system.createResult("success")
})

Deno.bench("Result pattern creation (error)", () => {
  const errorCode = system.createErrorCode(500, ErrorCategory.System)
  system.createResult(undefined, errorCode)
})

Deno.bench("SystemError creation", () => {
  const errorCode = system.createErrorCode(403, ErrorCategory.Network)
  system.createSystemError(errorCode)
})

Deno.bench("Error statistics calculation (100 errors)", () => {
  const errors = system.createErrorCodesBulk(smallArray, ErrorCategory.System)
  system.getErrorStats(errors)
})

Deno.bench("Error statistics calculation (1000 errors)", () => {
  const errors = system.createErrorCodesBulk(mediumArray, ErrorCategory.System)
  system.getErrorStats(errors)
})

Deno.bench("Memory statistics retrieval", () => {
  system.getMemoryStats()
})

Deno.bench("SIMD metrics retrieval", () => {
  system.getSIMDMetrics()
})

// Stress test: Mixed operations
Deno.bench("Mixed operations stress test", () => {
  // Create various error codes
  const errors = system.createErrorCodesBulk([404, 500, 403, 502], ErrorCategory.Network)

  // Compare some codes
  system.compareErrorCodes(errors[0], errors[1])

  // Validate a range
  system.validateErrorCodes([404, 500, 403], 400, 600)

  // Search for a code
  system.findErrorCode([404, 500, 403], 500)

  // Create result patterns
  system.createResult("success")
  system.createResult(undefined, errors[0])

  // Get statistics
  system.getErrorStats(errors)
})

// Performance comparison: SIMD vs Scalar
Deno.bench("Performance comparison - SIMD enabled", () => {
  const codes1 = Array.from({ length: 1000 }, (_, i) => i)
  const codes2 = Array.from({ length: 1000 }, (_, i) => i % 100)

  system.compareErrorCodesBulk(codes1, codes2, { enableSIMD: true })
})

Deno.bench("Performance comparison - SIMD disabled", () => {
  const codes1 = Array.from({ length: 1000 }, (_, i) => i)
  const codes2 = Array.from({ length: 1000 }, (_, i) => i % 100)

  system.compareErrorCodesBulk(codes1, codes2, { enableSIMD: false })
})

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  system?.cleanup()
})