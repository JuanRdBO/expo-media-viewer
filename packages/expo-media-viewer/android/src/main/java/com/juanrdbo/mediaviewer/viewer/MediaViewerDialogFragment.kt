package com.juanrdbo.mediaviewer.viewer

import android.app.Dialog
import android.content.DialogInterface
import android.graphics.Color
import android.graphics.Rect
import android.os.Bundle
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.DialogFragment
import androidx.viewpager2.widget.ViewPager2
import com.juanrdbo.mediaviewer.MediaViewerItem
import com.juanrdbo.mediaviewer.MediaViewerItemParser
import com.juanrdbo.mediaviewer.MediaViewerRegistry
import com.juanrdbo.mediaviewer.MediaViewerVideoError
import com.juanrdbo.mediaviewer.ViewerTheme

class MediaViewerDialogFragment : DialogFragment() {
    companion object {
        private const val ARG_ITEMS_JSON = "itemsJson"
        private const val ARG_INITIAL_INDEX = "initialIndex"
        private const val ARG_THEME = "theme"
        private const val ARG_EDGE_TO_EDGE = "edgeToEdge"
        private const val ARG_HIDE_INDICATORS = "hidePageIndicators"
        private const val ARG_GROUP_ID = "groupId"
        private const val ARG_THUMB_RECT = "thumbnailRect"

        fun newInstance(
            itemsJson: String?,
            initialIndex: Int,
            theme: ViewerTheme,
            edgeToEdge: Boolean,
            hidePageIndicators: Boolean,
            groupId: String,
            thumbnailRect: Rect? = null,
        ): MediaViewerDialogFragment =
            MediaViewerDialogFragment().apply {
                arguments =
                    Bundle().apply {
                        putString(ARG_ITEMS_JSON, itemsJson)
                        putInt(ARG_INITIAL_INDEX, initialIndex)
                        putString(ARG_THEME, theme.name)
                        putBoolean(ARG_EDGE_TO_EDGE, edgeToEdge)
                        putBoolean(ARG_HIDE_INDICATORS, hidePageIndicators)
                        putString(ARG_GROUP_ID, groupId)
                        if (thumbnailRect != null) putParcelable(ARG_THUMB_RECT, thumbnailRect)
                    }
            }
    }

    private var items: List<MediaViewerItem> = emptyList()
    private var initialIndex: Int = 0
    private var theme: ViewerTheme = ViewerTheme.Dark
    private var edgeToEdge: Boolean = true
    private var hidePageIndicators: Boolean = false
    private var groupId: String = ""

    private var currentIndex: Int = 0
    private var swipeDismissed = false
    private var adapter: MediaPageAdapter? = null
    private var viewPager: ViewPager2? = null
    private var thumbnailRect: Rect? = null
    private var contentContainer: FrameLayout? = null
    private var backgroundView: View? = null
    private var chromeController: MediaViewerChromeController? = null
    private var pageChangeCallback: ViewPager2.OnPageChangeCallback? = null

