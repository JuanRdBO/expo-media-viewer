package com.juanrdbo.mediaviewer.viewer

import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.juanrdbo.mediaviewer.ViewerTheme

class MediaPageAdapter(
    private val urls: Array<String>,
    private val mediaTypes: Array<String>?,
    private val posterUrls: Array<String>?,
    private val theme: ViewerTheme,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    companion object {
        private const val TYPE_PHOTO = 0
        private const val TYPE_VIDEO = 1
    }

    private val holders = mutableMapOf<Int, RecyclerView.ViewHolder>()

    override fun getItemViewType(position: Int): Int =
        if (mediaTypes?.getOrNull(position) == "video") TYPE_VIDEO else TYPE_PHOTO

    override fun getItemCount(): Int = urls.size

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int,
    ): RecyclerView.ViewHolder =
        if (viewType == TYPE_VIDEO) {
            VideoPageViewHolder.create(parent)
        } else {
            PhotoPageViewHolder.create(parent)
        }

    override fun onBindViewHolder(
        holder: RecyclerView.ViewHolder,
        position: Int,
    ) {
        holders[position] = holder
        val url = urls[position]
        when (holder) {
            is PhotoPageViewHolder -> holder.bind(url)
            is VideoPageViewHolder -> holder.bind(url, posterUrls?.getOrNull(position))
        }
    }

    override fun onViewRecycled(holder: RecyclerView.ViewHolder) {
        super.onViewRecycled(holder)
        when (holder) {
            is VideoPageViewHolder -> holder.release()
        }
        // Remove from holders map
        val entry = holders.entries.find { it.value === holder }
        if (entry != null) holders.remove(entry.key)
    }

    fun pausePlayerAt(position: Int) {
        (holders[position] as? VideoPageViewHolder)?.pause()
    }

    fun freezeForDismiss(position: Int) {
        (holders[position] as? VideoPageViewHolder)?.freezeForDismiss()
    }

    fun resumePlayerAt(position: Int) {
        (holders[position] as? VideoPageViewHolder)?.resume()
    }

    fun releaseAll() {
        holders.values.forEach { holder ->
            if (holder is VideoPageViewHolder) holder.release()
        }
        holders.clear()
    }
}
