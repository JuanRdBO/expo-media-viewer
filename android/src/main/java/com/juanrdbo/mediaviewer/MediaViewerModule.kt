package com.juanrdbo.mediaviewer

import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MediaViewerModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("MediaViewer")

            // Read GPS coordinates from a MediaStore asset ID.
            // Reconstructs the content:// URI and uses MediaStore.setRequireOriginal()
            // to bypass Android 10+ scoped storage GPS stripping.
            // Read GPS from an asset ID or filename. Tries multiple strategies.
            AsyncFunction("readGpsFromPhoto") { assetId: String?, fileName: String? ->
                val context = appContext.reactContext ?: return@AsyncFunction null

                try {
                    var contentUri: Uri? = null

                    // Strategy 1: use asset ID to build content URI
                    if (assetId != null) {
                        val numericId = assetId.substringAfterLast(':').toLongOrNull()
                        if (numericId != null) {
                            contentUri =
                                android.content.ContentUris.withAppendedId(
                                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                                    numericId,
                                )
                        }
                        android.util.Log.d("MediaViewer", "readGpsFromPhoto: assetId=$assetId numericId=$numericId")
                    }

                    // Strategy 2: query MediaStore by filename
                    if (contentUri == null && fileName != null) {
                        val cursor =
                            context.contentResolver.query(
                                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                                arrayOf(MediaStore.Images.Media._ID),
                                "${MediaStore.Images.Media.DISPLAY_NAME} = ?",
                                arrayOf(fileName),
                                "${MediaStore.Images.Media.DATE_ADDED} DESC",
                            )
                        cursor?.use {
                            if (it.moveToFirst()) {
                                val id = it.getLong(it.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
                                contentUri =
                                    android.content.ContentUris.withAppendedId(
                                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                                        id,
                                    )
                                android.util.Log.d(
                                    "MediaViewer",
                                    "readGpsFromPhoto: found by filename=$fileName id=$id",
                                )
                            }
                        }
                    }

                    if (contentUri == null) {
                        android.util.Log.w(
                            "MediaViewer",
                            "readGpsFromPhoto: no content URI found",
                        )
                        return@AsyncFunction null
                    }

                    // On Android 10+, request the original file (with GPS intact)
                    val resolvedUri =
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            try {
                                MediaStore.setRequireOriginal(contentUri!!)
                            } catch (e: Exception) {
                                android.util.Log.w("MediaViewer", "setRequireOriginal failed: ${e.message}")
                                contentUri!!
                            }
                        } else {
                            contentUri!!
                        }

                    val inputStream = context.contentResolver.openInputStream(resolvedUri)
                    if (inputStream == null) {
                        android.util.Log.w("MediaViewer", "readGpsFromPhoto: openInputStream returned null")
                        return@AsyncFunction null
                    }

                    inputStream.use { stream ->
                        val exif = ExifInterface(stream)
                        val latLong = FloatArray(2)
                        if (exif.getLatLong(latLong)) {
                            val lat = latLong[0].toDouble()
                            val lng = latLong[1].toDouble()
                            android.util.Log.d("MediaViewer", "readGpsFromPhoto: SUCCESS lat=$lat lng=$lng")
                            if (lat != 0.0 || lng != 0.0) {
                                return@AsyncFunction mapOf("latitude" to lat, "longitude" to lng)
                            }
                        }
                        android.util.Log.d("MediaViewer", "readGpsFromPhoto: no GPS in EXIF")
                    }
                    null
                } catch (e: Exception) {
                    android.util.Log.w("MediaViewer", "readGpsFromPhoto failed: ${e.message}")
                    e.printStackTrace()
                    null
                }
            }

            View(MediaViewerView::class) {
                Events("onIndexChange")

                Prop("urls") { view: MediaViewerView, urls: Array<String> ->
                    view.urls = urls
                }

                Prop("index") { view: MediaViewerView, index: Int ->
                    view.initialIndex = index
                }

                Prop("theme") { view: MediaViewerView, theme: String? ->
                    view.theme = if (theme == "light") ViewerTheme.Light else ViewerTheme.Dark
                }

                Prop("mediaTypes") { view: MediaViewerView, mediaTypes: Array<String>? ->
                    view.mediaTypes = mediaTypes
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
