import UIKit

class ImageViewerRootView: UIView, RootViewType {
    let transition = MatchTransition()

    weak var imageDatasource: ImageDataSource?
    let imageLoader: ImageLoader
    var initialIndex: Int = 0
    var theme: ImageViewerTheme = .dark
    var options: [ImageViewerOption] = []
    var onIndexChange: ((Int) -> Void)?
    var onDismiss: (() -> Void)?
    var sourceImage: UIImage?
    var hideBlurOverlay: Bool = false
    var hidePageIndicators: Bool = false
    var mediaTypes: [String]?
    var urls: [String]?

    private var pageViewController: UIPageViewController!
    private(set) lazy var backgroundView: UIView = {
        let view = UIView()
        view.backgroundColor = theme.color
        return view
    }()

    private(set) lazy var navBar: UINavigationBar = {
        let navBar = UINavigationBar(frame: .zero)
        navBar.isTranslucent = true
        navBar.setBackgroundImage(UIImage(), for: .default)
        navBar.shadowImage = UIImage()
        return navBar
    }()

    private lazy var navItem = UINavigationItem()
    private var onRightNavBarTapped: ((Int) -> Void)?

    private(set) var currentIndex: Int = 0
    private var initialViewController: UIViewController?

    var currentImageView: UIImageView? {
        if let vc = pageViewController?.viewControllers?.first as? ImageViewerController {
            return vc.imageView
        }
        if let vc = pageViewController?.viewControllers?.first as? VideoViewerController {
            return vc.thumbnailImageView
        }
        if let vc = initialViewController as? ImageViewerController {
            return vc.imageView
        }
        if let vc = initialViewController as? VideoViewerController {
            return vc.thumbnailImageView
        }
        return nil
    }

    var currentScrollView: UIScrollView? {
        if let vc = pageViewController?.viewControllers?.first as? ImageViewerController {
            return vc.scrollView
        }
        return (initialViewController as? ImageViewerController)?.scrollView
    }

    var preferredStatusBarStyle: UIStatusBarStyle {
        theme == .dark ? .lightContent : .default
    }

    var prefersStatusBarHidden: Bool { false }
    var prefersHomeIndicatorAutoHidden: Bool { false }

    func willAppear(animated: Bool) {
        navBar.alpha = 0
    }

    func didAppear(animated: Bool) {
        UIView.animate(withDuration: 0.25) {
            self.navBar.alpha = 1.0
        }
    }

    func willDisappear(animated: Bool) {
        UIView.animate(withDuration: 0.25) {
            self.navBar.alpha = 0
        }
    }

    func didDisappear(animated: Bool) {
        onDismiss?()
    }

