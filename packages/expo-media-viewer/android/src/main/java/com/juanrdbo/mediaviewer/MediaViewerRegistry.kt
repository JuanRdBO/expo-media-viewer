package com.juanrdbo.mediaviewer

import android.widget.ImageView
import java.lang.ref.WeakReference

/**
 * Weak-reference registry mapping (groupId, index) -> MediaViewerView / ImageView.
 *
 * Using weak references avoids holding stale views after they are detached/GC'd.
 * The inner ImageView is registered separately so alpha can be toggled directly on it
 * without going through Fabric's reconciler (which owns the MediaViewerView).
 */
object MediaViewerRegistry {
    private val viewRefs = mutableMapOf<String, MutableMap<Int, WeakReference<MediaViewerView>>>()
    private val imageRefs = mutableMapOf<String, MutableMap<Int, WeakReference<ImageView>>>()

    fun register(
        groupId: String,
        index: Int,
        view: MediaViewerView,
    ) {
        viewRefs.getOrPut(groupId) { mutableMapOf() }[index] = WeakReference(view)
    }

    fun registerImage(
        groupId: String,
        index: Int,
        imageView: ImageView,
    ) {
        imageRefs.getOrPut(groupId) { mutableMapOf() }[index] = WeakReference(imageView)
    }

    fun unregister(
        groupId: String,
        index: Int,
    ) {
        viewRefs[groupId]?.remove(index)
        imageRefs[groupId]?.remove(index)
    }

    fun getView(
        groupId: String,
        index: Int,
    ): MediaViewerView? = viewRefs[groupId]?.get(index)?.get()

    fun getImageView(
        groupId: String,
        index: Int,
    ): ImageView? = imageRefs[groupId]?.get(index)?.get()
}
