if (typeof Symbol.asyncDispose !== "symbol") {
  (Symbol as { asyncDispose: symbol }).asyncDispose = Symbol.for("Symbol.asyncDispose");
}