    var onIndexChanged: ((Int) -> Unit)? = null
    var onVideoError: ((MediaViewerVideoError) -> Unit)? = null
    var onDismissed: ((Int) -> Unit)? = null
    var onSwipeDismissed: ((Int) -> Unit)? = null
    var onEnterAnimationStart: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NO_FRAME, android.R.style.Theme_Black_NoTitleBar)

        val args = requireArguments()
        items = MediaViewerItemParser.parse(args.getString(ARG_ITEMS_JSON))
        initialIndex = args.getInt(ARG_INITIAL_INDEX, 0).coerceIn(0, (items.size - 1).coerceAtLeast(0))
        currentIndex = initialIndex
        theme = if (args.getString(ARG_THEME) == "Light") ViewerTheme.Light else ViewerTheme.Dark
        edgeToEdge = args.getBoolean(ARG_EDGE_TO_EDGE, true)
        hidePageIndicators = args.getBoolean(ARG_HIDE_INDICATORS, false)
        groupId = args.getString(ARG_GROUP_ID, "")
        @Suppress("DEPRECATION")
        thumbnailRect = args.getParcelable(ARG_THUMB_RECT)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog =
        Dialog(requireActivity(), android.R.style.Theme_Black_NoTitleBar).apply {
            setCanceledOnTouchOutside(false)
            window?.let { win ->
                WindowCompat.setDecorFitsSystemWindows(win, !edgeToEdge)
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
        val bgColor = if (theme == ViewerTheme.Dark) Color.BLACK else Color.WHITE

        val root =
            DismissableFrameLayout(requireContext()).apply {
                layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
            }

        val backgroundView =
            View(requireContext()).apply {
                setBackgroundColor(bgColor)
                layoutParams =
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    )
            }
        root.addView(backgroundView)

        val contentContainer =
            FrameLayout(requireContext()).apply {
                layoutParams =
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                    )
            }

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
                items = items,
                onVideoError = { error -> onVideoError?.invoke(error) },
            )
        adapter = pageAdapter
        pager.adapter = pageAdapter
        pager.setCurrentItem(initialIndex, false)

        val dismissHelper =
            DismissGestureHelper(
                backgroundView = backgroundView,
                contentView = contentContainer,
                onDismiss = {
                    adapter?.prepareForDismissTransition(currentIndex)
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

        pageChangeCallback =
            object : ViewPager2.OnPageChangeCallback() {
                override fun onPageSelected(position: Int) {
                    handlePageSelected(position)
                }
            }.also { callback ->
                pager.registerOnPageChangeCallback(callback)
            }

        contentContainer.addView(pager)
        root.addView(contentContainer)

        chromeController =
            MediaViewerChromeController(
                context = requireContext(),
                contentContainer = contentContainer,
                theme = theme,
                itemCount = items.size,
                hidePageIndicators = hidePageIndicators,
                chromeItems =
                    items.map { item ->
                        MediaViewerChromeItem(
                            title = item.title,
                            subtitle = item.subtitle,
                            footer = item.footer,
                        )
                    },
                onClose = { dismissViewer() },
            ).also { controller ->
                controller.attach(currentIndex)
            }

        this.contentContainer = contentContainer
        this.backgroundView = backgroundView

        ThumbnailTransitionAnimator.runEnterAnimation(
            root = root,
            contentContainer = contentContainer,
            backgroundView = backgroundView,
            thumbnailRect = thumbnailRect,
            sourceView = MediaViewerRegistry.getView(groupId, initialIndex),
            onStart = onEnterAnimationStart,
            onEnd = { adapter?.resumePlayerAt(initialIndex) },
        )

        return root
    }

    private fun handlePageSelected(position: Int) {
        adapter?.pausePlayerAt(currentIndex)

        MediaViewerRegistry.getView(groupId, currentIndex)?.alpha = 1f
        currentIndex = position
        MediaViewerRegistry.getView(groupId, currentIndex)?.alpha = 0f

        adapter?.resumePlayerAt(currentIndex)

        onIndexChanged?.invoke(position)
        chromeController?.update(position)
    }

    private fun dismissViewer() {
        adapter?.prepareForDismissTransition(currentIndex)
        animateToThumbnailAndDismiss {
            onDismissed?.invoke(currentIndex)
            swipeDismissed = true
            dismissAllowingStateLoss()
        }
    }

    private fun animateToThumbnailAndDismiss(onComplete: () -> Unit) {
        MediaViewerRegistry.getView(groupId, currentIndex)?.alpha = 1f

        ThumbnailTransitionAnimator.animateDismiss(
            contentContainer = contentContainer,
            backgroundView = backgroundView,
            targetView = MediaViewerRegistry.getView(groupId, currentIndex),
            fallbackThumbnailRect = thumbnailRect,
            onComplete = onComplete,
        )
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
        pageChangeCallback?.let { callback ->
            viewPager?.unregisterOnPageChangeCallback(callback)
        }
        viewPager?.adapter = null
        pageChangeCallback = null
        backgroundView = null
        contentContainer = null
        viewPager = null
        adapter = null
        chromeController = null
        super.onDestroyView()
    }
}
