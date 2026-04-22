package com.juanrdbo.mediaviewer.viewer

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.Outline
import android.graphics.Rect
import android.view.View
import android.view.ViewOutlineProvider
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import kotlin.math.max

internal object ThumbnailTransitionAnimator {
    fun runEnterAnimation(
        root: View,
        contentContainer: FrameLayout,
        backgroundView: View,
        thumbnailRect: Rect?,
        sourceImageView: ImageView?,
        onStart: (() -> Unit)? = null,
    ) {
        if (thumbnailRect == null || thumbnailRect.width() <= 0 || thumbnailRect.height() <= 0) {
            return
        }

        val screenW = root.resources.displayMetrics.widthPixels.toFloat()
        val screenH = root.resources.displayMetrics.heightPixels.toFloat()
        val thumbW = thumbnailRect.width().toFloat()
        val thumbH = thumbnailRect.height().toFloat()
        val thumbCenterX = thumbnailRect.centerX().toFloat()
        val thumbCenterY = thumbnailRect.centerY().toFloat()
        val screenCenterX = screenW / 2f
        val screenCenterY = screenH / 2f
        val uniformScale = max(thumbW / screenW, thumbH / screenH)
        val thumbRadius = findCornerRadius(sourceImageView, root.resources.displayMetrics.density)

        contentContainer.pivotX = screenCenterX
        contentContainer.pivotY = screenCenterY
        contentContainer.scaleX = uniformScale
        contentContainer.scaleY = uniformScale
        contentContainer.translationX = thumbCenterX - screenCenterX
        contentContainer.translationY = thumbCenterY - screenCenterY
        backgroundView.alpha = 0f

        val startClipW = thumbW / uniformScale
        val startClipH = thumbH / uniformScale
        val startClipL = (screenW - startClipW) / 2f
        val startClipT = (screenH - startClipH) / 2f
        applyClip(contentContainer, startClipL, startClipT, startClipW, startClipH, thumbRadius / uniformScale)

        root.post {
            onStart?.invoke()
            ValueAnimator
                .ofFloat(0f, 1f)
                .apply {
                    duration = 300
                    interpolator = DecelerateInterpolator(2.5f)
                    addUpdateListener { animation ->
                        val progress = animation.animatedFraction
                        val scale = uniformScale + (1f - uniformScale) * progress
                        contentContainer.scaleX = scale
                        contentContainer.scaleY = scale
                        contentContainer.translationX = (thumbCenterX - screenCenterX) * (1f - progress)
                        contentContainer.translationY = (thumbCenterY - screenCenterY) * (1f - progress)
                        backgroundView.alpha = progress

                        val clipW = startClipW + (screenW - startClipW) * progress
                        val clipH = startClipH + (screenH - startClipH) * progress
                        val clipL = startClipL * (1f - progress)
                        val clipT = startClipT * (1f - progress)
                        val radius = (thumbRadius / scale) * (1f - progress)
                        applyClip(contentContainer, clipL, clipT, clipW, clipH, radius)
                    }
                    addListener(
                        object : AnimatorListenerAdapter() {
                            override fun onAnimationEnd(animation: Animator) {
                                contentContainer.clipToOutline = false
                                contentContainer.outlineProvider = ViewOutlineProvider.BACKGROUND
                            }
                        },
                    )
                }.start()
        }
    }

