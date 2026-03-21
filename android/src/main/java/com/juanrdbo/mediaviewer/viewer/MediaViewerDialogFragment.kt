package com.juanrdbo.mediaviewer.viewer

import android.animation.ValueAnimator
import android.app.Dialog
import android.content.DialogInterface
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.DialogFragment
import androidx.viewpager2.widget.ViewPager2
import com.juanrdbo.mediaviewer.MediaViewerRegistry
import com.juanrdbo.mediaviewer.ViewerTheme

class MediaViewerDialogFragment : DialogFragment() {
    companion object {
        private const val ARG_URLS = "urls"
        private const val ARG_INITIAL_INDEX = "initialIndex"
        private const val ARG_THEME = "theme"
        private const val ARG_MEDIA_TYPES = "mediaTypes"
        private const val ARG_EDGE_TO_EDGE = "edgeToEdge"
        private const val ARG_HIDE_INDICATORS = "hidePageIndicators"
        private const val ARG_GROUP_ID = "groupId"
        private const val ARG_THUMB_RECT = "thumbnailRect"
        private const val ARG_TOP_TITLES = "topTitles"
        private const val ARG_TOP_SUBTITLES = "topSubtitles"
        private const val ARG_BOTTOM_TEXTS = "bottomTexts"

        fun newInstance(
            urls: Array<String>,
            initialIndex: Int,
            theme: ViewerTheme,
            mediaTypes: Array<String>?,
            edgeToEdge: Boolean,
            hidePageIndicators: Boolean,
            groupId: String,
            thumbnailRect: Rect? = null,
            topTitles: Array<String>? = null,
            topSubtitles: Array<String>? = null,
            bottomTexts: Array<String>? = null,
        ): MediaViewerDialogFragment =
            MediaViewerDialogFragment().apply {
                arguments =
                    Bundle().apply {
                        putStringArray(ARG_URLS, urls)
                        putInt(ARG_INITIAL_INDEX, initialIndex)
                        putString(ARG_THEME, theme.name)
                        putStringArray(ARG_MEDIA_TYPES, mediaTypes)
                        putBoolean(ARG_EDGE_TO_EDGE, edgeToEdge)
                        putBoolean(ARG_HIDE_INDICATORS, hidePageIndicators)
                        putString(ARG_GROUP_ID, groupId)
                        if (thumbnailRect != null) putParcelable(ARG_THUMB_RECT, thumbnailRect)
                        putStringArray(ARG_TOP_TITLES, topTitles)
                        putStringArray(ARG_TOP_SUBTITLES, topSubtitles)
                        putStringArray(ARG_BOTTOM_TEXTS, bottomTexts)
                    }
            }
    }

    private lateinit var urls: Array<String>
    private var initialIndex: Int = 0
    private var theme: ViewerTheme = ViewerTheme.Dark
    private var mediaTypes: Array<String>? = null
    private var edgeToEdge: Boolean = true
    private var hidePageIndicators: Boolean = false
    private var groupId: String = ""
    private var topTitles: Array<String>? = null
    private var topSubtitles: Array<String>? = null
    private var bottomTexts: Array<String>? = null
    private var topTitleView: android.widget.TextView? = null
    private var topSubtitleView: android.widget.TextView? = null
    private var bottomTextView: android.widget.TextView? = null

    private var currentIndex: Int = 0
    private val dots = mutableListOf<View>()
    private var swipeDismissed = false
    private var adapter: MediaPageAdapter? = null
    private var viewPager: ViewPager2? = null
    private var thumbnailRect: Rect? = null
    private var contentContainer: FrameLayout? = null
    private var backgroundView: View? = null

