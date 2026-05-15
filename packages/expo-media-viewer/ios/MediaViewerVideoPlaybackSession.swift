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

  private(set) var isReadyToPlay = false
  private(set) var hasDisplayedFirstFrame = false
  private(set) var playbackError: NSError?

  init(key: MediaViewerVideoSessionKey) {
    self.key = key
    player.actionAtItemEnd = .none
    player.automaticallyWaitsToMinimizeStalling = true
  }

  func configure(url: URL, headers: [String: String]?) {
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
    attachedPreviewView = previewView

    if attachedFullscreenController == nil {
      player.isMuted = true
      player.volume = 0
    }
    previewView.attach(player: player, isReady: hasDisplayedFirstFrame)
    player.play()
  }

  func detachPreview(_ previewView: MediaViewerVideoThumbnailView) {
    guard attachedPreviewView === previewView else { return }
    previewView.detach(player: player)
    attachedPreviewView = nil
  }

  func attachFullscreen(_ controller: AVPlayerViewController) {
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

    if attachedPreviewView != nil {
      player.isMuted = true
      player.volume = 0
      player.play()
    }
  }

  func reattachPreviewIfAvailable() {
    guard let previewView = MediaViewerVideoPlaybackRegistry.shared.previewView(for: key) else {
      return
    }
    attachPreview(previewView)
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

  deinit {
    tearDownPlayerItem()
  }
}

final class MediaViewerVideoPlaybackRegistry {
  static let shared = MediaViewerVideoPlaybackRegistry()

  private final class WeakPreviewRef {
    weak var view: MediaViewerVideoThumbnailView?

    init(_ view: MediaViewerVideoThumbnailView) {
      self.view = view
    }
  }

  private var sessions: [MediaViewerVideoSessionKey: MediaViewerVideoPlaybackSession] = [:]
  private var previews: [MediaViewerVideoSessionKey: WeakPreviewRef] = [:]
  private let lock = NSLock()

  private init() {}

  func session(for key: MediaViewerVideoSessionKey) -> MediaViewerVideoPlaybackSession {
    lock.lock()
    defer { lock.unlock() }

    if let session = sessions[key] {
      return session
    }

    let session = MediaViewerVideoPlaybackSession(key: key)
    sessions[key] = session
    return session
  }

  func existingSession(for key: MediaViewerVideoSessionKey) -> MediaViewerVideoPlaybackSession? {
    lock.lock()
    defer { lock.unlock() }
    return sessions[key]
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
  private var sessionListenerId: UUID?
  private var sessionKey: MediaViewerVideoSessionKey?

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
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      detachSession()
    } else {
      updateSession()
    }
  }

  func attach(player: AVPlayer, isReady: Bool) {
    if playerLayer.player !== player {
      playerLayer.player = player
    }
    setVideoVisible(isReady)
  }

  func detach(player: AVPlayer) {
    if playerLayer.player === player {
      playerLayer.player = nil
      setVideoVisible(false)
    }
  }

  private func updateSession() {
    guard window != nil, let groupId, let mediaItem, mediaItem.type == "video", let url = mediaItem.mediaURL else {
      return
    }

    let key = MediaViewerVideoSessionKey(groupId: groupId, itemId: mediaItem.id)
    if sessionKey == key, session != nil {
      return
    }

    detachSession()
    sessionKey = key
    MediaViewerVideoPlaybackRegistry.shared.registerPreview(self, for: key)

    let session = MediaViewerVideoPlaybackRegistry.shared.session(for: key)
    self.session = session
    session.configure(url: url, headers: mediaItem.headers)
    sessionListenerId = session.addListener { [weak self] session in
      self?.setVideoVisible(session.hasDisplayedFirstFrame && session.playbackError == nil)
    }
    session.attachPreview(self)
  }

  private func detachSession() {
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
  }

  private func updateVideoGravity() {
    playerLayer.videoGravity = fit == "contain" ? .resizeAspect : .resizeAspectFill
  }

  private func setVideoVisible(_ visible: Bool) {
    CATransaction.begin()
    CATransaction.setAnimationDuration(visible ? 0.15 : 0)
    playerLayer.opacity = visible ? 1 : 0
    CATransaction.commit()
  }
}
