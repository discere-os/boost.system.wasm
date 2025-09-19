# @discere-os/boost.system.wasm

WebAssembly port of Boost.System - Error reporting and system integration library with SIMD optimization and comprehensive TypeScript interface.

[![CI/CD](https://github.com/discere-os/discere-nucleus/actions/workflows/boost.system-wasm-ci.yml/badge.svg)](https://github.com/discere-os/discere-nucleus/actions)
[![JSR](https://jsr.io/badges/@discere-os/boost.system.wasm)](https://jsr.io/@discere-os/boost.system.wasm)
[![npm version](https://badge.fury.io/js/@discere-os%2Fboost.system.wasm.svg)](https://badge.fury.io/js/@discere-os%2Fboost.system.wasm)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](https://github.com/discere-os/discere-nucleus)

# Boost.System

The Boost.System library, part of [Boost C++ Libraries](https://boost.org),
implements an extensible framework for error reporting in the form of an
`error_code` class and supporting facilities.

It has been proposed for the C++11 standard, has been accepted, and
is now available as part of the standard library in the `<system_error>`
header. However, the Boost implementation has continued to evolve and
gain enhancements and additional functionality, such as support for
attaching [source locations](https://www.boost.org/doc/libs/release/libs/assert/doc/html/assert.html#source_location_support)
to `error_code`, and a `result<T>` class that can carry either a value
or an error code.

See [the documentation of System](http://boost.org/libs/system) for more
information.

Since `<system_error>` is a relatively undocumented portion of the C++
standard library, the documentation of Boost.System may be useful to you
even if you use the standard components.

## License

Distributed under the
[Boost Software License, Version 1.0](http://boost.org/LICENSE_1_0.txt).

## 💖 Support This Work

This WebAssembly port is part of a larger effort to bring professional desktop applications to browsers with native performance.

**👨‍💻 About the Maintainer**: [Isaac Johnston (@superstructor)](https://github.com/superstructor) - Building foundational browser-native computing infrastructure through systematic C/C++ to WebAssembly porting.

**📊 Impact**: 70+ open source WASM libraries enabling professional applications like Blender, GIMP, and scientific computing tools to run natively in browsers.

**🚀 Your Support Enables**:
- Continued maintenance and updates
- Performance optimizations
- New library ports and integrations
- Documentation and tutorials
- Cross-browser compatibility testing

**[💖 Sponsor this work](https://github.com/sponsors/superstructor)** to help build the future of browser-native computing.