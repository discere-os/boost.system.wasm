/**
 * Basic functionality tests for Boost.System WASM
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

import { assert, assertEquals, assertExists, assertThrows } from "@std/assert"
import BoostSystem, { ErrorCategory, SystemError } from "../../src/lib/index.ts"

Deno.test("BoostSystem initialization", async () => {
  const system = new BoostSystem()
  await system.initialize()

  assertExists(system)
  assert(system.isInitialized())

  system.cleanup()
})

Deno.test("Error code creation", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const errorCode = system.createErrorCode(404, ErrorCategory.Network)

  assertEquals(errorCode.value, 404)
  assertEquals(errorCode.category, ErrorCategory.Network)
  assertEquals(errorCode.categoryName, "Network")
  assertExists(errorCode.message)
  assert(errorCode.message.length > 0)

  system.cleanup()
})

Deno.test("Error code comparison", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const code1 = system.createErrorCode(100, ErrorCategory.System)
  const code2 = system.createErrorCode(100, ErrorCategory.System)
  const code3 = system.createErrorCode(200, ErrorCategory.System)

  const comparison1 = system.compareErrorCodes(code1, code2)
  const comparison2 = system.compareErrorCodes(code1, code3)

  // Same codes should be equal
  assert(comparison1.equal)
  assertEquals(comparison1.valueDifference, 0)
  assert(comparison1.categoryMatch)

  // Different codes should not be equal
  assert(!comparison2.equal)
  assertEquals(comparison2.valueDifference, 100)
  assert(comparison2.categoryMatch)

  system.cleanup()
})

Deno.test("Bulk error code creation", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const values = [404, 500, 503, 403]
  const errors = system.createErrorCodesBulk(values, ErrorCategory.Network)

  assertEquals(errors.length, 4)

  errors.forEach((error, i) => {
    assertEquals(error.value, values[i])
    assertEquals(error.category, ErrorCategory.Network)
    assertEquals(error.categoryName, "Network")
    assertExists(error.message)
  })

  system.cleanup()
})

Deno.test("Bulk error code comparison", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const codes1 = [1, 2, 3, 4, 5]
  const codes2 = [1, 2, 9, 4, 5]

  const result = system.compareErrorCodesBulk(codes1, codes2)

  assertEquals(result.results.length, 5)
  assert(result.results[0]) // 1 == 1
  assert(result.results[1]) // 2 == 2
  assert(!result.results[2]) // 3 != 9
  assert(result.results[3]) // 4 == 4
  assert(result.results[4]) // 5 == 5

  assertEquals(result.stats.processed, 5)
  assertEquals(result.stats.successful, 5)
  assertEquals(result.stats.failed, 0)
  assert(result.stats.processingTimeMs >= 0)

  system.cleanup()
})

Deno.test("Error code validation", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const codes = [10, 50, 150, -5, 1001]
  const results = system.validateErrorCodes(codes, 0, 1000)

  assertEquals(results.length, 5)
  assert(results[0]) // 10 is valid
  assert(results[1]) // 50 is valid
  assert(results[2]) // 150 is valid
  assert(!results[3]) // -5 is invalid
  assert(!results[4]) // 1001 is invalid

  system.cleanup()
})

Deno.test("Error code search", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const codes = [10, 20, 30, 40, 50]
  const foundIndex = system.findErrorCode(codes, 30)
  const notFoundIndex = system.findErrorCode(codes, 99)

  assertEquals(foundIndex, 2)
  assertEquals(notFoundIndex, -1)

  system.cleanup()
})

Deno.test("Result pattern", async () => {
  const system = new BoostSystem()
  await system.initialize()

  // Successful result
  const successResult = system.createResult("success value")
  assert(successResult.success)
  assertEquals(successResult.value, "success value")
  assertEquals(successResult.error, undefined)

  // Error result
  const errorCode = system.createErrorCode(500, ErrorCategory.System)
  const errorResult = system.createResult<string>(undefined, errorCode)
  assert(!errorResult.success)
  assertEquals(errorResult.value, undefined)
  assertExists(errorResult.error)
  assertEquals(errorResult.error.value, 500)

  system.cleanup()
})

Deno.test("SystemError creation and throwing", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const errorCode = system.createErrorCode(13, ErrorCategory.System)
  const systemError = system.createSystemError(errorCode)

  assertExists(systemError)
  assert(systemError instanceof SystemError)
  assert(systemError instanceof Error)
  assertEquals(systemError.errorCode.value, 13)
  assertEquals(systemError.name, "SystemError[System]")

  // Test throwing
  assertThrows(
    () => {
      throw systemError
    },
    SystemError,
  )

  // Verify the error name is correct when thrown
  try {
    throw systemError
  } catch (error) {
    assert(error instanceof SystemError)
    assertEquals(error.name, "SystemError[System]")
  }

  system.cleanup()
})

Deno.test("Error statistics", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const errors = [
    system.createErrorCode(1, ErrorCategory.System),
    system.createErrorCode(2, ErrorCategory.System),
    system.createErrorCode(1, ErrorCategory.System), // Duplicate
    system.createErrorCode(404, ErrorCategory.Network),
    system.createErrorCode(22, ErrorCategory.Generic),
  ]

  const stats = system.getErrorStats(errors)

  assertEquals(stats.total, 5)
  assertEquals(stats.byCategory[ErrorCategory.System], 3)
  assertEquals(stats.byCategory[ErrorCategory.Network], 1)
  assertEquals(stats.byCategory[ErrorCategory.Generic], 1)
  assertEquals(stats.byCategory[ErrorCategory.Unknown], 0)

  assertExists(stats.mostCommon)
  assert(stats.mostCommon.length > 0)
  assert(stats.averageProcessingTimeMs >= 0)

  system.cleanup()
})

Deno.test("SIMD metrics", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const metrics = system.getSIMDMetrics()

  assertExists(metrics)
  assert(typeof metrics.simdAvailable === 'boolean')
  assert(metrics.speedupFactor >= 1.0)
  assert(metrics.recommendedBatchSize > 0)
  assert(metrics.operationsPerSecond >= 0)

  system.cleanup()
})

Deno.test("Memory statistics", async () => {
  const system = new BoostSystem()
  await system.initialize()

  const initialStats = system.getMemoryStats()

  // Create some error codes to change memory usage
  system.createErrorCode(100, ErrorCategory.System)
  system.createErrorCode(200, ErrorCategory.Network)

  const afterStats = system.getMemoryStats()

  assert(afterStats.errorCodesCreated >= initialStats.errorCodesCreated)
  assert(afterStats.totalAllocated >= initialStats.totalAllocated)

  system.cleanup()
})

Deno.test("Error categories", async () => {
  const system = new BoostSystem()
  await system.initialize()

  // Test all error categories
  const systemError = system.createErrorCode(1, ErrorCategory.System)
  const genericError = system.createErrorCode(2, ErrorCategory.Generic)
  const networkError = system.createErrorCode(3, ErrorCategory.Network)

  assertEquals(systemError.category, ErrorCategory.System)
  assertEquals(systemError.categoryName, "System")

  assertEquals(genericError.category, ErrorCategory.Generic)
  assertEquals(genericError.categoryName, "Generic")

  assertEquals(networkError.category, ErrorCategory.Network)
  assertEquals(networkError.categoryName, "Network")

  system.cleanup()
})

Deno.test("Large array operations", async () => {
  const system = new BoostSystem()
  await system.initialize()

  // Test with larger arrays to ensure SIMD path is taken
  const size = 1000
  const codes1 = Array.from({ length: size }, (_, i) => i)
  const codes2 = Array.from({ length: size }, (_, i) => i)

  const startTime = performance.now()
  const result = system.compareErrorCodesBulk(codes1, codes2, { enableSIMD: true })
  const elapsed = performance.now() - startTime

  assertEquals(result.results.length, size)
  assert(result.results.every(r => r)) // All should be equal
  assertEquals(result.stats.processed, size)
  assert(elapsed < 100) // Should be fast

  // Test with SIMD disabled for comparison
  const scalarResult = system.compareErrorCodesBulk(codes1, codes2, { enableSIMD: false })
  assertEquals(scalarResult.results.length, size)
  assert(!scalarResult.stats.simdUsed)

  system.cleanup()
})

Deno.test("Cleanup and reinitialization", async () => {
  const system = new BoostSystem()
  await system.initialize()
  assert(system.isInitialized())

  system.cleanup()
  assert(!system.isInitialized())

  // Should be able to reinitialize
  await system.initialize()
  assert(system.isInitialized())

  system.cleanup()
})