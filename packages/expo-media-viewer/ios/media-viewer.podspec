require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'media-viewer'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = { :type => 'MIT' }
  s.authors        = 'Momentos'
  s.homepage       = 'https://github.com/juanrdbo/momentos-fran'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'SDWebImage'
  # b3ll/Motion is vendored locally in ios/Motion/ (SPM-only, no pod available)

  s.source_files = '**/*.{swift}'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
