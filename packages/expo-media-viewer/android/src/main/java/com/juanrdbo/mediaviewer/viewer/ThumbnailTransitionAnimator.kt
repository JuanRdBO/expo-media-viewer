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
import androidx.core.view.doOnPreDraw
import kotlin.math.max

internal object ThumbnailTransitionAnimator {
    fun runEnterAnimation(
        root: View,
        contentContainer: FrameLayout,
        backgroundView: View,
        thumbnailRect: Rect?,
        sourceView: View?,
        onStart: (() -> Unit)? = null,
        onEnd: (() -> Unit)? = null,
    ) {
        if (thumbnailRect == null || thumbnailRect.width() <= 0 || thumbnailRect.height() <= 0) {
            onEnd?.invoke()
            return
        }
        contentContainer.alpha = 0f
        backgroundView.alpha = 0f
        root.doOnPreDraw {
            if (root.width <= 0 || root.height <= 0) {
                contentContainer.alpha = 1f
                backgroundView.alpha = 1f
                onEnd?.invoke()
                return@doOnPreDraw
            }

            val rootLocation = IntArray(2)
            root.getLocationOnScreen(rootLocation)

            val containerW = root.width.toFloat()
            val containerH = root.height.toFloat()
            val thumbW = thumbnailRect.width().toFloat()
            val thumbH = thumbnailRect.height().toFloat()
            val thumbCenterX = thumbnailRect.centerX().toFloat() - rootLocation[0].toFloat()
            val thumbCenterY = thumbnailRect.centerY().toFloat() - rootLocation[1].toFloat()
            val containerCenterX = containerW / 2f
            val containerCenterY = containerH / 2f
            val uniformScale = max(thumbW / containerW, thumbH / containerH)
            val thumbRadius = findCornerRadius(sourceView, root.resources.displayMetrics.density)

            contentContainer.alpha = 1f
            contentContainer.pivotX = containerCenterX
            contentContainer.pivotY = containerCenterY
            contentContainer.scaleX = uniformScale
            contentContainer.scaleY = uniformScale
            contentContainer.translationX = thumbCenterX - containerCenterX
            contentContainer.translationY = thumbCenterY - containerCenterY

            val startClipW = thumbW / uniformScale
            val startClipH = thumbH / uniformScale
            val startClipL = (containerW - startClipW) / 2f
            val startClipT = (containerH - startClipH) / 2f
            applyClip(
                contentContainer,
                startClipL,
                startClipT,
                startClipW,
                startClipH,
                thumbRadius / uniformScale,
            )

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
                        contentContainer.translationX = (thumbCenterX - containerCenterX) * (1f - progress)
                        contentContainer.translationY = (thumbCenterY - containerCenterY) * (1f - progress)
                        backgroundView.alpha = progress

                        val clipW = startClipW + (containerW - startClipW) * progress
                        val clipH = startClipH + (containerH - startClipH) * progress
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
                                contentContainer.scaleX = 1f
                                contentContainer.scaleY = 1f
                                contentContainer.translationX = 0f
                                contentContainer.translationY = 0f
                                backgroundView.alpha = 1f
                                onEnd?.invoke()
                            }
                        },
                    )
                }.start()
        }
    }

    fun animateDismiss(
        contentContainer: FrameLayout?,
        backgroundView: View?,
        targetView: View?,
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

        val targetRect = resolveTargetRect(targetView, fallbackThumbnailRect)
        val targetCornerRadius =
            findCornerRadius(targetView, container.resources.displayMetrics.density)

        if (targetRect == null || targetRect.width() <= 0) {
            container.animate().alpha(0f).setDuration(200).start()
            background.animate().alpha(0f).setDuration(200).withEndAction(onComplete).start()
            return
        }

        if (container.width <= 0 || container.height <= 0) {
            onComplete()
            return
        }

        val coordinateSpaceLocation = IntArray(2)
        // During drag-to-dismiss the content container is already translated.
        // Measuring the target relative to that shifted container makes the
        // thumbnail appear too high/low on return. Use the stable background
        // layer instead, which stays pinned to the dialog root.
        background.getLocationOnScreen(coordinateSpaceLocation)

        val screenW = container.width.toFloat()
        val screenH = container.height.toFloat()
        val thumbW = targetRect.width().toFloat()
        val thumbH = targetRect.height().toFloat()
        val thumbCenterX = targetRect.centerX().toFloat() - coordinateSpaceLocation[0].toFloat()
        val thumbCenterY = targetRect.centerY().toFloat() - coordinateSpaceLocation[1].toFloat()
        val screenCenterX = screenW / 2f
        val screenCenterY = screenH / 2f
        val endScale = max(thumbW / screenW, thumbH / screenH)

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
                val startVisibleW = screenW * startScaleX
                val startVisibleH = screenH * startScaleY

                addUpdateListener { animation ->
                    val progress = animation.animatedFraction
                    val scaleX = startScaleX + (endScale - startScaleX) * progress
                    val scaleY = startScaleY + (endScale - startScaleY) * progress
                    container.scaleX = scaleX
                    container.scaleY = scaleY
                    container.translationX = startTx + ((thumbCenterX - screenCenterX) - startTx) * progress
                    container.translationY = startTy + ((thumbCenterY - screenCenterY) - startTy) * progress
                    container.rotation = startRotation * (1f - progress)
                    background.alpha = startAlpha * (1f - progress)

                    val visibleW = startVisibleW + (thumbW - startVisibleW) * progress
                    val visibleH = startVisibleH + (thumbH - startVisibleH) * progress
                    val clipW = visibleW / scaleX
                    val clipH = visibleH / scaleY
                    val clipL = (screenW - clipW) / 2f
                    val clipT = (screenH - clipH) / 2f
                    val radius = (targetCornerRadius / max(scaleX, scaleY)) * progress
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
        targetView: View?,
        fallbackThumbnailRect: Rect?,
    ): Rect? {
        if (targetView == null || targetView.width <= 0) {
            return fallbackThumbnailRect
        }

        val location = IntArray(2)
        targetView.getLocationOnScreen(location)
        return Rect(
            location[0],
            location[1],
            location[0] + targetView.width,
            location[1] + targetView.height,
        )
    }

    private fun findCornerRadius(
        view: View?,
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
