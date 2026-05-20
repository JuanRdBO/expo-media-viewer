import ExpoModulesCore
import UIKit

class MediaViewerView: ExpoView {
  private var childImageView: UIImageView?
  private weak var currentNavigationView: NavigationView?
  private weak var previousFirstResponder: UIResponder?
  private var isRegistered = false
  private var registeredGroupId: String?
  private var registeredIndex: Int?
  private var touchStartPoint: CGPoint?
  private let tapMovementTolerance: CGFloat = 12
  var providedGroupId: String?
  var thumbnailAnchorJson: String? {
    didSet {
      thumbnailAnchor = MediaViewerThumbnailAnchor.decode(thumbnailAnchorJson)
    }
  }
  private var thumbnailAnchor: MediaViewerThumbnailAnchor?

  func debugLog(_ message: String) {
    guard ProcessInfo.processInfo.environment["EXPO_MEDIA_VIEWER_IOS_DEBUG_LOGS"] == "1" else {
      return
    }
    NSLog("[MediaViewer][iOS][View] \(message)")
  }

  var groupId: String? {
    if let providedGroupId, !providedGroupId.isEmpty {
      return providedGroupId
    }
    if let itemsJson, !itemsJson.isEmpty {
      return String(itemsJson.hashValue)
    }
    return nil
  }

  deinit {
    unregisterFromRegistry()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    debugLog(
      "layoutSubviews bounds=\(bounds) subviews=\(subviews.count) hasChildImage=\(childImageView != nil) items=\(mediaItems.count) index=\(initialIndex.map(String.init) ?? "nil")"
    )

    if childImageView == nil {
      setupImageView()
    }
  }

  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    let hitView = super.hitTest(point, with: event)
    if bounds.contains(point) {
      debugLog(
        "hitTest point=\(point) bounds=\(bounds) hit=\(String(describing: type(of: hitView))) selfHit=\(hitView === self)"
      )
    }
    return hitView
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    debugLog("touchesBegan touches=\(touches.count)")
    touchStartPoint = touches.first?.location(in: self)
    super.touchesBegan(touches, with: event)
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    if let startPoint = touchStartPoint,
      let currentPoint = touches.first?.location(in: self) {
      let dx = currentPoint.x - startPoint.x
      let dy = currentPoint.y - startPoint.y
      if hypot(dx, dy) > tapMovementTolerance {
        debugLog("touchesMoved cancelled fallback tap distance=\(hypot(dx, dy))")
        touchStartPoint = nil
      }
    }

    super.touchesMoved(touches, with: event)
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    defer {
      touchStartPoint = nil
      super.touchesEnded(touches, with: event)
    }

    guard let startPoint = touchStartPoint,
      let endPoint = touches.first?.location(in: self) else {
      debugLog("touchesEnded fallback skipped: missing start or end point")
      return
    }

    let distance = hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
    debugLog("touchesEnded fallback candidate distance=\(distance)")

    guard distance <= tapMovementTolerance else {
      debugLog("touchesEnded fallback skipped: moved too far")
      return
    }

    let sourceImageView = childImageView ?? getChildImageView()

    if sourceImageView == nil {
      debugLog("touchesEnded fallback: no childImageView, opening from wrapper")
    }

