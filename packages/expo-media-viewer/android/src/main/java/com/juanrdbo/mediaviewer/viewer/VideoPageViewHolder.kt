package com.juanrdbo.mediaviewer.viewer

import android.graphics.Color
import android.graphics.Rect
import android.graphics.RectF
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions
import com.juanrdbo.mediaviewer.MediaViewerItem
import com.juanrdbo.mediaviewer.MediaViewerVideoPlaybackSession
import com.juanrdbo.mediaviewer.MediaViewerVideoPlaybackStore
import com.juanrdbo.mediaviewer.MediaViewerVideoSessionKey
import com.juanrdbo.mediaviewer.MediaViewerVideoError
import com.juanrdbo.mediaviewer.R as MediaViewerR

class VideoPageViewHolder private constructor(
    container: ViewGroup,
    private val thumbnailView: ImageView,
    private val playerView: PlayerView,
    private val loadingOverlay: View,
    private val loadingSpinner: ProgressBar,
    private val errorOverlay: View,
    private val errorMessageView: TextView,
    private val errorDetailView: TextView,
    private val retryButton: Button,
) : RecyclerView.ViewHolder(container) {
    companion object {
        private const val TAG = "MediaViewer"
        private const val USER_FACING_ERROR_MESSAGE = "This remote video could not be opened on Android."

        fun create(parent: ViewGroup): VideoPageViewHolder {
            val view =
                LayoutInflater
                    .from(parent.context)
                    .inflate(MediaViewerR.layout.video_page, parent, false)
            val thumbnailView = view.findViewById<ImageView>(MediaViewerR.id.video_thumbnail)
            val playerView = view.findViewById<PlayerView>(MediaViewerR.id.video_player_view)
            val loadingOverlay = view.findViewById<View>(MediaViewerR.id.video_loading_overlay)
            val loadingSpinner = view.findViewById<ProgressBar>(MediaViewerR.id.video_loading)
            val errorOverlay = view.findViewById<View>(MediaViewerR.id.video_error_overlay)
            val errorMessageView = view.findViewById<TextView>(MediaViewerR.id.video_error_message)
            val errorDetailView = view.findViewById<TextView>(MediaViewerR.id.video_error_detail)
            val retryButton = view.findViewById<Button>(MediaViewerR.id.video_error_retry)
            return VideoPageViewHolder(
                view as ViewGroup,
                thumbnailView,
                playerView,
                loadingOverlay,
                loadingSpinner,
                errorOverlay,
                errorMessageView,
                errorDetailView,
                retryButton,
            )
        }
    }

    private enum class UiState {
        LOADING,
        PLAYING,
        FAILED,
        THUMBNAIL,
    }

    private var player: ExoPlayer? = null
    private var currentIndex: Int = RecyclerView.NO_POSITION
    private var currentUrl: String? = null
    private var currentHeaders: Map<String, String>? = null
    private var currentItem: MediaViewerItem? = null
    private var currentGroupId: String = ""
    private var isPrepared = false
    private var hasPlaybackFailed = false
    private var onVideoError: ((MediaViewerVideoError) -> Unit)? = null
    private var sharedSession: MediaViewerVideoPlaybackSession? = null
    private var playerListener: Player.Listener? = null

    init {
        playerView.setShutterBackgroundColor(Color.BLACK)
        loadingSpinner.isIndeterminate = true
        retryButton.setOnClickListener { retryPlayback() }
    }

    fun bind(
        index: Int,
        item: MediaViewerItem,
        groupId: String,
        onVideoError: ((MediaViewerVideoError) -> Unit)?,
    ) {
        currentIndex = index
        val url = item.uri
        currentUrl = url
        currentItem = item
        currentGroupId = groupId
        val mediaHeaders = item.headers
        currentHeaders = mediaHeaders
        val thumbnailUrl = item.thumbnailUri?.takeIf { it.isNotBlank() }
        val thumbnailHeaders = item.thumbnailHeaders ?: item.headers
        this.onVideoError = onVideoError
        val options =
            RequestOptions()
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .skipMemoryCache(false)
        Glide
            .with(thumbnailView.context)
            .load(glideModel(thumbnailUrl?.takeIf { it.isNotBlank() } ?: url, thumbnailHeaders))
            .apply(options)
            .into(thumbnailView)

        val density = playerView.resources.displayMetrics.density
        playerView.setPadding(0, 0, 0, (48 * density).toInt())

        render(UiState.LOADING)
        setupPlayer(url, mediaHeaders, item, groupId)
    }

    private fun setupPlayer(
        url: String,
        headers: Map<String, String>?,
        item: MediaViewerItem,
        groupId: String,
    ) {
        releasePlayerBinding(reattachPreview = false)
        isPrepared = false
        hasPlaybackFailed = false
        errorMessageView.text = USER_FACING_ERROR_MESSAGE
        errorDetailView.text = ""
        errorDetailView.visibility = View.GONE

        val context = playerView.context
        val sharedKey =
            if (item.thumbnailMode == "loop-muted" && groupId.isNotBlank()) {
                MediaViewerVideoSessionKey(groupId = groupId, itemId = item.id)
            } else {
                null
            }

        if (sharedKey != null) {
            val session = MediaViewerVideoPlaybackStore.session(context, sharedKey)
            val listener = createPlayerListener()
            sharedSession = session
            playerListener = listener
            session.player.addListener(listener)
            session.configure(url, headers)
            session.attachFullscreen(playerView)
            player = session.player
            isPrepared = session.isReadyToPlay
            if (session.playbackError != null) {
                handlePlaybackError(session.playbackError!!)
            } else {
                render(if (isPrepared) UiState.PLAYING else UiState.LOADING)
            }
            return
        }

        val audioAttributes =
            AudioAttributes
                .Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build()

        val mediaSourceFactory =
            DefaultMediaSourceFactory(
                DefaultHttpDataSource.Factory().apply {
                    if (!headers.isNullOrEmpty()) {
                        setDefaultRequestProperties(headers)
                    }
                },
            )
        val renderersFactory =
            DefaultRenderersFactory(context)
                .setEnableDecoderFallback(true)

        val newPlayer =
            ExoPlayer
                .Builder(context, renderersFactory)
                .setMediaSourceFactory(mediaSourceFactory)
                .build()
                .apply {
                    setAudioAttributes(audioAttributes, true)
                    repeatMode = Player.REPEAT_MODE_ONE
                    playWhenReady = false
                    val listener = createPlayerListener()
                    playerListener = listener
                    addListener(listener)
                }

        newPlayer.setMediaItem(MediaItem.fromUri(url))
        newPlayer.prepare()
        playerView.player = newPlayer
        player = newPlayer
    }

    private fun retryPlayback() {
        val url = currentUrl ?: return
        val item = currentItem ?: return
        render(UiState.LOADING)
        setupPlayer(url, currentHeaders, item, currentGroupId)
        resume()
    }

    private fun createPlayerListener(): Player.Listener =
        object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (hasPlaybackFailed) return
                when (state) {
                    Player.STATE_READY -> {
                        isPrepared = true
                        render(UiState.PLAYING)
                    }

                    Player.STATE_BUFFERING -> {
                        render(UiState.LOADING)
                    }

                    Player.STATE_ENDED, Player.STATE_IDLE -> Unit
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                handlePlaybackError(error)
            }
        }

    private fun handlePlaybackError(error: PlaybackException) {
        if (hasPlaybackFailed) return

        hasPlaybackFailed = true
        player?.pause()

        val nativeMessage = error.message?.takeIf { it.isNotBlank() } ?: error.errorCodeName
        val underlyingMessage = error.cause?.message?.takeIf { it.isNotBlank() }
        val videoError =
            MediaViewerVideoError(
                index = currentIndex.takeIf { it != RecyclerView.NO_POSITION } ?: 0,
                url = currentUrl.orEmpty(),
                message = USER_FACING_ERROR_MESSAGE,
                nativeMessage = nativeMessage,
                underlyingMessage = underlyingMessage,
            )

        Log.e(
            TAG,
            "Failed to load video index=${videoError.index} stage=${videoError.stage.eventValue} url=${videoError.url} message=${nativeMessage ?: "unknown"} underlying=${underlyingMessage ?: "none"}",
            error,
        )

        errorMessageView.text = videoError.message
        errorDetailView.text = listOfNotNull(nativeMessage, underlyingMessage).joinToString("\n")
        errorDetailView.visibility = if (errorDetailView.text.isNullOrBlank()) View.GONE else View.VISIBLE
        render(UiState.FAILED)
        onVideoError?.invoke(videoError)
    }

    private fun render(state: UiState) {
        when (state) {
            UiState.LOADING -> {
                playerView.visibility = if (isPrepared) View.VISIBLE else View.INVISIBLE
                loadingOverlay.visibility = View.VISIBLE
                errorOverlay.visibility = View.GONE
                thumbnailView.visibility = if (isPrepared) View.GONE else View.VISIBLE
            }

            UiState.PLAYING -> {
                playerView.visibility = View.VISIBLE
                loadingOverlay.visibility = View.GONE
                errorOverlay.visibility = View.GONE
                thumbnailView.visibility = View.GONE
            }

            UiState.FAILED -> {
                playerView.visibility = View.GONE
                loadingOverlay.visibility = View.GONE
                errorOverlay.visibility = View.VISIBLE
                thumbnailView.visibility = View.GONE
            }

            UiState.THUMBNAIL -> {
                playerView.visibility = View.GONE
                loadingOverlay.visibility = View.GONE
                errorOverlay.visibility = View.GONE
                thumbnailView.visibility = View.VISIBLE
            }
        }
    }

    fun pause() {
        player?.pause()
    }

    fun canDismissWithLiveVideoHandoff(): Boolean =
        sharedSession != null &&
            isPrepared &&
            !hasPlaybackFailed &&
            player?.videoSize?.let { it.width > 0 && it.height > 0 } == true

    fun transitionVisibleVideoFrame(contentRoot: ViewGroup): RectF? {
        val videoSize = player?.videoSize ?: return null
        val videoWidth = videoSize.width.toFloat() * videoSize.pixelWidthHeightRatio
        val videoHeight = videoSize.height.toFloat()
        if (videoWidth <= 0f || videoHeight <= 0f || playerView.width <= 0 || playerView.height <= 0) {
            return null
        }

        val playerRect = Rect(0, 0, playerView.width, playerView.height)
        contentRoot.offsetDescendantRectToMyCoords(playerView, playerRect)

        val availableWidth = (playerView.width - playerView.paddingLeft - playerView.paddingRight).toFloat()
        val availableHeight = (playerView.height - playerView.paddingTop - playerView.paddingBottom).toFloat()
        if (availableWidth <= 0f || availableHeight <= 0f) return null

        val videoAspect = videoWidth / videoHeight
        val availableAspect = availableWidth / availableHeight
        val frameWidth: Float
        val frameHeight: Float
        if (availableAspect > videoAspect) {
            frameHeight = availableHeight
            frameWidth = frameHeight * videoAspect
        } else {
            frameWidth = availableWidth
            frameHeight = frameWidth / videoAspect
        }

        val left =
            playerRect.left.toFloat() +
                playerView.paddingLeft +
                ((availableWidth - frameWidth) / 2f)
        val top =
            playerRect.top.toFloat() +
                playerView.paddingTop +
                ((availableHeight - frameHeight) / 2f)
        return RectF(left, top, left + frameWidth, top + frameHeight)
    }

    fun prepareForDismissTransition() {
        val canUseLiveVideo = canDismissWithLiveVideoHandoff()
        setTransitionContentFit(!canUseLiveVideo)
        if (canUseLiveVideo) {
            render(UiState.PLAYING)
            playerView.bringToFront()
            player?.playWhenReady = true
            player?.play()
        } else {
            player?.pause()
            render(UiState.THUMBNAIL)
            thumbnailView.bringToFront()
        }
    }

    fun setTransitionContentFit(active: Boolean) {
        playerView.resizeMode =
            if (active) {
                AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            } else {
                AspectRatioFrameLayout.RESIZE_MODE_FIT
            }
        thumbnailView.scaleType =
            if (active) {
                ImageView.ScaleType.CENTER_CROP
            } else {
                ImageView.ScaleType.FIT_CENTER
            }
    }

    fun resume() {
        setTransitionContentFit(false)
        val url = currentUrl ?: return
        if (player == null) {
            setupPlayer(url, currentHeaders, currentItem ?: return, currentGroupId)
        }
        if (!hasPlaybackFailed) {
            render(if (isPrepared) UiState.PLAYING else UiState.LOADING)
        }
        player?.playWhenReady = true
        player?.play()
    }

    fun release() {
        releasePlayerBinding(reattachPreview = true)
        currentItem = null
        currentGroupId = ""
        currentHeaders = null
        onVideoError = null
        playerView.visibility = View.GONE
        loadingOverlay.visibility = View.GONE
        errorOverlay.visibility = View.GONE
        thumbnailView.visibility = View.GONE
    }

    private fun releasePlayerBinding(reattachPreview: Boolean) {
        val listener = playerListener
        if (listener != null) {
            player?.removeListener(listener)
        }

        val session = sharedSession
        if (session != null) {
            session.detachFullscreen(playerView)
            if (reattachPreview) {
                session.reattachPreviewIfAvailable()
            }
        } else {
            player?.release()
        }

        player = null
        playerListener = null
        sharedSession = null
        isPrepared = false
        hasPlaybackFailed = false
        playerView.player = null
    }
}