    // Callbacks set by MediaViewerView
    var onIndexChanged: ((Int) -> Unit)? = null
    var onDismissed: ((Int) -> Unit)? = null
    var onSwipeDismissed: ((Int) -> Unit)? = null
    var onEnterAnimationStart: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NO_FRAME, android.R.style.Theme_Black_NoTitleBar)

        val args = requireArguments()
        urls = args.getStringArray(ARG_URLS) ?: emptyArray()
        initialIndex = args.getInt(ARG_INITIAL_INDEX, 0)
        currentIndex = initialIndex
        theme = if (args.getString(ARG_THEME) == "Light") ViewerTheme.Light else ViewerTheme.Dark
        mediaTypes = args.getStringArray(ARG_MEDIA_TYPES)
        edgeToEdge = args.getBoolean(ARG_EDGE_TO_EDGE, true)
        hidePageIndicators = args.getBoolean(ARG_HIDE_INDICATORS, false)
        groupId = args.getString(ARG_GROUP_ID, "")
        topTitles = args.getStringArray(ARG_TOP_TITLES)
        topSubtitles = args.getStringArray(ARG_TOP_SUBTITLES)
        bottomTexts = args.getStringArray(ARG_BOTTOM_TEXTS)
        @Suppress("DEPRECATION")
        thumbnailRect = args.getParcelable(ARG_THUMB_RECT)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog =
        Dialog(requireActivity(), android.R.style.Theme_Black_NoTitleBar).apply {
            setCanceledOnTouchOutside(false)
            window?.let { win ->
                WindowCompat.setDecorFitsSystemWindows(win, false)
                val insetsController = WindowInsetsControllerCompat(win, win.decorView)
                val lightBars = theme == ViewerTheme.Light
                insetsController.isAppearanceLightStatusBars = lightBars
                insetsController.isAppearanceLightNavigationBars = lightBars
                win.navigationBarColor = Color.TRANSPARENT
                win.statusBarColor = Color.TRANSPARENT
            }
            setOnKeyListener { _, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                    dismissViewer()
                    true
                } else {
                    false
                }
            }
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        val density = resources.displayMetrics.density

        fun dp(value: Int) = (value * density).toInt()

        val bgColor = if (theme == ViewerTheme.Dark) Color.BLACK else Color.WHITE

        // Root container — intercepts vertical swipe-to-dismiss gestures
        val root =
            DismissableFrameLayout(requireContext()).apply {
                layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
            }

        // Background view — fades independently during dismiss
        val backgroundView: View =
            View(requireContext()).apply {
                setBackgroundColor(bgColor)
                layoutParams =
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    )
            }
        root.addView(backgroundView)

        // Content container — scales + translates during dismiss
        val contentContainer: FrameLayout =
            FrameLayout(requireContext()).apply {
                layoutParams =
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    )
            }

        // ViewPager2
        val pager =
            ViewPager2(requireContext()).apply {
                layoutParams =
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    )
                offscreenPageLimit = 1
            }
        viewPager = pager

        val pageAdapter =
            MediaPageAdapter(
                urls = urls,
                mediaTypes = mediaTypes,
                theme = theme,
            )
        adapter = pageAdapter
        pager.adapter = pageAdapter
        pager.setCurrentItem(initialIndex, false)

        // Swipe-to-dismiss: scales contentContainer + fades backgroundView
        val dismissHelper =
            DismissGestureHelper(
                backgroundView = backgroundView,
                contentView = contentContainer,
                onDismiss = {
                    adapter?.freezeForDismiss(currentIndex)
                    animateToThumbnailAndDismiss {
                        onSwipeDismissed?.invoke(currentIndex)
                        swipeDismissed = true
                        dismissAllowingStateLoss()
                    }
                },
                onIntercepting = { intercepting ->
                    pager.isUserInputEnabled = !intercepting
                },
            )
        root.setOnTouchListener(dismissHelper)

        pager.registerOnPageChangeCallback(
            object : ViewPager2.OnPageChangeCallback() {
                override fun onPageSelected(position: Int) {
                    handlePageSelected(position)
                }
            },
        )

        // Auto-play video on the initial page (onPageSelected doesn't fire for index 0)
        pager.post { adapter?.resumePlayerAt(initialIndex) }

        contentContainer.addView(pager)
        root.addView(contentContainer)

        // Close button (top-left)
        val closeBtn =
            ImageButton(requireContext()).apply {
                setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
                setColorFilter(Color.WHITE)
                val bg =
                    GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor("#66000000"))
                    }
                background = bg
                contentDescription = "Close"
            }
        contentContainer.addView(
            closeBtn,
            FrameLayout.LayoutParams(dp(44), dp(44)).apply {
                gravity = Gravity.TOP or Gravity.START
                topMargin = dp(52)
                leftMargin = dp(16)
            },
        )
        closeBtn.setOnClickListener { dismissViewer() }

        // Page indicator dots (bottom-center, only if multiple URLs and not hidden)
        if (urls.size > 1 && !hidePageIndicators) {
            val dotContainer =
                LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER
                }
            dots.clear()
            urls.indices.forEach { i ->
                val isActive = i == currentIndex
                val dot =
                    View(requireContext()).apply {
                        background =
                            GradientDrawable().apply {
                                cornerRadius = dp(999).toFloat()
                                setColor(if (isActive) Color.WHITE else Color.parseColor("#66FFFFFF"))
                            }
                    }
                val dotParams =
                    LinearLayout
                        .LayoutParams(
                            if (isActive) dp(20) else dp(6),
                            dp(6),
                        ).apply {
                            leftMargin = dp(3)
                            rightMargin = dp(3)
                        }
                dot.layoutParams = dotParams
                dots.add(dot)
                dotContainer.addView(dot)
            }
            contentContainer.addView(
                dotContainer,
                FrameLayout
                    .LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                    ).apply {
                        gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                        bottomMargin = dp(48)
                    },
            )
        }

        // Text overlays — theme-aware
        val isDark = theme == ViewerTheme.Dark
        val gradientBase = if (isDark) 0x99000000.toInt() else 0x99FFFFFF.toInt()
        val textPrimary = if (isDark) Color.WHITE else Color.BLACK
        val textSecondary = if (isDark) Color.parseColor("#B3FFFFFF") else Color.parseColor("#99000000")

        if (topTitles != null || topSubtitles != null) {
            // Top gradient
            val topGradient = View(requireContext()).apply {
                background = GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    intArrayOf(gradientBase, 0x00000000)
                )
            }
            contentContainer.addView(
                topGradient,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    dp(100),
                ).apply { gravity = Gravity.TOP },
            )

            // Top title
            if (topTitles != null) {
                val titleTv = android.widget.TextView(requireContext()).apply {
                    setTextColor(textPrimary)
                    textSize = 18f
                    typeface = android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.BOLD)
                    maxLines = 1
                    ellipsize = android.text.TextUtils.TruncateAt.END
                    text = topTitles?.getOrNull(currentIndex) ?: ""
                }
                contentContainer.addView(
                    titleTv,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                    ).apply {
                        gravity = Gravity.TOP or Gravity.START
                        topMargin = dp(52)
                        leftMargin = dp(16)
                        rightMargin = dp(64)
                    },
                )
                topTitleView = titleTv
            }

            // Top subtitle
            if (topSubtitles != null) {
                val subtitleTv = android.widget.TextView(requireContext()).apply {
                    setTextColor(textSecondary)
                    textSize = 14f
                    maxLines = 1
                    ellipsize = android.text.TextUtils.TruncateAt.END
                    text = topSubtitles?.getOrNull(currentIndex) ?: ""
                }
                contentContainer.addView(
                    subtitleTv,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                    ).apply {
                        gravity = Gravity.TOP or Gravity.START
                        topMargin = dp(78)
                        leftMargin = dp(16)
                        rightMargin = dp(64)
                    },
                )
                topSubtitleView = subtitleTv
            }
        }

        if (bottomTexts != null) {
            // Bottom gradient
            val bottomGradient = View(requireContext()).apply {
                background = GradientDrawable(
                    GradientDrawable.Orientation.BOTTOM_TOP,
                    intArrayOf(gradientBase, 0x00000000)
                )
            }
            contentContainer.addView(
                bottomGradient,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    dp(80),
                ).apply { gravity = Gravity.BOTTOM },
            )

            // Bottom text
            val bottomTv = android.widget.TextView(requireContext()).apply {
                setTextColor(textPrimary)
                textSize = 15f
                typeface = android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.NORMAL)
                gravity = Gravity.CENTER
                text = bottomTexts?.getOrNull(currentIndex) ?: ""
            }
            contentContainer.addView(
                bottomTv,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                ).apply {
                    gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                    bottomMargin = dp(24)
                    leftMargin = dp(16)
                    rightMargin = dp(16)
                },
            )
            bottomTextView = bottomTv
        }

        this.contentContainer = contentContainer
        this.backgroundView = backgroundView

        // Shared element enter animation — uniform scale + clip rect (no distortion)
        val thumbRect = thumbnailRect
        if (thumbRect != null && thumbRect.width() > 0 && thumbRect.height() > 0) {
            val screenW = resources.displayMetrics.widthPixels.toFloat()
            val screenH = resources.displayMetrics.heightPixels.toFloat()
            val thumbW = thumbRect.width().toFloat()
            val thumbH = thumbRect.height().toFloat()
            val thumbCenterX = thumbRect.centerX().toFloat()
            val thumbCenterY = thumbRect.centerY().toFloat()
            val screenCenterX = screenW / 2f
            val screenCenterY = screenH / 2f
            // Uniform scale so content fills the thumbnail (like scaleType=centerCrop)
            val uniformScale = maxOf(thumbW / screenW, thumbH / screenH)
            val thumbRadius = findCornerRadius(MediaViewerRegistry.getImageView(groupId, initialIndex))

            // Start state: scaled down at thumbnail center, clipped to thumbnail bounds
            contentContainer.pivotX = screenCenterX
            contentContainer.pivotY = screenCenterY
            contentContainer.scaleX = uniformScale
            contentContainer.scaleY = uniformScale
            contentContainer.translationX = thumbCenterX - screenCenterX
            contentContainer.translationY = thumbCenterY - screenCenterY
            backgroundView.alpha = 0f

            // Clip: at start, crop to thumbnail size (in container's own coordinate space)
            val startClipW = thumbW / uniformScale
            val startClipH = thumbH / uniformScale
            val startClipL = (screenW - startClipW) / 2f
            val startClipT = (screenH - startClipH) / 2f
            applyClip(contentContainer, startClipL, startClipT, startClipW, startClipH, thumbRadius / uniformScale)

            root.post {
                onEnterAnimationStart?.invoke()
                ValueAnimator
                    .ofFloat(0f, 1f)
                    .apply {
                        duration = 300
                        interpolator = DecelerateInterpolator(2.5f)

                        addUpdateListener { anim ->
                            val t = anim.animatedFraction
                            val curScale = uniformScale + (1f - uniformScale) * t
                            contentContainer.scaleX = curScale
                            contentContainer.scaleY = curScale
                            contentContainer.translationX = (thumbCenterX - screenCenterX) * (1f - t)
                            contentContainer.translationY = (thumbCenterY - screenCenterY) * (1f - t)
                            backgroundView.alpha = t

                            // Clip expands from thumbnail bounds to full screen
                            val clipW = startClipW + (screenW - startClipW) * t
                            val clipH = startClipH + (screenH - startClipH) * t
                            val clipL = startClipL * (1f - t)
                            val clipT = startClipT * (1f - t)
                            val radius = (thumbRadius / curScale) * (1f - t)
                            applyClip(contentContainer, clipL, clipT, clipW, clipH, radius)
                        }
                        addListener(
                            object : android.animation.AnimatorListenerAdapter() {
                                override fun onAnimationEnd(animation: android.animation.Animator) {
                                    contentContainer.clipToOutline = false
                                    contentContainer.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
                                }
                            },
                        )
                    }.start()
            }
        }

        return root
    }

    private fun handlePageSelected(position: Int) {
        // Pause/release previous page player
        adapter?.pausePlayerAt(currentIndex)

        // Toggle thumbnail alpha on the ExpoView wrapper
        MediaViewerRegistry.getView(groupId, currentIndex)?.alpha = 1f
        currentIndex = position
        MediaViewerRegistry.getView(groupId, currentIndex)?.alpha = 0f

        // Start new page player
        adapter?.resumePlayerAt(currentIndex)

        onIndexChanged?.invoke(position)
        updateDots(position)
        topTitleView?.text = topTitles?.getOrNull(position) ?: ""
        topSubtitleView?.text = topSubtitles?.getOrNull(position) ?: ""
        bottomTextView?.text = bottomTexts?.getOrNull(position) ?: ""
    }

    private fun updateDots(index: Int) {
        if (dots.isEmpty()) return
        val density = resources.displayMetrics.density

        fun dp(value: Int) = (value * density).toInt()
        dots.forEachIndexed { i, dot ->
            val isActive = i == index
            val params = dot.layoutParams as LinearLayout.LayoutParams
            params.width = if (isActive) dp(20) else dp(6)
            dot.layoutParams = params
            (dot.background as? GradientDrawable)?.setColor(
                if (isActive) Color.WHITE else Color.parseColor("#66FFFFFF"),
            )
        }
    }

    private fun dismissViewer() {
        // Show thumbnail overlay so dismiss animation has content (ExoPlayer surface goes black on pause)
        adapter?.freezeForDismiss(currentIndex)
        animateToThumbnailAndDismiss {
            onDismissed?.invoke(currentIndex)
            swipeDismissed = true
            dismissAllowingStateLoss()
            // releaseAll happens in onDestroyView
        }
    }

    /**
     * Animate content back to the current thumbnail rect, then run the completion block.
     * Falls back to a simple fade if no thumbnail rect is available.
     */
    private fun animateToThumbnailAndDismiss(onComplete: () -> Unit) {
        val cc =
            contentContainer ?: run {
                onComplete()
                return
            }
        val bg =
            backgroundView ?: run {
                onComplete()
                return
            }

        val currentThumb = MediaViewerRegistry.getImageView(groupId, currentIndex)
        val targetRect: Rect? =
            if (currentThumb != null && currentThumb.width > 0) {
                val loc = IntArray(2)
                currentThumb.getLocationOnScreen(loc)
                Rect(loc[0], loc[1], loc[0] + currentThumb.width, loc[1] + currentThumb.height)
            } else {
                thumbnailRect
            }

        val targetCornerRadius = findCornerRadius(currentThumb)

        if (targetRect == null || targetRect.width() <= 0) {
            cc
                .animate()
                .alpha(0f)
                .setDuration(200)
                .start()
            bg
                .animate()
                .alpha(0f)
                .setDuration(200)
                .withEndAction(onComplete)
                .start()
            return
        }

        val screenW = resources.displayMetrics.widthPixels.toFloat()
        val screenH = resources.displayMetrics.heightPixels.toFloat()
        val thumbW = targetRect.width().toFloat()
        val thumbH = targetRect.height().toFloat()
        val thumbCenterX = targetRect.centerX().toFloat()
        val thumbCenterY = targetRect.centerY().toFloat()
        val screenCenterX = screenW / 2f
        val screenCenterY = screenH / 2f
        val endScale = maxOf(thumbW / screenW, thumbH / screenH)

        // End clip: thumbnail bounds in container's coordinate space at end scale
        val endClipW = thumbW / endScale
        val endClipH = thumbH / endScale
        val endClipL = (screenW - endClipW) / 2f
        val endClipT = (screenH - endClipH) / 2f

        cc.pivotX = screenCenterX
        cc.pivotY = screenCenterY
        cc.clipToOutline = true

        val animator =
            ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 300
                interpolator = DecelerateInterpolator(2.5f)
                val startScaleX = cc.scaleX
                val startScaleY = cc.scaleY
                val startTx = cc.translationX
                val startTy = cc.translationY
                val startAlpha = bg.alpha
                val startRotation = cc.rotation

                addUpdateListener { anim ->
                    val t = anim.animatedFraction
                    // Uniform scale — no distortion
                    val curScale = startScaleX + (endScale - startScaleX) * t
                    cc.scaleX = curScale
                    cc.scaleY = startScaleY + (endScale - startScaleY) * t // converge Y to same uniform
                    cc.translationX = startTx + ((thumbCenterX - screenCenterX) - startTx) * t
                    cc.translationY = startTy + ((thumbCenterY - screenCenterY) - startTy) * t
                    cc.rotation = startRotation * (1f - t)
                    bg.alpha = startAlpha * (1f - t)

                    // Clip shrinks from fullscreen to thumbnail bounds
                    val clipL = endClipL * t
                    val clipT = endClipT * t
                    val clipW = screenW + (endClipW - screenW) * t
                    val clipH = screenH + (endClipH - screenH) * t
                    val radius = (targetCornerRadius / curScale) * t
                    applyClip(cc, clipL, clipT, clipW, clipH, radius)
                }
                addListener(
                    object : android.animation.AnimatorListenerAdapter() {
                        override fun onAnimationEnd(animation: android.animation.Animator) {
                            onComplete()
                        }
                    },
                )
            }
        animator.start()
    }

    private fun findCornerRadius(view: android.widget.ImageView?): Float {
        if (view == null) return 16f * resources.displayMetrics.density
        var current: View? = view
        while (current != null) {
            if (current.clipToOutline && current.outlineProvider != null) {
                val outline = android.graphics.Outline()
                current.outlineProvider.getOutline(current, outline)
                if (outline.radius > 0) return outline.radius
            }
            current = current.parent as? View
        }
        return 16f * resources.displayMetrics.density
    }

    private fun applyClip(
        view: View,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        radius: Float,
    ) {
        view.clipToOutline = true
        view.outlineProvider =
            object : android.view.ViewOutlineProvider() {
                override fun getOutline(
                    v: View,
                    outline: android.graphics.Outline,
                ) {
                    outline.setRoundRect(
                        left.toInt(),
                        top.toInt(),
                        (left + width).toInt(),
                        (top + height).toInt(),
                        radius,
                    )
                }
            }
        view.invalidateOutline()
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        if (!swipeDismissed) {
            onDismissed?.invoke(currentIndex)
        }
        swipeDismissed = false
    }

    override fun onDestroyView() {
        adapter?.releaseAll()
        viewPager = null
        adapter = null
        super.onDestroyView()
    }
}
