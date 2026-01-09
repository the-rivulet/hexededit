import { StackItem, Minmaxable } from "./patterns.js";
export function compileHex(patterns) {
    let stackTraces = [];
    let stackOptions = [{ stack: [], problems: [] }];
    for (let i = 0; i < patterns.length; i++) {
        let nextStackOptions = [];
        for (let s of stackOptions) {
            const evalResult = patterns[i].evaluate(s.stack.map(x => new StackItem(x.iota, new Minmaxable(x.count.min, x.count.max))));
            nextStackOptions.push(...evalResult);
        }
        if (nextStackOptions.length) {
            stackOptions = nextStackOptions.slice(0);
            stackTraces.push(nextStackOptions.slice(0));
        }
        else {
            console.error("catastrophic failure");
            break;
        }
    }
    return [...new Set(stackTraces)];
}
