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

                Prop("urls") { view: MediaViewerView, urls: Array<String> -> view.urls = urls }

                Prop("index") { view: MediaViewerView, index: Int -> view.initialIndex = index }

                Prop("theme") { view: MediaViewerView, theme: String? ->
                    view.theme = if (theme == "light") ViewerTheme.Light else ViewerTheme.Dark
                }

                Prop("mediaTypes") { view: MediaViewerView, mediaTypes: Array<String>? ->
                    view.mediaTypes = mediaTypes
                }

                Prop("posterUrls") { view: MediaViewerView, posterUrls: Array<String>? ->
                    view.posterUrls = posterUrls
                }

                Prop("edgeToEdge") { view: MediaViewerView, edgeToEdge: Boolean ->
                    view.edgeToEdge = edgeToEdge
                }

                Prop("hidePageIndicators") { view: MediaViewerView, hidePageIndicators: Boolean ->
                    view.hidePageIndicators = hidePageIndicators
                }

                Prop("topTitles") { view: MediaViewerView, topTitles: Array<String>? ->
                    view.topTitles = topTitles
                }
                Prop("topSubtitles") { view: MediaViewerView, topSubtitles: Array<String>? ->
                    view.topSubtitles = topSubtitles
                }
                Prop("bottomTexts") { view: MediaViewerView, bottomTexts: Array<String>? ->
                    view.bottomTexts = bottomTexts
                }
            }
        }
}
