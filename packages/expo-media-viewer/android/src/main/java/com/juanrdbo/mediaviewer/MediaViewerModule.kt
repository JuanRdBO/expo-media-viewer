package com.juanrdbo.mediaviewer

import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MediaViewerModule : Module() {
    companion object {
        private const val TAG = "MediaViewer"
    }

    override fun definition() =
        ModuleDefinition {
            Name("MediaViewer")

            // Reads GPS from an asset ID or filename, using MediaStore original access when possible.
            AsyncFunction("readGpsFromPhoto") { assetId: String?, fileName: String? ->
                val context = appContext.reactContext ?: return@AsyncFunction null

                try {
                    MediaViewerGpsReader.readGpsFromPhoto(context, assetId, fileName)
                } catch (e: Exception) {
                    Log.w(TAG, "readGpsFromPhoto failed", e)
                    null
                }
            }

            // Dismisses the currently presented viewer (used by custom overlay close()).
            AsyncFunction("dismiss") {
                Handler(Looper.getMainLooper()).post {
                    MediaViewerActiveSession.requestDismiss()
                }
            }

            View(MediaViewerView::class) {
                Events("onIndexChange", "onVideoError")

                Prop("itemsJson") { view: MediaViewerView, itemsJson: String? -> view.itemsJson = itemsJson }

                Prop("groupId") { view: MediaViewerView, groupId: String? -> view.providedGroupId = groupId }

                Prop("thumbnailAnchorJson") { view: MediaViewerView, thumbnailAnchorJson: String? ->
                    view.thumbnailAnchorJson = thumbnailAnchorJson
                }

                Prop("index") { view: MediaViewerView, index: Int -> view.initialIndex = index }

                Prop("theme") { view: MediaViewerView, theme: String? ->
                    view.theme = if (theme == "light") ViewerTheme.Light else ViewerTheme.Dark
                }

                Prop("edgeToEdge") { view: MediaViewerView, edgeToEdge: Boolean ->
                    view.edgeToEdge = edgeToEdge
                }

                Prop("hidePageIndicators") { view: MediaViewerView, hidePageIndicators: Boolean ->
                    view.hidePageIndicators = hidePageIndicators
                }

                Prop("hideCloseButton") { view: MediaViewerView, hideCloseButton: Boolean ->
                    view.hideCloseButton = hideCloseButton
                }
            }

            View(MediaViewerOverlayView::class) {
                Name("MediaViewerOverlayView")

                Prop("groupId") { view: MediaViewerOverlayView, groupId: String? -> view.providedGroupId = groupId }

                Prop("placement") { view: MediaViewerOverlayView, placement: String? -> view.placement = placement }
            }

            View(MediaViewerVideoThumbnailView::class) {
                Name("MediaViewerVideoThumbnailView")

                Prop("groupId") { view: MediaViewerVideoThumbnailView, groupId: String? -> view.groupId = groupId }

                Prop("index") { view: MediaViewerVideoThumbnailView, index: Int -> view.index = index }

                Prop("itemJson") { view: MediaViewerVideoThumbnailView, itemJson: String? -> view.itemJson = itemJson }

                Prop("fit") { view: MediaViewerVideoThumbnailView, fit: String? -> view.fit = fit ?: "cover" }
            }
        }
}
