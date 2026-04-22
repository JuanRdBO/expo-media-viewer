package com.juanrdbo.mediaviewer.viewer

import android.graphics.Color
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions
import com.juanrdbo.mediaviewer.MediaViewerVideoError
import com.juanrdbo.mediaviewer.R as MediaViewerR

class VideoPageViewHolder private constructor(
    private val container: ViewGroup,
    private val thumbnailView: ImageView,
    private val playerView: PlayerView,
    private val loadingOverlay: View,
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
            val errorOverlay = view.findViewById<View>(MediaViewerR.id.video_error_overlay)
            val errorMessageView = view.findViewById<TextView>(MediaViewerR.id.video_error_message)
            val errorDetailView = view.findViewById<TextView>(MediaViewerR.id.video_error_detail)
            val retryButton = view.findViewById<Button>(MediaViewerR.id.video_error_retry)
            return VideoPageViewHolder(
                view as ViewGroup,
                thumbnailView,
                playerView,
                loadingOverlay,
                errorOverlay,
                errorMessageView,
                errorDetailView,
                retryButton,
            )
        }
    }

    private var player: ExoPlayer? = null
    private var currentIndex: Int = RecyclerView.NO_POSITION
    private var currentUrl: String? = null
    private var isPrepared = false
    private var hasPlaybackFailed = false
    private var onVideoError: ((MediaViewerVideoError) -> Unit)? = null

    init {
        playerView.setShutterBackgroundColor(Color.BLACK)
        retryButton.setOnClickListener { retryPlayback() }
    }

    fun bind(
        index: Int,
        url: String,
        posterUrl: String?,
        onVideoError: ((MediaViewerVideoError) -> Unit)?,
    ) {
        currentIndex = index
        currentUrl = url
        this.onVideoError = onVideoError
        val options =
            RequestOptions()
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .skipMemoryCache(false)
        Glide
            .with(thumbnailView.context)
            .load(posterUrl?.takeIf { it.isNotBlank() } ?: url)
            .apply(options)
            .into(thumbnailView)

        val density = playerView.resources.displayMetrics.density
        playerView.setPadding(0, 0, 0, (48 * density).toInt())

        renderInitialLoading()
        setupPlayer(url)
    }

    private fun setupPlayer(url: String) {
        player?.release()
        isPrepared = false
        hasPlaybackFailed = false
        errorMessageView.text = USER_FACING_ERROR_MESSAGE
        errorDetailView.text = ""
        errorDetailView.visibility = View.GONE

        val context = playerView.context
        val audioAttributes =
            AudioAttributes
                .Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build()

        val newPlayer =
            ExoPlayer.Builder(context).build().apply {
                setAudioAttributes(audioAttributes, true)
                repeatMode = Player.REPEAT_MODE_ONE
                playWhenReady = false
                addListener(
                    object : Player.Listener {
                        override fun onPlaybackStateChanged(state: Int) {
                            if (hasPlaybackFailed) return
                            when (state) {
                                Player.STATE_READY -> {
                                    isPrepared = true
                                    renderPlaying()
                                }

                                Player.STATE_BUFFERING -> {
                                    renderBuffering()
                                }

                                Player.STATE_ENDED, Player.STATE_IDLE -> Unit
                            }
                        }

                        override fun onPlayerError(error: PlaybackException) {
                            handlePlaybackError(error)
                        }
                    },
                )
            }

        newPlayer.setMediaItem(MediaItem.fromUri(url))
        newPlayer.prepare()
        playerView.player = newPlayer
        player = newPlayer
    }

    private fun retryPlayback() {
        val url = currentUrl ?: return
        renderInitialLoading()
        setupPlayer(url)
        resume()
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
            "Failed to load video index=${videoError.index} stage=${videoError.stage} url=${videoError.url} message=${nativeMessage ?: "unknown"} underlying=${underlyingMessage ?: "none"}",
            error,
        )

        errorMessageView.text = videoError.message
        errorDetailView.text = listOfNotNull(nativeMessage, underlyingMessage).joinToString("\n")
        errorDetailView.visibility = if (errorDetailView.text.isNullOrBlank()) View.GONE else View.VISIBLE
        renderFailed()
        onVideoError?.invoke(videoError)
    }

    private fun renderInitialLoading() {
        playerView.visibility = View.INVISIBLE
        loadingOverlay.visibility = View.VISIBLE
        errorOverlay.visibility = View.GONE
        thumbnailView.visibility = View.GONE
    }

    private fun renderBuffering() {
        playerView.visibility = if (isPrepared) View.VISIBLE else View.INVISIBLE
        loadingOverlay.visibility = View.VISIBLE
        errorOverlay.visibility = View.GONE
        thumbnailView.visibility = View.GONE
    }

    private fun renderPlaying() {
        playerView.visibility = View.VISIBLE
        loadingOverlay.visibility = View.GONE
        errorOverlay.visibility = View.GONE
        thumbnailView.visibility = View.GONE
    }

    private fun renderFailed() {
        playerView.visibility = View.GONE
        loadingOverlay.visibility = View.GONE
        errorOverlay.visibility = View.VISIBLE
        thumbnailView.visibility = View.GONE
    }

    fun pause() {
        player?.pause()
    }

    fun freezeForDismiss() {
        player?.pause()
        loadingOverlay.visibility = View.GONE
        errorOverlay.visibility = View.GONE
        playerView.visibility = View.GONE
        thumbnailView.visibility = View.VISIBLE
        thumbnailView.bringToFront()
    }

    fun resume() {
        val url = currentUrl ?: return
        if (player == null) {
            setupPlayer(url)
        }
        if (!hasPlaybackFailed) {
            if (isPrepared) {
                renderPlaying()
            } else {
                renderInitialLoading()
            }
        }
        player?.playWhenReady = true
        player?.play()
    }

    fun release() {
        player?.release()
        player = null
        isPrepared = false
        hasPlaybackFailed = false
        onVideoError = null
        playerView.player = null
        loadingOverlay.visibility = View.GONE
        errorOverlay.visibility = View.GONE
        thumbnailView.visibility = View.GONE
    }
}
