package com.juanrdbo.mediaviewer.viewer

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import com.juanrdbo.mediaviewer.ViewerTheme
import kotlin.math.abs

internal class MediaViewerChromeController(
    private val context: Context,
    private val contentContainer: FrameLayout,
    private val theme: ViewerTheme,
    private val itemCount: Int,
    private val hidePageIndicators: Boolean,
    private val topTitles: Array<String>?,
    private val topSubtitles: Array<String>?,
    private val bottomTexts: Array<String>?,
    private val onClose: () -> Unit,
) {
    private val density = context.resources.displayMetrics.density
    private val isDark = theme == ViewerTheme.Dark
    private val closeIconColor = if (isDark) Color.WHITE else Color.BLACK
    private val closeBackgroundColor = if (isDark) 0x66000000 else 0x33FFFFFF
    private val activeDotColor = if (isDark) Color.WHITE else Color.BLACK
    private val inactiveDotColor = if (isDark) Color.parseColor("#66FFFFFF") else Color.parseColor("#55000000")
    private val dots = mutableListOf<View>()
    private var dotScrollView: HorizontalScrollView? = null
    private var topTitleView: TextView? = null
    private var topSubtitleView: TextView? = null
    private var bottomTextView: TextView? = null

    fun attach(initialIndex: Int) {
        addCloseButton()
        attachPageIndicators(initialIndex)
        attachMetadata(initialIndex)
    }

    fun update(index: Int) {
        updateDots(index)
        topTitleView?.text = topTitles?.getOrNull(index).orEmpty()
        topSubtitleView?.text = topSubtitles?.getOrNull(index).orEmpty()
        bottomTextView?.text = bottomTexts?.getOrNull(index).orEmpty()
    }

    private fun addCloseButton() {
        val button =
            ImageButton(context).apply {
                setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
                setColorFilter(closeIconColor)
                background =
                    GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(closeBackgroundColor)
                    }
                contentDescription = "Close"
                setOnClickListener { onClose() }
            }

        contentContainer.addView(
            button,
            FrameLayout.LayoutParams(dp(44), dp(44)).apply {
                gravity = Gravity.TOP or Gravity.START
                topMargin = dp(52)
                leftMargin = dp(16)
            },
        )
    }

    private fun attachPageIndicators(initialIndex: Int) {
        if (itemCount <= 1 || hidePageIndicators) {
            return
        }

        val dotSize = dp(6)
        val dotMargin = dp(3)
        val maxVisible = 7
        val dotContainer =
            LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

        dots.clear()
        repeat(itemCount) {
            val dot =
                View(context).apply {
                    background =
                        GradientDrawable().apply {
                            cornerRadius = dp(999).toFloat()
                            setColor(inactiveDotColor)
                        }
                }
            dot.layoutParams =
                LinearLayout.LayoutParams(dotSize, dotSize).apply {
                    leftMargin = dotMargin
                    rightMargin = dotMargin
                }
            dots += dot
            dotContainer.addView(dot)
        }

        val scrollView =
            HorizontalScrollView(context).apply {
                isHorizontalScrollBarEnabled = false
                isVerticalScrollBarEnabled = false
                overScrollMode = View.OVER_SCROLL_NEVER
                setOnTouchListener { _, _ -> true }
            }
        scrollView.addView(dotContainer)
        dotScrollView = scrollView

        val scrollWidth =
            if (itemCount <= maxVisible) {
                FrameLayout.LayoutParams.WRAP_CONTENT
            } else {
                pageDotStep() * maxVisible
            }

        contentContainer.addView(
            scrollView,
            FrameLayout.LayoutParams(scrollWidth, dp(14)).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = dp(48)
            },
        )
        scrollView.post { updateDots(initialIndex) }
    }

    private fun attachMetadata(initialIndex: Int) {
        val gradientBase = if (isDark) 0x99000000.toInt() else 0x99FFFFFF.toInt()
        val textPrimary = if (isDark) Color.WHITE else Color.BLACK
        val textSecondary = if (isDark) Color.parseColor("#B3FFFFFF") else Color.parseColor("#99000000")

        if (topTitles != null || topSubtitles != null) {
            addGradient(GradientDrawable.Orientation.TOP_BOTTOM, gradientBase, Gravity.TOP, dp(100))

            if (topTitles != null) {
                topTitleView =
                    createTopTextView(textPrimary, 18f, Typeface.BOLD).also { textView ->
                        textView.text = topTitles?.getOrNull(initialIndex).orEmpty()
                        contentContainer.addView(
                            textView,
                            FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.WRAP_CONTENT,
                            ).apply {
                                gravity = Gravity.TOP or Gravity.START
                                topMargin = dp(52)
                                leftMargin = dp(68)
                                rightMargin = dp(16)
                            },
                        )
                    }
            }

            if (topSubtitles != null) {
                topSubtitleView =
                    createTopTextView(textSecondary, 14f, Typeface.NORMAL).also { textView ->
                        textView.fontFeatureSettings = "tnum"
                        textView.text = topSubtitles?.getOrNull(initialIndex).orEmpty()
                        contentContainer.addView(
                            textView,
                            FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.WRAP_CONTENT,
                            ).apply {
                                gravity = Gravity.TOP or Gravity.START
                                topMargin = dp(78)
                                leftMargin = dp(68)
                                rightMargin = dp(16)
                            },
                        )
                    }
            }
        }

        if (bottomTexts != null) {
            addGradient(GradientDrawable.Orientation.BOTTOM_TOP, gradientBase, Gravity.BOTTOM, dp(80))

            bottomTextView =
                TextView(context).apply {
                    setTextColor(textPrimary)
                    textSize = 15f
                    typeface = Typeface.defaultFromStyle(Typeface.NORMAL)
                    fontFeatureSettings = "tnum"
                    gravity = Gravity.CENTER
                    text = bottomTexts?.getOrNull(initialIndex).orEmpty()
                }.also { textView ->
                    contentContainer.addView(
                        textView,
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
                }
        }
    }

    private fun createTopTextView(
        textColor: Int,
        textSizeSp: Float,
        typefaceStyle: Int,
    ) = TextView(context).apply {
        setTextColor(textColor)
        textSize = textSizeSp
        typeface = Typeface.defaultFromStyle(typefaceStyle)
        maxLines = 1
        ellipsize = TextUtils.TruncateAt.END
    }

    private fun addGradient(
        orientation: GradientDrawable.Orientation,
        gradientBase: Int,
        gravity: Int,
        height: Int,
    ) {
        val gradient =
            View(context).apply {
                background =
                    GradientDrawable(
                        orientation,
                        intArrayOf(gradientBase, 0x00000000),
                    )
            }
        contentContainer.addView(
            gradient,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                height,
            ).apply { this.gravity = gravity },
        )
    }

    private fun updateDots(index: Int) {
        if (dots.isEmpty()) {
            return
        }

        val total = dots.size
        val dotStep = pageDotStep()
        val maxVisible = 7

        if (total > maxVisible) {
            val viewportWidth = dotStep * maxVisible
            val activeDotCenter = index * dotStep + dotStep / 2
            val scrollTarget = activeDotCenter - viewportWidth / 2
            val maxScroll = dotStep * total - viewportWidth
            dotScrollView?.smoothScrollTo(scrollTarget.coerceIn(0, maxScroll), 0)
        }

        dots.forEachIndexed { dotIndex, dot ->
            val distance = abs(dotIndex - index)
            (dot.background as? GradientDrawable)?.setColor(
                if (dotIndex == index) activeDotColor else inactiveDotColor,
            )
            if (dotIndex == index) {
                dot.scaleX = 1.15f
                dot.scaleY = 1.15f
                dot.alpha = 1f
            } else {
                dot.scaleX =
                    when (distance) {
                        1 -> 1f
                        2 -> 0.75f
                        3 -> 0.5f
                        else -> 0.35f
                    }
                dot.scaleY = dot.scaleX
                dot.alpha =
                    when (distance) {
                        1 -> 0.6f
                        2 -> 0.4f
                        3 -> 0.25f
                        else -> 0.15f
                    }
            }
        }
    }

    private fun pageDotStep() = dp(6) + dp(3) * 2

    private fun dp(value: Int) = (value * density).toInt()
}
