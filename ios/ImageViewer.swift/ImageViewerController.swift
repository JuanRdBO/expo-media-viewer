import UIKit

class ImageViewerController: UIViewController {

    var imageView: UIImageView = UIImageView(frame: .zero)
    let imageLoader: ImageLoader

    var index: Int = 0
    var imageItem: ImageItem!

    var initialPlaceholder: UIImage?

    /// Dark gray placeholder shown while the full-res image loads.
    /// Removed once the image arrives so it doesn't interfere with zoom.
    private lazy var loadingView: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor(white: 0.15, alpha: 1.0)
        v.layer.cornerRadius = 12
        v.clipsToBounds = true
        return v
    }()

    private var loadingSpinner: UIActivityIndicatorView = {
        let s = UIActivityIndicatorView(style: .medium)
        s.color = UIColor(white: 0.5, alpha: 1.0)
        s.hidesWhenStopped = true
        return s
    }()

    private var top: NSLayoutConstraint!
    private var leading: NSLayoutConstraint!
    private var trailing: NSLayoutConstraint!
    private var bottom: NSLayoutConstraint!

    private(set) var scrollView: UIScrollView!

    private var maxZoomScale: CGFloat = 1.0

    init(
        index: Int,
        imageItem: ImageItem,
        imageLoader: ImageLoader
    ) {
        self.index = index
        self.imageItem = imageItem
        self.imageLoader = imageLoader
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func loadView() {
        let view = UIView()
        view.backgroundColor = .clear
        self.view = view

        scrollView = UIScrollView()
        scrollView.delegate = self
        scrollView.showsVerticalScrollIndicator = false
        scrollView.contentInsetAdjustmentBehavior = .never

        view.addSubview(scrollView)
        scrollView.bindFrameToSuperview()
        scrollView.backgroundColor = .clear
        scrollView.addSubview(imageView)

        imageView.translatesAutoresizingMaskIntoConstraints = false
        top = imageView.topAnchor.constraint(equalTo: scrollView.topAnchor)
        leading = imageView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor)
        trailing = scrollView.trailingAnchor.constraint(equalTo: imageView.trailingAnchor)
        bottom = scrollView.bottomAnchor.constraint(equalTo: imageView.bottomAnchor)

        top.isActive = true
        leading.isActive = true
        trailing.isActive = true
        bottom.isActive = true
    }

    private func showLoadingPlaceholder() {
        loadingView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loadingView)
        NSLayoutConstraint.activate([
            loadingView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            loadingView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.7),
            loadingView.heightAnchor.constraint(equalTo: loadingView.widthAnchor, multiplier: 0.75),
        ])

        loadingSpinner.translatesAutoresizingMaskIntoConstraints = false
        loadingView.addSubview(loadingSpinner)
        NSLayoutConstraint.activate([
            loadingSpinner.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            loadingSpinner.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor),
        ])
        loadingSpinner.startAnimating()
    }

    private func hideLoadingPlaceholder() {
        UIView.animate(withDuration: 0.2) {
            self.loadingView.alpha = 0
        } completion: { _ in
            self.loadingView.removeFromSuperview()
            self.loadingSpinner.stopAnimating()
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        switch imageItem {
        case .image(let img):
            imageView.image = img ?? initialPlaceholder
            imageView.layoutIfNeeded()
        case .url(let url, let placeholder):
            let effectivePlaceholder = placeholder ?? initialPlaceholder
            if let effectivePlaceholder {
                imageView.image = effectivePlaceholder
                imageView.contentMode = .scaleAspectFit
            } else {
                // No placeholder — show a visible loading state instead of black
                showLoadingPlaceholder()
            }
            imageLoader.loadImage(url, placeholder: effectivePlaceholder, imageView: imageView) { [weak self] _ in
                DispatchQueue.main.async {
                    self?.hideLoadingPlaceholder()
                    self?.layout()
                }
            }
        default:
            break
        }

        addGestureRecognizers()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        layout()
    }

    private func layout() {
        updateConstraintsForSize(view.bounds.size)
        updateMinMaxZoomScaleForSize(view.bounds.size)
    }

    func addGestureRecognizers() {
        let pinchRecognizer = UITapGestureRecognizer(
            target: self,
            action: #selector(didPinch(_:))
        )
        pinchRecognizer.numberOfTapsRequired = 1
        pinchRecognizer.numberOfTouchesRequired = 2
        scrollView.addGestureRecognizer(pinchRecognizer)

        let doubleTapRecognizer = UITapGestureRecognizer(
            target: self,
            action: #selector(didDoubleTap(_:))
        )
        doubleTapRecognizer.numberOfTapsRequired = 2
        doubleTapRecognizer.numberOfTouchesRequired = 1
        scrollView.addGestureRecognizer(doubleTapRecognizer)
    }

    @objc
    func didPinch(_ recognizer: UITapGestureRecognizer) {
        var newZoomScale = scrollView.zoomScale / 1.5
        newZoomScale = max(newZoomScale, scrollView.minimumZoomScale)
        scrollView.setZoomScale(newZoomScale, animated: true)
    }

    @objc
    func didDoubleTap(_ recognizer: UITapGestureRecognizer) {
        let pointInView = recognizer.location(in: imageView)
        zoomInOrOut(at: pointInView)
    }
}

