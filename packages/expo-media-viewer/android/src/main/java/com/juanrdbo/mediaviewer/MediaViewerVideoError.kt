package com.juanrdbo.mediaviewer

enum class MediaViewerVideoPlaybackStage(
    val eventValue: String,
) {
    Remote("remote"),
    FallbackDownload("fallback-download"),
    FallbackPlayback("fallback-playback"),
}

data class MediaViewerVideoError(
    val index: Int,
    val url: String,
    val message: String,
    val nativeMessage: String? = null,
    val underlyingMessage: String? = null,
    val platform: String = "android",
    val stage: MediaViewerVideoPlaybackStage = MediaViewerVideoPlaybackStage.Remote,
) {
    fun toEventPayload(): Map<String, Any> =
        mutableMapOf<String, Any>(
            "index" to index,
            "url" to url,
            "message" to message,
            "platform" to platform,
            "stage" to stage.eventValue,
        ).apply {
            nativeMessage?.let { put("nativeMessage", it) }
            underlyingMessage?.let { put("underlyingMessage", it) }
        }
}
