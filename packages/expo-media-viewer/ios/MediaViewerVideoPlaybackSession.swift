import AVKit
import ExpoModulesCore
import UIKit

struct MediaViewerVideoSessionKey: Hashable {
  let groupId: String
  let itemId: String
}

final class MediaViewerVideoPlaybackSession {
  typealias Listener = (MediaViewerVideoPlaybackSession) -> Void

  let key: MediaViewerVideoSessionKey
  let player = AVPlayer()

  private var currentURL: URL?
  private var currentHeaders: [String: String]?
  private var currentPlayerItem: AVPlayerItem?
  private var playerItemStatusObserver: NSKeyValueObservation?
  private var playbackEndedObserver: NSObjectProtocol?
  private var listeners: [UUID: Listener] = [:]
  private weak var attachedPreviewView: MediaViewerVideoThumbnailView?
  private weak var attachedFullscreenController: AVPlayerViewController?
  private var isReleased = false

  private(set) var isReadyToPlay = false
  private(set) var hasDisplayedFirstFrame = false
  private(set) var playbackError: NSError?

  init(key: MediaViewerVideoSessionKey) {
    self.key = key
    player.actionAtItemEnd = .none
    player.automaticallyWaitsToMinimizeStalling = true
  }

  func configure(url: URL, headers: [String: String]?) {
    guard !isReleased else { return }

    if currentURL == url, currentHeaders == headers, currentPlayerItem != nil {
      return
    }

    tearDownPlayerItem()
    currentURL = url
    currentHeaders = headers
    isReadyToPlay = false
    hasDisplayedFirstFrame = false
    playbackError = nil

    let assetOptions: [String: Any]? = headers.map { ["AVURLAssetHTTPHeaderFieldsKey": $0] }
    let asset = AVURLAsset(url: url, options: assetOptions)
    let playerItem = AVPlayerItem(asset: asset)
    playerItem.preferredForwardBufferDuration = 3
    playerItem.canUseNetworkResourcesForLiveStreamingWhilePaused = true

    currentPlayerItem = playerItem

    playbackEndedObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemDidPlayToEndTime,
      object: playerItem,
      queue: .main
    ) { [weak self] _ in
      guard let self else { return }
      self.player.seek(to: .zero)
      self.player.play()
    }

    playerItemStatusObserver = playerItem.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
      DispatchQueue.main.async {
        self?.handlePlayerItemStatus(item)
      }
    }

    player.replaceCurrentItem(with: playerItem)
  }

  @discardableResult
  func addListener(_ listener: @escaping Listener) -> UUID {
    guard !isReleased else {
      return UUID()
    }

    let id = UUID()
    listeners[id] = listener
    listener(self)
    return id
  }

  func removeListener(_ id: UUID?) {
    guard let id else { return }
    listeners[id] = nil
  }

  func attachPreview(_ previewView: MediaViewerVideoThumbnailView) {
    guard !isReleased else { return }

    attachedPreviewView = previewView
    previewView.attach(player: player, isReady: hasDisplayedFirstFrame)

    guard attachedFullscreenController == nil else {
      return
    }

    player.isMuted = true
    player.volume = 0
    player.play()
  }

  func detachPreview(_ previewView: MediaViewerVideoThumbnailView) {
    guard attachedPreviewView === previewView else { return }
    previewView.setVideoVisible(false)
    guard attachedFullscreenController == nil else {
      return
    }

    previewView.detach(player: player)
    attachedPreviewView = nil
    player.pause()
  }

  func attachFullscreen(_ controller: AVPlayerViewController) {
    guard !isReleased else { return }

    // Keep the preview layer attached behind the viewer so dismissal does not
    // have to move the player back into the thumbnail at the end of animation.
    attachedFullscreenController = controller

    player.isMuted = false
    player.volume = 1
    if controller.player !== player {
      controller.player = player
    }
  }

  func detachFullscreen(_ controller: AVPlayerViewController?) {
    guard let controller, attachedFullscreenController === controller else { return }
    if controller.player === player {
      controller.player = nil
    }
    attachedFullscreenController = nil

    if let previewView = attachedPreviewView {
      let isPreviewPlaying = previewView.refreshPreviewPlayback(force: true)
      if !isPreviewPlaying {
        player.pause()
      }
    } else {
      player.pause()
    }
  }

  func reattachPreviewIfAvailable() {
    guard let previewView = MediaViewerVideoPlaybackRegistry.shared.previewView(for: key) else {
      return
    }
    previewView.refreshPreviewPlayback(force: true)
  }

  func isPreviewAttached(_ previewView: MediaViewerVideoThumbnailView) -> Bool {
    attachedPreviewView === previewView && attachedFullscreenController == nil
  }

  private func handlePlayerItemStatus(_ item: AVPlayerItem) {
    guard item === currentPlayerItem else { return }

    switch item.status {
    case .readyToPlay:
      isReadyToPlay = true
      hasDisplayedFirstFrame = true
      playbackError = nil
      notifyListeners()

    case .failed:
      playbackError = item.error as NSError?
      notifyListeners()

    case .unknown:
      break

    @unknown default:
      break
    }
  }

  private func notifyListeners() {
    listeners.values.forEach { $0(self) }
  }

  private func tearDownPlayerItem() {
    if let playbackEndedObserver {
      NotificationCenter.default.removeObserver(playbackEndedObserver)
      self.playbackEndedObserver = nil
    }

    playerItemStatusObserver?.invalidate()
    playerItemStatusObserver = nil
    currentPlayerItem = nil
    player.pause()
    player.replaceCurrentItem(with: nil)
  }

  func release() {
    guard !isReleased else { return }

    isReleased = true
    listeners.removeAll()

    if let previewView = attachedPreviewView {
      previewView.setVideoVisible(false)
      previewView.detach(player: player)
      attachedPreviewView = nil
    }

    if let controller = attachedFullscreenController {
      if controller.player === player {
        controller.player = nil
      }
      attachedFullscreenController = nil
    }

    tearDownPlayerItem()
  }

  deinit {
    release()
  }
}

