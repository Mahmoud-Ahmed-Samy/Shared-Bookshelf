package com.bookshelf.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bookshelf.integration.OpenLibraryService;

@RestController
@RequestMapping("/api/open-library")
public class OpenLibraryController {

    private final OpenLibraryService openLibraryService;

    public OpenLibraryController(OpenLibraryService openLibraryService) {
        this.openLibraryService = openLibraryService;
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String title, @RequestParam(required = false) String author) {
        OpenLibraryService.OpenLibraryMatch match = openLibraryService.findBookDetails(title, author);
        if (match == null) {
            return ResponseEntity.ok().body(null);
        }
        return ResponseEntity.ok(match);
    }

    @GetMapping("/covers/{coverId}")
    public ResponseEntity<byte[]> cover(@PathVariable long coverId) {
        OpenLibraryService.CoverImage cover = openLibraryService.fetchCover(coverId);
        MediaType mediaType = MediaType.parseMediaType(cover.contentType());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(mediaType)
                .body(cover.bytes());
    }
}
