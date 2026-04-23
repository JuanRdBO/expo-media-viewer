import UIKit

public struct ImageViewerVideoError {
    let index: Int
    let url: String
    let message: String
    let nativeMessage: String?
    let underlyingMessage: String?
    let platform: String
    let stage: String
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
    case mediaTypes([String])
    case posterUrls([String])
    case topTitles([String])
    case topSubtitles([String])
    case bottomTexts([String])
}
