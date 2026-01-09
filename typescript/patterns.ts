enum IotaType {
  Any = "any",
  Entity = "entity",
  Vector = "vector",
  Number = "number",
  Boolean = "boolean",
  Pattern = "pattern",
  List = "list",
  Null = "null",
  Garbage = "garbage",
}
abstract class Iota {
  abstract type: IotaType;
  toItem(min = 1, max = 1) {
    return new StackItem(this, new Minmaxable(min, max));
  }
}
class EntityIota extends Iota {
  type = IotaType.Entity;
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
  toString() {
    return "<span style='color: cyan'>" + this.name + "</span>";
  }
}
class VectorIota extends Iota {
  type = IotaType.Vector;
  x: Minmaxable;
  y: Minmaxable;
  z: Minmaxable;
  constructor(x: Minmaxable, y: Minmaxable, z: Minmaxable) { // TODO
    super();
    this.x = x;
    this.y = y;
    this.z = z;
  }
  toString() {
    return "<span style='color: red'>(" + this.x + ", " + this.y + ", " + this.z + ")</span>";
  }
}
class NumberIota extends Iota {
  type = IotaType.Number;
  value: Minmaxable;
  constructor(value: Minmaxable) { // TODO
    super();
    this.value = value;
  }
  toString() {
    return "<span style='color: lime'>" + this.value + "</span>";
  }
}
class BooleanIota extends Iota {
  type = IotaType.Boolean;
  value: boolean;
  constructor(value: boolean) {
    super();
    this.value = value;
  }
  toString() {
    if(this.value === false) return "<span style='color: yellow'>False</span>";
    else if(this.value === true) return "<span style='color: yellow'>True</span>";
    else return "<span style='color: yellow'>Boolean</span>";
  }
}
class PatternIota extends Iota {
  type = IotaType.Pattern;
  pattern: HexPattern;
  constructor(pattern: HexPattern) {
    super();
    this.pattern = pattern;
  }
  toString() {
    return "<span style='color: magenta'>" + this.pattern.name + "</span>";
  }
}
class ListIota extends Iota {
  type = IotaType.List;
  contents: StackItem[] = [];
  constructor(contents: StackItem[]) {
    super();
    this.contents = contents;
  }
  toString() {
    return "<span style='color: purple'>[" + this.contents.join(", ") + "]</span>";
  }
  types() {
    return [...new Set(this.contents.map(x => x.iota.type))];
  }
}
class NullIota extends Iota {
  type = IotaType.Null;
  constructor() {
    super();
  }
  toString() {
    return "<span style='color: #aaa'>Null</span>";
  }
}class GarbageIota extends Iota {
  type = IotaType.Garbage;
  constructor() {
    super();
  }
  toString() {
    return "<span style='color: #777'>Garbage</span>";
  }
}

export class Minmaxable {
  min: number;
  max: number;
  constructor(min: number, max: number) {
    this.min = min;
    this.max = max;
  }
  toString() {
    if(this.max > 1e6 && this.min > 1e6) return "inf";
    else if(this.max < -1e6 && this.min < -1e6) return "-inf";
    else if(this.max > 1e6 && this.min < -1e6) return "any";
    else if(this.max > 1e6) return this.min + "~inf";
    else if(this.min < -1e6) return "-inf~" + this.max;
    return this.min + (this.max == this.min ? "" : ("~" + this.max));
  }
}
export class StackItem {
  iota: Iota;
  count: Minmaxable;
  constructor(iota: Iota, count: Minmaxable) {
    this.iota = iota;
    this.count = count;
  }
  toString() {
    return this.iota + ((this.count.min == 1 && this.count.max == 1) ? "" : " x " + this.count);
  }
}

