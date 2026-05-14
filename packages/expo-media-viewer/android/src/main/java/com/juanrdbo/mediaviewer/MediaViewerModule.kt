package com.juanrdbo.mediaviewer

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

            View(MediaViewerView::class) {
                Events("onIndexChange", "onVideoError")

                Prop("itemsJson") { view: MediaViewerView, itemsJson: String? -> view.itemsJson = itemsJson }

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
            }
        }
}
