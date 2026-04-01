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

    lateinit var urls: Array<String>
    var initialIndex: Int = 0
    var theme: ViewerTheme = ViewerTheme.Dark
    var mediaTypes: Array<String>? = null
    var hidePageIndicators: Boolean = false
    var topTitles: Array<String>? = null
    var topSubtitles: Array<String>? = null
    var bottomTexts: Array<String>? = null

    private var groupId: String = ""
    private var registeredIndex: Int = -1
    private var activeDialog: MediaViewerDialogFragment? = null

    private fun computeGroupId(): String =
        if (::urls.isInitialized && urls.isNotEmpty()) urls.joinToString(",").hashCode().toString() else ""

    private val clampedIndex: Int
        get() = if (::urls.isInitialized && urls.isNotEmpty()) initialIndex.coerceIn(0, urls.size - 1) else initialIndex

    private fun registerIfNeeded() {
        val newGroupId = computeGroupId()
        if (newGroupId.isEmpty()) {
            // URLs cleared — unregister stale entry if any
            if (groupId.isNotEmpty()) {
                MediaViewerRegistry.unregister(groupId, registeredIndex)
                groupId = ""
                registeredIndex = -1
            }
            return
        }
        val idx = clampedIndex
        if (newGroupId != groupId || idx != registeredIndex) {
            if (groupId.isNotEmpty()) MediaViewerRegistry.unregister(groupId, registeredIndex)
            groupId = newGroupId
            registeredIndex = idx
            MediaViewerRegistry.register(groupId, registeredIndex, this)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        registerIfNeeded()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (groupId.isNotEmpty()) MediaViewerRegistry.unregister(groupId, registeredIndex)
        groupId = ""
        registeredIndex = -1
    }

    override fun onLayout(
        changed: Boolean,
        l: Int,
        t: Int,
        r: Int,
        b: Int,
    ) {
        registerIfNeeded()
        setupClickListener(this)
    }

    private fun setupClickListener(viewGroup: ViewGroup) {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is ImageView) {
                MediaViewerRegistry.registerImage(groupId, clampedIndex, child)
                child.setOnClickListener {
                    openViewer(child)
                }
            } else if (child is ViewGroup) {
                setupClickListener(child)
            }
        }
    }

    private fun openViewer(thumbnailView: ImageView) {
        if (!::urls.isInitialized || urls.isEmpty()) return
        val activity = getActivity() ?: return
        val fm = (activity as? FragmentActivity)?.supportFragmentManager ?: return

        // Capture thumbnail rect in screen coordinates for shared element transition
        val loc = IntArray(2)
        thumbnailView.getLocationOnScreen(loc)
        val thumbRect =
            android.graphics.Rect(
                loc[0],
                loc[1],
                loc[0] + thumbnailView.width,
                loc[1] + thumbnailView.height,
            )

        val gId = groupId
        val idx = clampedIndex

        val dialog =
            MediaViewerDialogFragment.newInstance(
                urls = urls,
                initialIndex = idx,
                theme = theme,
                mediaTypes = mediaTypes,
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

        dialog.onDismissed = { _ ->
            restoreAllThumbnails()
            activeDialog = null
        }

        dialog.onSwipeDismissed = { _ ->
            restoreAllThumbnails()
            activeDialog = null
        }

        activeDialog = dialog
        if (fm.isStateSaved) return
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
