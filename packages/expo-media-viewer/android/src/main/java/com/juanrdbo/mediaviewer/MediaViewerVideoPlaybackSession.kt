package com.juanrdbo.mediaviewer

import android.content.Context
import android.graphics.Color
import android.graphics.Rect
import android.view.LayoutInflater
import android.view.TextureView
import android.view.View
import android.view.ViewTreeObserver
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference
import java.util.UUID

data class MediaViewerVideoSessionKey(
    val groupId: String,
    val itemId: String,
)

internal class MediaViewerVideoSessionLeaseTracker {
    private val leaseIds = mutableSetOf<String>()

    val leaseCount: Int
        get() = leaseIds.size

    fun acquire(leaseId: String): Boolean = leaseIds.add(leaseId)

    fun release(leaseId: String): Boolean = leaseIds.remove(leaseId)

    fun hasLeases(): Boolean = leaseIds.isNotEmpty()
}

internal class MediaViewerVideoPlaybackLease internal constructor(
    val key: MediaViewerVideoSessionKey,
    val session: MediaViewerVideoPlaybackSession,
    private val leaseId: String,
) : AutoCloseable {
    private var isReleased = false

    fun release() {
        if (isReleased) return
        isReleased = true
        MediaViewerVideoPlaybackStore.releaseLease(key, leaseId)
    }

    override fun close() {
        release()
    }
}

class MediaViewerVideoPlaybackSession(
    context: Context,
    val key: MediaViewerVideoSessionKey,
) {
    private val appContext = context.applicationContext
    private val listeners = mutableMapOf<String, (MediaViewerVideoPlaybackSession) -> Unit>()
    private var attachedPlayerView: PlayerView? = null
    private var attachedPreviewView: MediaViewerVideoThumbnailView? = null
    private var attachedFullscreenView: PlayerView? = null
    private var currentUrl: String? = null
    private var currentHeaders: Map<String, String>? = null
    private var isReleased = false

    val player: ExoPlayer =
        ExoPlayer
            .Builder(
                appContext,
                DefaultRenderersFactory(appContext).setEnableDecoderFallback(true),
            ).build()
            .apply {
                setAudioAttributes(
                    AudioAttributes
                        .Builder()
                        .setUsage(C.USAGE_MEDIA)
                        .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                        .build(),
                    true,
                )
                repeatMode = Player.REPEAT_MODE_ONE
                playWhenReady = false
                volume = 0f
                addListener(
                    object : Player.Listener {
                        override fun onPlaybackStateChanged(state: Int) {
                            when (state) {
                                Player.STATE_READY -> {
                                    isReadyToPlay = true
                                    hasDisplayedFirstFrame = true
                                    playbackError = null
                                    notifyListeners()
                                }

                                Player.STATE_BUFFERING -> notifyListeners()
                                Player.STATE_ENDED, Player.STATE_IDLE -> Unit
                            }
                        }

                        override fun onPlayerError(error: PlaybackException) {
                            playbackError = error
                            notifyListeners()
                        }

                        override fun onVideoSizeChanged(videoSize: VideoSize) {
                            notifyListeners()
                        }
                    },
                )
            }

    var isReadyToPlay: Boolean = false
        private set
    var hasDisplayedFirstFrame: Boolean = false
        private set
    var playbackError: PlaybackException? = null
        private set

    fun configure(
        url: String,
        headers: Map<String, String>?,
    ) {
        if (isReleased) return

        if (currentUrl == url && currentHeaders == headers && player.currentMediaItem != null) {
            return
        }

        currentUrl = url
        currentHeaders = headers
        isReadyToPlay = false
        hasDisplayedFirstFrame = false
        playbackError = null

        val dataSourceFactory =
            DefaultHttpDataSource.Factory().apply {
                if (!headers.isNullOrEmpty()) {
                    setDefaultRequestProperties(headers)
                }
            }
        val mediaSource =
            DefaultMediaSourceFactory(dataSourceFactory)
                .createMediaSource(MediaItem.fromUri(url))

        player.setMediaSource(mediaSource)
        player.prepare()
        notifyListeners()
    }

    fun addListener(listener: (MediaViewerVideoPlaybackSession) -> Unit): String {
        val id = UUID.randomUUID().toString()
        listeners[id] = listener
        listener(this)
        return id
    }

    fun removeListener(id: String?) {
        if (id == null) return
        listeners.remove(id)
    }

    fun attachPreview(previewView: MediaViewerVideoThumbnailView) {
        if (isReleased) return

        attachedPreviewView = previewView
        if (attachedFullscreenView != null) {
            previewView.setVideoVisible(false)
            return
        }
        attachPlayerView(previewView.playerView)
        player.volume = 0f
        player.playWhenReady = true
        player.play()
        previewView.syncWithSession(this)
    }

    fun detachPreview(previewView: MediaViewerVideoThumbnailView) {
        if (attachedPreviewView !== previewView) return
        if (attachedPlayerView === previewView.playerView) {
            PlayerView.switchTargetView(player, attachedPlayerView, null)
            attachedPlayerView = null
        }
        attachedPreviewView = null
        previewView.setVideoVisible(false)
        if (attachedFullscreenView == null) {
            player.playWhenReady = false
            player.pause()
        }
    }

    fun isPreviewAttached(previewView: MediaViewerVideoThumbnailView): Boolean =
        attachedPreviewView === previewView &&
            attachedFullscreenView == null &&
            attachedPlayerView === previewView.playerView

    fun attachFullscreen(playerView: PlayerView) {
        if (isReleased) return

        attachedFullscreenView = playerView
        attachedPreviewView?.setVideoVisible(false)
        attachPlayerView(playerView)
        player.volume = 1f
        player.playWhenReady = true
        player.play()
    }

    fun detachFullscreen(playerView: PlayerView) {
        if (attachedFullscreenView !== playerView) return
        attachedFullscreenView = null
        if (attachedPlayerView === playerView) {
            PlayerView.switchTargetView(player, attachedPlayerView, null)
            attachedPlayerView = null
        }
        player.playWhenReady = false
        player.pause()
    }

    fun reattachPreviewIfAvailable() {
        MediaViewerVideoPlaybackStore.previewFor(key)?.refreshPreviewPlayback(force = true)
    }

    fun release() {
        if (isReleased) return

        isReleased = true
        PlayerView.switchTargetView(player, attachedPlayerView, null)
        attachedPlayerView = null
        attachedPreviewView = null
        attachedFullscreenView = null
        listeners.clear()
        player.release()
    }

    private fun attachPlayerView(nextPlayerView: PlayerView) {
        if (attachedPlayerView === nextPlayerView) {
            nextPlayerView.player = player
            return
        }
        PlayerView.switchTargetView(player, attachedPlayerView, nextPlayerView)
        attachedPlayerView = nextPlayerView
    }

    private fun notifyListeners() {
        listeners.values.forEach { it(this) }
    }
}

