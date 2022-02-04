"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleSelection = exports.normalizeSelection = exports.Range = exports.Selection = void 0;
const pos_js_1 = require("../line/pos.js");
const misc_js_1 = require("../util/misc.js");
// Selection objects are immutable. A new one is created every time
// the selection changes. A selection is one or more non-overlapping
// (and non-touching) ranges, sorted, and an integer that indicates
// which one is the primary selection (the one that's scrolled into
// view, that getCursor returns, etc).
class Selection {
    constructor(ranges, primIndex) {
        this.ranges = ranges;
        this.primIndex = primIndex;
    }
    primary() { return this.ranges[this.primIndex]; }
    equals(other) {
        if (other == this)
            return true;
        if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length)
            return false;
        for (let i = 0; i < this.ranges.length; i++) {
            let here = this.ranges[i], there = other.ranges[i];
            if (!(0, pos_js_1.equalCursorPos)(here.anchor, there.anchor) || !(0, pos_js_1.equalCursorPos)(here.head, there.head))
                return false;
        }
        return true;
    }
    deepCopy() {
        let out = [];
        for (let i = 0; i < this.ranges.length; i++)
            out[i] = new Range((0, pos_js_1.copyPos)(this.ranges[i].anchor), (0, pos_js_1.copyPos)(this.ranges[i].head));
        return new Selection(out, this.primIndex);
    }
    somethingSelected() {
        for (let i = 0; i < this.ranges.length; i++)
            if (!this.ranges[i].empty())
                return true;
        return false;
    }
    contains(pos, end) {
        if (!end)
            end = pos;
        for (let i = 0; i < this.ranges.length; i++) {
            let range = this.ranges[i];
            if ((0, pos_js_1.cmp)(end, range.from()) >= 0 && (0, pos_js_1.cmp)(pos, range.to()) <= 0)
                return i;
        }
        return -1;
    }
}
exports.Selection = Selection;
class Range {
    constructor(anchor, head) {
        this.anchor = anchor;
        this.head = head;
    }
    from() { return (0, pos_js_1.minPos)(this.anchor, this.head); }
    to() { return (0, pos_js_1.maxPos)(this.anchor, this.head); }
    empty() { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch; }
}
exports.Range = Range;
// Take an unsorted, potentially overlapping set of ranges, and
// build a selection out of it. 'Consumes' ranges array (modifying
// it).
function normalizeSelection(cm, ranges, primIndex) {
    let mayTouch = cm && cm.options.selectionsMayTouch;
    let prim = ranges[primIndex];
    ranges.sort((a, b) => (0, pos_js_1.cmp)(a.from(), b.from()));
    primIndex = (0, misc_js_1.indexOf)(ranges, prim);
    for (let i = 1; i < ranges.length; i++) {
        let cur = ranges[i], prev = ranges[i - 1];
        let diff = (0, pos_js_1.cmp)(prev.to(), cur.from());
        if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
            let from = (0, pos_js_1.minPos)(prev.from(), cur.from()), to = (0, pos_js_1.maxPos)(prev.to(), cur.to());
            let inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
            if (i <= primIndex)
                --primIndex;
            ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
        }
    }
    return new Selection(ranges, primIndex);
}
exports.normalizeSelection = normalizeSelection;
function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0);
}
exports.simpleSelection = simpleSelection;
