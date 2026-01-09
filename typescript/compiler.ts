import { HexPattern, StackItem, Minmaxable, SimpleStackTrace } from "./patterns.js";

export function compileHex(patterns: HexPattern[]) {
  let stackTraces: SimpleStackTrace[][] = [];
  let stackOptions: SimpleStackTrace[] = [{stack: [], problems: []}];
  for(let i = 0; i < patterns.length; i++) {
    let nextStackOptions: SimpleStackTrace[] = [];
    for(let s of stackOptions) {
      const evalResult = patterns[i].evaluate(s.stack.map(x => new StackItem(x.iota, new Minmaxable(x.count.min, x.count.max))));
      nextStackOptions.push(...evalResult);
    }
    if(nextStackOptions.length) {
      stackOptions = nextStackOptions.slice(0);
      stackTraces.push(nextStackOptions.slice(0));
    } else {
      console.error("catastrophic failure");
      break;
    }
  }
  return [...new Set(stackTraces)];
}