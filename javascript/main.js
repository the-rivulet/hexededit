import { allPatterns, defaultPattern, GarbagePattern, getPattern, ProblemType, compileHex } from "./patterns.js";
// syntax highlighting and whatever
const patterns = document.getElementById("patterns");
const backdrop = document.getElementById("backdrop");
const overlay = document.getElementById("overlay");
const tooltip = document.getElementById("tooltip");
function insertTextAt(text, newText, pos, eraseAmount = 0) {
    return text.slice(0, pos) + newText + text.slice(pos + eraseAmount);
}
function checkAutocomplete(text) {
    const thisLine = patterns.value.slice(0, patterns.selectionStart).split("\n").at(-1).trimStart();
    if (patterns.selectionStart != patterns.selectionEnd || (patterns.value[patterns.selectionStart] && patterns.value[patterns.selectionStart] != "\n"))
        return -1;
    return [...Array(text.length).keys()].map(i => (thisLine == text.slice(0, i))).findLastIndex(i => i);
}
let forceAutocompleteIndex = -1;
function findBestAutocomplete() {
    const patternNames = allPatterns.map(x => x.name);
    const allAutocompletes = patternNames.map((x, i) => checkAutocomplete(x) > 0 ? i : -1).filter(x => x > -1);
    if (!allAutocompletes.length || patternNames.includes(patterns.value.slice(0, patterns.selectionStart).split("\n").at(-1).trimStart()))
        return { pattern: undefined, progress: -1, unique: false };
    if (forceAutocompleteIndex == -1) {
        return { pattern: allPatterns[allAutocompletes[0]], progress: checkAutocomplete(patternNames[allAutocompletes[0]]), unique: allAutocompletes.length == 1 };
    }
    else {
        return { pattern: allPatterns[allAutocompletes[forceAutocompleteIndex % allAutocompletes.length]], progress: checkAutocomplete(patternNames[allAutocompletes[forceAutocompleteIndex % allAutocompletes.length]]), unique: true };
    }
}
let compilationResult;
function handleInput() {
    let result = patterns.value;
    const bestAutocomplete = findBestAutocomplete();
    if (bestAutocomplete.progress > 0) {
        result = insertTextAt(result, "<span style='color:" + (bestAutocomplete.unique ? "#0aa" : "#444") + "'>" + bestAutocomplete.pattern.name.slice(checkAutocomplete(bestAutocomplete.pattern.name)) + "</span>", patterns.selectionStart);
    }
    else {
        forceAutocompleteIndex = -1;
    }
    // compile the hex
    compilationResult = compileHex(result.split("\n").map(x => getPattern(x) || (x.trim().length ? new GarbagePattern(x.trim(), "unknown pattern") : defaultPattern)));
    // this &nbsp; thing is a total hack but whatever
    result = result.replaceAll(" ", "&nbsp;").split("\n").map((q, i) => {
        let pre = q, num = 0;
        while (pre.startsWith("&nbsp;")) {
            pre = pre.replace("&nbsp;", "");
            num++;
        }
        return "&nbsp;".repeat(num) + "<span class='" + (compilationResult[i].find(x => x.problems.find(y => y.type == ProblemType.Error)) ? "err" : compilationResult[i].find(x => x.problems.find(y => y.type == ProblemType.Warning)) ? "warn" : "") + "'>" + pre + "</span>";
    }).join("<br/>").replaceAll("span&nbsp;", "span ");
    overlay.innerHTML = result;
}
handleInput();
patterns.addEventListener("input", handleInput);
patterns.addEventListener("mouseup", handleInput);
patterns.addEventListener("scroll", () => {
    backdrop.scrollTop = patterns.scrollTop;
});
patterns.addEventListener("keydown", (ev) => {
    if (patterns.selectionStart == patterns.selectionEnd && !(patterns.value[patterns.selectionStart] && patterns.value[patterns.selectionStart] != "\n")) {
        if (ev.key == "Tab") {
            ev.preventDefault();
            const bestAutocomplete = findBestAutocomplete();
            if (bestAutocomplete.progress > 0) {
                const completion = bestAutocomplete.pattern.name.slice(checkAutocomplete(bestAutocomplete.pattern.name));
                const nextPosition = patterns.selectionStart + completion.length;
                patterns.value = insertTextAt(patterns.value, completion, patterns.selectionStart);
                patterns.selectionStart = nextPosition;
                patterns.selectionEnd = nextPosition;
            }
        }
        else if (ev.key == "Enter") {
            ev.preventDefault();
            const bestAutocomplete = findBestAutocomplete();
            let caretPos = patterns.selectionStart;
            if (bestAutocomplete.progress > 0) {
                const remainingChars = bestAutocomplete.pattern.name.slice(checkAutocomplete(bestAutocomplete.pattern.name));
                patterns.value = insertTextAt(patterns.value, remainingChars, caretPos);
                caretPos += remainingChars.length;
            }
            const lastLine = patterns.value.slice(0, patterns.selectionStart).split("\n").at(-1);
            let leadingSpaces = lastLine.length - lastLine.trimStart().length;
            if (lastLine.endsWith("Introspection") || lastLine.endsWith("{"))
                leadingSpaces += 2;
            if (lastLine.endsWith("Retrospection") || lastLine.endsWith("}")) {
                const prevStart = 0 + patterns.selectionStart;
                patterns.value = insertTextAt(patterns.value, "", patterns.selectionStart - lastLine.length, Math.min(2, leadingSpaces));
                patterns.selectionStart = prevStart;
                leadingSpaces = Math.max(0, leadingSpaces - 2);
            }
            patterns.value = insertTextAt(patterns.value, "\n" + " ".repeat(leadingSpaces), caretPos);
            caretPos += 1 + leadingSpaces;
            patterns.selectionStart = caretPos;
            patterns.selectionEnd = caretPos;
        }
        else if (ev.key == "`") {
            ev.preventDefault();
            if (forceAutocompleteIndex == -1)
                forceAutocompleteIndex = 1;
            else
                forceAutocompleteIndex++;
        }
    }
    setTimeout(() => {
        handleInput();
        //@ts-expect-error
        const caret = getCaretCoordinates(patterns, patterns.selectionStart);
        const lineNum = (patterns.value.slice(0, patterns.selectionStart).match(/\n/g) || []).length;
        tooltip.style.left = caret.left + 5 + "px";
        tooltip.style.top = caret.top + caret.height + patterns.getBoundingClientRect().top + 5 + "px";
        tooltip.innerHTML = compilationResult[lineNum].map(x => x.stack.join(", ") + x.problems.map(x => "<br/>" + x.description).join("")).join("<hr/>");
        tooltip.style.display = tooltip.innerHTML.replaceAll("<br>", "").length ? "block" : "none";
    });
});
