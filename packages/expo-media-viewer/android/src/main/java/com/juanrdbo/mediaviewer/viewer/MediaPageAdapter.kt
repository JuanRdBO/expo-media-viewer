package com.juanrdbo.mediaviewer.viewer

import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.juanrdbo.mediaviewer.MediaViewerItem
import com.juanrdbo.mediaviewer.MediaViewerVideoError

class MediaPageAdapter(
    private val items: List<MediaViewerItem>,
    private val onVideoError: ((MediaViewerVideoError) -> Unit)? = null,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    companion object {
        private const val TYPE_PHOTO = 0
        private const val TYPE_VIDEO = 1
    }

    private val holders = mutableMapOf<Int, RecyclerView.ViewHolder>()

    override fun getItemViewType(position: Int): Int = if (items[position].type == "video") TYPE_VIDEO else TYPE_PHOTO

    override fun getItemCount(): Int = items.size

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
        val item = items[position]
        when (holder) {
            is PhotoPageViewHolder -> holder.bind(item, item.uri)
            is VideoPageViewHolder -> holder.bind(position, item, onVideoError)
        }
    }

    override fun onViewRecycled(holder: RecyclerView.ViewHolder) {
        super.onViewRecycled(holder)
        when (holder) {
            is VideoPageViewHolder -> holder.release()
        }
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
