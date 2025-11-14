import fse from "fs-extra/esm";
import util from "node:util";

const args = (() => {
  const args = process.argv.slice(2);
  if (args[0] === "--") return args.slice(1);
  return args;
})();

const parsed = util.parseArgs({
  args,
  options: {
    file: {
      type: "string",
      short: "f",
      multiple: true,
    },
  }
});

const {values: {file}} = parsed;

if (!file || file.length <= 0) {
  process.exit(0);
}

for(const f of file) {
  const exist = await fse.pathExists(f);
  if (!exist) continue;
  await fse.remove(f);
  console.log("remove:", f);
}