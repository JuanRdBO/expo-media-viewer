package com.juanrdbo.mediaviewer

import org.json.JSONObject

data class MediaViewerThumbnailAnchor(
    val cornerRadiusDp: Float?,
    val contentFit: String,
) {
    fun cornerRadiusPx(density: Float): Float? = cornerRadiusDp?.let { it * density }

    companion object {
        const val CONTENT_FIT_COVER = "cover"
        const val CONTENT_FIT_CONTAIN = "contain"

        fun parse(anchorJson: String?): MediaViewerThumbnailAnchor? {
            if (anchorJson.isNullOrBlank()) return null

            val anchor = runCatching { JSONObject(anchorJson) }.getOrNull() ?: return null
            val contentFit =
                anchor
                    .optString("contentFit")
                    .takeIf { it == CONTENT_FIT_CONTAIN || it == CONTENT_FIT_COVER }
                    ?: CONTENT_FIT_COVER
            val cornerRadiusDp =
                anchor
                    .optFiniteDouble("cornerRadius")
                    ?.takeIf { it >= 0.0 }
                    ?.toFloat()

            return MediaViewerThumbnailAnchor(
                cornerRadiusDp = cornerRadiusDp,
                contentFit = contentFit,
            )
        }
    }
}

private fun JSONObject.optFiniteDouble(name: String): Double? {
    if (!has(name) || isNull(name)) return null
    val value = optDouble(name, Double.NaN)
    return value.takeIf { it.isFinite() }
}
