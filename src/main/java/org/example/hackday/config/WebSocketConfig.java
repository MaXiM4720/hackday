package org.example.hackday.config;

import com.example.signaling.handler.SignalingWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.List;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SignalingWebSocketHandler signalingWebSocketHandler;
    private final List<String> allowedOrigins;

    public WebSocketConfig(
            SignalingWebSocketHandler signalingWebSocketHandler,
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins
    ) {
        this.signalingWebSocketHandler = signalingWebSocketHandler;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(signalingWebSocketHandler, "/ws/signaling")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new));
    }
}