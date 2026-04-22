import Foundation

private final class WeakMediaViewerViewRef {
    weak var view: MediaViewerView?

    init(_ view: MediaViewerView) {
        self.view = view
    }
}

final class MediaViewerRegistry {
    static let shared = MediaViewerRegistry()

    private var views: [String: [Int: WeakMediaViewerViewRef]] = [:]
    private let lock = NSLock()

    private init() {}

    func register(view: MediaViewerView, groupId: String, index: Int) {
        lock.lock()
        defer { lock.unlock() }

        if views[groupId] == nil {
            views[groupId] = [:]
        }
        views[groupId]?[index] = WeakMediaViewerViewRef(view)
    }

    func unregister(groupId: String, index: Int) {
        lock.lock()
        defer { lock.unlock() }

        views[groupId]?[index] = nil

        if views[groupId]?.isEmpty == true {
            views[groupId] = nil
        }
    }

    func view(forGroupId groupId: String, index: Int) -> MediaViewerView? {
        lock.lock()
        defer { lock.unlock() }

        return views[groupId]?[index]?.view
    }

    func cleanup() {
        lock.lock()
        defer { lock.unlock() }

        for (groupId, indexMap) in views {
            views[groupId] = indexMap.filter { $0.value.view != nil }
            if views[groupId]?.isEmpty == true {
                views[groupId] = nil
            }
        }
    }
}
