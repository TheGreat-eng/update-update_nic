package com.example.iotserver.dto.gemini;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class GeminiRequest {
    private List<Content> contents = new ArrayList<>();

    public GeminiRequest(String text) {
        this.contents.add(new Content(text));
    }

    @Data
    public static class Content {
        private List<Part> parts = new ArrayList<>();
        public Content(String text) {
            this.parts.add(new Part(text));
        }
    }

    @Data
    public static class Part {
        private String text;
        public Part(String text) { this.text = text; }
    }
}