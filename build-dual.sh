#!/bin/bash
# build-dual.sh - Dual build system for boost.system.wasm
#
# Copyright (c) 2018-2021 Peter Dimov
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under Boost Software License, Version 1.0

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building boost-system-side.wasm for production..."
    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Core sources - simple implementation and SIMD utilities
    SOURCES="../wasm/boost_system_simple.cpp"
    SIMD_SOURCES="../wasm/error_simd.cpp"

    emcc ${SOURCES} ${SIMD_SOURCES} \
        -I../wasm \
        -std=c++17 \
        -O3 -flto -msimd128 \
        -sSIDE_MODULE=1 \
        -sSTANDALONE_WASM=1 \
        -sEXPORTED_FUNCTIONS='["_wasm_create_error_code","_wasm_compare_error_codes","_compare_error_codes_simd","_wasm_format_error_message","_wasm_get_system_category","_wasm_get_generic_category"]' \
        -o boost-system-side.wasm

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp boost-system-side.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/boost-system-side.wasm"
    cd ..
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building boost-system-main.js for testing..."
    mkdir -p "${BUILD_DIR}-main"
    cd "${BUILD_DIR}-main"

    # Core sources - simple implementation and SIMD utilities
    SOURCES="../wasm/boost_system_simple.cpp"
    SIMD_SOURCES="../wasm/error_simd.cpp"

    emcc ${SOURCES} ${SIMD_SOURCES} \
        -I../wasm \
        -std=c++17 \
        -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="BoostSystemModule" \
        -sEXPORTED_FUNCTIONS='["_wasm_create_error_code","_wasm_compare_error_codes","_compare_error_codes_simd","_wasm_format_error_message","_wasm_get_system_category","_wasm_get_generic_category","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","stringToUTF8","lengthBytesUTF8","HEAPU8","HEAP32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=33554432 \
        -sENVIRONMENT=web,webview,worker \
        -sNODEJS_CATCH_EXIT=0 \
        -sNODEJS_CATCH_REJECTION=0 \
        -o boost-system-main.js

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp boost-system-main.js "${INSTALL_PREFIX}/wasm/"
    cp boost-system-main.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "MAIN_MODULE: ${INSTALL_PREFIX}/wasm/boost-system-main.js"
    cd ..
}

case "$VARIANT" in
    side) check_prerequisites && build_side_module ;;
    main) check_prerequisites && build_main_module ;;
    all) check_prerequisites && build_side_module && build_main_module ;;
    clean) rm -rf "${BUILD_DIR}"* "${INSTALL_PREFIX}" ;;
    *) echo "Usage: $0 [side|main|all|clean]"; exit 1 ;;
esac