    init(
        imageDataSource: ImageDataSource?,
        imageLoader: ImageLoader,
        options: [ImageViewerOption] = [],
        initialIndex: Int = 0,
        sourceImage: UIImage? = nil,
        mediaTypes: [String]? = nil
    ) {
        self.imageDatasource = imageDataSource
        self.imageLoader = imageLoader
        self.options = options
        self.initialIndex = initialIndex
        self.currentIndex = initialIndex
        self.sourceImage = sourceImage
        self.mediaTypes = mediaTypes

        for option in options {
            if case .hidePageIndicators(let hide) = option {
                self.hidePageIndicators = hide
            }
        }

        super.init(frame: .zero)
        setupViews()
        applyOptions()
        setupGestures()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func makeViewController(index: Int, datasource: ImageDataSource) -> UIViewController {
        if let types = mediaTypes, types.count > index, types[index] == "video" {
            // Extract URL from the image datasource
            let item = datasource.imageItem(at: index)
            if case .url(let url, _) = item {
                return VideoViewerController(index: index, videoURL: url, placeholder: nil)
            }
        }
        let vc = ImageViewerController(
            index: index,
            imageItem: datasource.imageItem(at: index),
            imageLoader: imageLoader
        )
        vc.view.gestureRecognizers?.removeAll(where: { $0 is UIPanGestureRecognizer })
        return vc
    }

    private func setupViews() {
        addSubview(backgroundView)

        let pageOptions = [UIPageViewController.OptionsKey.interPageSpacing: 20]
        pageViewController = UIPageViewController(
            transitionStyle: .scroll,
            navigationOrientation: .horizontal,
            options: pageOptions
        )
        pageViewController.dataSource = self
        pageViewController.delegate = self
        pageViewController.view.backgroundColor = .clear

        addSubview(pageViewController.view)

        if let datasource = imageDatasource {
            let initialVC: UIViewController
            let isVideo = mediaTypes != nil && mediaTypes!.count > initialIndex && mediaTypes![initialIndex] == "video"

            if isVideo {
                let item = datasource.imageItem(at: initialIndex)
                if case .url(let url, _) = item {
                    initialVC = VideoViewerController(index: initialIndex, videoURL: url, placeholder: nil)
                } else {
                    initialVC = ImageViewerController(index: initialIndex, imageItem: datasource.imageItem(at: initialIndex), imageLoader: imageLoader)
                }
            } else {
                let imgVC = ImageViewerController(index: initialIndex, imageItem: datasource.imageItem(at: initialIndex), imageLoader: imageLoader)
                if let sourceImage = self.sourceImage {
                    imgVC.initialPlaceholder = sourceImage
                }
                initialVC = imgVC
            }
            self.initialViewController = initialVC

            initialVC.view.gestureRecognizers?.removeAll(where: { $0 is UIPanGestureRecognizer })
            pageViewController.setViewControllers([initialVC], direction: .forward, animated: false)

            initialVC.view.setNeedsLayout()
            initialVC.view.layoutIfNeeded()

            onIndexChange?(initialIndex)
        }

        let closeBarButton = UIBarButtonItem(
            title: NSLocalizedString("Close", comment: "Close button title"),
            style: .plain,
            target: self,
            action: #selector(dismissViewer)
        )
        closeBarButton.tintColor = theme.tintColor
        navItem.rightBarButtonItem = closeBarButton
        navBar.items = [navItem]
        addSubview(navBar)
    }

    private func applyOptions() {
        let closeButton = navItem.rightBarButtonItem

        options.forEach { option in
            switch option {
            case .theme(let newTheme):
                self.theme = newTheme
                backgroundView.backgroundColor = newTheme.color
                closeButton?.tintColor = newTheme.tintColor
            case .closeIcon(let icon):
                closeButton?.image = icon
            case .rightNavItemTitle(let title, let onTap):
                let customButton = UIBarButtonItem(
                    title: title,
                    style: .plain,
                    target: self,
                    action: #selector(didTapRightNavItem)
                )
                if let closeButton = closeButton {
                    navItem.rightBarButtonItems = [closeButton, customButton]
                } else {
                    navItem.rightBarButtonItem = customButton
                }
                onRightNavBarTapped = onTap
            case .rightNavItemIcon(let icon, let onTap):
                let customButton = UIBarButtonItem(
                    image: icon,
                    style: .plain,
                    target: self,
                    action: #selector(didTapRightNavItem)
                )
                if let closeButton = closeButton {
                    navItem.rightBarButtonItems = [closeButton, customButton]
                } else {
                    navItem.rightBarButtonItem = customButton
                }
                onRightNavBarTapped = onTap
            case .onIndexChange(let callback):
                self.onIndexChange = callback
            case .onDismiss(let callback):
                self.onDismiss = callback
            case .contentMode:
                break
            case .hideBlurOverlay(let hide):
                self.hideBlurOverlay = hide
            case .hidePageIndicators(let hide):
                self.hidePageIndicators = hide
            case .mediaTypes(let types):
                self.mediaTypes = types
            }
        }
    }

    private func setupGestures() {
        addGestureRecognizer(transition.verticalDismissGestureRecognizer)
        transition.verticalDismissGestureRecognizer.delegate = self

        let singleTapGesture = UITapGestureRecognizer(target: self, action: #selector(didSingleTap))
        singleTapGesture.numberOfTapsRequired = 1
        addGestureRecognizer(singleTapGesture)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        backgroundView.frame = bounds
        pageViewController.view.frame = bounds

        pageViewController.view.setNeedsLayout()
        pageViewController.view.layoutIfNeeded()
        for child in pageViewController.children {
            child.view.setNeedsLayout()
            child.view.layoutIfNeeded()
        }

        let navBarHeight: CGFloat = 44
        let statusBarHeight = safeAreaInsets.top
        let horizontalPadding: CGFloat = 16
        navBar.frame = CGRect(
            x: horizontalPadding,
            y: statusBarHeight,
            width: bounds.width - (horizontalPadding * 2),
            height: navBarHeight
        )
    }

    @objc private func dismissViewer() {
        navigationView?.popView(animated: true)
    }

    @objc private func didSingleTap() {
        let currentAlpha = navBar.alpha
        UIView.animate(withDuration: 0.235) {
            self.navBar.alpha = currentAlpha > 0.5 ? 0.0 : 1.0
        }
    }

    @objc private func didTapRightNavItem() {
        onRightNavBarTapped?(currentIndex)
    }
}

extension ImageViewerRootView: TransitionProvider {
    func transitionFor(presenting: Bool, otherView: UIView) -> ViewerTransition? {
        return transition
    }
}

extension ImageViewerRootView: MatchTransitionDelegate {
    func matchedViewFor(transition: MatchTransition, otherView: UIView) -> UIView? {
        let imageView = currentImageView
        return imageView
    }

    func matchTransitionWillBegin(transition: MatchTransition) {
        navBar.alpha = 0
        transition.overlayView?.isHidden = hideBlurOverlay
    }
}

extension ImageViewerRootView: UIGestureRecognizerDelegate {
    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        if let scrollView = currentScrollView {
            return scrollView.zoomScale <= scrollView.minimumZoomScale + 0.01
        }
        return true
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        return false
    }
}

extension ImageViewerRootView: UIPageViewControllerDataSource {
    func pageViewController(
        _ pageViewController: UIPageViewController,
        viewControllerBefore viewController: UIViewController
    ) -> UIViewController? {
        guard let datasource = imageDatasource else { return nil }
        let idx: Int
        if let imgVC = viewController as? ImageViewerController { idx = imgVC.index } else if let vidVC = viewController as? VideoViewerController { idx = vidVC.index } else { return nil }
        guard idx > 0 else { return nil }
        return makeViewController(index: idx - 1, datasource: datasource)
    }

