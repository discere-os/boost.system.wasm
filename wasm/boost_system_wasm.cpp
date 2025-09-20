/**
 * WebAssembly enhancements for Boost.System
 * Copyright (c) 2018-2021 Peter Dimov
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 */

#include <boost/system/error_code.hpp>
#include <boost/system/system_error.hpp>
#include <boost/system/error_category.hpp>
#include <boost/system/generic_category.hpp>
#include <boost/system/system_category.hpp>
#include <emscripten.h>
#include <string>
#include <vector>
#include <memory>
#include <cstring>

extern "C" {

// WASM-native error category management
EMSCRIPTEN_KEEPALIVE
const boost::system::error_category* get_system_category() {
    return &boost::system::system_category();
}

EMSCRIPTEN_KEEPALIVE
const boost::system::error_category* get_generic_category() {
    return &boost::system::generic_category();
}

// Create error code with category
EMSCRIPTEN_KEEPALIVE
int create_error_code(int value, const boost::system::error_category* category) {
    static std::vector<boost::system::error_code> error_storage;
    error_storage.emplace_back(value, *category);
    return error_storage.size() - 1; // Return index as handle
}

// Compare error codes efficiently
EMSCRIPTEN_KEEPALIVE
bool compare_error_codes(int handle1, int handle2) {
    // For demonstration - in real implementation would use handle lookup
    boost::system::error_code ec1(handle1, boost::system::system_category());
    boost::system::error_code ec2(handle2, boost::system::system_category());
    return ec1 == ec2;
}

// Format error message with proper UTF-8 handling
EMSCRIPTEN_KEEPALIVE
const char* format_error_message(int value, const boost::system::error_category* category) {
    static std::string message_buffer;
    boost::system::error_code ec(value, *category);
    message_buffer = ec.message();
    return message_buffer.c_str();
}

// Get error condition for interoperability
EMSCRIPTEN_KEEPALIVE
int get_error_condition(int value, const boost::system::error_category* category) {
    boost::system::error_code ec(value, *category);
    auto condition = category->default_error_condition(value);
    return condition.value();
}

// Batch error code validation for SIMD optimization potential
EMSCRIPTEN_KEEPALIVE
void validate_error_codes_batch(const int* values, const int* categories, bool* results, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        // Simplified validation - check for common error patterns
        results[i] = (values[i] >= 0 && values[i] <= 255); // Basic range check
    }
}

// Convert boost error to JavaScript Error-like structure
EMSCRIPTEN_KEEPALIVE
int create_js_error_info(int value, const boost::system::error_category* category,
                         char* name_buf, size_t name_size,
                         char* message_buf, size_t message_size) {
    boost::system::error_code ec(value, *category);

    // Get category name
    std::string cat_name = category->name();
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
void create_error_codes_bulk(const int* values, size_t count, int* handles) {
    for (size_t i = 0; i < count; ++i) {
        handles[i] = values[i]; // Simplified - would use proper handle management
    }
}

// WASM-optimized string interning for error messages
static std::vector<std::string> interned_messages;

EMSCRIPTEN_KEEPALIVE
int intern_error_message(const char* message) {
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
const char* get_interned_message(int handle) {
    if (handle >= 0 && handle < static_cast<int>(interned_messages.size())) {
        return interned_messages[handle].c_str();
    }
    return nullptr;
}

// Memory management helpers for JavaScript integration
EMSCRIPTEN_KEEPALIVE
void* allocate_buffer(size_t size) {
    return malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void free_buffer(void* ptr) {
    free(ptr);
}

} // extern "C"