final class MediaViewerVideoPlaybackSessionLease {
  let session: MediaViewerVideoPlaybackSession

  fileprivate let id = UUID()
  private let key: MediaViewerVideoSessionKey
  private var isReleased = false

  fileprivate init(key: MediaViewerVideoSessionKey, session: MediaViewerVideoPlaybackSession) {
    self.key = key
    self.session = session
  }

  func release() {
    guard !isReleased else { return }

    isReleased = true
    MediaViewerVideoPlaybackRegistry.shared.releaseLease(id, for: key)
  }

  deinit {
    release()
  }
}

final class MediaViewerVideoPlaybackRegistry {
  static let shared = MediaViewerVideoPlaybackRegistry()

  private final class SessionEntry {
    let session: MediaViewerVideoPlaybackSession
    var leases: Set<UUID> = []

    init(session: MediaViewerVideoPlaybackSession) {
      self.session = session
    }
  }

  private final class WeakPreviewRef {
    weak var view: MediaViewerVideoThumbnailView?

    init(_ view: MediaViewerVideoThumbnailView) {
      self.view = view
    }
  }

  private var sessions: [MediaViewerVideoSessionKey: SessionEntry] = [:]
  private var previews: [MediaViewerVideoSessionKey: WeakPreviewRef] = [:]
  private let lock = NSLock()

  private init() {}

  func leaseSession(for key: MediaViewerVideoSessionKey) -> MediaViewerVideoPlaybackSessionLease {
    lock.lock()
    defer { lock.unlock() }

    let entry: SessionEntry
    if let existingEntry = sessions[key] {
      entry = existingEntry
    } else {
      let session = MediaViewerVideoPlaybackSession(key: key)
      entry = SessionEntry(session: session)
      sessions[key] = entry
    }

    let lease = MediaViewerVideoPlaybackSessionLease(key: key, session: entry.session)
    entry.leases.insert(lease.id)
    return lease
  }

  func existingSession(for key: MediaViewerVideoSessionKey) -> MediaViewerVideoPlaybackSession? {
    lock.lock()
    defer { lock.unlock() }
    return sessions[key]?.session
  }

