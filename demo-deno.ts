#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Boost.System WASM Demo - Comprehensive error handling showcase
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

import BoostSystem, { ErrorCategory, SystemError } from "./src/lib/index.ts"

async function demo() {
  console.log("🚀 Boost.System WASM Demo")
  console.log("=" + "=".repeat(60))

  const system = new BoostSystem({
    simdOptimizations: true,
    maxMemoryMB: 64,
    internMessages: true,
  })

  console.log("📦 Initializing Boost.System WASM module...")
  await system.initialize()
  console.log("✅ Initialization complete")

  // Demo 1: Basic error code creation
  console.log("\n📋 Demo 1: Basic Error Code Operations")
  console.log("-".repeat(50))

  const errorCode1 = system.createErrorCode(404, ErrorCategory.Network)
  const errorCode2 = system.createErrorCode(500, ErrorCategory.System)
  const errorCode3 = system.createErrorCode(22, ErrorCategory.Generic)

  console.log(`Network Error: ${errorCode1.value} - "${errorCode1.message}"`)
  console.log(`System Error:  ${errorCode2.value} - "${errorCode2.message}"`)
  console.log(`Generic Error: ${errorCode3.value} - "${errorCode3.message}"`)

  // Demo 2: Error code comparison
  console.log("\n🔍 Demo 2: Error Code Comparison")
  console.log("-".repeat(50))

  const comparison = system.compareErrorCodes(errorCode1, errorCode2)
  console.log(`Codes ${errorCode1.value} vs ${errorCode2.value}:`)
  console.log(`  Equal: ${comparison.equal}`)
  console.log(`  Value difference: ${comparison.valueDifference}`)
  console.log(`  Category match: ${comparison.categoryMatch}`)
  console.log(`  Message match: ${comparison.messageMatch}`)

  // Demo 3: Bulk operations with SIMD
  console.log("\n⚡ Demo 3: Bulk Operations with SIMD")
  console.log("-".repeat(50))

  const simdMetrics = system.getSIMDMetrics()
  console.log(`SIMD Available: ${simdMetrics.simdAvailable}`)
  console.log(`Expected Speedup: ${simdMetrics.speedupFactor}x`)

  // Generate test data
  const errorCodes1 = Array.from({ length: 1000 }, (_, i) => i % 100)
  const errorCodes2 = Array.from({ length: 1000 }, (_, i) => (i + 1) % 100)

  const startTime = performance.now()
  const bulkResult = system.compareErrorCodesBulk(errorCodes1, errorCodes2, { enableSIMD: true })
  const elapsedTime = performance.now() - startTime

  console.log(`Processed: ${bulkResult.stats.processed} comparisons`)
  console.log(`SIMD Used: ${bulkResult.stats.simdUsed}`)
  console.log(`Processing time: ${elapsedTime.toFixed(3)}ms`)
  console.log(`Equal pairs: ${bulkResult.results.filter(r => r).length}`)

  // Demo 4: Error validation
  console.log("\n✅ Demo 4: Error Code Validation")
  console.log("-".repeat(50))

  const testCodes = [10, 50, 150, 999, 1001, -5]
  const validationResults = system.validateErrorCodes(testCodes, 0, 1000)

  testCodes.forEach((code, i) => {
    console.log(`Code ${code}: ${validationResults[i] ? '✅ Valid' : '❌ Invalid'}`)
  })

  // Demo 5: Bulk error code creation
  console.log("\n📦 Demo 5: Bulk Error Code Creation")
  console.log("-".repeat(50))

  const errorValues = [404, 500, 503, 403, 401]
  const networkErrors = system.createErrorCodesBulk(errorValues, ErrorCategory.Network)

  networkErrors.forEach(error => {
    console.log(`${error.categoryName} ${error.value}: ${error.message}`)
  })

  // Demo 6: Error statistics
  console.log("\n📊 Demo 6: Error Statistics")
  console.log("-".repeat(50))

  const allErrors = [
    ...system.createErrorCodesBulk([1, 2, 3, 1, 2], ErrorCategory.System),
    ...system.createErrorCodesBulk([404, 500, 404], ErrorCategory.Network),
    ...system.createErrorCodesBulk([22, 9], ErrorCategory.Generic),
  ]

  const stats = system.getErrorStats(allErrors)
  console.log(`Total errors: ${stats.total}`)
  console.log("By category:")
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`  ${category}: ${count}`)
    }
  })

  console.log("Most common errors:")
  stats.mostCommon.forEach(error => {
    console.log(`  ${error.categoryName} ${error.value}: ${error.message}`)
  })

  // Demo 7: Result pattern
  console.log("\n🎯 Demo 7: Result Pattern for Error Handling")
  console.log("-".repeat(50))

  function divideNumbers(a: number, b: number) {
    if (b === 0) {
      const error = system.createErrorCode(22, ErrorCategory.Generic) // EINVAL
      return system.createResult<number>(undefined, error)
    }
    return system.createResult(a / b)
  }

  const result1 = divideNumbers(10, 2)
  const result2 = divideNumbers(10, 0)

  console.log(`10 / 2: ${result1.success ? `Result = ${result1.value}` : `Error: ${result1.error?.message}`}`)
  console.log(`10 / 0: ${result2.success ? `Result = ${result2.value}` : `Error: ${result2.error?.message}`}`)

  // Demo 8: SystemError throwing pattern
  console.log("\n💥 Demo 8: SystemError Exception Pattern")
  console.log("-".repeat(50))

  try {
    const criticalError = system.createErrorCode(13, ErrorCategory.System) // EACCES
    throw system.createSystemError(criticalError)
  } catch (error) {
    if (error instanceof SystemError) {
      console.log(`Caught SystemError: ${error.name}`)
      console.log(`Error code: ${error.errorCode.value}`)
      console.log(`Category: ${error.errorCode.categoryName}`)
      console.log(`Message: ${error.message}`)
      console.log(`JSON: ${JSON.stringify(error.toJSON(), null, 2)}`)
    }
  }

  // Demo 9: Find operations
  console.log("\n🔎 Demo 9: SIMD-Optimized Search Operations")
  console.log("-".repeat(50))

  const searchArray = Array.from({ length: 10000 }, (_, i) => i % 1000)
  const targetCode = 42

  const searchStart = performance.now()
  const foundIndex = system.findErrorCode(searchArray, targetCode)
  const searchTime = performance.now() - searchStart

  console.log(`Searching for ${targetCode} in ${searchArray.length} codes`)
  console.log(`Found at index: ${foundIndex}`)
  console.log(`Search time: ${searchTime.toFixed(3)}ms`)

  // Demo 10: Memory usage stats
  console.log("\n💾 Demo 10: Memory Usage Statistics")
  console.log("-".repeat(50))

  const memStats = system.getMemoryStats()
  console.log(`Total allocated: ${memStats.totalAllocated} bytes`)
  console.log(`Error codes created: ${memStats.errorCodesCreated}`)
  console.log(`Interned messages: ${memStats.internedMessages}`)
  console.log(`Peak usage: ${memStats.peakUsage} bytes`)

  // Performance summary
  console.log("\n⚡ Performance Summary")
  console.log("-".repeat(50))

  const totalOps = 1000 + testCodes.length + errorValues.length
  console.log(`Total operations processed: ${totalOps}`)
  console.log(`SIMD acceleration: ${simdMetrics.simdAvailable ? 'Enabled' : 'Disabled'}`)
  console.log(`Memory efficiency: Optimized with message interning`)

  // Cleanup
  system.cleanup()
  console.log("\n🧹 Cleanup complete")
  console.log("\n✨ Demo finished successfully!")
}

if (import.meta.main) {
  try {
    await demo()
  } catch (error) {
    console.error("❌ Demo failed:", error)
    Deno.exit(1)
  }
}