interface PopResult {
  iota: Iota;
  remaining: StackItem[];
}
function popItem(items: StackItem[], last = true): PopResult[] {
  if(!items.length) return [{iota: undefined, remaining: []}];
  const lastItem = items.at(last ? -1 : 0);
  if(lastItem.count.min > 1) {
    // this will definitely not remove the iota
    lastItem.count.min--;
    lastItem.count.max--;
    return [{iota: lastItem.iota, remaining: items}];
  } else if(lastItem.count.min == 1 && lastItem.count.max == 1) {
    return [{iota: lastItem.iota, remaining: last ? items.slice(0, -1) : items.slice(1)}];
  } else if(lastItem.count.min == 1) {
    // this may remove the iota
    lastItem.count.min--;
    lastItem.count.max--;
    return [{iota: lastItem.iota, remaining: items}, {iota: lastItem.iota, remaining: last ? items.slice(0, -1) : items.slice(1)}];
  } else if(items.length > 1) {
    // the iota may already be gone
    lastItem.count.max--;
    return [{iota: lastItem.iota, remaining: items}, {iota: lastItem.iota, remaining: last ? items.slice(0, -1) : items.slice(1)}, ...popItem(last ? items.slice(0, -1) : items.slice(1))];
  } else if(lastItem.count.max == 1) {
    // there are only 0-1 items left in the whole list
    return [{iota: lastItem.iota, remaining: []}, {iota: undefined, remaining: []}];
  } else {
    // there are only 0-n items left in the whole list
    lastItem.count.max--;
    return [{iota: lastItem.iota, remaining: []}, {iota: undefined, remaining: []}];
  }
}

export enum ProblemType {
  Warning,
  Error
}
export interface Problem {
  type: ProblemType;
  description: string;
}
export class HexPattern {
  name: string;
  evaluate: (stack: StackItem[]) => SimpleStackTrace[];
  constructor(name: string, evaluate: (stack: StackItem[]) => SimpleStackTrace[] = (stack: StackItem[]) => [{stack: stack, problems: []}]) {
    this.name = name;
    this.evaluate = evaluate;
  }
}
export class GarbagePattern extends HexPattern {
  constructor(name: string, warningMessage: string) {
    super(name, (stack) => [{stack: [...stack, new GarbageIota().toItem()], problems: [{type: ProblemType.Warning, description: warningMessage}]}]);
  }
}
export interface SimpleStackTrace {
  stack: StackItem[];
  problems: Problem[];
}
class SimpleHexPattern extends HexPattern {
  constructor(name: string, pops: IotaType[], pushes: ((iotas: Iota[]) => (Iota | StackItem)[][])) {
    super(name, (stack) => {
      let stackOptions = [{stack: stack, problems: []}];
      let iotas: Iota[] = [];
      for(let i of pops.toReversed()) {
        let nextStackOptions: SimpleStackTrace[] = [];
        for(let s of stackOptions) {
          const poppedOptions = popItem(s.stack);
          for(const option of poppedOptions) {
            if(!option.iota) {
              nextStackOptions.push({stack: [], problems: [...s.problems, {type: ProblemType.Warning, description: "expected " + i + " but the stack was empty"}]});
            } else if(option.iota.type != i && IotaType.Any != i) {
              nextStackOptions.push({stack: option.remaining, problems: [...s.problems, {type: ProblemType.Warning, description: "expected " + i + " but got " + option.iota}]});
            } else {
              nextStackOptions.push({stack: option.remaining, problems: s.problems});
              iotas.push(option.iota);
            }
          }          
        }
        if(nextStackOptions.length) {
          stackOptions = nextStackOptions;
        } else {
          stackOptions = [];
          break;
        }
      }
      const returnals = stackOptions.flatMap(x => (x.problems.length ? [[new GarbageIota().toItem(x.problems.length, x.problems.length)]] : pushes(iotas.toReversed()).map(y => y.map(z => z instanceof Iota ? z.toItem() : z))).map(y => ({stack: [...x.stack, ...y], problems: x.problems})));
      return [...new Set(returnals)];
    });
  }
}
class RearrangerHexPattern extends SimpleHexPattern {
  constructor(name: string, ordering: number[]) {
    super(name, [...Array(Math.max(...ordering) + 1).keys()].map(x => IotaType.Any), (iotas) => [ordering.map(x => iotas[x])]);
  }
}

