package com.juanrdbo.mediaviewer

import android.content.Context
import android.graphics.Matrix
import android.util.AttributeSet
import android.view.TextureView
import android.view.View.MeasureSpec
import android.widget.FrameLayout
import kotlin.math.roundToInt

class MediaViewerVideoSurfaceFrame
    @JvmOverloads
    constructor(
        context: Context,
        attrs: AttributeSet? = null,
    ) : FrameLayout(context, attrs) {
    var fit: String = "cover"
        set(value) {
            field = value
            onGeometryChanged?.invoke()
            requestLayout()
        }

    var onGeometryChanged: (() -> Unit)? = null

    private var videoAspectRatio = 0f

    private data class ChildSize(
        val width: Int,
        val height: Int,
    )

    init {
        clipChildren = true
        clipToPadding = true
    }

    fun setVideoSize(
        width: Int,
        height: Int,
        rotationDegrees: Int,
        pixelWidthHeightRatio: Float,
    ) {
        val nextAspectRatio =
            if (width > 0 && height > 0) {
                val pixelRatio = pixelWidthHeightRatio.takeIf { it > 0f } ?: 1f
                val encodedAspectRatio = (width.toFloat() * pixelRatio) / height.toFloat()
                if (rotationDegrees.mod(180) == 90) {
                    1f / encodedAspectRatio
                } else {
                    encodedAspectRatio
                }
            } else {
                0f
            }
        if (videoAspectRatio != nextAspectRatio) {
            videoAspectRatio = nextAspectRatio
            onGeometryChanged?.invoke()
            requestLayout()
        }
    }

    override fun onSizeChanged(
        width: Int,
        height: Int,
        oldWidth: Int,
        oldHeight: Int,
    ) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        if (width != oldWidth || height != oldHeight) {
            onGeometryChanged?.invoke()
        }
    }

    fun applyTextureTransform(textureView: TextureView?): Boolean {
        if (textureView == null || textureView.width <= 0 || textureView.height <= 0 || videoAspectRatio <= 0f) {
            textureView?.setTransform(null)
            return false
        }

        val textureAspectRatio = textureView.width.toFloat() / textureView.height.toFloat()
        var scaleX = 1f
        var scaleY = 1f
        if (fit == "contain") {
            if (textureAspectRatio > videoAspectRatio) {
                scaleX = videoAspectRatio / textureAspectRatio
            } else {
                scaleY = textureAspectRatio / videoAspectRatio
            }
        } else {
            if (textureAspectRatio > videoAspectRatio) {
                scaleY = textureAspectRatio / videoAspectRatio
            } else {
                scaleX = videoAspectRatio / textureAspectRatio
            }
        }

        val matrix = Matrix()
        matrix.setScale(
            scaleX,
            scaleY,
            textureView.width / 2f,
            textureView.height / 2f,
        )
        textureView.setTransform(matrix)
        return true
    }

    override fun onLayout(
        changed: Boolean,
        left: Int,
        top: Int,
        right: Int,
        bottom: Int,
    ) {
        val child = getChildAt(0) ?: return
        val parentWidth = right - left
        val parentHeight = bottom - top
        val childSize = resolveChildSize(parentWidth, parentHeight)
        val childLeft = (parentWidth - childSize.width) / 2
        val childTop = (parentHeight - childSize.height) / 2
        child.layout(childLeft, childTop, childLeft + childSize.width, childTop + childSize.height)
    }

    override fun onMeasure(
        widthMeasureSpec: Int,
        heightMeasureSpec: Int,
    ) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        val child = getChildAt(0) ?: return
        val childSize = resolveChildSize(measuredWidth, measuredHeight)
        child.measure(
            MeasureSpec.makeMeasureSpec(childSize.width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(childSize.height, MeasureSpec.EXACTLY),
        )
    }

    private fun resolveChildSize(
        parentWidth: Int,
        parentHeight: Int,
    ): ChildSize {
        if (parentWidth <= 0 || parentHeight <= 0 || videoAspectRatio <= 0f) {
            return ChildSize(parentWidth, parentHeight)
        }

        val parentAspectRatio = parentWidth.toFloat() / parentHeight.toFloat()
        val shouldFillWidth =
            if (fit == "contain") {
                parentAspectRatio <= videoAspectRatio
            } else {
                parentAspectRatio >= videoAspectRatio
            }

        return if (shouldFillWidth) {
            ChildSize(
                width = parentWidth,
                height = (parentWidth / videoAspectRatio).roundToInt(),
            )
        } else {
            ChildSize(
                width = (parentHeight * videoAspectRatio).roundToInt(),
                height = parentHeight,
            )
        }
    }
}
