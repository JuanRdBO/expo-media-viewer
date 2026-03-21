import AVKit
import UIKit

/// Fullscreen video player for the media viewer.
/// Shows a thumbnail placeholder + loading spinner, then auto-plays the video.
class VideoViewerController: UIViewController {
    var index: Int
    let videoURL: URL
    let placeholder: UIImage?

    private(set) var thumbnailImageView: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFit
        iv.clipsToBounds = true
        iv.backgroundColor = .clear
        return iv
    }()

    private var loadingIndicator: UIActivityIndicatorView = {
        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = .white
        spinner.hidesWhenStopped = true
        return spinner
    }()

    private var playerViewController: AVPlayerViewController?
    private var player: AVPlayer?
    private var timeControlObserver: NSKeyValueObservation?

    init(index: Int, videoURL: URL, placeholder: UIImage?) {
        self.index = index
        self.videoURL = videoURL
        self.placeholder = placeholder
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func loadView() {
        let v = UIView()
        v.backgroundColor = .clear
        self.view = v

        thumbnailImageView.translatesAutoresizingMaskIntoConstraints = false
        v.addSubview(thumbnailImageView)
        NSLayoutConstraint.activate([
            thumbnailImageView.topAnchor.constraint(equalTo: v.topAnchor),
            thumbnailImageView.leadingAnchor.constraint(equalTo: v.leadingAnchor),
            thumbnailImageView.trailingAnchor.constraint(equalTo: v.trailingAnchor),
            thumbnailImageView.bottomAnchor.constraint(equalTo: v.bottomAnchor),
        ])

        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        v.addSubview(loadingIndicator)
        NSLayoutConstraint.activate([
            loadingIndicator.centerXAnchor.constraint(equalTo: v.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: v.centerYAnchor),
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        if let placeholder = placeholder {
            thumbnailImageView.image = placeholder
        }
        loadingIndicator.startAnimating()
        setupPlayer()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        playerViewController?.showsPlaybackControls = true
        // Safety net: if player is ready but not playing (e.g. readyToPlay fired before view was in window)
        if player?.currentItem?.status == .readyToPlay && player?.timeControlStatus != .playing {
            player?.play()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        pause()
    }

    private func setupPlayer() {
        let playerItem = AVPlayerItem(url: videoURL)
        let avPlayer = AVPlayer(playerItem: playerItem)
        avPlayer.actionAtItemEnd = .none
        self.player = avPlayer

        // Loop video
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinish),
            name: .AVPlayerItemDidPlayToEndTime,
            object: playerItem
        )

        // Observe player item status (KVO — more reliable than Swift observe for AVPlayerItem)
        playerItem.addObserver(self, forKeyPath: "status", options: [.new], context: nil)

        // Observe player timeControlStatus for buffering indicator
        timeControlObserver = avPlayer.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch player.timeControlStatus {
                case .playing:
                    self.loadingIndicator.stopAnimating()
                case .waitingToPlayAtSpecifiedRate:
                    self.loadingIndicator.startAnimating()
                    self.view.bringSubviewToFront(self.loadingIndicator)
                case .paused:
                    break
                @unknown default:
                    break
                }
            }
        }

        let pvc = AVPlayerViewController()
        pvc.player = avPlayer
        pvc.showsPlaybackControls = true
        pvc.videoGravity = .resizeAspect
        pvc.allowsPictureInPicturePlayback = false
        if #available(iOS 16.0, *) {
            pvc.allowsVideoFrameAnalysis = false
        }

        addChild(pvc)
        pvc.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(pvc.view)
        NSLayoutConstraint.activate([
            pvc.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            pvc.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            pvc.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            pvc.view.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
        ])
        pvc.didMove(toParent: self)
        self.playerViewController = pvc

        // Keep spinner on top of player
        view.bringSubviewToFront(loadingIndicator)
    }

    func play() {
        player?.play()
    }

    func pause() {
        player?.pause()
    }

    @objc private func playerDidFinish(_ notification: Notification) {
        player?.seek(to: .zero)
        player?.play()
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                                change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status", let item = object as? AVPlayerItem {
            DispatchQueue.main.async { [weak self] in
                switch item.status {
                case .readyToPlay:
                    print("[VideoViewerController] Ready to play: \(self?.videoURL.absoluteString ?? "?")")
                    self?.loadingIndicator.stopAnimating()
                    self?.player?.play()
                case .failed:
                    self?.loadingIndicator.stopAnimating()
                    self?.thumbnailImageView.isHidden = false
                    self?.playerViewController?.view.isHidden = true
                    print("[VideoViewerController] FAILED to load: \(self?.videoURL.absoluteString ?? "?")")
                    print("[VideoViewerController] Error: \(item.error?.localizedDescription ?? "unknown")")
                    if let underlyingError = (item.error as NSError?)?.userInfo[NSUnderlyingErrorKey] as? NSError {
                        print("[VideoViewerController] Underlying: \(underlyingError)")
                    }
                case .unknown:
                    print("[VideoViewerController] Status unknown for: \(self?.videoURL.absoluteString ?? "?")")
                @unknown default:
                    break
                }
            }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        timeControlObserver?.invalidate()
        player?.currentItem?.removeObserver(self, forKeyPath: "status")
    }
}