extension ImageViewerController {

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        layout()
    }

    func updateMinMaxZoomScaleForSize(_ size: CGSize) {

        guard let image = imageView.image else { return }
        let imageSize = image.size

        if imageSize.width == 0 || imageSize.height == 0 {
            return
        }

        let safeAreaInsets = view.safeAreaInsets
        let availableWidth = size.width - safeAreaInsets.left - safeAreaInsets.right
        let availableHeight = size.height - safeAreaInsets.top - safeAreaInsets.bottom

        let minScale = min(
            availableWidth/imageSize.width,
            availableHeight/imageSize.height)

        let maxScale = max(
            (availableWidth + 1.0) / imageSize.width,
            (availableHeight + 1.0) / imageSize.height)

        scrollView.minimumZoomScale = minScale
        scrollView.zoomScale = minScale
        maxZoomScale = maxScale

        scrollView.maximumZoomScale =  maxZoomScale * 1.1
    }

    func zoomInOrOut(at point: CGPoint) {
        let newZoomScale = scrollView.zoomScale == scrollView.minimumZoomScale
            ? maxZoomScale : scrollView.minimumZoomScale
        let size = scrollView.bounds.size
        let w = size.width / newZoomScale
        let h = size.height / newZoomScale
        let x = point.x - (w * 0.5)
        let y = point.y - (h * 0.5)
        let rect = CGRect(x: x, y: y, width: w, height: h)
        scrollView.zoom(to: rect, animated: true)
    }

    func updateConstraintsForSize(_ size: CGSize) {
        guard let image = imageView.image else { return }
        let imageSize = image.size

        let safeAreaInsets = view.safeAreaInsets
        let availableWidth = size.width - safeAreaInsets.left - safeAreaInsets.right
        let availableHeight = size.height - safeAreaInsets.top - safeAreaInsets.bottom

        let scaledImageWidth = imageSize.width * scrollView.zoomScale
        let scaledImageHeight = imageSize.height * scrollView.zoomScale

        let verticalPadding = max(0, (availableHeight - scaledImageHeight) / 2)
        top.constant = verticalPadding + safeAreaInsets.top
        bottom.constant = verticalPadding + safeAreaInsets.bottom

        let horizontalPadding = max(0, (availableWidth - scaledImageWidth) / 2)
        leading.constant = horizontalPadding + safeAreaInsets.left
        trailing.constant = horizontalPadding + safeAreaInsets.right
        view.layoutIfNeeded()
    }

}

extension ImageViewerController: UIScrollViewDelegate {

    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return imageView
    }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
        updateConstraintsForSize(view.bounds.size)
    }
}
