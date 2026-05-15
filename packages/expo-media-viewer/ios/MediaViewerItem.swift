import Foundation

public struct MediaViewerNativeItem: Decodable {
  let id: String
  let type: String
  let uri: String
  let headers: [String: String]?
  let thumbnailUri: String?
  let thumbnailHeaders: [String: String]?
  let thumbnailMode: String?
  let title: String?
  let subtitle: String?
  let footer: String?

  var mediaURL: URL? {
    Self.makeURL(uri)
  }

  var thumbnailURL: URL? {
    guard let thumbnailUri, !thumbnailUri.isEmpty else { return nil }
    return Self.makeURL(thumbnailUri)
  }

  static func decodeItems(_ json: String?) -> [MediaViewerNativeItem] {
    guard let json, let data = json.data(using: .utf8) else { return [] }
    return (try? JSONDecoder().decode([MediaViewerNativeItem].self, from: data)) ?? []
  }

  static func decodeItem(_ json: String?) -> MediaViewerNativeItem? {
    guard let json, let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(MediaViewerNativeItem.self, from: data)
  }

  private static func makeURL(_ string: String) -> URL? {
    if string.hasPrefix("http://") || string.hasPrefix("https://") || string.hasPrefix("file://") {
      return URL(string: string)
    }
    return URL(fileURLWithPath: string)
  }
}
