import UIKit

struct MediaViewerThumbnailAnchor {
  static let contentFitCover = "cover"
  static let contentFitContain = "contain"

  let cornerRadius: CGFloat?
  let contentFit: String

  var contentMode: UIView.ContentMode {
    contentFit == Self.contentFitContain ? .scaleAspectFit : .scaleAspectFill
  }

  static func decode(_ json: String?) -> MediaViewerThumbnailAnchor? {
    guard let json, let data = json.data(using: .utf8) else { return nil }
    guard let payload = try? JSONDecoder().decode(DecodedThumbnailAnchor.self, from: data) else {
      return nil
    }

    let decodedContentFit = payload.contentFit
    let contentFit =
      decodedContentFit == contentFitContain || decodedContentFit == contentFitCover
        ? decodedContentFit ?? contentFitCover
        : contentFitCover
    let cornerRadius =
      payload.cornerRadius.flatMap { value -> CGFloat? in
        guard value.isFinite, value >= 0 else { return nil }
        return CGFloat(value)
      }

    return MediaViewerThumbnailAnchor(cornerRadius: cornerRadius, contentFit: contentFit)
  }
}

private struct DecodedThumbnailAnchor: Decodable {
  let cornerRadius: Double?
  let contentFit: String?
}
