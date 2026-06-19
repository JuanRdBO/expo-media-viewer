import UIKit

public enum ImageViewerVideoPlaybackStage: String {
    case remote
    case fallbackDownload = "fallback-download"
    case fallbackPlayback = "fallback-playback"
}

public struct ImageViewerVideoError {
    let index: Int
    let url: String
    let message: String
    let nativeMessage: String?
    let underlyingMessage: String?
    let platform: String
    let stage: ImageViewerVideoPlaybackStage
}

public enum ImageViewerOption {
    case theme(ImageViewerTheme)
    case contentMode(UIView.ContentMode)
    case closeIcon(UIImage)
    case rightNavItemTitle(String, onTap: ((Int) -> Void)?)
    case rightNavItemIcon(UIImage, onTap: ((Int) -> Void)?)
    case onIndexChange((_ index: Int) -> Void)
    case onVideoError((ImageViewerVideoError) -> Void)
    case onDismiss(() -> Void)
    case hideBlurOverlay(Bool)
    case hidePageIndicators(Bool)
    case hideCloseButton(Bool)
    case mediaItems([MediaViewerNativeItem])
}
