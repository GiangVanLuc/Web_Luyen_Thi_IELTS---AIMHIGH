package vn.aimhigh.aimhighbackend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.service.RedisService;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter implements Filter {

    private final RedisService redisService;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Chỉ chặn Rate Limit các luồng nhạy cảm cần bảo vệ tài nguyên
        boolean isSensitiveEndpoint = 
                (path.contains("/api/attempts/") && path.contains("/submit")) ||
                path.contains("/api/media/upload") ||
                path.contains("/api/ai/chat") ||
                path.contains("/api/auth/register") ||
                path.contains("/api/auth/login");

        if (isSensitiveEndpoint) {
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = request.getRemoteAddr();
            }

            // Giới hạn: Tối đa 5 request nhạy cảm trong vòng 60 giây
            boolean isLimited = redisService.isRateLimited(ip, 5, 60);
            
            if (isLimited) {
                log.warn("IP {} đang bị Rate Limit trên endpoint: {} {}", ip, method, path);
                
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                
                ApiResponse<String> apiResponse = ApiResponse.error(
                        "Bạn đang thao tác quá nhanh. Vui lòng đợi 1 phút trước khi thực hiện tiếp!", 429);
                
                response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
                return;
            }
        }

        filterChain.doFilter(servletRequest, servletResponse);
    }
}
