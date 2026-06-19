import ExpoModulesCore
import UIKit

/// Tracks the navigation view of the currently-presented fullscreen viewer so a
/// JS `dismiss()` call (used by custom header/footer `close()` handlers) can pop
/// it. Only one viewer is presented at a time, so a single weak ref is enough.
final class MediaViewerActiveSession {
  static let shared = MediaViewerActiveSession()
  weak var navigationView: NavigationView?
  private init() {}
}

/// Weak registry mapping `(groupId, placement)` -> a parked overlay view,
/// mirroring `MediaViewerRegistry`. The fullscreen viewer pulls the parked RN
/// view out by key and reparents it while presented.
final class MediaViewerOverlayRegistry {
  static let shared = MediaViewerOverlayRegistry()

  private final class WeakRef {
    weak var view: MediaViewerOverlayView?
    init(_ view: MediaViewerOverlayView) { self.view = view }
  }

  private var views: [String: WeakRef] = [:]
  private let lock = NSLock()
  private init() {}

  private func key(_ groupId: String, _ placement: String) -> String {
    return "\(groupId)::\(placement)"
  }

  func register(view: MediaViewerOverlayView, groupId: String, placement: String) {
    lock.lock(); defer { lock.unlock() }
    views[key(groupId, placement)] = WeakRef(view)
  }

  func unregister(groupId: String, placement: String) {
    lock.lock(); defer { lock.unlock() }
    views[key(groupId, placement)] = nil
  }

  func view(forGroupId groupId: String, placement: String) -> MediaViewerOverlayView? {
    lock.lock(); defer { lock.unlock() }
    return views[key(groupId, placement)]?.view
  }
}

/// Hosts custom RN overlay content for the fullscreen viewer. It is mounted in
/// the normal RN tree (parked, hidden) and registers itself by
/// `(groupId, placement)`. The viewer reparents it on present and calls
/// `restoreAfterDismiss()` on dismiss, which returns it to its original RN
/// superview so Fabric keeps owning its children the whole time.
class MediaViewerOverlayView: ExpoView {
  private weak var savedSuperview: UIView?
  private var registeredGroupId: String?
  private var registeredPlacement: String?

  /// Set by the host viewer while presented. Invoked when Fabric re-lays the
  /// view out so the viewer can re-pin its position (e.g. footer to the bottom).
  var onPresentedLayout: (() -> Void)?
  private(set) var isPresented = false

  var providedGroupId: String? {
    didSet { registerWithRegistry() }
  }

  var placement: String? {
    didSet { registerWithRegistry() }
  }

  deinit {
    if let registeredGroupId, let registeredPlacement {
      MediaViewerOverlayRegistry.shared.unregister(
        groupId: registeredGroupId,
        placement: registeredPlacement
      )
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if isPresented {
      onPresentedLayout?()
    }
  }

  private func registerWithRegistry() {
    if let registeredGroupId, let registeredPlacement,
       registeredGroupId != providedGroupId || registeredPlacement != placement {
      MediaViewerOverlayRegistry.shared.unregister(
        groupId: registeredGroupId,
        placement: registeredPlacement
      )
      self.registeredGroupId = nil
      self.registeredPlacement = nil
    }
    guard let groupId = providedGroupId, !groupId.isEmpty,
          let placement, !placement.isEmpty else { return }
    MediaViewerOverlayRegistry.shared.register(view: self, groupId: groupId, placement: placement)
    registeredGroupId = groupId
    registeredPlacement = placement
  }

  func prepareForPresentation() {
    if savedSuperview == nil {
      savedSuperview = superview
    }
    isPresented = true
  }

  func restoreAfterDismiss() {
    isPresented = false
    onPresentedLayout = nil
    // Restore to the parked RN wrapper if it still exists; otherwise drop it
    // (the MediaViewer component unmounted while the viewer was open).
    if let savedSuperview, savedSuperview.window != nil {
      savedSuperview.addSubview(self)
    } else {
      removeFromSuperview()
    }
    savedSuperview = nil
    alpha = 1
  }
}
