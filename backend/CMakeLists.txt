cmake_minimum_required(VERSION 3.16)
project(resume_backend CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_BUILD_TYPE Release)

# ── Dependencies ──────────────────────────────────────────────────────────────
find_package(Drogon CONFIG REQUIRED)
find_package(OpenSSL REQUIRED)

# Optional: libharu for PDF
find_package(PkgConfig QUIET)
if(PKG_CONFIG_FOUND)
    pkg_check_modules(HARU QUIET libharu)
endif()

# ── Sources ───────────────────────────────────────────────────────────────────
file(GLOB_RECURSE SOURCES
    src/controllers/*.cc
    src/filters/*.cc
    src/exporters/*.cc
    src/utils/*.cc
)

add_executable(resume_backend main.cpp ${SOURCES})

target_include_directories(resume_backend PRIVATE src)

target_link_libraries(resume_backend
    PRIVATE
    Drogon::Drogon
    OpenSSL::SSL
    OpenSSL::Crypto
)

if(HARU_FOUND)
    target_include_directories(resume_backend PRIVATE ${HARU_INCLUDE_DIRS})
    target_link_libraries(resume_backend PRIVATE ${HARU_LIBRARIES})
    target_compile_definitions(resume_backend PRIVATE HAVE_LIBHARU)
endif()

# ── Tests (opt-in: cmake -DBUILD_TESTS=ON ..) ─────────────────────────────────
option(BUILD_TESTS "Build the Google Test suite" OFF)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
