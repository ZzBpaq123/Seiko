package com.seiko.blog.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.CorsFilter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CorsConfigTest {

    private final CorsFilter filter = new CorsConfig()
            .corsFilter(" http://localhost:3001, http://localhost:3003, ").getFilter();

    @Test
    void allowsBlogAndManagePreflightWithTokenHeader() throws Exception {
        for (String origin : new String[]{"http://localhost:3001", "http://localhost:3003"}) {
            MockHttpServletResponse response = preflight(origin);
            assertEquals(200, response.getStatus());
            assertEquals(origin, response.getHeader("Access-Control-Allow-Origin"));
            assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
            assertEquals("token", response.getHeader("Access-Control-Allow-Headers"));
        }
    }

    @Test
    void rejectsUnconfiguredOrigin() throws Exception {
        MockHttpServletResponse response = preflight("https://untrusted.example");
        assertEquals(403, response.getStatus());
        assertNull(response.getHeader("Access-Control-Allow-Origin"));
    }

    private MockHttpServletResponse preflight(String origin) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/manage/posts");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