object MediaViewerVideoPlaybackStore {
    private class SessionEntry(
        val session: MediaViewerVideoPlaybackSession,
        val leases: MediaViewerVideoSessionLeaseTracker = MediaViewerVideoSessionLeaseTracker(),
    )

    private val sessions = mutableMapOf<MediaViewerVideoSessionKey, SessionEntry>()
    private val previews = mutableMapOf<MediaViewerVideoSessionKey, WeakReference<MediaViewerVideoThumbnailView>>()

    internal fun leaseSession(
        context: Context,
        key: MediaViewerVideoSessionKey,
    ): MediaViewerVideoPlaybackLease {
        val leaseId = UUID.randomUUID().toString()
        val session =
            synchronized(this) {
                val entry = sessions.getOrPut(key) { SessionEntry(MediaViewerVideoPlaybackSession(context, key)) }
                entry.leases.acquire(leaseId)
                entry.session
            }

        return MediaViewerVideoPlaybackLease(key, session, leaseId)
    }

    @Synchronized
    fun existingSession(key: MediaViewerVideoSessionKey): MediaViewerVideoPlaybackSession? = sessions[key]?.session

    internal fun releaseLease(
        key: MediaViewerVideoSessionKey,
        leaseId: String,
    ) {
        val sessionToRelease =
            synchronized(this) {
                val entry = sessions[key] ?: return
                if (!entry.leases.release(leaseId)) return
                if (entry.leases.hasLeases()) return

                sessions.remove(key)
                entry.session
            }

        sessionToRelease.release()
    }

