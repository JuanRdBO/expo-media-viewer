package com.juanrdbo.mediaviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MediaViewerVideoSessionLeaseTrackerTest {
    @Test
    fun `keeps session leased until preview and fullscreen owners release`() {
        val tracker = MediaViewerVideoSessionLeaseTracker()

        assertTrue(tracker.acquire("preview"))
        assertTrue(tracker.acquire("fullscreen"))

        assertEquals(2, tracker.leaseCount)
        assertTrue(tracker.hasLeases())

        assertTrue(tracker.release("fullscreen"))

        assertEquals(1, tracker.leaseCount)
        assertTrue(tracker.hasLeases())

        assertTrue(tracker.release("preview"))

        assertEquals(0, tracker.leaseCount)
        assertFalse(tracker.hasLeases())
    }

    @Test
    fun `ignores duplicate acquire for same owner`() {
        val tracker = MediaViewerVideoSessionLeaseTracker()

        assertTrue(tracker.acquire("preview"))
        assertFalse(tracker.acquire("preview"))

        assertEquals(1, tracker.leaseCount)
    }

    @Test
    fun `ignores duplicate release for same owner`() {
        val tracker = MediaViewerVideoSessionLeaseTracker()

        tracker.acquire("preview")

        assertTrue(tracker.release("preview"))
        assertFalse(tracker.release("preview"))

        assertEquals(0, tracker.leaseCount)
        assertFalse(tracker.hasLeases())
    }
}
