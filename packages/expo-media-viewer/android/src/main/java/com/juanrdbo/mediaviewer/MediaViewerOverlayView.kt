package com.juanrdbo.mediaviewer

import android.content.Context
import android.view.ViewGroup
import androidx.annotation.Keep
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * Hosts custom RN overlay content for the fullscreen viewer. It is mounted in
 * the normal RN tree (parked, hidden) and registers itself by
 * `(groupId, placement)`. The dialog reparents it into its own window while
 * presented and calls [restoreToParkedParent] on dismiss, which returns it to
 * its original RN parent so Fabric keeps owning its children the whole time.
 *
 * ponytail: cross-window reparenting of a Fabric-managed view. Known ceiling —
 * if the host `MediaViewer` unmounts *while the viewer is open*, Fabric may try
 * to remove this view from a parent it no longer lives in. Restore is guarded,
 * but the bullet-proof fix would be a dedicated React root in the dialog window.
 */
@Keep
class MediaViewerOverlayView(
    context: Context,
    appContext: AppContext,
) : ExpoView(context, appContext) {
    var providedGroupId: String? = null
        set(value) {
            field = value
            registerWithRegistry()
        }

    var placement: String? = null
        set(value) {
            field = value
            registerWithRegistry()
        }

    private var registeredGroupId: String? = null
    private var registeredPlacement: String? = null

    private var savedParent: ViewGroup? = null
    private var savedIndex: Int = -1
    private var savedLayoutParams: ViewGroup.LayoutParams? = null

    private fun registerWithRegistry() {
        val newGroupId = providedGroupId
        val newPlacement = placement
        val prevGroupId = registeredGroupId
        val prevPlacement = registeredPlacement
        if (prevGroupId != null &&
            prevPlacement != null &&
            (prevGroupId != newGroupId || prevPlacement != newPlacement)
        ) {
            MediaViewerOverlayRegistry.unregister(prevGroupId, prevPlacement)
            registeredGroupId = null
            registeredPlacement = null
        }
        if (newGroupId.isNullOrEmpty() || newPlacement.isNullOrEmpty()) return
        MediaViewerOverlayRegistry.register(newGroupId, newPlacement, this)
        registeredGroupId = newGroupId
        registeredPlacement = newPlacement
    }

    /** Detach from the parked RN wrapper, remembering where to put it back. */
    fun detachForPresentation() {
        val parent = this.parent as? ViewGroup ?: return
        savedParent = parent
        savedIndex = parent.indexOfChild(this)
        savedLayoutParams = layoutParams
        parent.removeView(this)
    }

    /** Return to the parked RN parent after the viewer dismisses. */
    fun restoreToParkedParent() {
        (parent as? ViewGroup)?.removeView(this)
        translationY = 0f
        alpha = 1f
        val parent = savedParent
        if (parent != null && parent.isAttachedToWindow) {
            val index = savedIndex.coerceIn(0, parent.childCount)
            parent.addView(this, index, savedLayoutParams ?: layoutParams)
        }
        savedParent = null
        savedIndex = -1
        savedLayoutParams = null
    }
}
