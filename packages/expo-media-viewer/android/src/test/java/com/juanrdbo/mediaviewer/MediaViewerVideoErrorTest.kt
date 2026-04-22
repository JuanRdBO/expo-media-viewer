package com.juanrdbo.mediaviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class MediaViewerVideoErrorTest {
    @Test
    fun `toEventPayload includes required fields and optional diagnostics`() {
        val payload =
            MediaViewerVideoError(
                index = 3,
                url = "https://example.com/video.mp4",
                message = "failed",
                nativeMessage = "native",
                underlyingMessage = "cause",
            ).toEventPayload()

        assertEquals(3, payload["index"])
        assertEquals("https://example.com/video.mp4", payload["url"])
        assertEquals("failed", payload["message"])
        assertEquals("android", payload["platform"])
        assertEquals("remote", payload["stage"])
        assertEquals("native", payload["nativeMessage"])
        assertEquals("cause", payload["underlyingMessage"])
    }

    @Test
    fun `toEventPayload omits empty optional messages`() {
        val payload =
            MediaViewerVideoError(
                index = 0,
                url = "https://example.com/video.mp4",
                message = "failed",
            ).toEventPayload()

        assertFalse(payload.containsKey("nativeMessage"))
        assertFalse(payload.containsKey("underlyingMessage"))
    }
}
