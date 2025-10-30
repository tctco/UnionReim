/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const baseConfig = {
    appId: "com.unionreim.app",
    productName: "UnionReim",
    directories: {
        output: "release",
        buildResources: "build",
    },
    files: ["dist-main/index.js", "dist-preload/index.js", "dist-renderer/**/*"],
    artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
    publish: [{ provider: "github", overwrite: false }],
    extraMetadata: {
        "chromium-ffmpeg": false
    },
};

// Inject version from CI tag or npm package metadata when available
if (process.env.VITE_APP_VERSION) {
    baseConfig.extraMetadata.version = process.env.VITE_APP_VERSION;
} else if (process.env.npm_package_version) {
    baseConfig.extraMetadata.version = process.env.npm_package_version;
}

/**
 * @type {Record<NodeJS.Platform, import('electron-builder').Configuration>}
 */
const platformSpecificConfigurations = {
    darwin: {
        ...baseConfig,
        // Remove code signing hook by default to avoid CI failures when no signing is configured
        mac: {
            icon: "build/logo-img.png",
            target: [{ target: "dmg" }, { target: "zip" }],
            category: "public.app-category.utilities",
        },
    },
    win32: {
        ...baseConfig,
        win: {
            icon: "build/logo-img.png",
            target: [{ target: "nsis" }, { target: "msi" }, { target: "zip" }],
        },
        appx: {
            // Display name shown in Microsoft Store contexts
            publisherDisplayName: "tctco",
            // Supported languages
            languages: ["en-US", "zh-CN"],
        },
        nsis: {
            oneClick: false,
            perMachine: false,
            allowToChangeInstallationDirectory: true,
        },
    },
    linux: {
        ...baseConfig,
        linux: {
            category: "Utility",
            icon: "build/logo-img.png",
            target: [{ target: "AppImage" }, { target: "deb" }, { target: "zip" }],
        },
    },
};

module.exports = platformSpecificConfigurations[process.platform];
