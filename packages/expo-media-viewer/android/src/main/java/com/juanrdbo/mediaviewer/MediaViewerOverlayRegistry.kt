package com.juanrdbo.mediaviewer

import com.juanrdbo.mediaviewer.viewer.MediaViewerDialogFragment
import java.lang.ref.WeakReference

/**
 * Weak registry mapping `(groupId, placement)` -> a parked overlay view,
 * mirroring [MediaViewerRegistry]. The fullscreen [MediaViewerDialogFragment]
 * pulls the parked RN view out by key and reparents it while presented.
 *
 * Registrations are weak, so a detached/GC'd view clears itself — we never
 * unregister on detach because the view *detaches* when it is reparented into
 * the dialog.
 */
object MediaViewerOverlayRegistry {
    private val views = mutableMapOf<String, WeakReference<MediaViewerOverlayView>>()

    private fun key(
        groupId: String,
        placement: String,
    ) = "$groupId::$placement"

    fun register(
        groupId: String,
        placement: String,
        view: MediaViewerOverlayView,
    ) {
        views[key(groupId, placement)] = WeakReference(view)
    }

    fun unregister(
        groupId: String,
        placement: String,
    ) {
        views.remove(key(groupId, placement))
    }

    fun getView(
        groupId: String,
        placement: String,
    ): MediaViewerOverlayView? = views[key(groupId, placement)]?.get()
}

/**
 * Tracks the currently-presented fullscreen viewer so a JS `dismiss()` call
 * (used by custom header/footer `close()` handlers) can dismiss it. Only one
 * viewer is presented at a time.
 */
object MediaViewerActiveSession {
    private var dialogRef: WeakReference<MediaViewerDialogFragment>? = null

    fun setCurrent(dialog: MediaViewerDialogFragment) {
        dialogRef = WeakReference(dialog)
    }

    fun clear(dialog: MediaViewerDialogFragment) {
        if (dialogRef?.get() === dialog) dialogRef = null
    }

    fun requestDismiss() {
        dialogRef?.get()?.requestDismiss()
    }
}
