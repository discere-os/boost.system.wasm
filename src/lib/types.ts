/**
 * TypeScript type definitions for Boost.System WASM
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

/** WASM-native error category enumeration */
export enum ErrorCategory {
  Unknown = 0,
  System = 1,
  Generic = 2,
  Network = 3,
  Custom = 99,
}

/** Error code with category information */
export interface ErrorCode {
  readonly value: number
  readonly category: ErrorCategory
  readonly message: string
  readonly categoryName: string
}

/** Error condition for interoperability */
export interface ErrorCondition {
  readonly value: number
  readonly category: ErrorCategory
  readonly message: string
}

/** Result type that can carry either a value or an error code */
export interface Result<T> {
  readonly success: boolean
  readonly value?: T
  readonly error?: ErrorCode
}

/** Options for bulk error operations */
export interface BulkErrorOptions {
  /** Enable SIMD optimizations for large datasets */
  enableSIMD?: boolean
  /** Batch size for processing */
  batchSize?: number
  /** Enable memory optimization for large arrays */
  memoryOptimized?: boolean
}

/** Error statistics for analysis */
export interface ErrorStats {
  readonly total: number
  readonly byCategory: Record<ErrorCategory, number>
  readonly mostCommon: ErrorCode[]
  readonly averageProcessingTimeMs: number
}

/** JavaScript-native error that wraps Boost.System error codes */
export class SystemError extends Error {
  public readonly errorCode: ErrorCode
  public readonly condition?: ErrorCondition

  constructor(errorCode: ErrorCode, condition?: ErrorCondition) {
    super(errorCode.message)
    this.name = `SystemError[${errorCode.categoryName}]`
    this.errorCode = errorCode
    this.condition = condition
  }

  /** Convert to plain object for serialization */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      condition: this.condition,
    }
  }
}

/** Configuration options for BoostSystem initialization */
export interface BoostSystemOptions {
  /** Enable SIMD optimizations */
  simdOptimizations?: boolean
  /** Maximum memory usage in MB */
  maxMemoryMB?: number
  /** Enable error message interning for memory efficiency */
  internMessages?: boolean
  /** Custom error categories */
  customCategories?: Map<string, number>
}

/** Batch operation results */
export interface BatchResult<T> {
  readonly results: T[]
  readonly errors: ErrorCode[]
  readonly stats: {
    readonly processed: number
    readonly successful: number
    readonly failed: number
    readonly processingTimeMs: number
    readonly simdUsed: boolean
  }
}

/** Error comparison result with detailed information */
export interface ComparisonResult {
  readonly equal: boolean
  readonly valueDifference: number
  readonly categoryMatch: boolean
  readonly messageMatch: boolean
}

/** Memory usage statistics */
export interface MemoryStats {
  readonly totalAllocated: number
  readonly internedMessages: number
  readonly errorCodesCreated: number
  readonly peakUsage: number
}

/** Performance metrics for SIMD operations */
export interface SIMDPerformanceMetrics {
  readonly simdAvailable: boolean
  readonly operationsPerSecond: number
  readonly speedupFactor: number
  readonly recommendedBatchSize: number
}