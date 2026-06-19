package com.juanrdbo.mediaviewer

import android.graphics.Rect
import android.view.View

internal data class MediaViewerPresentationRequest(
    val itemsJson: String?,
    val initialIndex: Int,
    val theme: ViewerTheme,
    val edgeToEdge: Boolean,
    val hidePageIndicators: Boolean,
    val hideCloseButton: Boolean,
    val groupId: String,
    val thumbnailRect: Rect,
    val thumbnailAnchorJson: String?,
) {
    companion object {
        fun fromView(
            view: View,
            itemsJson: String?,
            initialIndex: Int,
            theme: ViewerTheme,
            edgeToEdge: Boolean,
            hidePageIndicators: Boolean,
            hideCloseButton: Boolean,
            groupId: String,
            thumbnailAnchorJson: String?,
        ): MediaViewerPresentationRequest =
            MediaViewerPresentationRequest(
                itemsJson = itemsJson,
                initialIndex = initialIndex,
                theme = theme,
                edgeToEdge = edgeToEdge,
                hidePageIndicators = hidePageIndicators,
                hideCloseButton = hideCloseButton,
                groupId = groupId,
                thumbnailRect = view.screenRect(),
                thumbnailAnchorJson = thumbnailAnchorJson,
            )
    }
}

private fun View.screenRect(): Rect {
    val location = IntArray(2)
    getLocationOnScreen(location)
    return Rect(location[0], location[1], location[0] + width, location[1] + height)
}
