import fse from "fs-extra/esm";

await fse.copy("./package.json", "./dist/package.json");
await fse.copy("./README.md", "./dist/README.md");
await fse.copy("./LICENSE", "./dist/LICENSE");
await fse.copy("./CHANGELOG.md", "./dist/CHANGELOG.md");