    func pageViewController(
        _ pageViewController: UIPageViewController,
        viewControllerAfter viewController: UIViewController
    ) -> UIViewController? {
        guard let datasource = imageDatasource else { return nil }
        let idx: Int
        if let imgVC = viewController as? ImageViewerController { idx = imgVC.index } else if let vidVC = viewController as? VideoViewerController { idx = vidVC.index } else { return nil }
        guard idx < datasource.numberOfImages() - 1 else { return nil }
        return makeViewController(index: idx + 1, datasource: datasource)
    }

    func presentationCount(for pageViewController: UIPageViewController) -> Int {
        guard !hidePageIndicators else { return 0 }
        let count = imageDatasource?.numberOfImages() ?? 0
        return count > 1 ? count : 0
    }

    func presentationIndex(for pageViewController: UIPageViewController) -> Int {
        return currentIndex
    }
}

extension ImageViewerRootView: UIPageViewControllerDelegate {
    func pageViewController(
        _ pageViewController: UIPageViewController,
        didFinishAnimating finished: Bool,
        previousViewControllers: [UIViewController],
        transitionCompleted completed: Bool
    ) {
        if completed, let firstVC = pageViewController.viewControllers?.first {
            if let imgVC = firstVC as? ImageViewerController {
                currentIndex = imgVC.index
            } else if let vidVC = firstVC as? VideoViewerController {
                currentIndex = vidVC.index
            }
            onIndexChange?(currentIndex)
        }
    }
}
