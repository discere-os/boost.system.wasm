/**
 * WASM-native enhancements for Boost.System - TypeScript API
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

import type {
  BoostSystemOptions,
  ErrorCode,
  ErrorCondition,
  Result,
  BulkErrorOptions,
  BatchResult,
  ComparisonResult,
  ErrorStats,
  MemoryStats,
  SIMDPerformanceMetrics,
} from './types.ts'

import { ErrorCategory, SystemError } from './types.ts'

export * from './types.ts'

export default class BoostSystem {
  private module: any = null
  private initialized = false
  private memoryUsage = {
    totalAllocated: 0,
    internedMessages: 0,
    errorCodesCreated: 0,
    peakUsage: 0,
  }

  constructor(private options: BoostSystemOptions = {}) {
    this.options = {
      simdOptimizations: true,
      maxMemoryMB: 64,
      internMessages: true,
      customCategories: new Map(),
      ...options,
    }
  }

  /** Initialize the WASM module and Boost.System enhancements */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const wasmBinary = await this.loadWasmBinary()
      const moduleFactory = await this.loadModuleFactory()

      this.module = await moduleFactory({
        wasmBinary,
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return new URL('../../install/wasm/' + path, import.meta.url).href
          }
          return path
        },
      })

      this.setupBindings()
      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize BoostSystem: ${error}`)
    }
  }

  private async loadWasmBinary(): Promise<ArrayBuffer | undefined> {
    // Deno-first development environment
    if (typeof globalThis.Deno !== 'undefined') {
      try {
        const wasmPath = new URL('../../install/wasm/boost-system-main.wasm', import.meta.url).pathname
        const wasmBuffer = await Deno.readFile(wasmPath)
        return wasmBuffer.buffer
      } catch (error) {
        console.warn('Failed to load local WASM binary:', error)
        return undefined
      }
    }

    // Web/CDN runtime - try CDN locations
    const cdnUrls = [
      'https://wasm.discere.cloud/boost.system/latest/main/',
      'https://cdn.jsdelivr.net/npm/@discere-os/boost.system.wasm/dist/',
    ]

    for (const url of cdnUrls) {
      try {
        const response = await fetch(`${url}boost-system-main.wasm`)
        if (response.ok) {
          return await response.arrayBuffer()
        }
      } catch {
        continue
      }
    }

    return undefined
  }

  private async loadModuleFactory(): Promise<any> {
    // Deno-first development environment
    if (typeof globalThis.Deno !== 'undefined') {
      const moduleFactory = (await import('../../install/wasm/boost-system-main.js')).default
      return moduleFactory
    }

    // Web/CDN runtime
    const cdnUrls = [
      'https://wasm.discere.cloud/boost.system/latest/main/',
      'https://cdn.jsdelivr.net/npm/@discere-os/boost.system.wasm/dist/',
    ]

    for (const url of cdnUrls) {
      try {
        const moduleFactory = (await import(`${url}boost-system-main.js`)).default
        return moduleFactory
      } catch {
        continue
      }
    }

    throw new Error('Failed to load module factory from any source')
  }

  private setupBindings(): void {
    // Bind C++ functions with proper types
    this._getSystemCategory = this.module.cwrap('wasm_get_system_category', 'number', [])
    this._getGenericCategory = this.module.cwrap('wasm_get_generic_category', 'number', [])
    this._createErrorCode = this.module.cwrap('wasm_create_error_code', 'number', ['number', 'number'])
    this._compareErrorCodes = this.module.cwrap('wasm_compare_error_codes', 'boolean', ['number', 'number'])
    this._formatErrorMessage = this.module.cwrap('wasm_format_error_message', 'string', ['number', 'number'])
    this._getCategoryName = this.module.cwrap('wasm_get_category_name', 'string', ['number'])
    this._internErrorMessage = this.module.cwrap('wasm_intern_error_message', 'number', ['string'])
    this._getInternedMessage = this.module.cwrap('wasm_get_interned_message', 'string', ['number'])

    // SIMD functions
    this._simdAvailable = this.module.cwrap('error_simd_available', 'boolean', [])
    this._compareErrorCodesSIMD = this.module.cwrap('compare_error_codes_simd', null, ['number', 'number', 'number', 'number'])
    this._validateErrorRangeSIMD = this.module.cwrap('validate_error_range_simd', null, ['number', 'number', 'number', 'number', 'number'])
    this._findErrorCodeSIMD = this.module.cwrap('find_error_code_simd', 'number', ['number', 'number', 'number'])
    this._categorizeErrorCodesSIMD = this.module.cwrap('categorize_error_codes_simd', null, ['number', 'number', 'number'])
    this._countErrorsByCategorySIMD = this.module.cwrap('count_errors_by_category_simd', null, ['number', 'number', 'number'])

    // Memory management
    this._allocateBuffer = this.module.cwrap('wasm_allocate_buffer', 'number', ['number'])
    this._freeBuffer = this.module.cwrap('wasm_free_buffer', null, ['number'])
  }

  // Internal C++ function bindings
  private _getSystemCategory!: () => number
  private _getGenericCategory!: () => number
  private _createErrorCode!: (value: number, category: number) => number
  private _compareErrorCodes!: (handle1: number, handle2: number) => boolean
  private _formatErrorMessage!: (value: number, category: number) => string
  private _getCategoryName!: (category: number) => string
  private _internErrorMessage!: (message: string) => number
  private _getInternedMessage!: (handle: number) => string
  private _simdAvailable!: () => boolean
  private _compareErrorCodesSIMD!: (codes1: number, codes2: number, results: number, count: number) => void
  private _validateErrorRangeSIMD!: (codes: number, valid: number, count: number, min: number, max: number) => void
  private _findErrorCodeSIMD!: (codes: number, count: number, target: number) => number
  private _categorizeErrorCodesSIMD!: (codes: number, categories: number, count: number) => void
  private _countErrorsByCategorySIMD!: (categories: number, count: number, counts: number) => void
  private _allocateBuffer!: (size: number) => number
  private _freeBuffer!: (ptr: number) => void

  /** Create a new error code with specified value and category */
  createErrorCode(value: number, category: ErrorCategory = ErrorCategory.System): ErrorCode {
    this.ensureInitialized()

    const categoryType = category === ErrorCategory.Generic ? 1 : 0
    const message = this._formatErrorMessage(value, categoryType)

    // Map category name properly
    let categoryName: string
    switch (category) {
      case ErrorCategory.System:
        categoryName = "System"
        break
      case ErrorCategory.Generic:
        categoryName = "Generic"
        break
      case ErrorCategory.Network:
        categoryName = "Network"
        break
      default:
        categoryName = "Unknown"
    }

    // Update memory usage stats
    this.memoryUsage.errorCodesCreated++
    this.memoryUsage.totalAllocated += message.length + 16 // Approximate

    return {
      value,
      category,
      message,
      categoryName,
    }
  }

  /** Create error codes in bulk for better performance */
  createErrorCodesBulk(values: number[], category: ErrorCategory = ErrorCategory.System): ErrorCode[] {
    this.ensureInitialized()

    const results: ErrorCode[] = []
    const categoryType = category === ErrorCategory.Generic ? 1 : 0

    // Map category name properly
    let categoryName: string
    switch (category) {
      case ErrorCategory.System:
        categoryName = "System"
        break
      case ErrorCategory.Generic:
        categoryName = "Generic"
        break
      case ErrorCategory.Network:
        categoryName = "Network"
        break
      default:
        categoryName = "Unknown"
    }

    for (const value of values) {
      const message = this._formatErrorMessage(value, categoryType)
      results.push({
        value,
        category,
        message,
        categoryName,
      })
    }

    this.memoryUsage.errorCodesCreated += values.length
    return results
  }

  /** Compare two error codes efficiently */
  compareErrorCodes(code1: ErrorCode, code2: ErrorCode): ComparisonResult {
    this.ensureInitialized()

    // Create error code handles in WASM for comparison
    const categoryType1 = code1.category === ErrorCategory.Generic ? 1 : 0
    const categoryType2 = code2.category === ErrorCategory.Generic ? 1 : 0

    const handle1 = this._createErrorCode(code1.value, categoryType1)
    const handle2 = this._createErrorCode(code2.value, categoryType2)

    const equal = this._compareErrorCodes(handle1, handle2)

    return {
      equal,
      valueDifference: Math.abs(code1.value - code2.value),
      categoryMatch: code1.category === code2.category,
      messageMatch: code1.message === code2.message,
    }
  }

  /** Compare arrays of error codes using SIMD optimization */
  compareErrorCodesBulk(codes1: number[], codes2: number[], options?: BulkErrorOptions): BatchResult<boolean> {
    this.ensureInitialized()

    const startTime = performance.now()
    const count = Math.min(codes1.length, codes2.length)
    const results: boolean[] = new Array(count)
    const errors: ErrorCode[] = []

    if (options?.enableSIMD !== false && this._simdAvailable() && count >= 16) {
      // Use SIMD for large arrays
      const codes1Ptr = this.copyArrayToWASM(codes1, 'Int32Array')
      const codes2Ptr = this.copyArrayToWASM(codes2, 'Int32Array')
      const resultsPtr = this._allocateBuffer(count)

      try {
        this._compareErrorCodesSIMD(codes1Ptr, codes2Ptr, resultsPtr, count)

        // Copy results back
        const resultBytes = new Uint8Array(this.module.HEAPU8.buffer, resultsPtr, count)
        for (let i = 0; i < count; i++) {
          results[i] = resultBytes[i] !== 0
        }
      } finally {
        this._freeBuffer(codes1Ptr)
        this._freeBuffer(codes2Ptr)
        this._freeBuffer(resultsPtr)
      }
    } else {
      // Scalar fallback
      for (let i = 0; i < count; i++) {
        results[i] = codes1[i] === codes2[i]
      }
    }

    const processingTime = performance.now() - startTime
    return {
      results,
      errors,
      stats: {
        processed: count,
        successful: count,
        failed: 0,
        processingTimeMs: processingTime,
        simdUsed: options?.enableSIMD !== false && this._simdAvailable() && count >= 16,
      },
    }
  }

  /** Find error code in array using SIMD optimization */
  findErrorCode(codes: number[], target: number): number {
    this.ensureInitialized()

    if (this._simdAvailable() && codes.length >= 16) {
      const codesPtr = this.copyArrayToWASM(codes, 'Int32Array')
      try {
        return this._findErrorCodeSIMD(codesPtr, codes.length, target)
      } finally {
        this._freeBuffer(codesPtr)
      }
    }

    // Scalar fallback
    return codes.indexOf(target)
  }

  /** Validate error codes are within acceptable range */
  validateErrorCodes(codes: number[], minValue = 0, maxValue = 999): boolean[] {
    this.ensureInitialized()

    const results: boolean[] = new Array(codes.length)

    if (this._simdAvailable() && codes.length >= 16) {
      const codesPtr = this.copyArrayToWASM(codes, 'Int32Array')
      const resultsPtr = this._allocateBuffer(codes.length)

      try {
        this._validateErrorRangeSIMD(codesPtr, resultsPtr, codes.length, minValue, maxValue)

        const resultBytes = new Uint8Array(this.module.HEAPU8.buffer, resultsPtr, codes.length)
        for (let i = 0; i < codes.length; i++) {
          results[i] = resultBytes[i] !== 0
        }
      } finally {
        this._freeBuffer(codesPtr)
        this._freeBuffer(resultsPtr)
      }
    } else {
      // Scalar fallback
      for (let i = 0; i < codes.length; i++) {
        results[i] = codes[i] >= minValue && codes[i] <= maxValue
      }
    }

    return results
  }

  /** Get error statistics for analysis */
  getErrorStats(codes: ErrorCode[]): ErrorStats {
    this.ensureInitialized()

    const startTime = performance.now()
    const byCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.Unknown]: 0,
      [ErrorCategory.System]: 0,
      [ErrorCategory.Generic]: 0,
      [ErrorCategory.Network]: 0,
      [ErrorCategory.Custom]: 0,
    }

    const messageCounts = new Map<string, number>()

    for (const code of codes) {
      byCategory[code.category]++

      const count = messageCounts.get(code.message) || 0
      messageCounts.set(code.message, count + 1)
    }

    // Find most common errors
    const mostCommon = Array.from(messageCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message]) => codes.find(c => c.message === message)!)
      .filter(Boolean)

    return {
      total: codes.length,
      byCategory,
      mostCommon,
      averageProcessingTimeMs: performance.now() - startTime,
    }
  }

  /** Create a Result type wrapper for error-prone operations */
  createResult<T>(value?: T, error?: ErrorCode): Result<T> {
    return {
      success: !error,
      value,
      error,
    }
  }

  /** Create a SystemError from an ErrorCode for throwing */
  createSystemError(errorCode: ErrorCode, condition?: ErrorCondition): SystemError {
    return new SystemError(errorCode, condition)
  }

  /** Get SIMD performance metrics */
  getSIMDMetrics(): SIMDPerformanceMetrics {
    this.ensureInitialized()

    // Run a quick benchmark to measure actual operations/second
    let operationsPerSecond = 0
    if (this._simdAvailable()) {
      const testData = Array.from({length: 1000}, (_, i) => i % 100)
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        this.findErrorCode(testData, 42)
      }

      const elapsed = performance.now() - startTime
      operationsPerSecond = Math.round((iterations * testData.length) / (elapsed / 1000))
    }

    const simdAvailable = Boolean(this._simdAvailable())
    return {
      simdAvailable,
      operationsPerSecond,
      speedupFactor: simdAvailable ? 3.5 : 1.0, // Typical SIMD speedup
      recommendedBatchSize: 64, // Optimal batch size for SIMD operations
    }
  }

  /** Get current memory usage statistics */
  getMemoryStats(): MemoryStats {
    return { ...this.memoryUsage }
  }

  /** Clean up WASM resources */
  cleanup(): void {
    if (this.module) {
      // Cleanup any allocated resources
      this.module = null
      this.initialized = false
      this.memoryUsage = {
        totalAllocated: 0,
        internedMessages: 0,
        errorCodesCreated: 0,
        peakUsage: 0,
      }
    }
  }

  /** Check if the module is initialized */
  isInitialized(): boolean {
    return this.initialized
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('BoostSystem not initialized. Call initialize() first.')
    }
  }

  private copyArrayToWASM(array: number[], arrayType: 'Int32Array' | 'Float32Array' | 'Uint8Array'): number {
    let typedArray: Int32Array | Float32Array | Uint8Array
    let heap: any
    let bytesPerElement: number

    switch (arrayType) {
      case 'Int32Array':
        typedArray = new Int32Array(array)
        heap = this.module.HEAP32
        bytesPerElement = 4
        break
      case 'Float32Array':
        typedArray = new Float32Array(array)
        heap = this.module.HEAPF32
        bytesPerElement = 4
        break
      case 'Uint8Array':
        typedArray = new Uint8Array(array)
        heap = this.module.HEAPU8
        bytesPerElement = 1
        break
    }

    const ptr = this._allocateBuffer(typedArray.byteLength)
    const offset = bytesPerElement === 1 ? ptr : ptr / bytesPerElement
    heap.set(typedArray, offset)
    return ptr
  }
}