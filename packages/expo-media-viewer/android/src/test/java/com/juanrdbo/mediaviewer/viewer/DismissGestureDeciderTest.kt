package com.juanrdbo.mediaviewer.viewer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DismissGestureDeciderTest {
    @Test
    fun `dismisses when combined translation clears threshold`() {
        assertTrue(
            DismissGestureDecider.shouldDismiss(
                totalDx = 90f,
                totalDy = 10f,
                velocityX = 0f,
                velocityY = 0f,
                density = 1f,
            ),
        )
    }

    @Test
    fun `dismisses on fast vertical swipe`() {
        assertTrue(
            DismissGestureDecider.shouldDismiss(
                totalDx = 0f,
                totalDy = -10f,
                velocityX = 0f,
                velocityY = -500f,
                density = 1f,
            ),
        )
    }

    @Test
    fun `keeps viewer when gesture stays below thresholds`() {
        assertFalse(
            DismissGestureDecider.shouldDismiss(
                totalDx = 20f,
                totalDy = 15f,
                velocityX = 0f,
                velocityY = 0f,
                density = 1f,
            ),
        )
    }
}
