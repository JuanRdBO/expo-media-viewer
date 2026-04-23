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

    lateinit var urls: Array<String>
    var initialIndex: Int = 0
    var theme: ViewerTheme = ViewerTheme.Dark
    var mediaTypes: Array<String>? = null
    var posterUrls: Array<String>? = null
    var edgeToEdge: Boolean = true
    var hidePageIndicators: Boolean = false
    var topTitles: Array<String>? = null
    var topSubtitles: Array<String>? = null
    var bottomTexts: Array<String>? = null

    private var groupId: String = ""

    private fun computeGroupId(): String =
        if (::urls.isInitialized) urls.joinToString(",").hashCode().toString() else ""

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
        // Re-compute groupId after props are set (urls may not be available at onAttached time)
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
                openViewer()
            }
        }
    }

    private fun findImageView(viewGroup: ViewGroup): ImageView? {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is ImageView) {
                return child
            }
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
        if (!::urls.isInitialized || urls.isEmpty()) {
            return
        }
        val activity = getActivity()
        if (activity == null) {
            return
        }
        val fm = (activity as? FragmentActivity)?.supportFragmentManager
        if (fm == null) {
            return
        }

        // Capture the wrapper rect, not expo-image's internal ImageView.
        // The wrapper bounds match the visible thumbnail cell the user tracks on screen.
        val loc = IntArray(2)
        getLocationOnScreen(loc)
        val thumbRect =
            android.graphics.Rect(
                loc[0],
                loc[1],
                loc[0] + width,
                loc[1] + height,
            )

        val gId = groupId
        val idx = initialIndex

        val dialog =
            MediaViewerDialogFragment.newInstance(
                urls = urls,
                initialIndex = initialIndex,
                theme = theme,
                mediaTypes = mediaTypes,
                posterUrls = posterUrls,
                edgeToEdge = edgeToEdge,
                hidePageIndicators = hidePageIndicators,
                groupId = groupId,
                thumbnailRect = thumbRect,
                topTitles = topTitles,
                topSubtitles = topSubtitles,
                bottomTexts = bottomTexts,
            )

        dialog.onIndexChanged = { newIndex ->
            onIndexChange(mapOf("currentIndex" to newIndex))
        }
        dialog.onVideoError = { error ->
            onVideoError(error.toEventPayload())
        }

        val restoreAllThumbnails = {
            // Restore alpha on ALL MediaViewerViews (ExpoView wrappers) in this group
            for (i in urls.indices) {
                MediaViewerRegistry.getView(gId, i)?.alpha = 1f
            }
        }

        dialog.onEnterAnimationStart = {
            // Hide the ExpoView wrapper, not the inner ImageView (which React can recreate)
            MediaViewerRegistry.getView(gId, idx)?.alpha = 0f
        }

        dialog.onDismissed = { _ -> restoreAllThumbnails() }

        dialog.onSwipeDismissed = { _ -> restoreAllThumbnails() }

        dialog.show(fm, "media_viewer")
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
