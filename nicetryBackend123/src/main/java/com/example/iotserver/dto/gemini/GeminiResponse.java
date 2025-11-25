package com.example.iotserver.dto.gemini;

import lombok.Data;
import java.util.List;

@Data
public class GeminiResponse {
    private List<Candidate> candidates;

    @Data
    public static class Candidate {
        private Content content;
    }

    @Data
    public static class Content {
        private List<Part> parts;
    }

    @Data
    public static class Part {
        private String text;
    }
    
    // Helper để lấy text nhanh
    public String getResponseText() {
        if (candidates != null && !candidates.isEmpty() && 
            candidates.get(0).getContent() != null && 
            !candidates.get(0).getContent().getParts().isEmpty()) {
            return candidates.get(0).getContent().getParts().get(0).getText();
        }
        return "";
    }
}