cmake_minimum_required(VERSION 3.15)

project(libOpenCOR VERSION 0.0.0)

# Enable C++20.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Some common CMake policies.

foreach(POLICY CMP0042 CMP0091)
    cmake_policy(SET ${POLICY} NEW)
endforeach()

# Get access to cmake-js.

include_directories(${CMAKE_JS_INC})

# Get access to libOpenCOR.

if(WIN32)
    set(PLATFORM Windows)
    set(EXTENSION .zip)
elseif(APPLE)
    set(PLATFORM macOS)
    set(EXTENSION .zip)
else()
    set(PLATFORM Linux)
    set(EXTENSION .tar.gz)
endif()

if(WIN32)
    if("${CMAKE_CXX_COMPILER_ARCHITECTURE_ID}" STREQUAL "x64")
        set(ARCHITECTURE Intel)
    else()
        set(ARCHITECTURE ARM)
    endif()
else()
    if("${CMAKE_HOST_SYSTEM_PROCESSOR}" STREQUAL "x86_64")
        set(ARCHITECTURE Intel)
    else()
        set(ARCHITECTURE ARM)
    endif()
endif()

set(LIBOPENCOR_FILE_NAME_WE ${CMAKE_PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${PLATFORM}-${ARCHITECTURE}-Shared)
set(LIBOPENCOR_FILE_NAME ${LIBOPENCOR_FILE_NAME_WE}${EXTENSION})

file(DOWNLOAD https://opencor.ws/libopencor/downloads/${LIBOPENCOR_FILE_NAME}
              ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

execute_process(COMMAND ${CMAKE_COMMAND} -E tar xvf ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME}
                WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
                OUTPUT_QUIET)

execute_process(COMMAND ${CMAKE_COMMAND} -E rename ${LIBOPENCOR_FILE_NAME_WE} Shared
                WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
                OUTPUT_QUIET)

file(REMOVE ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

include_directories(${CMAKE_BINARY_DIR}/Shared/include
                    ${CMAKE_BINARY_DIR}/Shared/include/libopencor/module)

# Use the appropriate C runtime library.

if(MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
endif()

# Don't allow unresolved symbols.
# Note: MSVC doesn't allow unresolved symbols, so we only need to look for them if we are building using GNU or Clang.

if(BUILDING_USING_GNU)
    SET(CMAKE_SHARED_LINKER_FLAGS -Wl,--no-undefined)
elseif(BUILDING_USING_CLANG)
    # On macOS, only use the -Wl,--no-undefined option if we are not using Xcode 15.0 or later since otherwise the
    # linker is going to generate some warnings about -undefined error being deprecated.

    if(APPLE)
        # Get the Xcode version.
        # Note: CMake has XCODE_VERSION, but it's only available when using the Xcode generator. So, we need to get the
        #       Xcode version ourselves. And, depending on how Xcode was installed, we may need to get the Xcode version
        #       using softwareupdate.

        execute_process(COMMAND xcodebuild -version
                        OUTPUT_VARIABLE XCODE_VERSION
                        OUTPUT_STRIP_TRAILING_WHITESPACE
                        RESULT_VARIABLE RESULT
                        ERROR_QUIET)

        if(NOT RESULT EQUAL 0)
            execute_process(COMMAND softwareupdate --history
                            COMMAND awk "/Command Line Tools for Xcode/ {print \$6}"
                            COMMAND tail -1
                            OUTPUT_VARIABLE XCODE_VERSION
                            OUTPUT_STRIP_TRAILING_WHITESPACE
                            ERROR_QUIET)
        endif()
    else()
        set(XCODE_VERSION 0)
    endif()

    if(XCODE_VERSION VERSION_LESS 15.0)
        SET(CMAKE_SHARED_LINKER_FLAGS -Wl,-undefined,error)
    endif()
endif()

# Create our Node.js add-on as a shared library.

add_library(${CMAKE_PROJECT_NAME} SHARED
            ${CMAKE_JS_SRC}
            src/libopencor/src/main.cpp
            src/libopencor/src/version.cpp)

# Don't have a "lib" prefix and use a ".node" suffix.

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
                      PREFIX ""
                      SUFFIX ".node")

# Generate node.lib.

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()

# Link cmake-js and libOpenCOR to our Node.js add-on.

if(WIN32)
    set(LIBOPENCOR_DIR bin)
    set(FULL_LIBOPENCOR_FILENAME ${CMAKE_PROJECT_NAME}${CMAKE_SHARED_LIBRARY_SUFFIX})
else()
    set(LIBOPENCOR_DIR lib)

    if(APPLE)
        set(FULL_LIBOPENCOR_FILENAME ${CMAKE_PROJECT_NAME}.${CMAKE_PROJECT_VERSION}${CMAKE_SHARED_LIBRARY_SUFFIX})
    else()
        set(FULL_LIBOPENCOR_FILENAME ${CMAKE_PROJECT_NAME}${CMAKE_SHARED_LIBRARY_SUFFIX}.${CMAKE_PROJECT_VERSION})
    endif()
endif()

execute_process(COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/Shared/${LIBOPENCOR_DIR}/${FULL_LIBOPENCOR_FILENAME}
                                                 ${CMAKE_BINARY_DIR}/../${FULL_LIBOPENCOR_FILENAME})

if(WIN32)
    set(LIBOPENCOR_FILENAME ${CMAKE_PROJECT_NAME}${CMAKE_IMPORT_LIBRARY_SUFFIX})

    execute_process(COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/Shared/lib/${LIBOPENCOR_FILENAME}
                                                     ${CMAKE_BINARY_DIR}/../${LIBOPENCOR_FILENAME})
else()
    set(LIBOPENCOR_FILENAME ${FULL_LIBOPENCOR_FILENAME})
endif()

target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE
                      ${CMAKE_JS_LIB}
                      ${CMAKE_BINARY_DIR}/../${LIBOPENCOR_FILENAME})

set(LIBOPENCOR_NODE_FILENAME ${CMAKE_BINARY_DIR}/../${CMAKE_PROJECT_NAME}.node)

add_custom_command(TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
                   COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:${CMAKE_PROJECT_NAME}>
                                                    ${LIBOPENCOR_NODE_FILENAME})

# On Linux, replace the RUNPATH value with an RPATH value of $ORIGIN so that, once deployed, OpenCOR can find our C++
# version of libOpenCOR.

if(NOT WIN32 AND NOT APPLE)
    find_program(PATCHELF patchelf REQUIRED)

    add_custom_command(TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
                       COMMAND ${PATCHELF} --set-rpath "\\$$ORIGIN" --force-rpath ${LIBOPENCOR_NODE_FILENAME})
endif()

# Configure our splash screen.

string(TIMESTAMP CURRENT_YEAR "%Y")

if(CURRENT_YEAR EQUAL 2025)
    set(COPYRIGHT "2025")
else()
    set(COPYRIGHT "2025-${CURRENT_YEAR}")
endif()

set(VERSION ${PROJECT_VERSION})

configure_file(src/main/assets/splashscreen.html.in
               ${CMAKE_BINARY_DIR}/../splashscreen.html)
