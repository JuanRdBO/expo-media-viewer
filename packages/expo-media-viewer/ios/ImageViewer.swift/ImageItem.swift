import UIKit

public enum ImageItem {
    case image(UIImage?)
    case url(URL, placeholder: UIImage?)
    case request(URL, placeholder: UIImage?, headers: [String: String]?)
}
