import ExpoModulesCore

public class MediaViewerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaViewer")

    View(MediaViewerView.self) {
      Events("onIndexChange", "onPressRightNavItemIcon")

      OnViewDidUpdateProps { (view) in
        view.setupImageView()
      }

      Prop("urls") { (view, urls: [String]?) in
        view.urls = urls
      }

      Prop("index") { (view, index: Int?) in
        view.initialIndex = index
      }

      Prop("theme") { (view, theme: Theme?) in
        view.theme = theme ?? .dark
      }
      Prop("closeIconName") { (view, closeIconName: String?) in
        view.closeIconName = closeIconName
      }
      Prop("rightNavItemIconName") { (view, rightNavItemIconName: String?) in
        view.rightNavItemIconName = rightNavItemIconName
      }

      Prop("hideBlurOverlay") { (view, hideBlurOverlay: Bool?) in
        view.hideBlurOverlay = hideBlurOverlay ?? false
      }

      Prop("mediaTypes") { (view, mediaTypes: [String]?) in
        view.mediaTypes = mediaTypes
      }

      Prop("hidePageIndicators") { (view, hidePageIndicators: Bool?) in
        view.hidePageIndicators = hidePageIndicators ?? false
      }

      Prop("topTitles") { (view, topTitles: [String]?) in
        view.topTitles = topTitles
      }
      Prop("topSubtitles") { (view, topSubtitles: [String]?) in
        view.topSubtitles = topSubtitles
      }
      Prop("bottomTexts") { (view, bottomTexts: [String]?) in
        view.bottomTexts = bottomTexts
      }

    }
  }

  func onIndexChange(index: Int) {
    sendEvent("onIndexChange", ["currentIndex": index])
  }
}
