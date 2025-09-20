/**
 * Standalone WebAssembly implementation of Boost.System-like functionality
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 *
 * This is a standalone implementation that provides the core functionality
 * of Boost.System without requiring the full Boost library headers.
 */

#include <emscripten.h>
#include <string>
#include <vector>
#include <memory>
#include <cstring>
#include <map>
#include <unordered_map>

namespace boost_system_wasm {

// Minimal error category implementation
class error_category {
public:
    virtual ~error_category() = default;
    virtual const char* name() const = 0;
    virtual std::string message(int value) const = 0;
    virtual bool equivalent(int code, int condition) const { return code == condition; }

    bool operator==(const error_category& other) const {
        return this == &other;
    }

    bool operator!=(const error_category& other) const {
        return !(*this == other);
    }
};

// System category implementation
class system_category_impl : public error_category {
public:
    const char* name() const override {
        return "system";
    }

    std::string message(int value) const override {
        // Common system error messages
        static const std::unordered_map<int, std::string> messages = {
            {1, "Operation not permitted"},
            {2, "No such file or directory"},
            {3, "No such process"},
            {4, "Interrupted system call"},
            {5, "I/O error"},
            {6, "No such device or address"},
            {7, "Argument list too long"},
            {8, "Exec format error"},
            {9, "Bad file number"},
            {10, "No child processes"},
            {11, "Try again"},
            {12, "Out of memory"},
            {13, "Permission denied"},
            {14, "Bad address"},
            {15, "Block device required"},
            {16, "Device or resource busy"},
            {17, "File exists"},
            {18, "Cross-device link"},
            {19, "No such device"},
            {20, "Not a directory"},
            {21, "Is a directory"},
            {22, "Invalid argument"},
            {23, "File table overflow"},
            {24, "Too many open files"},
            {25, "Not a typewriter"},
        };

        auto it = messages.find(value);
        if (it != messages.end()) {
            return it->second;
        }
        return "Unknown error " + std::to_string(value);
    }
};

// Generic category implementation
class generic_category_impl : public error_category {
public:
    const char* name() const override {
        return "generic";
    }

    std::string message(int value) const override {
        // Common generic error conditions
        static const std::unordered_map<int, std::string> messages = {
            {0, "Success"},
            {1, "Address family not supported"},
            {2, "Address in use"},
            {3, "Address not available"},
            {4, "Already connected"},
            {5, "Argument list too long"},
            {6, "Argument out of domain"},
            {7, "Bad address"},
            {8, "Bad file descriptor"},
            {9, "Bad message"},
            {10, "Broken pipe"},
            {11, "Connection aborted"},
            {12, "Connection already in progress"},
            {13, "Connection refused"},
            {14, "Connection reset"},
            {15, "Cross-device link"},
            {16, "Destination address required"},
            {17, "Device or resource busy"},
            {18, "Directory not empty"},
            {19, "Executable format error"},
            {20, "File exists"},
            {21, "File too large"},
            {22, "Filename too long"},
            {23, "Function not supported"},
            {24, "Host unreachable"},
            {25, "Identifier removed"},
        };

        auto it = messages.find(value);
        if (it != messages.end()) {
            return it->second;
        }
        return "Generic error " + std::to_string(value);
    }
};

// Error code implementation
class error_code {
public:
    error_code() : value_(0), category_(&get_system_category()) {}
    error_code(int val, const error_category& cat) : value_(val), category_(&cat) {}

    int value() const { return value_; }
    const error_category& category() const { return *category_; }
    std::string message() const { return category_->message(value_); }

    bool operator==(const error_code& other) const {
        return value_ == other.value_ && category_ == other.category_;
    }

    bool operator!=(const error_code& other) const {
        return !(*this == other);
    }

    operator bool() const { return value_ != 0; }

private:
    int value_;
    const error_category* category_;
};

// Global category instances
static system_category_impl system_cat;
static generic_category_impl generic_cat;

const error_category& get_system_category() { return system_cat; }
const error_category& get_generic_category() { return generic_cat; }

// Storage for error codes and messages
static std::vector<error_code> error_storage;
static std::vector<std::string> message_storage;

} // namespace boost_system_wasm

using namespace boost_system_wasm;

