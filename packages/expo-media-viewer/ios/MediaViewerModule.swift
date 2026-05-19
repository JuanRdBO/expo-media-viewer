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

      Prop("groupId") { (view, groupId: String?) in
        view.providedGroupId = groupId
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

    View(MediaViewerVideoThumbnailView.self) {
      ViewName("MediaViewerVideoThumbnailView")

      Prop("groupId") { (view, groupId: String?) in
        view.groupId = groupId
      }

      Prop("index") { (view, index: Int?) in
        view.index = index
      }

      Prop("itemJson") { (view, itemJson: String?) in
        view.itemJson = itemJson
      }

      Prop("fit") { (view, fit: String?) in
        view.fit = fit ?? "cover"
      }
    }
  }

  func onIndexChange(index: Int) {
    sendEvent("onIndexChange", ["currentIndex": index])
  }
}
