/**
 * Simple WebAssembly implementation for Boost.System-like functionality
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Boost Software License, Version 1.0
 *
 * This is a simplified implementation that avoids namespace conflicts
 * with standard library error_code by using different names.
 */

#include <emscripten.h>
#include <string>
#include <vector>
#include <cstring>
#include <unordered_map>

// Simple error code representation
struct boost_error_code {
    int value;
    int category; // 0 = system, 1 = generic
    std::string message;

    boost_error_code() : value(0), category(0) {}
    boost_error_code(int val, int cat) : value(val), category(cat) {
        message = get_message(val, cat);
    }

private:
    std::string get_message(int val, int cat) {
        if (cat == 0) { // system category
            static const std::unordered_map<int, std::string> system_messages = {
                {0, "Success"},
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
                {404, "Not found"},
                {500, "Internal server error"},
                {503, "Service unavailable"},
            };

            auto it = system_messages.find(val);
            if (it != system_messages.end()) {
                return it->second;
            }
            return "System error " + std::to_string(val);
        } else { // generic category
            static const std::unordered_map<int, std::string> generic_messages = {
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
                {22, "Invalid argument"},
                {23, "Function not supported"},
                {24, "Host unreachable"},
                {25, "Identifier removed"},
            };

            auto it = generic_messages.find(val);
            if (it != generic_messages.end()) {
                return it->second;
            }
            return "Generic error " + std::to_string(val);
        }
    }
};

// Storage for created error codes and messages
static std::vector<boost_error_code> error_storage;
static std::vector<std::string> message_storage;
static std::vector<std::string> interned_messages;

extern "C" {

// Create error code with category
EMSCRIPTEN_KEEPALIVE
int wasm_create_error_code(int value, int category_type) {
    error_storage.emplace_back(value, category_type);
    return error_storage.size() - 1; // Return index as handle
}

// Compare error codes efficiently
EMSCRIPTEN_KEEPALIVE
bool wasm_compare_error_codes(int handle1, int handle2) {
    if (handle1 < 0 || handle1 >= static_cast<int>(error_storage.size()) ||
        handle2 < 0 || handle2 >= static_cast<int>(error_storage.size())) {
        return false;
    }

    const auto& ec1 = error_storage[handle1];
    const auto& ec2 = error_storage[handle2];
    return ec1.value == ec2.value && ec1.category == ec2.category;
}

// Format error message with proper UTF-8 handling
EMSCRIPTEN_KEEPALIVE
const char* wasm_format_error_message(int value, int category_type) {
    boost_error_code ec(value, category_type);
    message_storage.emplace_back(ec.message);
    return message_storage.back().c_str();
}

// Get category name
EMSCRIPTEN_KEEPALIVE
const char* wasm_get_category_name(int category_type) {
    if (category_type == 0) {
        return "system";
    } else if (category_type == 1) {
        return "generic";
    }
    return "unknown";
}

// Get system category (returns pointer as int for JS)
EMSCRIPTEN_KEEPALIVE
int wasm_get_system_category() {
    return 0; // System category identifier
}

// Get generic category (returns pointer as int for JS)
EMSCRIPTEN_KEEPALIVE
int wasm_get_generic_category() {
    return 1; // Generic category identifier
}

// Batch error code validation
EMSCRIPTEN_KEEPALIVE
void wasm_validate_error_codes_batch(const int* values, const int* categories, bool* results, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        // Basic validation - check for reasonable ranges
        bool valid = (values[i] >= 0 && values[i] <= 9999) &&
                    (categories[i] >= 0 && categories[i] <= 1);
        results[i] = valid;
    }
}

// Create JS error info
EMSCRIPTEN_KEEPALIVE
int wasm_create_js_error_info(int value, int category_type,
                              char* name_buf, size_t name_size,
                              char* message_buf, size_t message_size) {
    boost_error_code ec(value, category_type);

    // Get category name
    const char* cat_name = wasm_get_category_name(category_type);
    if (strlen(cat_name) < name_size) {
        strcpy(name_buf, cat_name);
    } else {
        strncpy(name_buf, cat_name, name_size - 1);
        name_buf[name_size - 1] = '\0';
    }

    // Get error message
    if (ec.message.length() < message_size) {
        strcpy(message_buf, ec.message.c_str());
    } else {
        strncpy(message_buf, ec.message.c_str(), message_size - 1);
        message_buf[message_size - 1] = '\0';
    }

    return ec.value;
}

// Bulk error code creation
EMSCRIPTEN_KEEPALIVE
void wasm_create_error_codes_bulk(const int* values, const int* category_types, size_t count, int* handles) {
    for (size_t i = 0; i < count; ++i) {
        error_storage.emplace_back(values[i], category_types[i]);
        handles[i] = error_storage.size() - 1;
    }
}

// String interning for error messages
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

// Memory management helpers
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

// Get error code info by handle
EMSCRIPTEN_KEEPALIVE
bool wasm_get_error_code_info(int handle, int* value, int* category, char* message_buf, size_t message_size) {
    if (handle < 0 || handle >= static_cast<int>(error_storage.size())) {
        return false;
    }

    const auto& ec = error_storage[handle];
    *value = ec.value;
    *category = ec.category;

    if (ec.message.length() < message_size) {
        strcpy(message_buf, ec.message.c_str());
    } else {
        strncpy(message_buf, ec.message.c_str(), message_size - 1);
        message_buf[message_size - 1] = '\0';
    }

    return true;
}

} // extern "C"