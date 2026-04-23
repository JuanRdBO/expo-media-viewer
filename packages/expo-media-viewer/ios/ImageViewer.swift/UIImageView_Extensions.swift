import UIKit

private var currentNavigationView: NavigationView?

extension UIImageView {

    private func debugLog(_ message: String, mediaViewerView: MediaViewerView? = nil) {
        mediaViewerView?.debugLog("[UIImageView] \(message)")
    }

    private class TapWithDataRecognizer: UITapGestureRecognizer {
        weak var sourceImageView: UIImageView?
        weak var from: UIViewController?
        var imageDatasource: ImageDataSource?
        var imageLoader: ImageLoader?
        var initialIndex: Int = 0
        var options: [ImageViewerOption] = []
    }

    public func setupImageViewer(
        options: [ImageViewerOption] = [],
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {
        setup(
            datasource: SimpleImageDatasource(imageItems: [.image(image)]),
            options: options,
            tapView: tapView,
            from: from,
            imageLoader: imageLoader)
    }

    public func setupImageViewer(
        url: URL,
        initialIndex: Int = 0,
        placeholder: UIImage? = nil,
        options: [ImageViewerOption] = [],
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {

        let datasource = SimpleImageDatasource(
            imageItems: [url].compactMap {
                ImageItem.url($0, placeholder: placeholder)
        })
        setup(
            datasource: datasource,
            initialIndex: initialIndex,
            options: options,
            tapView: tapView,
            from: from,
            imageLoader: imageLoader)
    }

    public func setupImageViewer(
        images: [UIImage],
        initialIndex: Int = 0,
        options: [ImageViewerOption] = [],
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {

        let datasource = SimpleImageDatasource(
            imageItems: images.compactMap {
                ImageItem.image($0)
        })
        setup(
            datasource: datasource,
            initialIndex: initialIndex,
            options: options,
            tapView: tapView,
            from: from,
            imageLoader: imageLoader)
    }

    public func setupImageViewer(
        urls: [URL],
        initialIndex: Int = 0,
        options: [ImageViewerOption] = [],
        placeholder: UIImage? = nil,
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {

        let datasource = SimpleImageDatasource(
            imageItems: urls.compactMap {
                ImageItem.url($0, placeholder: placeholder)
        })
        setup(
            datasource: datasource,
            initialIndex: initialIndex,
            options: options,
            tapView: tapView,
            from: from,
            imageLoader: imageLoader)
    }

    public func setupImageViewer(
        datasource: ImageDataSource,
        initialIndex: Int = 0,
        options: [ImageViewerOption] = [],
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {

        setup(
            datasource: datasource,
            initialIndex: initialIndex,
            options: options,
            tapView: tapView,
            from: from,
            imageLoader: imageLoader)
    }

    func removeImageViewerTapGesture(from tapView: UIView? = nil) {
        let gestureView = tapView ?? self
        debugLog(
            "remove tap gesture source=\(self) gestureView=\(gestureView) recognizers=\(gestureView.gestureRecognizers?.count ?? 0)"
        )
        gestureView.gestureRecognizers?.forEach {
            if let recognizer = $0 as? TapWithDataRecognizer {
                debugLog("removed recognizer from gestureView=\(gestureView)")
                gestureView.removeGestureRecognizer(recognizer)
            }
        }

        if gestureView !== self {
            gestureRecognizers?.forEach {
                if let recognizer = $0 as? TapWithDataRecognizer {
                    debugLog("removed stale recognizer from source image=\(self)")
                    removeGestureRecognizer(recognizer)
                }
            }
        }
    }

    func presentImageViewerFromTapView(_ tapView: UIView? = nil) {
        let gestureView = tapView ?? self
        let mediaViewerView = gestureView as? MediaViewerView
        let recognizer = gestureView.gestureRecognizers?.compactMap { $0 as? TapWithDataRecognizer }.first
            ?? gestureRecognizers?.compactMap { $0 as? TapWithDataRecognizer }.first

        guard let recognizer else {
            debugLog("presentImageViewerFromTapView aborted: no recognizer found", mediaViewerView: mediaViewerView)
            return
        }

        debugLog("presentImageViewerFromTapView invoking recognizer directly", mediaViewerView: mediaViewerView)
        showImageViewer(recognizer)
    }

    private func setup(
        datasource: ImageDataSource?,
        initialIndex: Int = 0,
        options: [ImageViewerOption] = [],
        tapView: UIView? = nil,
        from: UIViewController? = nil,
        imageLoader: ImageLoader? = nil) {

        var _tapRecognizer: TapWithDataRecognizer?
        let gestureView = tapView ?? self
        let mediaViewerView = gestureView as? MediaViewerView
        debugLog(
            "setup start source=\(self) sourceFrame=\(frame) gestureView=\(gestureView) gestureFrame=\(gestureView.frame) initialIndex=\(initialIndex) hasDatasource=\(datasource != nil)",
            mediaViewerView: mediaViewerView
        )

        if gestureView !== self {
            gestureRecognizers?.forEach {
                if let recognizer = $0 as? TapWithDataRecognizer {
                    debugLog("removing source recognizer because tapView is external", mediaViewerView: mediaViewerView)
                    removeGestureRecognizer(recognizer)
                }
            }
        }

        gestureView.gestureRecognizers?.forEach {
            if let _tr = $0 as? TapWithDataRecognizer {
                _tapRecognizer = _tr
            }
        }

        if let recognizer = _tapRecognizer {
            if let sourceImageView = recognizer.sourceImageView {
                if sourceImageView !== self {
                    debugLog("removing recognizer for recycled source image=\(sourceImageView)", mediaViewerView: mediaViewerView)
                    gestureView.removeGestureRecognizer(recognizer)
                    _tapRecognizer = nil
                }
            } else {
                debugLog("removing recognizer with nil source image", mediaViewerView: mediaViewerView)
                gestureView.removeGestureRecognizer(recognizer)
                _tapRecognizer = nil
            }
        }

        isUserInteractionEnabled = true
        gestureView.isUserInteractionEnabled = true

        var imageContentMode: UIView.ContentMode = .scaleAspectFill
        options.forEach {
            switch $0 {
            case .contentMode(let contentMode):
                imageContentMode = contentMode
            default:
                break
            }
        }
        contentMode = imageContentMode

        clipsToBounds = true

        if _tapRecognizer == nil {
            _tapRecognizer = TapWithDataRecognizer(
                target: self, action: #selector(showImageViewer(_:)))
            _tapRecognizer!.numberOfTouchesRequired = 1
            _tapRecognizer!.numberOfTapsRequired = 1
            gestureView.addGestureRecognizer(_tapRecognizer!)
            debugLog("added tap recognizer to gestureView=\(gestureView)", mediaViewerView: mediaViewerView)
        } else {
            debugLog("reused tap recognizer on gestureView=\(gestureView)", mediaViewerView: mediaViewerView)
        }
        _tapRecognizer!.sourceImageView = self
        _tapRecognizer!.imageDatasource = datasource
        _tapRecognizer!.imageLoader = imageLoader
        _tapRecognizer!.initialIndex = initialIndex
        _tapRecognizer!.options = options
        _tapRecognizer!.from = from
    }

    @objc
    private func showImageViewer(_ sender: TapWithDataRecognizer) {
        let mediaViewerView = sender.view as? MediaViewerView
        debugLog("showImageViewer fired state=\(sender.state.rawValue)", mediaViewerView: mediaViewerView)
        guard let sourceView = sender.sourceImageView else {
            debugLog("showImageViewer aborted: sourceImageView is nil", mediaViewerView: mediaViewerView)
            return
        }
        guard let window = sourceView.window else {
            debugLog("showImageViewer aborted: sourceView has no window source=\(sourceView)", mediaViewerView: mediaViewerView)
            return
        }

        let defaultImageLoader: ImageLoader
        #if canImport(SDWebImage)
        defaultImageLoader = SDWebImageLoader()
        #else
        defaultImageLoader = URLSessionImageLoader()
        #endif

        let imageLoader = sender.imageLoader ?? defaultImageLoader

        let galeriaView = sourceView.findSuperview(ofType: MediaViewerView.self)
        debugLog(
            "showImageViewer opening sourceFrame=\(sourceView.frame) sourceBounds=\(sourceView.bounds) hasGaleriaView=\(galeriaView != nil) datasource=\(String(describing: sender.imageDatasource)) initialIndex=\(sender.initialIndex)",
            mediaViewerView: galeriaView ?? mediaViewerView
        )

        let placeholderRoot = ImageViewerPlaceholderView(sourceImageView: sourceView, galeriaView: galeriaView)
        placeholderRoot.backgroundColor = .clear

        let navView = NavigationView(rootView: placeholderRoot)
        navView.frame = window.bounds
        navView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(navView)
        currentNavigationView = navView

        let sourceImage: UIImage? = sourceView.image

        let viewerView = ImageViewerRootView(
            imageDataSource: sender.imageDatasource,
            imageLoader: imageLoader,
            options: sender.options,
            initialIndex: sender.initialIndex,
            sourceImage: sourceImage,
            mediaTypes: galeriaView?.mediaTypes
        )

        placeholderRoot.viewerRootView = viewerView

        let optionsDismissCallback = viewerView.onDismiss
        viewerView.onDismiss = { [weak navView] in
            optionsDismissCallback?()
            navView?.removeFromSuperview()
            currentNavigationView = nil
        }

        navView.pushView(viewerView, animated: true)
    }
}

extension UIView {
    func findSuperview<T: UIView>(ofType type: T.Type) -> T? {
        var currentView: UIView? = self
        while let view = currentView {
            if let typedView = view as? T {
                return typedView
            }
            currentView = view.superview
        }
        return nil
    }
}

class ImageViewerPlaceholderView: UIView, MatchTransitionDelegate {
    weak var sourceImageView: UIImageView?
    weak var galeriaView: MediaViewerView?
    var viewerRootView: ImageViewerRootView?

    init(sourceImageView: UIImageView?, galeriaView: MediaViewerView?) {
        self.sourceImageView = sourceImageView
        self.galeriaView = galeriaView
        super.init(frame: .zero)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func matchedViewFor(transition: MatchTransition, otherView: UIView) -> UIView? {
        if let viewerRoot = viewerRootView ?? (otherView as? ImageViewerRootView),
           let groupId = galeriaView?.groupId {
            let currentIndex = viewerRoot.currentIndex

            if let targetView = MediaViewerView.findView(groupId: groupId, index: currentIndex) {
                return targetView.matchedViewFor(transition: transition, otherView: otherView)
            }
        }

        if let galeriaView = galeriaView {
            return galeriaView.matchedViewFor(transition: transition, otherView: otherView)
        }

        guard let sourceImageView, sourceImageView.superview != nil else {
            return nil
        }
        return sourceImageView
    }

    func matchTransitionWillBegin(transition: MatchTransition) {
        if let viewerRoot = viewerRootView,
           let groupId = galeriaView?.groupId,
           let targetView = MediaViewerView.findView(groupId: groupId, index: viewerRoot.currentIndex) {
            targetView.matchTransitionWillBegin(transition: transition)
            return
        }
        galeriaView?.matchTransitionWillBegin(transition: transition)
    }
}
