package com.juanrdbo.mediaviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MediaViewerItemParserTest {
    @Test
    fun `parse decodes the native payload contract`() {
        val items =
            MediaViewerItemParser.parse(
                """
                [
                  {
                    "id": "video-1",
                    "type": "video",
                    "uri": "https://example.com/video.mp4",
                    "headers": {
                      "Authorization": "Bearer token",
                      "X-Blank": ""
                    },
                    "thumbnailUri": "https://example.com/poster.jpg",
                    "thumbnailHeaders": {
                      "X-Poster": "poster"
                    },
                    "thumbnailMode": "loop-muted",
                    "title": "Video title",
                    "subtitle": "Video subtitle",
                    "footer": "1 of 2"
                  }
                ]
                """.trimIndent(),
            )

        assertEquals(1, items.size)
        val item = items.single()
        assertEquals("video-1", item.id)
        assertEquals("video", item.type)
        assertEquals("https://example.com/video.mp4", item.uri)
        assertEquals(mapOf("Authorization" to "Bearer token"), item.headers)
        assertEquals("https://example.com/poster.jpg", item.thumbnailUri)
        assertEquals(mapOf("X-Poster" to "poster"), item.thumbnailHeaders)
        assertEquals("loop-muted", item.thumbnailMode)
        assertEquals("Video title", item.title)
        assertEquals("Video subtitle", item.subtitle)
        assertEquals("1 of 2", item.footer)
    }

    @Test
    fun `parse generates stable fallback ids`() {
        val items =
            MediaViewerItemParser.parse(
                """
                [
                  {
                    "type": "image",
                    "uri": "https://example.com/photo.jpg"
                  }
                ]
                """.trimIndent(),
            )

        assertEquals("image:https://example.com/photo.jpg:0", items.single().id)
    }

    @Test
    fun `parse skips malformed payload entries`() {
        val items =
            MediaViewerItemParser.parse(
                """
                [
                  { "type": "image" },
                  null,
                  { "type": "image", "uri": "https://example.com/photo.jpg" }
                ]
                """.trimIndent(),
            )

        assertEquals(1, items.size)
        assertEquals("https://example.com/photo.jpg", items.single().uri)
    }

    @Test
    fun `parse returns an empty list for blank or invalid payloads`() {
        assertTrue(MediaViewerItemParser.parse(null).isEmpty())
        assertTrue(MediaViewerItemParser.parse("").isEmpty())
        assertTrue(MediaViewerItemParser.parse("not json").isEmpty())
    }

    @Test
    fun `parse treats empty optional strings and headers as absent`() {
        val item =
            MediaViewerItemParser
                .parse(
                    """
                    [
                      {
                        "type": "image",
                        "uri": "https://example.com/photo.jpg",
                        "headers": {
                          "X-Blank": ""
                        },
                        "title": "",
                        "subtitle": "",
                        "footer": ""
                      }
                    ]
                    """.trimIndent(),
                ).single()

        assertNull(item.headers)
        assertNull(item.title)
        assertNull(item.subtitle)
        assertNull(item.footer)
    }
}
