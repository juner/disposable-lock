import fse from "fs-extra/esm";
import path from "node:path";
import util from "node:util";

const args = (() => {
  const args = process.argv.slice(2);
  if (args[0] === "--") return args.slice(1);
  return args;
})();

const parsed = util.parseArgs({
  args,
  options: {
    output: {
      type: "string",
      short: "o",
      require: true,
    },
    file: {
      type: "string",
      short: "f",
      multiple: true,
    },
  }
});

const {values: {output, file}} = parsed;

if (!file || file.length <= 0) {
  process.exit(0);
}

if (!output || output.length <= 0) {
  throw new Error("required -o or --output");
}

for(const f of file) {
  const src = path.join("./", f);
  const dest = path.join(output, f);

  await fse.copy(src, dest, {
    overwrite: true,
  });

  console.log("copy:", src, " to ", dest);
}
