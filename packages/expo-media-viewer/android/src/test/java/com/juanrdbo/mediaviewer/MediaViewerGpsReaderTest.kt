package com.juanrdbo.mediaviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaViewerGpsReaderTest {
    @Test
    fun `extractMediaStoreId returns trailing numeric segment`() {
        assertEquals(42L, MediaViewerGpsReader.extractMediaStoreId("asset:media/42"))
        assertEquals(123L, MediaViewerGpsReader.extractMediaStoreId("123"))
    }

    @Test
    fun `extractMediaStoreId returns null for invalid values`() {
        assertNull(MediaViewerGpsReader.extractMediaStoreId(null))
        assertNull(MediaViewerGpsReader.extractMediaStoreId(""))
        assertNull(MediaViewerGpsReader.extractMediaStoreId("asset:media/not-a-number"))
    }
}
