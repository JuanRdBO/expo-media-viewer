package com.juanrdbo.mediaviewer

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.exifinterface.media.ExifInterface

internal object MediaViewerGpsReader {
    fun extractMediaStoreId(assetId: String?): Long? =
        assetId
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.split(':', '/')
            ?.lastOrNull()
            ?.toLongOrNull()

    fun readGpsFromPhoto(
        context: Context,
        assetId: String?,
        fileName: String?,
    ): Map<String, Double>? =
        resolveContentUri(context.contentResolver, assetId, fileName)
            ?.let { resolveOriginalUri(it) }
            ?.let { readGpsFromUri(context, it) }

    private fun resolveContentUri(
        contentResolver: ContentResolver,
        assetId: String?,
        fileName: String?,
    ): Uri? = buildContentUri(assetId) ?: findContentUriByFileName(contentResolver, fileName)

    private fun buildContentUri(assetId: String?): Uri? =
        extractMediaStoreId(assetId)?.let { numericId ->
            ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, numericId)
        }

    private fun findContentUriByFileName(
        contentResolver: ContentResolver,
        fileName: String?,
    ): Uri? {
        if (fileName.isNullOrBlank()) {
            return null
        }

        val projection = arrayOf(MediaStore.Images.Media._ID)
        val selection = "${MediaStore.Images.Media.DISPLAY_NAME} = ?"
        val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"

        return contentResolver
            .query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                arrayOf(fileName),
                sortOrder,
            )?.use { cursor ->
                if (!cursor.moveToFirst()) {
                    return null
                }

                val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
                ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
            }
    }

    private fun resolveOriginalUri(contentUri: Uri): Uri {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return contentUri
        }

        return try {
            MediaStore.setRequireOriginal(contentUri)
        } catch (_: Exception) {
            contentUri
        }
    }

    private fun readGpsFromUri(
        context: Context,
        resolvedUri: Uri,
    ): Map<String, Double>? =
        context.contentResolver.openInputStream(resolvedUri)?.use { stream ->
            val exif = ExifInterface(stream)
            val latLong = FloatArray(2)
            if (!exif.getLatLong(latLong)) {
                null
            } else {
                val latitude = latLong[0].toDouble()
                val longitude = latLong[1].toDouble()
                if (latitude != 0.0 || longitude != 0.0) {
                    mapOf("latitude" to latitude, "longitude" to longitude)
                } else {
                    null
                }
            }
        }
}