    fun animateDismiss(
        contentContainer: FrameLayout?,
        backgroundView: View?,
        targetImageView: ImageView?,
        fallbackThumbnailRect: Rect?,
        onComplete: () -> Unit,
    ) {
        val container = contentContainer ?: run {
            onComplete()
            return
        }
        val background = backgroundView ?: run {
            onComplete()
            return
        }

        val targetRect = resolveTargetRect(targetImageView, fallbackThumbnailRect)
        val targetCornerRadius =
            findCornerRadius(targetImageView, container.resources.displayMetrics.density)

        if (targetRect == null || targetRect.width() <= 0) {
            container.animate().alpha(0f).setDuration(200).start()
            background.animate().alpha(0f).setDuration(200).withEndAction(onComplete).start()
            return
        }

        val screenW = container.resources.displayMetrics.widthPixels.toFloat()
        val screenH = container.resources.displayMetrics.heightPixels.toFloat()
        val thumbW = targetRect.width().toFloat()
        val thumbH = targetRect.height().toFloat()
        val thumbCenterX = targetRect.centerX().toFloat()
        val thumbCenterY = targetRect.centerY().toFloat()
        val screenCenterX = screenW / 2f
        val screenCenterY = screenH / 2f
        val endScale = max(thumbW / screenW, thumbH / screenH)
        val endClipW = thumbW / endScale
        val endClipH = thumbH / endScale
        val endClipL = (screenW - endClipW) / 2f
        val endClipT = (screenH - endClipH) / 2f

        container.pivotX = screenCenterX
        container.pivotY = screenCenterY
        container.clipToOutline = true

        ValueAnimator
            .ofFloat(0f, 1f)
            .apply {
                duration = 300
                interpolator = DecelerateInterpolator(2.5f)
                val startScaleX = container.scaleX
                val startScaleY = container.scaleY
                val startTx = container.translationX
                val startTy = container.translationY
                val startAlpha = background.alpha
                val startRotation = container.rotation

                addUpdateListener { animation ->
                    val progress = animation.animatedFraction
                    val scale = startScaleX + (endScale - startScaleX) * progress
                    container.scaleX = scale
                    container.scaleY = startScaleY + (endScale - startScaleY) * progress
                    container.translationX = startTx + ((thumbCenterX - screenCenterX) - startTx) * progress
                    container.translationY = startTy + ((thumbCenterY - screenCenterY) - startTy) * progress
                    container.rotation = startRotation * (1f - progress)
                    background.alpha = startAlpha * (1f - progress)

                    val clipL = endClipL * progress
                    val clipT = endClipT * progress
                    val clipW = screenW + (endClipW - screenW) * progress
                    val clipH = screenH + (endClipH - screenH) * progress
                    val radius = (targetCornerRadius / scale) * progress
                    applyClip(container, clipL, clipT, clipW, clipH, radius)
                }
                addListener(
                    object : AnimatorListenerAdapter() {
                        override fun onAnimationEnd(animation: Animator) {
                            onComplete()
                        }
                    },
                )
            }.start()
    }

    private fun resolveTargetRect(
        targetImageView: ImageView?,
        fallbackThumbnailRect: Rect?,
    ): Rect? {
        if (targetImageView == null || targetImageView.width <= 0) {
            return fallbackThumbnailRect
        }

        val location = IntArray(2)
        targetImageView.getLocationOnScreen(location)
        return Rect(
            location[0],
            location[1],
            location[0] + targetImageView.width,
            location[1] + targetImageView.height,
        )
    }

    private fun findCornerRadius(
        view: ImageView?,
        fallbackDensity: Float,
    ): Float {
        if (view == null) {
            return 16f * fallbackDensity
        }

        var current: View? = view
        while (current != null) {
            if (current.clipToOutline && current.outlineProvider != null) {
                val outline = Outline()
                current.outlineProvider.getOutline(current, outline)
                if (outline.radius > 0) {
                    return outline.radius
                }
            }
            current = current.parent as? View
        }
        return 16f * fallbackDensity
    }

    private fun applyClip(
        view: View,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        radius: Float,
    ) {
        view.clipToOutline = true
        view.outlineProvider =
            object : ViewOutlineProvider() {
                override fun getOutline(
                    v: View,
                    outline: Outline,
                ) {
                    outline.setRoundRect(
                        left.toInt(),
                        top.toInt(),
                        (left + width).toInt(),
                        (top + height).toInt(),
                        radius,
                    )
                }
            }
        view.invalidateOutline()
    }
}
