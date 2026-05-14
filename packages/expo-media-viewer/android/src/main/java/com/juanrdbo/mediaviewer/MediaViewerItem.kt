package com.juanrdbo.mediaviewer

import org.json.JSONArray
import org.json.JSONObject

data class MediaViewerItem(
    val id: String,
    val type: String,
    val uri: String,
    val headers: Map<String, String>?,
    val thumbnailUri: String?,
    val thumbnailHeaders: Map<String, String>?,
    val thumbnailMode: String?,
    val title: String?,
    val subtitle: String?,
    val footer: String?,
)

object MediaViewerItemParser {
    fun parse(itemsJson: String?): List<MediaViewerItem> {
        if (itemsJson.isNullOrBlank()) return emptyList()

        val array = runCatching { JSONArray(itemsJson) }.getOrNull() ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val uri = item.optStringOrNull("uri") ?: continue
                val type = item.optStringOrNull("type") ?: "image"
                add(
                    MediaViewerItem(
                        id = item.optStringOrNull("id") ?: "$type:$uri:$index",
                        type = type,
                        uri = uri,
                        headers = item.optHeaders("headers"),
                        thumbnailUri = item.optStringOrNull("thumbnailUri"),
                        thumbnailHeaders = item.optHeaders("thumbnailHeaders"),
                        thumbnailMode = item.optStringOrNull("thumbnailMode"),
                        title = item.optStringOrNull("title"),
                        subtitle = item.optStringOrNull("subtitle"),
                        footer = item.optStringOrNull("footer"),
                    ),
                )
            }
        }
    }
}

private fun JSONObject.optStringOrNull(name: String): String? =
    if (has(name) && !isNull(name)) optString(name).takeIf { it.isNotBlank() } else null

private fun JSONObject.optHeaders(name: String): Map<String, String>? {
    val headers = optJSONObject(name) ?: return null
    val keys = headers.keys()
    val result = mutableMapOf<String, String>()
    while (keys.hasNext()) {
        val key = keys.next()
        val value = headers.optString(key).takeIf { it.isNotBlank() } ?: continue
        result[key] = value
    }
    return result.takeIf { it.isNotEmpty() }
}
