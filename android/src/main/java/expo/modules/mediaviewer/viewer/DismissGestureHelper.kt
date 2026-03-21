package expo.modules.mediaviewer.viewer

import android.animation.ValueAnimator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.animation.OvershootInterpolator
import kotlin.math.abs
import kotlin.math.max

/**
 * iOS-style drag-to-dismiss for the media viewer.
 *
 * Mirrors the iOS MatchTransition behavior:
 * - Content scales down + follows finger at half speed
 * - Slight rotation follows horizontal movement
 * - Background fades based on drag progress
 * - Spring snap-back or fly-out dismiss
 * - Haptic feedback on drag start
 */
class DismissGestureHelper(
    private val backgroundView: View,
    private val contentView: View,
    private val onDismiss: () -> Unit,
    private val onIntercepting: ((Boolean) -> Unit)? = null,
) : View.OnTouchListener {

    private val density = backgroundView.resources.displayMetrics.density
    private val screenW = backgroundView.context.resources.displayMetrics.widthPixels.toFloat()
    private val screenH = backgroundView.context.resources.displayMetrics.heightPixels.toFloat()
    private val maxAxis = max(screenW, screenH)

    private var startX = 0f
    private var startY = 0f
    private var totalDx = 0f
    private var totalDy = 0f
    private var isIntercepting = false
    private var velocityTracker: VelocityTracker? = null

    override fun onTouch(v: View, event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                startX = event.rawX
                startY = event.rawY
                totalDx = 0f
                totalDy = 0f
                isIntercepting = false
                velocityTracker?.recycle()
                velocityTracker = VelocityTracker.obtain()
                velocityTracker?.addMovement(event)
            }

            MotionEvent.ACTION_MOVE -> {
                velocityTracker?.addMovement(event)
                val dx = event.rawX - startX
                val dy = event.rawY - startY

                if (!isIntercepting) {
                    if (abs(dy) > 15 * density && abs(dy) > abs(dx) * 1.5f) {
                        isIntercepting = true
                        onIntercepting?.invoke(true)
                        hapticFeedback()
                        // Reset start to current position so first frame isn't a jump
                        startX = event.rawX
                        startY = event.rawY
                        totalDx = 0f
                        totalDy = 0f
                    } else {
                        return false
                    }
                }

                totalDx = event.rawX - startX
                totalDy = event.rawY - startY

                // Progress: based on total displacement relative to screen
                val progress = (abs(totalDx) / maxAxis + abs(totalDy) / maxAxis) * 1.2f

                // Scale: shrinks from 1.0 based on progress (matches iOS feel)
                val scale = (1f - progress * 0.35f).coerceIn(0.6f, 1f)
                contentView.scaleX = scale
                contentView.scaleY = scale

                // Translate: content follows finger at half speed (like iOS matched transition)
                contentView.translationX = totalDx * 0.5f
                contentView.translationY = totalDy * 0.5f

                // Rotation: slight tilt following horizontal movement
                contentView.rotation = totalDx * 0.02f

                // Background: fade based on progress
                backgroundView.alpha = (1f - progress * 1.5f).coerceIn(0f, 1f)
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (!isIntercepting) return false

                velocityTracker?.addMovement(event)
                velocityTracker?.computeCurrentVelocity(1000)
                val vx = velocityTracker?.xVelocity ?: 0f
                val vy = velocityTracker?.yVelocity ?: 0f
                velocityTracker?.recycle()
                velocityTracker = null

                isIntercepting = false
                onIntercepting?.invoke(false)

                // Dismiss decision: matches iOS — translation + velocity/2 > 80
                val combinedX = totalDx + vx / 2f
                val combinedY = totalDy + vy / 2f
                val shouldDismiss = combinedX + combinedY > 80 * density ||
                    abs(combinedY) > 200 * density // also dismiss on strong upward swipe

                if (shouldDismiss) {
                    // Let the dialog handle the dismiss animation (snap to thumbnail)
                    onDismiss()
                } else {
                    springBack()
                }
            }
        }
        return isIntercepting
    }

    private fun springBack() {
        // Spring-like snap back to original position
        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 350
            interpolator = OvershootInterpolator(1.2f)
            val startTx = contentView.translationX
            val startTy = contentView.translationY
            val startScale = contentView.scaleX
            val startRotation = contentView.rotation
            val startAlpha = backgroundView.alpha

            addUpdateListener { anim ->
                val t = anim.animatedFraction
                contentView.translationX = startTx * (1f - t)
                contentView.translationY = startTy * (1f - t)
                val s = startScale + (1f - startScale) * t
                contentView.scaleX = s
                contentView.scaleY = s
                contentView.rotation = startRotation * (1f - t)
                backgroundView.alpha = startAlpha + (1f - startAlpha) * t
            }
        }
        animator.start()
    }

    private fun hapticFeedback() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = backgroundView.context.getSystemService(VibratorManager::class.java)
                vm?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = backgroundView.context.getSystemService(Vibrator::class.java)
                vibrator?.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        } catch (_: Exception) {
            // Vibration permission may not be granted
        }
    }
}
