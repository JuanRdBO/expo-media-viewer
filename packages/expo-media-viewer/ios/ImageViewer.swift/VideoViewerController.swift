import AVKit
import UIKit

/// Fullscreen video player for the media viewer.
/// It keeps initial video loading deterministic:
/// - open into a black loader state
/// - start playback only when the first frame is ready
/// - fall back to a downloaded local file for remote servers AVPlayer rejects directly
class VideoViewerController: UIViewController {
    private enum VideoUIState: String {
        case loadingInitial
        case bufferingPlayback
        case playing
        case failed
        case dismissing
    }

    private enum PlaybackStage: String {
        case remote
        case fallbackDownload = "fallback-download"
        case fallbackPlayback = "fallback-playback"
    }

    private struct PlaybackSource {
        let url: URL
        let stage: PlaybackStage
    }

    var index: Int
    let videoURL: URL
    let placeholder: UIImage?
    let posterURL: URL?
    let imageLoader: ImageLoader
    let onVideoError: ((ImageViewerVideoError) -> Void)?

    private(set) var thumbnailImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
        imageView.backgroundColor = .black
        imageView.isHidden = true
        return imageView
    }()

    private let loadingOverlay: UIView = {
        let view = UIView()
        view.backgroundColor = .black
        view.isUserInteractionEnabled = false
        return view
    }()

    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.color = .white
        indicator.hidesWhenStopped = false
        return indicator
    }()

    private let errorOverlay: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.94)
        view.isHidden = true
        return view
    }()

    private let errorTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Couldn't Load Video"
        label.textColor = .white
        label.font = .systemFont(ofSize: 22, weight: .semibold)
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    private let errorMessageLabel: UILabel = {
        let label = UILabel()
        label.textColor = UIColor.white.withAlphaComponent(0.88)
        label.font = .systemFont(ofSize: 16, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    private let errorDetailLabel: UILabel = {
        let label = UILabel()
        label.textColor = UIColor.white.withAlphaComponent(0.62)
        label.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.isHidden = true
        return label
    }()

    private lazy var retryButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Retry", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = UIColor.white.withAlphaComponent(0.16)
        button.layer.cornerRadius = 8
        button.layer.cornerCurve = .continuous
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        button.addTarget(self, action: #selector(didTapRetry), for: .touchUpInside)
        return button
    }()

    private var playerViewController: AVPlayerViewController?
    private var player: AVPlayer?
    private var currentPlayerItem: AVPlayerItem?
    private var playerOutput: AVPlayerItemVideoOutput?
    private var playerItemStatusObserver: NSKeyValueObservation?
    private var timeControlObserver: NSKeyValueObservation?
    private var playbackStalledObserver: NSObjectProtocol?
    private var playbackEndedObserver: NSObjectProtocol?
    private var failedToPlayToEndObserver: NSObjectProtocol?
    private var firstFrameDisplayLink: CADisplayLink?
    private var compatibilityDownloadTask: URLSessionDownloadTask?
    private var fallbackFileURL: URL?
    private var currentSource: PlaybackSource?
    private var isPlaybackActive = false
    private var isReadyToPlay = false
    private var hasPlaybackFailed = false
    private var hasDisplayedFirstFrame = false
    private var didAttemptCompatibilityFallback = false
    private var uiState: VideoUIState = .loadingInitial

    init(
        index: Int,
        videoURL: URL,
        placeholder: UIImage?,
        posterURL: URL? = nil,
        imageLoader: ImageLoader,
        onVideoError: ((ImageViewerVideoError) -> Void)? = nil
    ) {
        self.index = index
        self.videoURL = videoURL
        self.placeholder = placeholder
        self.posterURL = posterURL
        self.imageLoader = imageLoader
        self.onVideoError = onVideoError
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func loadView() {
        let rootView = UIView()
        rootView.backgroundColor = .black
        view = rootView

        thumbnailImageView.translatesAutoresizingMaskIntoConstraints = false
        rootView.addSubview(thumbnailImageView)
        NSLayoutConstraint.activate([
            thumbnailImageView.topAnchor.constraint(equalTo: rootView.topAnchor),
            thumbnailImageView.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            thumbnailImageView.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            thumbnailImageView.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
        ])

        loadingOverlay.translatesAutoresizingMaskIntoConstraints = false
        rootView.addSubview(loadingOverlay)
        NSLayoutConstraint.activate([
            loadingOverlay.topAnchor.constraint(equalTo: rootView.topAnchor),
            loadingOverlay.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            loadingOverlay.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            loadingOverlay.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
        ])

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingOverlay.addSubview(loadingIndicator)
        NSLayoutConstraint.activate([
            loadingIndicator.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: loadingOverlay.centerYAnchor),
        ])

        errorOverlay.translatesAutoresizingMaskIntoConstraints = false
        rootView.addSubview(errorOverlay)
        NSLayoutConstraint.activate([
            errorOverlay.topAnchor.constraint(equalTo: rootView.topAnchor),
            errorOverlay.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            errorOverlay.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            errorOverlay.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
        ])

        let errorStack = UIStackView(arrangedSubviews: [
            errorTitleLabel,
            errorMessageLabel,
            errorDetailLabel,
            retryButton,
        ])
        errorStack.axis = .vertical
        errorStack.alignment = .fill
        errorStack.spacing = 14
        errorStack.translatesAutoresizingMaskIntoConstraints = false
        errorOverlay.addSubview(errorStack)

        NSLayoutConstraint.activate([
            errorStack.centerXAnchor.constraint(equalTo: errorOverlay.centerXAnchor),
            errorStack.centerYAnchor.constraint(equalTo: errorOverlay.centerYAnchor),
            errorStack.leadingAnchor.constraint(greaterThanOrEqualTo: errorOverlay.leadingAnchor, constant: 28),
            errorStack.trailingAnchor.constraint(lessThanOrEqualTo: errorOverlay.trailingAnchor, constant: -28),
            errorStack.widthAnchor.constraint(lessThanOrEqualToConstant: 320),
            retryButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadTransitionThumbnail()
        setupPlayerViewController()
        startPlaybackLoad(reason: "viewDidLoad")
    }

    func setPlaybackActive(_ active: Bool) {
        isPlaybackActive = active
        log("setPlaybackActive(\(active))")

        guard !hasPlaybackFailed else {
            render(.failed, reason: "setPlaybackActive failed")
            return
        }

        if active {
            if isReadyToPlay {
                startPlaybackIfPossible(reason: "setPlaybackActive ready")
            } else if hasDisplayedFirstFrame {
                render(.playing, reason: "setPlaybackActive first frame already displayed")
            } else {
                render(.loadingInitial, reason: "setPlaybackActive awaiting source")
            }
        } else {
            pause()
            stopFirstFrameObservation()
        }
    }

    func prepareForDismissTransition() {
        pause()
        stopFirstFrameObservation()
        render(.dismissing, reason: "prepareForDismissTransition")
    }

    private func loadTransitionThumbnail() {
        if let placeholder {
            thumbnailImageView.image = placeholder
            return
        }

        guard let posterURL else { return }
        imageLoader.loadImage(posterURL, placeholder: nil, imageView: thumbnailImageView) { _ in }
    }

    private func setupPlayerViewController() {
        let avPlayer = AVPlayer()
        avPlayer.actionAtItemEnd = .none
        avPlayer.automaticallyWaitsToMinimizeStalling = true
        player = avPlayer

        timeControlObserver = avPlayer.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            DispatchQueue.main.async {
                self?.handleTimeControlStatus(player.timeControlStatus)
            }
        }

        let controller = AVPlayerViewController()
        controller.player = avPlayer
        controller.showsPlaybackControls = true
        controller.videoGravity = .resizeAspect
        controller.allowsPictureInPicturePlayback = false
        controller.view.backgroundColor = .black
        controller.view.isHidden = true
        if #available(iOS 16.0, *) {
            controller.allowsVideoFrameAnalysis = false
        }

        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(controller.view, aboveSubview: thumbnailImageView)
        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        controller.didMove(toParent: self)
        playerViewController = controller

        view.bringSubviewToFront(loadingOverlay)
        view.bringSubviewToFront(errorOverlay)
        render(.loadingInitial, reason: "setupPlayerViewController")
    }

    private func startPlaybackLoad(reason: String) {
        cancelCompatibilityDownload()
        cleanupFallbackFile()
        hasPlaybackFailed = false
        isReadyToPlay = false
        hasDisplayedFirstFrame = false
        didAttemptCompatibilityFallback = false
        updateErrorContent(stage: .remote, error: nil)
        loadPlaybackSource(
            PlaybackSource(url: videoURL, stage: .remote),
            reason: reason
        )
    }

    private func loadPlaybackSource(_ source: PlaybackSource, reason: String) {
        currentSource = source
        isReadyToPlay = false
        hasDisplayedFirstFrame = false
        stopFirstFrameObservation()
        replacePlayerItem(with: source)
        render(.loadingInitial, reason: "\(reason) stage=\(source.stage.rawValue)")
    }

    private func replacePlayerItem(with source: PlaybackSource) {
        tearDownCurrentPlayerItem()

        let asset = AVURLAsset(url: source.url)
        let playerItem = AVPlayerItem(asset: asset)
        playerItem.preferredForwardBufferDuration = 3
        playerItem.canUseNetworkResourcesForLiveStreamingWhilePaused = true

        let output = AVPlayerItemVideoOutput(pixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)
        ])
        playerItem.add(output)

        playerOutput = output
        currentPlayerItem = playerItem

        playbackEndedObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            self?.playerDidFinish()
        }

        playbackStalledObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemPlaybackStalled,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            self?.handlePlaybackStall()
        }

        failedToPlayToEndObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] notification in
            let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? NSError
            self?.handlePlaybackFailure(error)
        }

        playerItemStatusObserver = playerItem.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            DispatchQueue.main.async {
                self?.handlePlayerItemStatus(item)
            }
        }

        player?.replaceCurrentItem(with: playerItem)
    }

    private func tearDownCurrentPlayerItem() {
        stopFirstFrameObservation()

        if let playbackEndedObserver {
            NotificationCenter.default.removeObserver(playbackEndedObserver)
            self.playbackEndedObserver = nil
        }

        if let playbackStalledObserver {
            NotificationCenter.default.removeObserver(playbackStalledObserver)
            self.playbackStalledObserver = nil
        }

        if let failedToPlayToEndObserver {
            NotificationCenter.default.removeObserver(failedToPlayToEndObserver)
            self.failedToPlayToEndObserver = nil
        }

        playerItemStatusObserver?.invalidate()
        playerItemStatusObserver = nil

        if let currentPlayerItem, let playerOutput {
            currentPlayerItem.remove(playerOutput)
        }

        playerOutput = nil
        currentPlayerItem = nil
        player?.pause()
        player?.replaceCurrentItem(with: nil)
    }

    private func startPlaybackIfPossible(reason: String) {
        guard isPlaybackActive else { return }

        guard isReadyToPlay else {
            render(hasDisplayedFirstFrame ? .bufferingPlayback : .loadingInitial, reason: "\(reason) awaiting ready")
            return
        }

        if hasDisplayedFirstFrame {
            render(.playing, reason: "\(reason) first frame ready")
        } else {
            render(.loadingInitial, reason: "\(reason) awaiting first frame")
            startFirstFrameObservation()
        }

        player?.play()
    }

    private func handlePlayerItemStatus(_ item: AVPlayerItem) {
        guard item === currentPlayerItem else { return }
        log("handlePlayerItemStatus=\(item.status.rawValue)")

        switch item.status {
        case .readyToPlay:
            isReadyToPlay = true
            if isPlaybackActive {
                startPlaybackIfPossible(reason: "readyToPlay")
            }

        case .failed:
            handlePlaybackFailure(item.error as NSError?)

        case .unknown:
            break

        @unknown default:
            break
        }
    }

    private func handleTimeControlStatus(_ status: AVPlayer.TimeControlStatus) {
        guard !hasPlaybackFailed, currentPlayerItem != nil else { return }
        log("handleTimeControlStatus=\(status.rawValue)")

        switch status {
        case .playing:
            if hasDisplayedFirstFrame {
                render(.playing, reason: "timeControl playing")
            } else {
                render(.loadingInitial, reason: "timeControl playing awaiting first frame")
                startFirstFrameObservation()
            }

        case .waitingToPlayAtSpecifiedRate:
            guard isPlaybackActive else { return }
            render(hasDisplayedFirstFrame ? .bufferingPlayback : .loadingInitial, reason: "timeControl waiting")
            if !hasDisplayedFirstFrame {
                startFirstFrameObservation()
            }

        case .paused:
            if isPlaybackActive, isReadyToPlay, !hasDisplayedFirstFrame {
                render(.loadingInitial, reason: "timeControl paused awaiting first frame")
                startFirstFrameObservation()
            }

        @unknown default:
            break
        }
    }

    private func handlePlaybackStall() {
        guard !hasPlaybackFailed, isPlaybackActive else { return }
        render(hasDisplayedFirstFrame ? .bufferingPlayback : .loadingInitial, reason: "playback stalled")
    }

    private func handlePlaybackFailure(_ error: NSError?) {
        guard !hasPlaybackFailed else { return }

        let source = currentSource ?? PlaybackSource(url: videoURL, stage: .remote)
        log("handlePlaybackFailure stage=\(source.stage.rawValue) error=\(error?.localizedDescription ?? "none")")

        if shouldAttemptCompatibilityFallback(from: source) {
            startCompatibilityFallbackDownload()
            return
        }

        finalizePlaybackFailure(error, stage: source.stage)
    }

    private func shouldAttemptCompatibilityFallback(from source: PlaybackSource) -> Bool {
        guard source.stage == .remote else { return false }
        guard !source.url.isFileURL else { return false }
        guard !didAttemptCompatibilityFallback else { return false }
        guard !hasDisplayedFirstFrame else { return false }

        let scheme = source.url.scheme?.lowercased()
        return scheme == "http" || scheme == "https"
    }

    private func startCompatibilityFallbackDownload() {
        guard !didAttemptCompatibilityFallback else { return }

        didAttemptCompatibilityFallback = true
        cancelCompatibilityDownload()
        tearDownCurrentPlayerItem()
        currentSource = PlaybackSource(url: videoURL, stage: .fallbackDownload)
        render(.loadingInitial, reason: "startCompatibilityFallbackDownload")

        let request = URLRequest(url: videoURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
        compatibilityDownloadTask = URLSession.shared.downloadTask(with: request) { [weak self] temporaryURL, _, error in
            guard let self else { return }

            if let error {
                DispatchQueue.main.async {
                    self.handleCompatibilityDownloadCompletion(persistedURL: nil, error: error as NSError?)
                }
                return
            }

            guard let temporaryURL else {
                DispatchQueue.main.async {
                    self.handleCompatibilityDownloadCompletion(
                        persistedURL: nil,
                        error: self.makeCompatibilityError("Compatibility download produced no file.")
                    )
                }
                return
            }

            do {
                let persistedURL = try self.makeFallbackFileURL(from: temporaryURL)
                try FileManager.default.moveItem(at: temporaryURL, to: persistedURL)

                DispatchQueue.main.async {
                    self.handleCompatibilityDownloadCompletion(persistedURL: persistedURL, error: nil)
                }
            } catch {
                DispatchQueue.main.async {
                    self.handleCompatibilityDownloadCompletion(persistedURL: nil, error: error as NSError)
                }
            }
        }
        compatibilityDownloadTask?.resume()
    }

    private func handleCompatibilityDownloadCompletion(persistedURL: URL?, error: NSError?) {
        compatibilityDownloadTask = nil

        guard !hasPlaybackFailed else { return }

        if let error {
            finalizePlaybackFailure(error, stage: .fallbackDownload)
            return
        }

        guard let persistedURL else {
            finalizePlaybackFailure(makeCompatibilityError("Compatibility download produced no file."), stage: .fallbackDownload)
            return
        }

        self.fallbackFileURL = persistedURL
        loadPlaybackSource(
            PlaybackSource(url: persistedURL, stage: .fallbackPlayback),
            reason: "compatibility fallback ready"
        )
    }

    private func finalizePlaybackFailure(_ error: NSError?, stage: PlaybackStage) {
        guard !hasPlaybackFailed else { return }

        hasPlaybackFailed = true
        isReadyToPlay = false
        hasDisplayedFirstFrame = false
        stopFirstFrameObservation()
        cancelCompatibilityDownload()
        pause()
        tearDownCurrentPlayerItem()

        updateErrorContent(stage: stage, error: error)
        render(.failed, reason: "finalizePlaybackFailure stage=\(stage.rawValue)")

        let nativeMessage = cleanedErrorMessage(error?.localizedDescription)
        let underlyingMessage = underlyingErrorMessage(for: error)
        let friendlyMessage = userFacingFailureMessage(for: stage)

        NSLog(
            "[expo-media-viewer][iOS] Failed to load video " +
                "index=\(index) stage=\(stage.rawValue) url=\(videoURL.absoluteString) " +
                "message=\(nativeMessage ?? "unknown") underlying=\(underlyingMessage ?? "none")"
        )

        onVideoError?(ImageViewerVideoError(
            index: index,
            url: videoURL.absoluteString,
            message: friendlyMessage,
            nativeMessage: nativeMessage,
            underlyingMessage: underlyingMessage,
            platform: "ios",
            stage: stage.rawValue
        ))
    }

    private func updateErrorContent(stage: PlaybackStage, error: NSError?) {
        errorMessageLabel.text = userFacingFailureMessage(for: stage)
        let detail = [cleanedErrorMessage(error?.localizedDescription), underlyingErrorMessage(for: error)]
            .compactMap { $0 }
            .joined(separator: "\n")
        errorDetailLabel.text = detail
        errorDetailLabel.isHidden = detail.isEmpty
    }

    private func userFacingFailureMessage(for stage: PlaybackStage) -> String {
        switch stage {
        case .remote:
            return "This remote video could not be opened directly."
        case .fallbackDownload:
            return "The video could not be downloaded for compatibility playback."
        case .fallbackPlayback:
            return "The downloaded video still could not be opened by iOS."
        }
    }

    private func underlyingErrorMessage(for error: NSError?) -> String? {
        if let underlyingError = error?.userInfo[NSUnderlyingErrorKey] as? NSError {
            return cleanedErrorMessage(underlyingError.localizedDescription) ?? cleanedErrorMessage(underlyingError.description)
        }

        if let underlyingString = error?.userInfo[NSUnderlyingErrorKey] as? String {
            return cleanedErrorMessage(underlyingString)
        }

        return nil
    }

    private func cleanedErrorMessage(_ message: String?) -> String? {
        guard let trimmed = message?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return nil
        }
        return trimmed
    }

    private func makeCompatibilityError(_ message: String) -> NSError {
        NSError(
            domain: "expo-media-viewer",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
    }

    private func makeFallbackFileURL(from temporaryURL: URL) throws -> URL {
        let fileExtension = videoURL.pathExtension.isEmpty ? temporaryURL.pathExtension : videoURL.pathExtension
        let fallbackFileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("expo-media-viewer-\(UUID().uuidString)")
            .appendingPathExtension(fileExtension.isEmpty ? "mp4" : fileExtension)

        let directoryURL = fallbackFileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true, attributes: nil)
        return fallbackFileURL
    }

    private func render(_ state: VideoUIState, reason: String) {
        uiState = state

        switch state {
        case .loadingInitial:
            errorOverlay.isHidden = true
            loadingOverlay.isHidden = false
            loadingOverlay.backgroundColor = .black
            playerViewController?.view.isHidden = true
            thumbnailImageView.isHidden = true
            loadingIndicator.startAnimating()
            loadingOverlay.bringSubviewToFront(loadingIndicator)
            view.bringSubviewToFront(loadingOverlay)

        case .bufferingPlayback:
            errorOverlay.isHidden = true
            loadingOverlay.isHidden = false
            loadingOverlay.backgroundColor = UIColor.black.withAlphaComponent(0.45)
            playerViewController?.view.isHidden = false
            thumbnailImageView.isHidden = true
            loadingIndicator.startAnimating()
            loadingOverlay.bringSubviewToFront(loadingIndicator)
            view.bringSubviewToFront(loadingOverlay)

        case .playing:
            errorOverlay.isHidden = true
            loadingOverlay.isHidden = true
            loadingIndicator.stopAnimating()
            playerViewController?.view.isHidden = false
            thumbnailImageView.isHidden = true

        case .failed:
            loadingOverlay.isHidden = true
            loadingIndicator.stopAnimating()
            playerViewController?.view.isHidden = true
            thumbnailImageView.isHidden = true
            errorOverlay.isHidden = false
            view.bringSubviewToFront(errorOverlay)

        case .dismissing:
            loadingOverlay.isHidden = true
            errorOverlay.isHidden = true
            loadingIndicator.stopAnimating()
            playerViewController?.view.isHidden = true
            thumbnailImageView.isHidden = false
        }

        log("render \(state.rawValue) reason=\(reason)")
    }

    private func startFirstFrameObservation() {
        guard firstFrameDisplayLink == nil else { return }
        let displayLink = CADisplayLink(target: self, selector: #selector(checkForFirstFrame))
        displayLink.add(to: .main, forMode: .common)
        firstFrameDisplayLink = displayLink
    }

    private func stopFirstFrameObservation() {
        firstFrameDisplayLink?.invalidate()
        firstFrameDisplayLink = nil
    }

    @objc private func checkForFirstFrame() {
        guard
            isPlaybackActive,
            !hasDisplayedFirstFrame,
            let player,
            let playerOutput
        else {
            return
        }

        let currentTime = player.currentTime()
        var itemTimeForDisplay = CMTime.invalid
        let pixelBuffer = playerOutput.copyPixelBuffer(forItemTime: currentTime, itemTimeForDisplay: &itemTimeForDisplay)

        guard pixelBuffer != nil || playerOutput.hasNewPixelBuffer(forItemTime: currentTime) else {
            return
        }

        hasDisplayedFirstFrame = true
        stopFirstFrameObservation()
        render(.playing, reason: "first frame displayed")
    }

    @objc private func didTapRetry() {
        startPlaybackLoad(reason: "retry tapped")
        if isPlaybackActive {
            startPlaybackIfPossible(reason: "retry tapped")
        }
    }

    func pause() {
        player?.pause()
    }

    private func playerDidFinish() {
        player?.seek(to: .zero)
        if isPlaybackActive {
            player?.play()
        }
    }

    private func cancelCompatibilityDownload() {
        compatibilityDownloadTask?.cancel()
        compatibilityDownloadTask = nil
    }

    private func cleanupFallbackFile() {
        guard let fallbackFileURL else { return }
        try? FileManager.default.removeItem(at: fallbackFileURL)
        self.fallbackFileURL = nil
    }

    deinit {
        cancelCompatibilityDownload()
        cleanupFallbackFile()
        stopFirstFrameObservation()
        tearDownCurrentPlayerItem()
        timeControlObserver?.invalidate()
        playerViewController?.player = nil
        player?.pause()
    }

    private func log(_ message: String) {
#if DEBUG
        guard ProcessInfo.processInfo.environment["EXPO_MEDIA_VIEWER_IOS_DEBUG_LOGS"] == "1" else {
            return
        }
        NSLog("[VideoViewerController][\(index)] \(message) state=\(uiState.rawValue)")
#endif
    }
}
