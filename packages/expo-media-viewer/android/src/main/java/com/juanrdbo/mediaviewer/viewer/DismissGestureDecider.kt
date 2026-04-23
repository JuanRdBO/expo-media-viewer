package com.juanrdbo.mediaviewer.viewer

import kotlin.math.abs

internal object DismissGestureDecider {
    private const val DISMISS_DISTANCE_DP = 80
    private const val FAST_VERTICAL_SWIPE_DP = 200

    fun shouldDismiss(
        totalDx: Float,
        totalDy: Float,
        velocityX: Float,
        velocityY: Float,
        density: Float,
    ): Boolean {
        val combinedX = totalDx + velocityX / 2f
        val combinedY = totalDy + velocityY / 2f

        return combinedX + combinedY > DISMISS_DISTANCE_DP * density ||
            abs(combinedY) > FAST_VERTICAL_SWIPE_DP * density
    }
}
