cmake_minimum_required(VERSION 3.15)

project(libOpenCOR
        VERSION 0.0.0)

# Enable C++20.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Get access to cmake-js.

include_directories(${CMAKE_JS_INC})

# Create the C++ add-on as a shared library.

add_library(${CMAKE_PROJECT_NAME} SHARED
            src/libopencor/interface.cpp
            src/libopencor/interface.h
            ${CMAKE_JS_SRC})

# Don't have a "lib" prefix and use a ".node" suffix.

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
                      PREFIX ""
                      SUFFIX ".node")

# Essential library files to link to a Node.js add-on.

target_link_libraries(${CMAKE_PROJECT_NAME}
                      ${CMAKE_JS_LIB})

# Include the Node-API wrappers.

execute_process(COMMAND node -p "require('node-addon-api').include"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_ADDON_API_DIR)

string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${CMAKE_PROJECT_NAME} PRIVATE
                           ${NODE_ADDON_API_DIR})

add_definitions(-DNAPI_VERSION=3)