    debugLog("touchesEnded fallback opening viewer")
    presentImageViewer(sourceImageView: sourceImageView)
  }

  private func makeUrlDatasource() -> ImageDataSource? {
    let imageItems: [ImageItem] = mediaItems.compactMap { item in
      guard let url = item.mediaURL else { return nil }
      return ImageItem.request(url, placeholder: nil, headers: item.headers)
    }
    return imageItems.isEmpty ? nil : SimpleImageDatasource(imageItems: imageItems)
  }

  private func presentImageViewer(sourceImageView: UIImageView?) {
    guard let window else {
      debugLog("presentImageViewer skipped: wrapper has no window")
      return
    }

    guard let datasource = makeUrlDatasource() else {
      debugLog("presentImageViewer skipped: missing datasource items=\(mediaItems.count)")
      return
    }

    let sourceImage = sourceImageView?.image ?? snapshotImage()
    let placeholderRoot = ImageViewerPlaceholderView(sourceImageView: sourceImageView, galeriaView: self)
    placeholderRoot.backgroundColor = .clear

    let navView = NavigationView(rootView: placeholderRoot)
    navView.frame = window.bounds
    navView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(navView)
    currentNavigationView = navView

    let viewerView = ImageViewerRootView(
      imageDataSource: datasource,
      imageLoader: defaultImageLoader(),
      options: buildImageViewerOptions(),
      initialIndex: initialIndex ?? 0,
      sourceImage: sourceImage,
      mediaItems: mediaItems,
      groupId: groupId
    )
    viewerView.backgroundColor = theme.toImageViewerTheme().color

    placeholderRoot.viewerRootView = viewerView

    let optionsDismissCallback = viewerView.onDismiss
    viewerView.onDismiss = { [weak self, weak navView, weak viewerView] in
      optionsDismissCallback?()
      if let self,
        let groupId = self.groupId,
        let currentIndex = viewerView?.currentIndex,
        self.mediaItems.indices.contains(currentIndex) {
        let mediaItem = self.mediaItems[currentIndex]
        if mediaItem.type == "video",
          mediaItem.thumbnailMode == "loop-muted" {
          let key = MediaViewerVideoSessionKey(groupId: groupId, itemId: mediaItem.id)
          MediaViewerVideoPlaybackRegistry.shared.existingSession(for: key)?.reattachPreviewIfAvailable()
        }
      }
      navView?.removeFromSuperview()
      self?.currentNavigationView = nil
    }

    debugLog("presentImageViewer opening initialIndex=\(initialIndex ?? 0) sourceImageView=\(sourceImageView != nil)")
    navView.pushView(viewerView, animated: true)
  }

  private func snapshotImage() -> UIImage? {
    guard bounds.width > 0, bounds.height > 0 else {
      return nil
    }

    let renderer = UIGraphicsImageRenderer(bounds: bounds)
    return renderer.image { _ in
      drawHierarchy(in: bounds, afterScreenUpdates: true)
    }
  }

  private func defaultImageLoader() -> ImageLoader {
    #if canImport(SDWebImage)
      return SDWebImageLoader()
    #else
      return URLSessionImageLoader()
    #endif
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    debugLog("touchesCancelled")
    touchStartPoint = nil
    super.touchesCancelled(touches, with: event)
  }

  private func registerWithRegistry() {
    guard let groupId = groupId, let index = initialIndex else {
      debugLog(
        "register skipped groupId=\(groupId ?? "nil") index=\(initialIndex.map(String.init) ?? "nil")"
      )
      return
    }

    if registeredGroupId == groupId, registeredIndex == index, isRegistered {
      return
    }

    unregisterFromRegistry()

    MediaViewerRegistry.shared.register(view: self, groupId: groupId, index: index)
    isRegistered = true
    registeredGroupId = groupId
    registeredIndex = index
    debugLog("registered groupId=\(groupId) index=\(index)")
  }

  private func unregisterFromRegistry() {
    guard isRegistered, let groupId = registeredGroupId, let index = registeredIndex else { return }
    MediaViewerRegistry.shared.unregister(groupId: groupId, index: index)
    isRegistered = false
    registeredGroupId = nil
    registeredIndex = nil
    debugLog("unregistered groupId=\(groupId) index=\(index)")
  }

  class func findView(groupId: String, index: Int) -> MediaViewerView? {
    return MediaViewerRegistry.shared.view(forGroupId: groupId, index: index)
  }

  private func findImageView(in view: UIView) -> UIImageView? {
    debugLog("searching view=\(type(of: view)) subviews=\(view.subviews.count)")
    if let imageView = view as? UIImageView {
      debugLog("found UIImageView frame=\(imageView.frame) bounds=\(imageView.bounds)")
      return imageView
    }

    for subview in view.subviews {
      if let imageView = findImageView(in: subview) {
        return imageView
      }
    }

    return nil
  }

  func getChildImageView() -> UIImageView? {
    var reactSubviews: [UIView]?
    #if RCT_NEW_ARCH_ENABLED
      reactSubviews = self.subviews
    #else
      reactSubviews = self.reactSubviews()
    #endif

    guard let reactSubviews else {
      debugLog("getChildImageView: no react subviews")
      return nil
    }

    debugLog("getChildImageView reactSubviews=\(reactSubviews.count)")

    for reactSubview in reactSubviews {
      if let imageView = findImageView(in: reactSubview) {
        childImageView = imageView
        return imageView
      }
    }

    debugLog("getChildImageView: no UIImageView found")
    return nil
  }

  #if !RCT_NEW_ARCH_ENABLED
    override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
      super.insertReactSubview(subview, at: atIndex)
      debugLog("insertReactSubview type=\(type(of: subview)) index=\(atIndex)")
      setupImageView()
    }
  #endif

  #if RCT_NEW_ARCH_ENABLED
    override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
      super.mountChildComponentView(childComponentView, index: index)
      debugLog("mountChildComponentView type=\(type(of: childComponentView)) index=\(index)")
      setupImageView()
    }

    // https://github.com/nandorojo/galeria/issues/19
    // Cleanup gesture recognizers from the image view to work with fabric view recycling
    override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
      debugLog("unmountChildComponentView type=\(type(of: childComponentView)) index=\(index)")
      childImageView?.removeImageViewerTapGesture(from: self)
      childImageView = nil
      unregisterFromRegistry()
      super.unmountChildComponentView(childComponentView, index: index)
    }
  #endif

  var theme: Theme = .dark
  var initialIndex: Int?
  var closeIconName: String?
  var rightNavItemIconName: String?
  var hideBlurOverlay: Bool = false
  var hidePageIndicators: Bool = false
  var itemsJson: String? {
    didSet {
      mediaItems = MediaViewerNativeItem.decodeItems(itemsJson)
      registerWithRegistry()
    }
  }
  var mediaItems: [MediaViewerNativeItem] = []
  let onPressRightNavItemIcon = EventDispatcher()
  let onIndexChange = EventDispatcher()
  let onVideoError = EventDispatcher()

  public func setupImageView() {
    registerWithRegistry()

    guard let childImage = getChildImageView() else {
      debugLog(
        "setupImageView skipped: no child image items=\(mediaItems.count) index=\(initialIndex.map(String.init) ?? "nil")"
      )
      return
    }

    debugLog(
      "setupImageView child=\(childImage) childFrame=\(childImage.frame) wrapperBounds=\(bounds) items=\(mediaItems.count) index=\(initialIndex.map(String.init) ?? "nil")"
    )

    if !mediaItems.isEmpty, let initialIndex = self.initialIndex {
      setupImageViewerWithItems(childImage, initialIndex: initialIndex)
    }
  }

  private func setupImageViewerWithItems(
    _ childImage: UIImageView,
    initialIndex: Int
  ) {
    let options = buildImageViewerOptions()
    let imageItems: [ImageItem] = mediaItems.compactMap { item in
      guard let url = item.mediaURL else { return nil }
      return ImageItem.request(url, placeholder: nil, headers: item.headers)
    }

    let datasource = SimpleImageDatasource(imageItems: imageItems)
    debugLog("setupImageViewerWithItems items=\(imageItems.count) initialIndex=\(initialIndex)")
    childImage.setupImageViewer(
      datasource: datasource,
      initialIndex: initialIndex,
      options: options,
      tapView: self
    )
  }

  private func buildImageViewerOptions() -> [ImageViewerOption] {
    let viewerTheme = theme.toImageViewerTheme()
    var options: [ImageViewerOption] = [.theme(viewerTheme)]
    let iconColor = theme.iconColor()

    if let thumbnailAnchor {
      options.append(.contentMode(thumbnailAnchor.contentMode))
    }

    if let closeIconName = closeIconName,
      let closeIconImage = UIImage(systemName: closeIconName)?.withTintColor(
        iconColor, renderingMode: .alwaysOriginal) {
      options.append(ImageViewerOption.closeIcon(closeIconImage))

    }

    if let rightIconName = rightNavItemIconName,
      let rightIconImage = UIImage(systemName: rightIconName)?.withTintColor(
        iconColor, renderingMode: .alwaysOriginal) {
      let rightNavItemOption = ImageViewerOption.rightNavItemIcon(
        rightIconImage,
        onTap: { index in
          self.onPressRightNavItemIcon(["index": index])
        })
      options.append(rightNavItemOption)
    }

    options.append(
      .onIndexChange { [weak self] index in
        self?.onIndexChange(["currentIndex": index])
      })

    options.append(
      .onVideoError { [weak self] error in
        self?.onVideoError([
          "index": error.index,
          "url": error.url,
          "message": error.message,
          "nativeMessage": error.nativeMessage ?? NSNull(),
          "underlyingMessage": error.underlyingMessage ?? NSNull(),
          "platform": error.platform,
          "stage": error.stage.rawValue,
        ])
      })

    options.append(
      .onDismiss { [weak self] in
        self?.restoreKeyboard()
      })

    options.append(.hideBlurOverlay(hideBlurOverlay))
    options.append(.hidePageIndicators(hidePageIndicators))

    if !mediaItems.isEmpty { options.append(.mediaItems(mediaItems)) }
    return options
  }
}