  fileprivate func releaseLease(_ id: UUID, for key: MediaViewerVideoSessionKey) {
    var sessionToRelease: MediaViewerVideoPlaybackSession?

    lock.lock()
    if let entry = sessions[key] {
      let releasedLease = entry.leases.remove(id)
      if releasedLease != nil && entry.leases.isEmpty {
        sessions[key] = nil
        sessionToRelease = entry.session
      }
    }
    lock.unlock()

    sessionToRelease?.release()
  }

  func registerPreview(_ view: MediaViewerVideoThumbnailView, for key: MediaViewerVideoSessionKey) {
    lock.lock()
    previews[key] = WeakPreviewRef(view)
    lock.unlock()
  }

  func unregisterPreview(_ view: MediaViewerVideoThumbnailView, for key: MediaViewerVideoSessionKey) {
    lock.lock()
    if previews[key]?.view === view {
      previews[key] = nil
    }
    lock.unlock()
  }

  func previewView(for key: MediaViewerVideoSessionKey) -> MediaViewerVideoThumbnailView? {
    lock.lock()
    defer { lock.unlock() }
    return previews[key]?.view
  }
}

final class MediaViewerVideoThumbnailView: ExpoView {
  private let playerLayer = AVPlayerLayer()
  private var mediaItem: MediaViewerNativeItem?
  private var session: MediaViewerVideoPlaybackSession?
  private var sessionLease: MediaViewerVideoPlaybackSessionLease?
  private var sessionListenerId: UUID?
  private var sessionKey: MediaViewerVideoSessionKey?
  private var previewPlaybackActive = false
  private var scrollObservations: [NSKeyValueObservation] = []
  private var observedScrollViews: [UIScrollView] = []
  private var visibilityRefreshQueued = false
  private var visibilityTimer: Timer?

  var groupId: String? {
    didSet { updateSession() }
  }

  var index: Int?

  var itemJson: String? {
    didSet {
      mediaItem = MediaViewerNativeItem.decodeItem(itemJson)
      updateSession()
    }
  }

