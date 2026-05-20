package com.juanrdbo.mediaviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaViewerThumbnailAnchorTest {
    @Test
    fun `parse decodes corner radius and content fit`() {
        val anchor =
            MediaViewerThumbnailAnchor.parse(
                """
                {
                  "cornerRadius": 12,
                  "contentFit": "contain"
                }
                """.trimIndent(),
            ) ?: error("Expected thumbnail anchor")

        assertEquals(12f, anchor.cornerRadiusDp ?: 0f, 0.001f)
        assertEquals(MediaViewerThumbnailAnchor.CONTENT_FIT_CONTAIN, anchor.contentFit)
        assertEquals(30f, anchor.cornerRadiusPx(2.5f) ?: 0f, 0.001f)
    }

    @Test
    fun `parse defaults invalid fit to cover and drops invalid radius`() {
        val anchor =
            MediaViewerThumbnailAnchor.parse(
                """
                {
                  "cornerRadius": -4,
                  "contentFit": "stretch"
                }
                """.trimIndent(),
            ) ?: error("Expected thumbnail anchor")

        assertNull(anchor.cornerRadiusDp)
        assertEquals(MediaViewerThumbnailAnchor.CONTENT_FIT_COVER, anchor.contentFit)
    }

    @Test
    fun `parse returns null for blank or invalid payloads`() {
        assertNull(MediaViewerThumbnailAnchor.parse(null))
        assertNull(MediaViewerThumbnailAnchor.parse(""))
        assertNull(MediaViewerThumbnailAnchor.parse("not json"))
    }
}