enum Theme: String, Enumerable {
  case dark
  case light

  func toImageViewerTheme() -> ImageViewerTheme {
    switch self {
    case .dark:
      return .dark
    case .light:
      return .light
    }
  }
  func iconColor() -> UIColor {
    return UIColor.label
  }
}

extension MediaViewerView: MatchTransitionDelegate {
  func matchedViewFor(transition: MatchTransition, otherView: UIView) -> UIView? {
    guard let imageView = childImageView else {
      if let thumbnailAnchor, window != nil, !bounds.isEmpty {
        applyThumbnailAnchor(thumbnailAnchor, to: self)
      }
      return window == nil || bounds.isEmpty ? nil : self
    }

    if let thumbnailAnchor {
      applyThumbnailAnchor(thumbnailAnchor, to: imageView)
    }

    if let cornerRadius = thumbnailAnchor?.cornerRadius ?? findCornerRadius(for: imageView), cornerRadius > 0 {
      imageView.layer.cornerRadius = cornerRadius
      imageView.clipsToBounds = true
    }

    return imageView
  }

    func matchTransitionWillBegin(transition: MatchTransition) {
        guard previousFirstResponder == nil else { return }

        previousFirstResponder = UIResponder.currentFirstResponder
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    func restoreKeyboard() {
        previousFirstResponder?.becomeFirstResponder()
        previousFirstResponder = nil
    }

  private func findCornerRadius(for view: UIView) -> CGFloat? {
    var current: UIView? = view.superview
    while let parent = current {
      if parent.layer.cornerRadius > 0 {
        return parent.layer.cornerRadius
      }
      if parent === self {
        break
      }
      current = parent.superview
    }
    return nil
  }

  private func applyThumbnailAnchor(_ anchor: MediaViewerThumbnailAnchor, to view: UIView) {
    if let imageView = view as? UIImageView {
      imageView.contentMode = anchor.contentMode
    }

    guard let cornerRadius = anchor.cornerRadius else { return }
    view.layer.cornerRadius = cornerRadius
    view.clipsToBounds = true
  }
}

extension UIResponder {
    private static weak var _currentFirstResponder: UIResponder?

    static var currentFirstResponder: UIResponder? {
        _currentFirstResponder = nil
        UIApplication.shared.sendAction(#selector(findFirstResponder(_:)), to: nil, from: nil, for: nil)
        return _currentFirstResponder
    }

    @objc private func findFirstResponder(_ sender: Any) {
        UIResponder._currentFirstResponder = self
    }
}
