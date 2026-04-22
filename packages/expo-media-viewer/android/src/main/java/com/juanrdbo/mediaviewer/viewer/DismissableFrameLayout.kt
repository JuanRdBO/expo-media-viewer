package com.juanrdbo.mediaviewer.viewer

import android.content.Context
import android.view.MotionEvent
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * A FrameLayout that intercepts vertical swipe gestures for swipe-to-dismiss.
 * When the user starts dragging more vertically than horizontally (and beyond a
 * small threshold), this layout intercepts the touch so that the DismissGestureHelper
 * on the parent receives the full gesture — even though ViewPager2 is a child.
 */
class DismissableFrameLayout(
    context: Context,
) : FrameLayout(context) {
    private val density = context.resources.displayMetrics.density
    private val touchSlop = (10 * density)

    private var startX = 0f
    private var startY = 0f
    private var decided = false
    private var intercepting = false

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                startX = ev.rawX
                startY = ev.rawY
                decided = false
                intercepting = false
            }

            MotionEvent.ACTION_MOVE -> {
                if (decided) return intercepting
                val dx = abs(ev.rawX - startX)
                val dy = abs(ev.rawY - startY)
                if (dy > touchSlop || dx > touchSlop) {
                    decided = true
                    // Intercept if the gesture is more vertical than horizontal
                    intercepting = dy > dx * 1.5f
                    if (intercepting) {
                        // Disallow parent from stealing (e.g. ViewPager2 horizontal scroll)
                        parent?.requestDisallowInterceptTouchEvent(true)
                    }
                    return intercepting
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                decided = false
                intercepting = false
            }
        }
        return false
    }
}