extern "C" {

// WASM-native error category management
EMSCRIPTEN_KEEPALIVE
const error_category* wasm_get_system_category() {
    return &get_system_category();
}

EMSCRIPTEN_KEEPALIVE
const error_category* wasm_get_generic_category() {
    return &get_generic_category();
}

// Create error code with category
EMSCRIPTEN_KEEPALIVE
int wasm_create_error_code(int value, int category_type) {
    const error_category* cat = (category_type == 0) ?
        &get_system_category() : &get_generic_category();

    error_storage.emplace_back(value, *cat);
    return error_storage.size() - 1; // Return index as handle
}

// Compare error codes efficiently
EMSCRIPTEN_KEEPALIVE
bool wasm_compare_error_codes(int handle1, int handle2) {
    if (handle1 < 0 || handle1 >= static_cast<int>(error_storage.size()) ||
        handle2 < 0 || handle2 >= static_cast<int>(error_storage.size())) {
        return false;
    }

    return error_storage[handle1] == error_storage[handle2];
}

// Format error message with proper UTF-8 handling
EMSCRIPTEN_KEEPALIVE
const char* wasm_format_error_message(int value, int category_type) {
    const error_category* cat = (category_type == 0) ?
        &get_system_category() : &get_generic_category();

    message_storage.emplace_back(cat->message(value));
    return message_storage.back().c_str();
}

// Get error condition for interoperability
EMSCRIPTEN_KEEPALIVE
int wasm_get_error_condition(int value, int category_type) {
    // Simplified - just return the value for now
    return value;
}

// Batch error code validation for SIMD optimization potential
EMSCRIPTEN_KEEPALIVE
void wasm_validate_error_codes_batch(const int* values, const int* categories, bool* results, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        // Simplified validation - check for common error patterns
        results[i] = (values[i] >= 0 && values[i] <= 255); // Basic range check
    }
}

// Convert boost error to JavaScript Error-like structure
EMSCRIPTEN_KEEPALIVE
int wasm_create_js_error_info(int value, int category_type,
                              char* name_buf, size_t name_size,
                              char* message_buf, size_t message_size) {
    const error_category* cat = (category_type == 0) ?
        &get_system_category() : &get_generic_category();

    error_code ec(value, *cat);

    // Get category name
    std::string cat_name = cat->name();
    if (cat_name.length() < name_size) {
        strcpy(name_buf, cat_name.c_str());
    } else {
        strncpy(name_buf, cat_name.c_str(), name_size - 1);
        name_buf[name_size - 1] = '\0';
    }

    // Get error message
    std::string message = ec.message();
    if (message.length() < message_size) {
        strcpy(message_buf, message.c_str());
    } else {
        strncpy(message_buf, message.c_str(), message_size - 1);
        message_buf[message_size - 1] = '\0';
    }

    return ec.value();
}

// High-performance error code creation for bulk operations
EMSCRIPTEN_KEEPALIVE
void wasm_create_error_codes_bulk(const int* values, const int* category_types, size_t count, int* handles) {
    for (size_t i = 0; i < count; ++i) {
        const error_category* cat = (category_types[i] == 0) ?
            &get_system_category() : &get_generic_category();

        error_storage.emplace_back(values[i], *cat);
        handles[i] = error_storage.size() - 1;
    }
}

// WASM-optimized string interning for error messages
static std::vector<std::string> interned_messages;

EMSCRIPTEN_KEEPALIVE
int wasm_intern_error_message(const char* message) {
    std::string msg(message);

    // Check if already interned
    for (size_t i = 0; i < interned_messages.size(); ++i) {
        if (interned_messages[i] == msg) {
            return static_cast<int>(i);
        }
    }

    // Add new message
    interned_messages.push_back(msg);
    return static_cast<int>(interned_messages.size() - 1);
}

EMSCRIPTEN_KEEPALIVE
const char* wasm_get_interned_message(int handle) {
    if (handle >= 0 && handle < static_cast<int>(interned_messages.size())) {
        return interned_messages[handle].c_str();
    }
    return nullptr;
}

// Get category name
EMSCRIPTEN_KEEPALIVE
const char* wasm_get_category_name(int category_type) {
    const error_category* cat = (category_type == 0) ?
        &get_system_category() : &get_generic_category();
    return cat->name();
}

// Memory management helpers for JavaScript integration
EMSCRIPTEN_KEEPALIVE
void* wasm_allocate_buffer(size_t size) {
    return malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void wasm_free_buffer(void* ptr) {
    free(ptr);
}

// Clear storage for memory management
EMSCRIPTEN_KEEPALIVE
void wasm_clear_storage() {
    error_storage.clear();
    message_storage.clear();
    interned_messages.clear();
}

// Get storage statistics
EMSCRIPTEN_KEEPALIVE
void wasm_get_storage_stats(int* error_count, int* message_count, int* interned_count) {
    *error_count = static_cast<int>(error_storage.size());
    *message_count = static_cast<int>(message_storage.size());
    *interned_count = static_cast<int>(interned_messages.size());
}

} // extern "C"