"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveVisually = exports.endOfLine = exports.moveLogically = void 0;
const pos_js_1 = require("../line/pos.js");
const position_measurement_js_1 = require("../measurement/position_measurement.js");
const bidi_js_1 = require("../util/bidi.js");
const misc_js_1 = require("../util/misc.js");
function moveCharLogically(line, ch, dir) {
    let target = (0, misc_js_1.skipExtendingChars)(line.text, ch + dir, dir);
    return target < 0 || target > line.text.length ? null : target;
}
function moveLogically(line, start, dir) {
    let ch = moveCharLogically(line, start.ch, dir);
    return ch == null ? null : new pos_js_1.Pos(start.line, ch, dir < 0 ? "after" : "before");
}
exports.moveLogically = moveLogically;
function endOfLine(visually, cm, lineObj, lineNo, dir) {
    if (visually) {
        if (cm.doc.direction == "rtl")
            dir = -dir;
        let order = (0, bidi_js_1.getOrder)(lineObj, cm.doc.direction);
        if (order) {
            let part = dir < 0 ? (0, misc_js_1.lst)(order) : order[0];
            let moveInStorageOrder = (dir < 0) == (part.level == 1);
            let sticky = moveInStorageOrder ? "after" : "before";
            let ch;
            // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
            // it could be that the last bidi part is not on the last visual line,
            // since visual lines contain content order-consecutive chunks.
            // Thus, in rtl, we are looking for the first (content-order) character
            // in the rtl chunk that is on the last line (that is, the same line
            // as the last (content-order) character).
            if (part.level > 0 || cm.doc.direction == "rtl") {
                let prep = (0, position_measurement_js_1.prepareMeasureForLine)(cm, lineObj);
                ch = dir < 0 ? lineObj.text.length - 1 : 0;
                let targetTop = (0, position_measurement_js_1.measureCharPrepared)(cm, prep, ch).top;
                ch = (0, misc_js_1.findFirst)(ch => (0, position_measurement_js_1.measureCharPrepared)(cm, prep, ch).top == targetTop, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
                if (sticky == "before")
                    ch = moveCharLogically(lineObj, ch, 1);
            }
            else
                ch = dir < 0 ? part.to : part.from;
            return new pos_js_1.Pos(lineNo, ch, sticky);
        }
    }
    return new pos_js_1.Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after");
}
exports.endOfLine = endOfLine;
function moveVisually(cm, line, start, dir) {
    let bidi = (0, bidi_js_1.getOrder)(line, cm.doc.direction);
    if (!bidi)
        return moveLogically(line, start, dir);
    if (start.ch >= line.text.length) {
        start.ch = line.text.length;
        start.sticky = "before";
    }
    else if (start.ch <= 0) {
        start.ch = 0;
        start.sticky = "after";
    }
    let partPos = (0, bidi_js_1.getBidiPartAt)(bidi, start.ch, start.sticky), part = bidi[partPos];
    if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
        // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
        // nothing interesting happens.
        return moveLogically(line, start, dir);
    }
    let mv = (pos, dir) => moveCharLogically(line, pos instanceof pos_js_1.Pos ? pos.ch : pos, dir);
    let prep;
    let getWrappedLineExtent = ch => {
        if (!cm.options.lineWrapping)
            return { begin: 0, end: line.text.length };
        prep = prep || (0, position_measurement_js_1.prepareMeasureForLine)(cm, line);
        return (0, position_measurement_js_1.wrappedLineExtentChar)(cm, line, prep, ch);
    };
    let wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);
    if (cm.doc.direction == "rtl" || part.level == 1) {
        let moveInStorageOrder = (part.level == 1) == (dir < 0);
        let ch = mv(start, moveInStorageOrder ? 1 : -1);
        if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
            // Case 2: We move within an rtl part or in an rtl editor on the same visual line
            let sticky = moveInStorageOrder ? "before" : "after";
            return new pos_js_1.Pos(start.line, ch, sticky);
        }
    }
    // Case 3: Could not move within this bidi part in this visual line, so leave
    // the current bidi part
    let searchInVisualLine = (partPos, dir, wrappedLineExtent) => {
        let getRes = (ch, moveInStorageOrder) => moveInStorageOrder
            ? new pos_js_1.Pos(start.line, mv(ch, 1), "before")
            : new pos_js_1.Pos(start.line, ch, "after");
        for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
            let part = bidi[partPos];
            let moveInStorageOrder = (dir > 0) == (part.level != 1);
            let ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
            if (part.from <= ch && ch < part.to)
                return getRes(ch, moveInStorageOrder);
            ch = moveInStorageOrder ? part.from : mv(part.to, -1);
            if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end)
                return getRes(ch, moveInStorageOrder);
        }
    };
    // Case 3a: Look for other bidi parts on the same visual line
    let res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
    if (res)
        return res;
    // Case 3b: Look for other bidi parts on the next visual line
    let nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
    if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
        res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
        if (res)
            return res;
    }
    // Case 4: Nowhere to move
    return null;
}
exports.moveVisually = moveVisually;