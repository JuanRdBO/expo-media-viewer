package com.juanrdbo.mediaviewer

import android.content.Context
import android.view.ViewGroup
import android.widget.ImageView
import androidx.annotation.Keep
import androidx.fragment.app.FragmentActivity
import com.juanrdbo.mediaviewer.viewer.MediaViewerDialogFragment
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

enum class ViewerTheme { Dark, Light }

@Keep
class MediaViewerView(
    context: Context,
    appContext: AppContext,
) : ExpoView(context, appContext) {
    val onIndexChange by EventDispatcher()
    val onVideoError by EventDispatcher()

    var itemsJson: String? = null
        set(value) {
            field = value
            items = MediaViewerItemParser.parse(value)
        }
    var items: List<MediaViewerItem> = emptyList()
    var initialIndex: Int = 0
    var theme: ViewerTheme = ViewerTheme.Dark
    var edgeToEdge: Boolean = true
    var hidePageIndicators: Boolean = false

    private var groupId: String = ""

    private fun computeGroupId(): String =
        itemsJson?.takeIf { it.isNotBlank() }?.hashCode()?.toString().orEmpty()

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        groupId = computeGroupId()
        if (groupId.isNotEmpty()) MediaViewerRegistry.register(groupId, initialIndex, this)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (groupId.isNotEmpty()) MediaViewerRegistry.unregister(groupId, initialIndex)
    }

    override fun onLayout(
        changed: Boolean,
        l: Int,
        t: Int,
        r: Int,
        b: Int,
    ) {
        val newGroupId = computeGroupId()
        if (newGroupId.isNotEmpty() && newGroupId != groupId) {
            if (groupId.isNotEmpty()) MediaViewerRegistry.unregister(groupId, initialIndex)
            groupId = newGroupId
            MediaViewerRegistry.register(groupId, initialIndex, this)
        }
        setupWrapperClickListener()
        setupClickListener(this)
    }

    private fun setupWrapperClickListener() {
        isClickable = true
        setOnClickListener {
            val imageView = findImageView(this)
            imageView?.let {
                MediaViewerRegistry.registerImage(groupId, initialIndex, imageView)
            }
            openViewer()
        }
    }

    private fun findImageView(viewGroup: ViewGroup): ImageView? {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is ImageView) return child
            if (child is ViewGroup) {
                findImageView(child)?.let { return it }
            }
        }
        return null
    }

    private fun setupClickListener(viewGroup: ViewGroup) {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is ImageView) {
                MediaViewerRegistry.registerImage(groupId, initialIndex, child)
                child.setOnClickListener {
                    openViewer()
                }
            } else if (child is ViewGroup) {
                setupClickListener(child)
            }
        }
    }

    private fun openViewer() {
        if (items.isEmpty()) return

        val activity = getActivity() as? FragmentActivity ?: return
        val groupIdForOpen = groupId.takeIf { it.isNotEmpty() } ?: computeGroupId()
        val thumbnailRect =
            IntArray(2)
                .also { getLocationOnScreen(it) }
                .let { location ->
                    android.graphics.Rect(
                        location[0],
                        location[1],
                        location[0] + width,
                        location[1] + height,
                    )
                }

        val dialog =
            MediaViewerDialogFragment.newInstance(
                itemsJson = itemsJson,
                initialIndex = initialIndex,
                theme = theme,
                edgeToEdge = edgeToEdge,
                hidePageIndicators = hidePageIndicators,
                groupId = groupIdForOpen,
                thumbnailRect = thumbnailRect,
            )

        dialog.onIndexChanged = { newIndex ->
            onIndexChange(mapOf("currentIndex" to newIndex))
        }
        dialog.onVideoError = { error ->
            onVideoError(error.toEventPayload())
        }

        val restoreAllThumbnails = {
            for (i in items.indices) {
                MediaViewerRegistry.getView(groupIdForOpen, i)?.alpha = 1f
            }
        }

        dialog.onEnterAnimationStart = {
            MediaViewerRegistry.getView(groupIdForOpen, initialIndex)?.alpha = 0f
        }

        dialog.onDismissed = { _ -> restoreAllThumbnails() }
        dialog.onSwipeDismissed = { _ -> restoreAllThumbnails() }

        dialog.show(activity.supportFragmentManager, "media_viewer")
    }

    private fun getActivity(): android.app.Activity? {
        var ctx = context
        while (ctx is android.content.ContextWrapper) {
            if (ctx is android.app.Activity) return ctx
            ctx = ctx.baseContext
        }
        return null
    }
}
