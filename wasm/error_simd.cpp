/**
 * SIMD-optimized error handling utilities for Boost.System WASM
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

#include <emscripten.h>
#include <cstddef>
#include <cstdint>
#include <algorithm>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

extern "C" {

// SIMD feature detection
EMSCRIPTEN_KEEPALIVE
bool error_simd_available() {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

// SIMD-optimized bulk error code comparison
EMSCRIPTEN_KEEPALIVE
void compare_error_codes_simd(const int32_t* codes1, const int32_t* codes2, bool* results, size_t count) {
#ifdef __wasm_simd128__
    size_t simd_count = (count / 4) * 4;

    // Process 4 comparisons at once with SIMD
    for (size_t i = 0; i < simd_count; i += 4) {
        v128_t v1 = wasm_v128_load(&codes1[i]);
        v128_t v2 = wasm_v128_load(&codes2[i]);
        v128_t cmp = wasm_i32x4_eq(v1, v2);

        // Extract comparison results
        int32_t mask[4];
        wasm_v128_store(mask, cmp);

        results[i] = (mask[0] != 0);
        results[i + 1] = (mask[1] != 0);
        results[i + 2] = (mask[2] != 0);
        results[i + 3] = (mask[3] != 0);
    }

    // Handle remainder with scalar operations
    for (size_t i = simd_count; i < count; ++i) {
        results[i] = (codes1[i] == codes2[i]);
    }
#else
    // Scalar fallback
    for (size_t i = 0; i < count; ++i) {
        results[i] = (codes1[i] == codes2[i]);
    }
#endif
}

// SIMD-optimized error code validation
EMSCRIPTEN_KEEPALIVE
void validate_error_range_simd(const int32_t* codes, bool* valid, size_t count, int32_t min_val, int32_t max_val) {
#ifdef __wasm_simd128__
    v128_t min_vec = wasm_i32x4_splat(min_val);
    v128_t max_vec = wasm_i32x4_splat(max_val);

    size_t simd_count = (count / 4) * 4;

    // Process 4 validations at once
    for (size_t i = 0; i < simd_count; i += 4) {
        v128_t codes_vec = wasm_v128_load(&codes[i]);
        v128_t ge_min = wasm_i32x4_ge(codes_vec, min_vec);
        v128_t le_max = wasm_i32x4_le(codes_vec, max_vec);
        v128_t valid_vec = wasm_v128_and(ge_min, le_max);

        // Extract validation results
        int32_t mask[4];
        wasm_v128_store(mask, valid_vec);

        valid[i] = (mask[0] != 0);
        valid[i + 1] = (mask[1] != 0);
        valid[i + 2] = (mask[2] != 0);
        valid[i + 3] = (mask[3] != 0);
    }

    // Handle remainder
    for (size_t i = simd_count; i < count; ++i) {
        valid[i] = (codes[i] >= min_val && codes[i] <= max_val);
    }
#else
    // Scalar fallback
    for (size_t i = 0; i < count; ++i) {
        valid[i] = (codes[i] >= min_val && codes[i] <= max_val);
    }
#endif
}

// SIMD-optimized search for specific error code
EMSCRIPTEN_KEEPALIVE
int find_error_code_simd(const int32_t* codes, size_t count, int32_t target) {
#ifdef __wasm_simd128__
    v128_t target_vec = wasm_i32x4_splat(target);
    size_t simd_count = (count / 4) * 4;

    // Process 4 elements at once
    for (size_t i = 0; i < simd_count; i += 4) {
        v128_t codes_vec = wasm_v128_load(&codes[i]);
        v128_t cmp = wasm_i32x4_eq(codes_vec, target_vec);
        int32_t mask = wasm_i32x4_bitmask(cmp);

        if (mask != 0) {
            // Found a match - determine exact position
            for (int j = 0; j < 4; ++j) {
                if (codes[i + j] == target) {
                    return static_cast<int>(i + j);
                }
            }
        }
    }

    // Handle remainder with scalar
    for (size_t i = simd_count; i < count; ++i) {
        if (codes[i] == target) {
            return static_cast<int>(i);
        }
    }
#else
    // Scalar fallback
    for (size_t i = 0; i < count; ++i) {
        if (codes[i] == target) {
            return static_cast<int>(i);
        }
    }
#endif

    return -1; // Not found
}

// SIMD-optimized categorization of error codes
EMSCRIPTEN_KEEPALIVE
void categorize_error_codes_simd(const int32_t* codes, int32_t* categories, size_t count) {
#ifdef __wasm_simd128__
    // Common error code ranges for categorization
    v128_t system_min = wasm_i32x4_splat(1);
    v128_t system_max = wasm_i32x4_splat(99);
    v128_t network_min = wasm_i32x4_splat(100);
    v128_t network_max = wasm_i32x4_splat(199);

    v128_t cat_system = wasm_i32x4_splat(1);
    v128_t cat_network = wasm_i32x4_splat(2);
    v128_t cat_unknown = wasm_i32x4_splat(0);

    size_t simd_count = (count / 4) * 4;

    for (size_t i = 0; i < simd_count; i += 4) {
        v128_t codes_vec = wasm_v128_load(&codes[i]);

        // Check system error range
        v128_t is_system = wasm_v128_and(
            wasm_i32x4_ge(codes_vec, system_min),
            wasm_i32x4_le(codes_vec, system_max)
        );

        // Check network error range
        v128_t is_network = wasm_v128_and(
            wasm_i32x4_ge(codes_vec, network_min),
            wasm_i32x4_le(codes_vec, network_max)
        );

        // Select appropriate category
        v128_t result = wasm_v128_bitselect(cat_system, cat_unknown, is_system);
        result = wasm_v128_bitselect(cat_network, result, is_network);

        wasm_v128_store(&categories[i], result);
    }

    // Handle remainder
    for (size_t i = simd_count; i < count; ++i) {
        if (codes[i] >= 1 && codes[i] <= 99) {
            categories[i] = 1; // System
        } else if (codes[i] >= 100 && codes[i] <= 199) {
            categories[i] = 2; // Network
        } else {
            categories[i] = 0; // Unknown
        }
    }
#else
    // Scalar fallback
    for (size_t i = 0; i < count; ++i) {
        if (codes[i] >= 1 && codes[i] <= 99) {
            categories[i] = 1; // System
        } else if (codes[i] >= 100 && codes[i] <= 199) {
            categories[i] = 2; // Network
        } else {
            categories[i] = 0; // Unknown
        }
    }
#endif
}

// SIMD-optimized count of error codes by category
EMSCRIPTEN_KEEPALIVE
void count_errors_by_category_simd(const int32_t* categories, size_t count, int32_t* counts) {
    // Initialize counters
    counts[0] = 0; // Unknown
    counts[1] = 0; // System
    counts[2] = 0; // Network

#ifdef __wasm_simd128__
    v128_t unknown_count = wasm_i32x4_splat(0);
    v128_t system_count = wasm_i32x4_splat(0);
    v128_t network_count = wasm_i32x4_splat(0);

    v128_t one = wasm_i32x4_splat(1);
    v128_t cat_unknown = wasm_i32x4_splat(0);
    v128_t cat_system = wasm_i32x4_splat(1);
    v128_t cat_network = wasm_i32x4_splat(2);

    size_t simd_count = (count / 4) * 4;

    for (size_t i = 0; i < simd_count; i += 4) {
        v128_t cats = wasm_v128_load(&categories[i]);

        // Create masks for each category
        v128_t is_unknown = wasm_i32x4_eq(cats, cat_unknown);
        v128_t is_system = wasm_i32x4_eq(cats, cat_system);
        v128_t is_network = wasm_i32x4_eq(cats, cat_network);

        // Add to counters using bitselect
        unknown_count = wasm_i32x4_add(unknown_count, wasm_v128_bitselect(one, wasm_i32x4_splat(0), is_unknown));
        system_count = wasm_i32x4_add(system_count, wasm_v128_bitselect(one, wasm_i32x4_splat(0), is_system));
        network_count = wasm_i32x4_add(network_count, wasm_v128_bitselect(one, wasm_i32x4_splat(0), is_network));
    }

    // Extract horizontal sums
    int32_t unknown_temp[4], system_temp[4], network_temp[4];
    wasm_v128_store(unknown_temp, unknown_count);
    wasm_v128_store(system_temp, system_count);
    wasm_v128_store(network_temp, network_count);

    counts[0] = unknown_temp[0] + unknown_temp[1] + unknown_temp[2] + unknown_temp[3];
    counts[1] = system_temp[0] + system_temp[1] + system_temp[2] + system_temp[3];
    counts[2] = network_temp[0] + network_temp[1] + network_temp[2] + network_temp[3];

    // Handle remainder
    for (size_t i = simd_count; i < count; ++i) {
        if (categories[i] >= 0 && categories[i] <= 2) {
            counts[categories[i]]++;
        }
    }
#else
    // Scalar fallback
    for (size_t i = 0; i < count; ++i) {
        if (categories[i] >= 0 && categories[i] <= 2) {
            counts[categories[i]]++;
        }
    }
#endif
}

} // extern "C"