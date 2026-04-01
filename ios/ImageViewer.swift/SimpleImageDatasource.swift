public protocol ImageDataSource: AnyObject {
    func numberOfImages() -> Int
    func imageItem(at index: Int) -> ImageItem
}

class SimpleImageDatasource: ImageDataSource {

    private(set) var imageItems: [ImageItem]

    init(imageItems: [ImageItem]) {
        self.imageItems = imageItems
    }

    func numberOfImages() -> Int {
        return imageItems.count
    }

    func imageItem(at index: Int) -> ImageItem {
        let clamped = min(max(index, 0), max(imageItems.count - 1, 0))
        return imageItems[clamped]
    }
}
