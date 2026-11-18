# Independent agent package artifact

SEO Analyst source lives in its own private sibling repository: `~/Documents/augarch-seo-analyst`, GitHub `JD1212/augarch-seo-analyst`.

This directory holds only the versioned `npm pack` artifact and source provenance. No agent source project, credentials or business-specific configuration is embedded here. `package-lock.json` pins SHA-512 integrity. Vercel can build from the website repository without a private registry token or cross-repository Git credential.

To update: test and commit the standalone project, tag its version, run `npm pack`, copy the artifact here, install that file dependency, and update provenance. Verify the tarball contents and integrity before releasing. Preserve the prior source history; do not silently replace a published version.
