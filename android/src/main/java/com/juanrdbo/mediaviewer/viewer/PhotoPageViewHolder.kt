package com.juanrdbo.mediaviewer.viewer

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions
import com.github.chrisbanes.photoview.PhotoView

class PhotoPageViewHolder private constructor(
    private val photoView: PhotoView,
) : RecyclerView.ViewHolder(photoView) {
    companion object {
        fun create(parent: ViewGroup): PhotoPageViewHolder {
            val photoView =
                PhotoView(parent.context).apply {
                    layoutParams =
                        FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.MATCH_PARENT,
                        )
                    // Allow parent (ViewPager2 / RecyclerView) to intercept swipes at zoom == 1.
                    // PhotoView handles this automatically via setAllowParentInterceptOnEdge.
                    setAllowParentInterceptOnEdge(true)
                }
            return PhotoPageViewHolder(photoView)
        }
    }

    fun bind(url: String) {
        // Reset zoom before loading a new image
        photoView.setScale(1f, false)
        Glide.with(photoView.context)
            .load(url)
            .apply(
                RequestOptions()
                    .diskCacheStrategy(DiskCacheStrategy.ALL)
                    .skipMemoryCache(false),
            ).thumbnail(0.25f)
            .into(photoView)
    }
}
