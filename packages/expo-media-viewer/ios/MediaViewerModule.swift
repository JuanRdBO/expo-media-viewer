import ExpoModulesCore

public class MediaViewerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaViewer")

    View(MediaViewerView.self) {
      Events("onIndexChange", "onVideoError")

      OnViewDidUpdateProps { (view) in
        view.setupImageView()
      }

      Prop("itemsJson") { (view, itemsJson: String?) in
        view.itemsJson = itemsJson
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
      Prop("rightNavItemIconName") { (view, rightNavItemIconName: String) in
        view.rightNavItemIconName = rightNavItemIconName
      }

      Prop("hideBlurOverlay") { (view, hideBlurOverlay: Bool?) in
        view.hideBlurOverlay = hideBlurOverlay ?? false
      }

      Prop("hidePageIndicators") { (view, hidePageIndicators: Bool?) in
        view.hidePageIndicators = hidePageIndicators ?? false
      }
    }
  }

  func onIndexChange(index: Int) {
    sendEvent("onIndexChange", ["currentIndex": index])
  }
}
