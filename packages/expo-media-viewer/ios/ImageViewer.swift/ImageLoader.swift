import Foundation
#if canImport(SDWebImage)
import SDWebImage
#endif

public protocol ImageLoader {
    func loadImage(_ url: URL, headers: [String: String]?, placeholder: UIImage?, imageView: UIImageView, completion: @escaping (_ image: UIImage?) -> Void)
}

extension ImageLoader {
    func loadImage(_ url: URL, placeholder: UIImage?, imageView: UIImageView, completion: @escaping (_ image: UIImage?) -> Void) {
        loadImage(url, headers: nil, placeholder: placeholder, imageView: imageView, completion: completion)
    }
}

public struct URLSessionImageLoader: ImageLoader {
    private let session: URLSession

    public init() {
        let config = URLSessionConfiguration.default
        // Use shared URL cache so images are cached across views
        config.urlCache = URLCache.shared
        config.requestCachePolicy = .returnCacheDataElseLoad
        self.session = URLSession(configuration: config)
    }

    public func loadImage(_ url: URL, headers: [String: String]?, placeholder: UIImage?, imageView: UIImageView, completion: @escaping (UIImage?) -> Void) {
        if let placeholder = placeholder {
            DispatchQueue.main.async {
                imageView.image = placeholder
            }
        }

        var request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
        headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }
        session.dataTask(with: request) { data, _, _ in
            guard let data = data, let image = UIImage(data: data) else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            DispatchQueue.main.async {
                imageView.image = image
                completion(image)
            }
        }.resume()
    }
}

#if canImport(SDWebImage)
struct SDWebImageLoader: ImageLoader {
    func loadImage(_ url: URL, headers: [String: String]?, placeholder: UIImage?, imageView: UIImageView, completion: @escaping (UIImage?) -> Void) {
        // Use the same SDWebImage cache that expo-image uses.
        // .queryMemoryData = check memory cache first (instant if expo-image already loaded it)
        // .retryFailed = retry if a previous load failed (e.g. network timeout)
        // .scaleDownLargeImages = avoid OOM on very large photos
        let requestModifier = headers.map { headers in
            SDWebImageDownloaderRequestModifier { request in
                var request = request
                headers.forEach { key, value in
                    request.setValue(value, forHTTPHeaderField: key)
                }
                return request
            }
        }
        let context: [SDWebImageContextOption: Any]? =
            requestModifier.map { [.downloadRequestModifier: $0] }

        imageView.sd_setImage(
            with: url,
            placeholderImage: placeholder,
            options: [.retryFailed, .scaleDownLargeImages, .queryMemoryData],
            context: context,
            progress: nil) {(img, _, _, _) in
                DispatchQueue.main.async {
                    completion(img)
                }
        }
    }
}
#endif

public struct ImageLoaderFactory {
    public static func makeDefault() -> ImageLoader {
        #if canImport(SDWebImage)
        return SDWebImageLoader()
        #else
        return URLSessionImageLoader()
        #endif
    }
}