export const defaultPattern = new HexPattern("");
export const allPatterns = [
  // Hex: Basic Patterns
  new SimpleHexPattern("Mind's Reflection", [], () => [[new EntityIota("Caster")]]),
  new SimpleHexPattern("Compass Purification", [IotaType.Entity], () => [[new VectorIota(
    new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7)
  )]]),
  new SimpleHexPattern("Compass Purification II", [IotaType.Entity], () => [[new VectorIota(
    new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7)
  )]]),
  new SimpleHexPattern("Alidade's Purification", [IotaType.Entity], () => [[new VectorIota(
    new Minmaxable(-1, 1), new Minmaxable(-1, 1), new Minmaxable(-1, 1)
  )]]),
  new SimpleHexPattern("Archer's Distillation", [IotaType.Vector, IotaType.Vector], () => [[new VectorIota(
    new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7), new Minmaxable(-3e7, 3e7)
  )], [new NullIota()]]),
  new SimpleHexPattern("Architect's Distillation", [IotaType.Vector, IotaType.Vector], () => [[new VectorIota(
    new Minmaxable(-1, 1), new Minmaxable(-1, 1), new Minmaxable(-1, 1)
  )], [new NullIota()]]),
  new SimpleHexPattern("Scout's Distillation", [IotaType.Vector, IotaType.Vector], () => [[new EntityIota("Scout's Target")], [new NullIota()]]),
  new SimpleHexPattern("Reveal", [IotaType.Any], (iotas) => [[iotas[0]]]),
  new SimpleHexPattern("Stadiometer's Purification", [IotaType.Entity], () => [[new NumberIota(new Minmaxable(0, 200))]]),
  new SimpleHexPattern("Pace Purification", [IotaType.Entity], () => [[new NumberIota(new Minmaxable(0, 1e7))]]),
  // Hex: Mathematics
  new GarbagePattern("Numerical Reflection: ", "needs an argument"),
  //new HexPattern("Additive Distillation"),
  //new HexPattern("Subtractive Distillation"),
  //new HexPattern("Multiplicative Distillation"),
  //new HexPattern("Division Distillation"),
  //new HexPattern("Length Purification"),
  //new HexPattern("Power Distillation"),
  new SimpleHexPattern("Floor Purification", [IotaType.Number], (iotas) => [[new NumberIota(new Minmaxable(Math.floor((iotas[0] as NumberIota).value.min), Math.floor((iotas[0] as NumberIota).value.max)))]]),
  new SimpleHexPattern("Ceiling Purification", [IotaType.Number], (iotas) => [[new NumberIota(new Minmaxable(Math.ceil((iotas[0] as NumberIota).value.min), Math.ceil((iotas[0] as NumberIota).value.max)))]]),
  new SimpleHexPattern("Vector Exaltation", [IotaType.Number, IotaType.Number, IotaType.Number], (iotas) => [[
    new VectorIota((iotas[0] as NumberIota).value, (iotas[1] as NumberIota).value, (iotas[2] as NumberIota).value)
  ]]),
  new SimpleHexPattern("Vector Disintegration", [IotaType.Vector], (iotas) => [[
    new NumberIota(new Minmaxable((iotas[0] as VectorIota).x.min, (iotas[0] as VectorIota).x.max)),
    new NumberIota(new Minmaxable((iotas[0] as VectorIota).y.min, (iotas[0] as VectorIota).y.max)),
    new NumberIota(new Minmaxable((iotas[0] as VectorIota).z.min, (iotas[0] as VectorIota).z.max))
  ]]),
  //new HexPattern("Modulus Distillation"),
  //new HexPattern("Axial Purification"),
  new SimpleHexPattern("Entropy Reflection", [], () => [[new NumberIota(new Minmaxable(0, 0.99999))]]),
  // Hex: Constants
  new SimpleHexPattern("True Reflection", [], () => [[new BooleanIota(true)]]),
  new SimpleHexPattern("False Reflection", [], () => [[new BooleanIota(false)]]),
  new SimpleHexPattern("Nullary Reflection", [], () => [[new NullIota()]]),
  new SimpleHexPattern("Vector Reflection Zero", [], () => [[new VectorIota(new Minmaxable(0, 0), new Minmaxable(0, 0), new Minmaxable(0, 0))]]),
  new SimpleHexPattern("Vector Reflection +X", [], () => [[new VectorIota(new Minmaxable(1, 1), new Minmaxable(0, 0), new Minmaxable(0, 0))]]),
  new SimpleHexPattern("Vector Reflection -X", [], () => [[new VectorIota(new Minmaxable(-1, -1), new Minmaxable(0, 0), new Minmaxable(0, 0))]]),
  new SimpleHexPattern("Vector Reflection +Y", [], () => [[new VectorIota(new Minmaxable(0, 0), new Minmaxable(1, 1), new Minmaxable(0, 0))]]),
  new SimpleHexPattern("Vector Reflection -Y", [], () => [[new VectorIota(new Minmaxable(0, 0), new Minmaxable(-1, -1), new Minmaxable(0, 0))]]),
  new SimpleHexPattern("Vector Reflection +Z", [], () => [[new VectorIota(new Minmaxable(0, 0), new Minmaxable(0, 0), new Minmaxable(1, 1))]]),
  new SimpleHexPattern("Vector Reflection -Z", [], () => [[new VectorIota(new Minmaxable(0, 0), new Minmaxable(0, 0), new Minmaxable(-1, -1))]]),
  new SimpleHexPattern("Circle's Reflection", [], () => [[new NumberIota(new Minmaxable(Math.PI * 2, Math.PI * 2))]]),
  new SimpleHexPattern("Arc's Reflection", [], () => [[new NumberIota(new Minmaxable(Math.PI, Math.PI))]]),
  new SimpleHexPattern("Euler's Reflection", [], () => [[new NumberIota(new Minmaxable(Math.E, Math.E))]]),
  // Hex: Stack Manipulation
  new SimpleHexPattern("Novice's Gambit", [IotaType.Any], () => [[]]),
  new RearrangerHexPattern("Jester's Gambit", [1, 0]),
  new RearrangerHexPattern("Rotation Gambit", [1, 2, 0]),
  new RearrangerHexPattern("Rotation Gambit II", [2, 0, 1]),
  new RearrangerHexPattern("Gemini Decomposition", [0, 0]),
  new RearrangerHexPattern("Prospector's Gambit", [0, 1, 0]),
  new RearrangerHexPattern("Undertaker's Gambit", [1, 0, 1]),
  new SimpleHexPattern("Gemini Gambit", [IotaType.Any, IotaType.Number], (iotas) =>
    (iotas[1] as NumberIota).value.min <= 0 ? ((iotas[1] as NumberIota).value.max <= 0 ? [[]] : [[], [new StackItem(iotas[0], new Minmaxable(0, Math.floor((iotas[1] as NumberIota).value.max)))]])
    : ([[new StackItem(iotas[0], new Minmaxable(Math.floor((iotas[1] as NumberIota).value.min), Math.floor((iotas[1] as NumberIota).value.max)))]])
  ),
  new RearrangerHexPattern("Dioscuri Gambit", [0, 1, 0, 1]),
  new HexPattern("Flock's Reflection", (stack) => [{stack: [...stack, new NumberIota(new Minmaxable(stack.length, stack.length)).toItem()], problems: []}]),
  //new HexPattern("Fisherman's Gambit"),
  //new HexPattern("Fisherman's Gambit II"),
  //new GarbagePattern("Bookkeeper's Gambit: ", "needs an argument"),
  //new HexPattern("Swindler's Gambit"),
  // Hex: Logical Operators
  new SimpleHexPattern("Augur's Purification", [IotaType.Any], (iotas) => [[new BooleanIota(
    iotas[0] instanceof BooleanIota ? iotas[0].value : iotas[0] instanceof NullIota ? false :
    iotas[0] instanceof NumberIota ? ((iotas[0].value.min == 0 && iotas[0].value.max == 0) ? false : (iotas[0].value.min <= 0 && iotas[0].value.max >= 0) ? undefined : true) : true
  )]]),
  new SimpleHexPattern("Negation Purification", [IotaType.Boolean], (iotas) => [[new BooleanIota((iotas[0] as BooleanIota).value === true ? false : (iotas[0] as BooleanIota).value === false ? true : undefined)]]),
  new SimpleHexPattern("Disjunction Distillation", [IotaType.Boolean, IotaType.Boolean], (iotas) => [[(iotas[0] as BooleanIota).value === true ? new BooleanIota(true) : iotas[1]]]),
  new SimpleHexPattern("Conjunction Distillation", [IotaType.Boolean, IotaType.Boolean], (iotas) => [[(iotas[0] as BooleanIota).value === false ? new BooleanIota(false) : iotas[1]]]),
  //new HexPattern("Exclusion Distillation"),
  new SimpleHexPattern("Augur's Exaltation", [IotaType.Boolean, IotaType.Any, IotaType.Any], (iotas) => ((iotas[0] as BooleanIota).value === true ? [[iotas[1]]] : (iotas[0] as BooleanIota).value === false ? [[iotas[2]]] : [[iotas[1]], [iotas[2]]])),
  //new HexPattern("Equality Distillation"),
  //new HexPattern("Inequality Distillation"),
  new SimpleHexPattern("Maximus Distillation", [IotaType.Number, IotaType.Number], (iotas) => [[new BooleanIota(
    (iotas[0] as NumberIota).value.min > (iotas[1] as NumberIota).value.max ? true : (iotas[0] as NumberIota).value.max <= (iotas[1] as NumberIota).value.min ? false : undefined
  )]]),
  new SimpleHexPattern("Minimus Distillation", [IotaType.Number, IotaType.Number], (iotas) => [[new BooleanIota(
    (iotas[0] as NumberIota).value.max < (iotas[1] as NumberIota).value.min ? true : (iotas[0] as NumberIota).value.min >= (iotas[1] as NumberIota).value.max ? false : undefined
  )]]),
  new SimpleHexPattern("Maximus Distillation II", [IotaType.Number, IotaType.Number], (iotas) => [[new BooleanIota(
    (iotas[0] as NumberIota).value.min >= (iotas[1] as NumberIota).value.max ? true : (iotas[0] as NumberIota).value.max < (iotas[1] as NumberIota).value.min ? false : undefined
  )]]),
  new SimpleHexPattern("Minimus Distillation II", [IotaType.Number, IotaType.Number], (iotas) => [[new BooleanIota(
    (iotas[0] as NumberIota).value.max <= (iotas[1] as NumberIota).value.min ? true : (iotas[0] as NumberIota).value.min > (iotas[1] as NumberIota).value.max ? false : undefined
  )]]),
  // Hex: Entities
  new SimpleHexPattern("Entity Purification", [IotaType.Vector], () => [[new EntityIota("Entity")], [new NullIota()]]),
  new SimpleHexPattern("Entity Purification: Animal", [IotaType.Vector], () => [[new EntityIota("Animal")], [new NullIota()]]),
  new SimpleHexPattern("Entity Purification: Monster", [IotaType.Vector], () => [[new EntityIota("Monster")], [new NullIota()]]),
  new SimpleHexPattern("Entity Purification: Item", [IotaType.Vector], () => [[new EntityIota("Item")], [new NullIota()]]),
  new SimpleHexPattern("Entity Purification: Player", [IotaType.Vector], () => [[new EntityIota("Player")], [new NullIota()]]),
  new SimpleHexPattern("Entity Purification: Living", [IotaType.Vector], () => [[new EntityIota("Living Entity")], [new NullIota()]]),
  new SimpleHexPattern("Zone Distillation: Animal", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Animal").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Monster", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Monster").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Item", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Item").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Player", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Player").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Living", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Living").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Non-Animal", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Non-Animal").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Non-Monster", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Non-Monster").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Non-Item", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Non-Item").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Non-Player", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Non-Player").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Non-Living", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Non-Living").toItem(0, 1e7)])]]),
  new SimpleHexPattern("Zone Distillation: Any", [IotaType.Vector, IotaType.Number], () => [[new ListIota([new EntityIota("Any").toItem(0, 1e7)])]]),
  // Hex: List Manipulation
  new SimpleHexPattern("Selection Distillation", [IotaType.List, IotaType.Number], (iotas) => {
    let results = [{remaining: (iotas[0] as ListIota).contents.slice(0), outputs: []}];
    for(let i = 0; i <= Math.min((iotas[1] as NumberIota).value.max, (iotas[0] as ListIota).contents.length - 1); i++) {
      let collected = [];
      for(const result of results) {
        let poppedOptions = popItem(result.remaining, false);
        for(const option of poppedOptions) {
          let out = {remaining: option.remaining, outputs: result.outputs};
          if(i >= (iotas[1] as NumberIota).value.min) out.outputs.push(option.iota || new NullIota());
          collected.push(out);
        }
      }
      results = collected;
    }
    const finalResult = results.flatMap(x => x.outputs).map(x => [x]);
    return finalResult.length ? finalResult : [[new NullIota()]];
  }),
  //new HexPattern("Selection Exaltation"),
  new SimpleHexPattern("Integration Distillation", [IotaType.List, IotaType.Any], (iotas) => [[new ListIota([...(iotas[0] as ListIota).contents, iotas[1].toItem()])]]),
  new SimpleHexPattern("Derivation Distillation", [IotaType.List], (iotas) => popItem((iotas[0] as ListIota).contents).map(x => x.iota ? [new ListIota(x.remaining), x.iota] : [new ListIota([]), new NullIota()])),
  new SimpleHexPattern("Vacant Reflection", [], () => [[new ListIota([])]]),
  new SimpleHexPattern("Single's Purification", [IotaType.Any], (iotas) => [[new ListIota([iotas[0].toItem()])]]),
  new SimpleHexPattern("Retrograde Purification", [IotaType.List], (iotas) => [[new ListIota((iotas[0] as ListIota).contents.toReversed())]]),
  //new HexPattern("Locator's Distillation"),
  //new HexPattern("Excisor's Distillation"),
  //new HexPattern("Flock's Gambit"),
  new HexPattern("Flock's Disintegration", (stack) => (popItem(stack).map(x => x.iota ? (x.iota.type == IotaType.List ? {stack: [...x.remaining, ...(x.iota as ListIota).contents], problems: []} : ({stack: [...x.remaining, new GarbageIota().toItem()], problems: [{type: ProblemType.Warning, description: "expected list but got " + x.iota}]})) : {stack: [], problems: [{type: ProblemType.Warning, description: "expected list but the stack was empty"}]}))),
  new SimpleHexPattern("Speaker's Distillation", [IotaType.List, IotaType.Any], (iotas) => [[new ListIota([iotas[1].toItem(), ...(iotas[0] as ListIota).contents])]]),
  new SimpleHexPattern("Speaker's Decomposition", [IotaType.List], (iotas) => popItem((iotas[0] as ListIota).contents, false).map(x => x.iota ? [new ListIota(x.remaining), x.iota] : [new ListIota([]), new NullIota()])),
  // Hex: Escaping Patterns
  new HexPattern("Introspection"),
  new HexPattern("{"),
  new HexPattern("Retrospection"),
  new HexPattern("}"),
];
export function getPattern(name: string) {
  if(name.toLowerCase().startsWith("numerical reflection: ")) {
    let arg = name.slice("numerical reflection: ".length);
    return new HexPattern("Numerical Reflection: " + arg, (stack) => {
      const num = parseFloat(arg);
      if(isNaN(num)) return [{stack: [...stack, new GarbageIota().toItem()], problems: [{type: ProblemType.Error, description: "argument must be a number"}]}];
      return [{stack: [...stack, new NumberIota(new Minmaxable(num, num)).toItem()], problems: []}];
    });
  }
  return allPatterns.find(y => y.name.toLowerCase() == name.trim().toLowerCase());
}