  var fit: String = "cover" {
    didSet { updateVideoGravity() }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    playerLayer.opacity = 0
    layer.addSublayer(playerLayer)
    updateVideoGravity()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    playerLayer.frame = bounds
    updateScrollContainerObservers()
    refreshPreviewPlayback()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      stopVisibilityTracking()
      detachSession()
    } else {
      startVisibilityTracking()
      updateScrollContainerObservers()
      updateSession()
      refreshPreviewPlayback()
    }
  }

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    updateScrollContainerObservers()
    refreshPreviewPlayback()
  }

  func attach(player: AVPlayer, isReady: Bool) {
    if playerLayer.player !== player {
      playerLayer.player = player
    }
    setVideoVisible(previewPlaybackActive && isReady)
  }

  func detach(player: AVPlayer) {
    if playerLayer.player === player {
      playerLayer.player = nil
    }
    setVideoVisible(false)
  }

  @discardableResult
  func refreshPreviewPlayback(force: Bool = false) -> Bool {
    guard window != nil else {
      session?.detachPreview(self)
      previewPlaybackActive = false
      setVideoVisible(false)
      return false
    }

    updateSession(forceVisibilityUpdate: force)
    return previewPlaybackActive
  }

  private func updateSession(forceVisibilityUpdate: Bool = false) {
    guard window != nil else {
      return
    }

    guard let groupId, let mediaItem, mediaItem.type == "video", let url = mediaItem.mediaURL else {
      detachSession()
      return
    }

    let key = MediaViewerVideoSessionKey(groupId: groupId, itemId: mediaItem.id)
    if sessionKey == key, session != nil {
      updatePreviewPlayback(force: forceVisibilityUpdate)
      return
    }

    detachSession()
    sessionKey = key
    MediaViewerVideoPlaybackRegistry.shared.registerPreview(self, for: key)

    let sessionLease = MediaViewerVideoPlaybackRegistry.shared.leaseSession(for: key)
    let session = sessionLease.session
    self.sessionLease = sessionLease
    self.session = session
    session.configure(url: url, headers: mediaItem.headers)
    sessionListenerId = session.addListener { [weak self] session in
      guard let self else { return }
      self.setVideoVisible(self.previewPlaybackActive && session.hasDisplayedFirstFrame && session.playbackError == nil)
    }
    updatePreviewPlayback(force: true)
  }

  private func updatePreviewPlayback(force: Bool = false) {
    let shouldPlayPreview = isPreviewVisibleInWindow()
    let wasPlayingPreview = previewPlaybackActive
    previewPlaybackActive = shouldPlayPreview

    guard let session else {
      setVideoVisible(false)
      return
    }

    if shouldPlayPreview {
      if force || !wasPlayingPreview || !session.isPreviewAttached(self) {
        session.attachPreview(self)
      }
    } else if force || wasPlayingPreview || session.isPreviewAttached(self) {
      session.detachPreview(self)
    } else {
      setVideoVisible(false)
    }
  }

  private func isPreviewVisibleInWindow() -> Bool {
    guard let window, !isHidden, !bounds.isEmpty else {
      return false
    }

    var visibleRect = bounds
    var currentView: UIView = self
    while let superview = currentView.superview {
      if superview.isHidden {
        return false
      }

      visibleRect = currentView.convert(visibleRect, to: superview)
      if superview.clipsToBounds {
        visibleRect = visibleRect.intersection(superview.bounds)
        if visibleRect.isNull || visibleRect.isEmpty {
          return false
        }
      }

      currentView = superview
    }

    let rectInWindow = currentView.convert(visibleRect, to: window)
    let visibleWindowRect = rectInWindow.intersection(window.bounds)
    return !visibleWindowRect.isNull && !visibleWindowRect.isEmpty
  }

  private func startVisibilityTracking() {
    guard visibilityTimer == nil else { return }

    let timer = Timer(timeInterval: 0.15, repeats: true) { [weak self] _ in
      self?.refreshPreviewPlayback()
    }
    RunLoop.main.add(timer, forMode: .common)
    visibilityTimer = timer
  }

  private func updateScrollContainerObservers() {
    guard window != nil else {
      stopVisibilityTracking()
      return
    }

    let scrollViews = ancestorScrollViews()
    let isAlreadyObserving =
      scrollViews.count == observedScrollViews.count &&
      zip(scrollViews, observedScrollViews).allSatisfy { current, observed in
        current === observed
      }

    guard !isAlreadyObserving else { return }

    stopVisibilityTracking()
    observedScrollViews = scrollViews
    // KVO on ancestor scrollViews' contentOffset/bounds crashes during
    // UINavigationController pop teardown: invalidating an NSKeyValueObservation
    // after UIKit has begun detaching the view hierarchy jumps to NULL inside
    // _NSKeyValueRetainedObservationInfoForObject. The existing visibilityTimer
    // (0.15s) already drives scroll-driven visibility refresh, so we can drop
    // the KVO setup entirely without changing user-visible behaviour.
    scrollObservations = []
  }

  private func ancestorScrollViews() -> [UIScrollView] {
    var scrollViews: [UIScrollView] = []
    var view = superview
    while let currentView = view {
      if let scrollView = currentView as? UIScrollView {
        scrollViews.append(scrollView)
      }
      view = currentView.superview
    }
    return scrollViews
  }

  private func queueVisibilityRefresh() {
    guard !visibilityRefreshQueued else { return }

    visibilityRefreshQueued = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.visibilityRefreshQueued = false
      self.refreshPreviewPlayback()
    }
  }

  private func stopVisibilityTracking() {
    visibilityTimer?.invalidate()
    visibilityTimer = nil
    scrollObservations.removeAll()
    observedScrollViews.removeAll()
    visibilityRefreshQueued = false
  }

  private func detachSession() {
    let currentLease = sessionLease

    if let session {
      session.removeListener(sessionListenerId)
      session.detachPreview(self)
    }
    if let sessionKey {
      MediaViewerVideoPlaybackRegistry.shared.unregisterPreview(self, for: sessionKey)
    }
    sessionListenerId = nil
    sessionKey = nil
    session = nil
    sessionLease = nil
    previewPlaybackActive = false
    currentLease?.release()
  }

  private func updateVideoGravity() {
    playerLayer.videoGravity = fit == "contain" ? .resizeAspect : .resizeAspectFill
  }

  fileprivate func setVideoVisible(_ visible: Bool) {
    CATransaction.begin()
    CATransaction.setAnimationDuration(visible ? 0.15 : 0)
    playerLayer.opacity = visible ? 1 : 0
    CATransaction.commit()
  }
}
