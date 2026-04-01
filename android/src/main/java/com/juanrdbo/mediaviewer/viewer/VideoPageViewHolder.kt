package com.juanrdbo.mediaviewer.viewer

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions
import com.juanrdbo.mediaviewer.R as MediaViewerR

class VideoPageViewHolder private constructor(
    private val container: ViewGroup,
    private val thumbnailView: ImageView,
    private val playerView: PlayerView,
    private val loadingView: ProgressBar,
) : RecyclerView.ViewHolder(container) {
    companion object {
        fun create(parent: ViewGroup): VideoPageViewHolder {
            val view =
                LayoutInflater
                    .from(parent.context)
                    .inflate(MediaViewerR.layout.video_page, parent, false)
            val thumbnailView = view.findViewById<ImageView>(MediaViewerR.id.video_thumbnail)
            val playerView = view.findViewById<PlayerView>(MediaViewerR.id.video_player_view)
            val loadingView = view.findViewById<ProgressBar>(MediaViewerR.id.video_loading)
            return VideoPageViewHolder(view as ViewGroup, thumbnailView, playerView, loadingView)
        }
    }

    private var player: ExoPlayer? = null
    private var currentUrl: String? = null
    private var isPrepared = false

    fun bind(url: String) {
        currentUrl = url
        Glide.with(thumbnailView).clear(thumbnailView)
        val options =
            RequestOptions()
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .skipMemoryCache(false)
        Glide
            .with(thumbnailView)
            .load(url)
            .apply(options)
            .into(thumbnailView)
        thumbnailView.visibility = View.VISIBLE
        loadingView.visibility = View.VISIBLE

        val density = playerView.resources.displayMetrics.density
        playerView.setPadding(0, 0, 0, (48 * density).toInt())
    }

    private fun setupPlayer(url: String) {
        player?.release()
        isPrepared = false

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
                            when (state) {
                                Player.STATE_READY -> {
                                    if (!isPrepared) {
                                        isPrepared = true
                                        thumbnailView.visibility = View.GONE
                                    }
                                    loadingView.visibility = View.GONE
                                }

                                Player.STATE_BUFFERING -> {
                                    loadingView.visibility = View.VISIBLE
                                    loadingView.bringToFront()
                                }

                                Player.STATE_ENDED, Player.STATE_IDLE -> {
                                    loadingView.visibility = View.GONE
                                }
                            }
                        }
                    },
                )
            }

        newPlayer.setMediaItem(MediaItem.fromUri(url))
        newPlayer.prepare()
        playerView.player = newPlayer
        player = newPlayer
    }

    fun pause() {
        player?.pause()
    }

    fun freezeForDismiss() {
        player?.pause()
        loadingView.visibility = View.GONE
        thumbnailView.visibility = View.VISIBLE
        thumbnailView.bringToFront()
    }

    fun resume() {
        val url = currentUrl ?: return
        if (player == null) {
            setupPlayer(url)
        }
        player?.playWhenReady = true
        player?.play()
    }

    fun release() {
        player?.release()
        player = null
        isPrepared = false
        playerView.player = null
        Glide.with(thumbnailView).clear(thumbnailView)
        loadingView.visibility = View.GONE
        thumbnailView.visibility = View.VISIBLE
    }
}