    @Synchronized
    fun registerPreview(
        key: MediaViewerVideoSessionKey,
        previewView: MediaViewerVideoThumbnailView,
    ) {
        previews[key] = WeakReference(previewView)
    }

    @Synchronized
    fun unregisterPreview(
        key: MediaViewerVideoSessionKey,
        previewView: MediaViewerVideoThumbnailView,
    ) {
        if (previews[key]?.get() === previewView) {
            previews.remove(key)
        }
    }

    @Synchronized
    fun previewFor(key: MediaViewerVideoSessionKey): MediaViewerVideoThumbnailView? = previews[key]?.get()
}

class MediaViewerVideoThumbnailView(
    context: Context,
    appContext: AppContext,
) : ExpoView(context, appContext) {
    private val surfaceFrame: MediaViewerVideoSurfaceFrame
    val playerView: PlayerView

    var groupId: String? = null
        set(value) {
            field = value
            updateSession()
        }

    var index: Int = 0
    var itemJson: String? = null
        set(value) {
            field = value
            mediaItem = MediaViewerItemParser.parseItem(value)
            updateSession()
        }

    var fit: String = "cover"
        set(value) {
            field = value
            surfaceFrame.fit = value
        }

    private var mediaItem: MediaViewerItem? = null
    private var session: MediaViewerVideoPlaybackSession? = null
    private var sessionLease: MediaViewerVideoPlaybackLease? = null
    private var sessionKey: MediaViewerVideoSessionKey? = null
    private var sessionListenerId: String? = null
    private var pendingTransformRetry = false
    private var previewPlaybackActive = false
    private var observedViewTree: ViewTreeObserver? = null
    private val visibleRect = Rect()
    private val scrollChangedListener =
        ViewTreeObserver.OnScrollChangedListener {
            refreshPreviewPlayback()
        }
    private val globalLayoutListener =
        ViewTreeObserver.OnGlobalLayoutListener {
            refreshPreviewPlayback()
        }
    private val preDrawListener =
        ViewTreeObserver.OnPreDrawListener {
            refreshPreviewPlayback()
            true
        }

    init {
        clipChildren = true
        clipToPadding = true
        setBackgroundColor(Color.TRANSPARENT)
        LayoutInflater.from(context).inflate(R.layout.video_thumbnail_view, this, true)
        surfaceFrame = findViewById(R.id.video_thumbnail_surface_frame)
        playerView = findViewById(R.id.video_thumbnail_player_view)
        playerView.useController = false
        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FILL
        playerView.setShutterBackgroundColor(Color.TRANSPARENT)
        playerView.setBackgroundColor(Color.TRANSPARENT)
        surfaceFrame.fit = fit
        surfaceFrame.onGeometryChanged = {
            session?.let { syncWithSession(it) }
        }
        playerView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            session?.let { syncWithSession(it) }
        }
        playerView.alpha = 0f
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        startVisibilityTracking()
        updateSession()
        refreshPreviewPlayback()
    }

    override fun onDetachedFromWindow() {
        stopVisibilityTracking()
        detachSession()
        super.onDetachedFromWindow()
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(visibility)
        refreshPreviewPlayback()
    }

    override fun onVisibilityAggregated(isVisible: Boolean) {
        super.onVisibilityAggregated(isVisible)
        refreshPreviewPlayback()
    }

    override fun onSizeChanged(
        width: Int,
        height: Int,
        oldWidth: Int,
        oldHeight: Int,
    ) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        refreshPreviewPlayback()
    }

    fun setVideoVisible(visible: Boolean) {
        playerView.animate().cancel()
        playerView
            .animate()
            .alpha(if (visible) 1f else 0f)
            .setDuration(if (visible) 150L else 0L)
            .start()
    }

    fun syncWithSession(session: MediaViewerVideoPlaybackSession) {
        val videoSize = session.player.videoSize
        surfaceFrame.setVideoSize(
            videoSize.width,
            videoSize.height,
            videoSize.unappliedRotationDegrees,
            videoSize.pixelWidthHeightRatio,
        )
        val textureView = playerView.videoSurfaceView as? TextureView
        val didApplyTransform = surfaceFrame.applyTextureTransform(textureView)
        val canShowVideo =
            previewPlaybackActive &&
                session.hasDisplayedFirstFrame &&
                session.playbackError == null &&
                didApplyTransform
        setVideoVisible(
            canShowVideo,
        )
        if (previewPlaybackActive && !canShowVideo && session.hasDisplayedFirstFrame && session.playbackError == null) {
            scheduleTransformRetry()
        }
    }

    fun refreshPreviewPlayback(force: Boolean = false) {
        if (!isAttachedToWindow) return
        updateSession(force)
    }

    private fun scheduleTransformRetry() {
        if (pendingTransformRetry) return
        pendingTransformRetry = true
        playerView.postDelayed({
            pendingTransformRetry = false
            session?.let { syncWithSession(it) }
        }, 16L)
    }

    private fun updateSession(forceVisibilityUpdate: Boolean = false) {
        if (!isAttachedToWindow) return
        val groupId =
            groupId?.takeIf { it.isNotBlank() }
                ?: run {
                    detachSession()
                    return
                }
        val item =
            mediaItem?.takeIf { it.type == "video" }
                ?: run {
                    detachSession()
                    return
                }
        val key = MediaViewerVideoSessionKey(groupId = groupId, itemId = item.id)

        if (sessionKey == key && session != null) {
            updatePreviewPlayback(forceVisibilityUpdate)
            return
        }

        detachSession()
        sessionKey = key
        MediaViewerVideoPlaybackStore.registerPreview(key, this)

        val nextLease = MediaViewerVideoPlaybackStore.leaseSession(context, key)
        val nextSession = nextLease.session
        sessionLease = nextLease
        session = nextSession
        nextSession.configure(item.uri, item.headers)
        sessionListenerId =
            nextSession.addListener { state ->
                syncWithSession(state)
            }
        updatePreviewPlayback(force = true)
    }

    private fun updatePreviewPlayback(force: Boolean = false) {
        val currentSession = session
        val shouldPlayPreview = isPreviewVisibleInWindow()
        val wasPlayingPreview = previewPlaybackActive
        previewPlaybackActive = shouldPlayPreview

        if (currentSession == null) {
            setVideoVisible(false)
            return
        }

        if (shouldPlayPreview) {
            if (force || !wasPlayingPreview || !currentSession.isPreviewAttached(this)) {
                currentSession.attachPreview(this)
            }
        } else if (force || wasPlayingPreview || currentSession.isPreviewAttached(this)) {
            currentSession.detachPreview(this)
        } else {
            setVideoVisible(false)
        }
    }

    private fun isPreviewVisibleInWindow(): Boolean {
        if (
            !isAttachedToWindow ||
            windowVisibility != View.VISIBLE ||
            visibility != View.VISIBLE ||
            !isShown ||
            width <= 0 ||
            height <= 0
        ) {
            return false
        }

        visibleRect.setEmpty()
        return getGlobalVisibleRect(visibleRect) && visibleRect.width() > 0 && visibleRect.height() > 0
    }

    private fun startVisibilityTracking() {
        val nextObserver = viewTreeObserver.takeIf { it.isAlive } ?: return
        if (observedViewTree === nextObserver) return
        stopVisibilityTracking()
        nextObserver.addOnScrollChangedListener(scrollChangedListener)
        nextObserver.addOnGlobalLayoutListener(globalLayoutListener)
        nextObserver.addOnPreDrawListener(preDrawListener)
        observedViewTree = nextObserver
    }

    private fun stopVisibilityTracking() {
        observedViewTree?.takeIf { it.isAlive }?.let { observer ->
            observer.removeOnScrollChangedListener(scrollChangedListener)
            observer.removeOnGlobalLayoutListener(globalLayoutListener)
            observer.removeOnPreDrawListener(preDrawListener)
        }
        observedViewTree = null
    }

    private fun detachSession() {
        val key = sessionKey
        val currentSession = session
        val currentLease = sessionLease

        if (currentSession != null) {
            currentSession.removeListener(sessionListenerId)
            currentSession.detachPreview(this)
        }

        if (key != null) {
            MediaViewerVideoPlaybackStore.unregisterPreview(key, this)
        }

        sessionListenerId = null
        sessionKey = null
        session = null
        sessionLease = null
        previewPlaybackActive = false
        pendingTransformRetry = false
        currentLease?.release()
    }
}
