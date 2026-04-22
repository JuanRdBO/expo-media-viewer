const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const deploymentTarget = "15.1";
const marker = "expo-media-viewer-pods-deployment-target";

function withIosPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfile = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");

      if (contents.includes(marker)) {
        return modConfig;
      }

      const hook = [
        "",
        `    # ${marker}`,
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |build_config|",
        `        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'`,
        "      end",
        "    end",
      ].join("\n");

      contents = contents.replace(
        /(\n\s*react_native_post_install\([\s\S]*?\n\s*\))/,
        `$1${hook}`,
      );

      fs.writeFileSync(podfile, contents);
      return modConfig;
    },
  ]);
}

module.exports = withIosPodsDeploymentTarget;
