cmake_minimum_required(VERSION 3.16)
project(resume_backend_tests CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── GoogleTest ────────────────────────────────────────────────────────────────
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# ── Backend dependencies (same as main build) ─────────────────────────────────
find_package(OpenSSL REQUIRED)
find_package(jsoncpp REQUIRED)

find_package(PkgConfig QUIET)
if(PKG_CONFIG_FOUND)
    pkg_check_modules(ZLIB QUIET zlib)
endif()
if(NOT ZLIB_FOUND)
    find_package(ZLIB REQUIRED)
endif()

# ── Source files under test (exclude main.cpp and Drogon controllers) ─────────
set(SOURCES_UNDER_TEST
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/JWTHelper.cc
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/exporters/TeXExporter.cc
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/exporters/DOCXExporter.cc
)

# ── Test executables ──────────────────────────────────────────────────────────
add_executable(test_jwt_helper
    test_jwt_helper.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/JWTHelper.cc
)
target_include_directories(test_jwt_helper PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
)
target_link_libraries(test_jwt_helper
    PRIVATE
    GTest::gtest_main
    OpenSSL::SSL
    OpenSSL::Crypto
    jsoncpp_lib
)

add_executable(test_tex_exporter
    test_tex_exporter.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/exporters/TeXExporter.cc
)
target_include_directories(test_tex_exporter PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
)
target_link_libraries(test_tex_exporter
    PRIVATE
    GTest::gtest_main
    jsoncpp_lib
)

add_executable(test_docx_exporter
    test_docx_exporter.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/exporters/DOCXExporter.cc
)
target_include_directories(test_docx_exporter PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
)
target_link_libraries(test_docx_exporter
    PRIVATE
    GTest::gtest_main
    jsoncpp_lib
    ZLIB::ZLIB
)

# ── CTest integration ─────────────────────────────────────────────────────────
include(GoogleTest)
gtest_discover_tests(test_jwt_helper)
gtest_discover_tests(test_tex_exporter)
gtest_discover_tests(test_docx_exporter)
