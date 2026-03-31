"use strict";

/** @typedef UI
 *  @property {HTMLInputElement} width
 *  @property {HTMLInputElement} height
 *  @property {HTMLInputElement} probability
 *  @property {HTMLInputElement} size
 *  @property {HTMLInputElement} start
 *  @property {boolean[][]} open
 *  @property {CanvasRenderingContext2D} ctx
 *  @property {AudioContext} audioCtx
 *  @property {AudioBuffer} pop
 *  @property {boolean} mute
 *  @property {Grid} grid
 *  @property {boolean} recentClick
 *  @property {number} timeoutID
 * */

/** @type {UI}
 * */
let UI = undefined;
let debug = false;
let clickDelay = 400;

window.onload = init;
function init() {
    let main = document.getElementsByClassName('main').item(0);
    main.id = "main";
    document.body.appendChild(main);
    let cvs = document.createElement("canvas");
    main.appendChild(cvs);

    UI = {
        width: document.createElement("input"),
        height: document.createElement("input"),
        probability: document.createElement("input"),
        size: document.createElement("input"),
        start: document.createElement("input"),
        open: undefined,
        ctx: cvs.getContext("2d"),
        audioCtx: undefined,
        pop: undefined,
        mute: false,
        grid: undefined,
        recentClick: false,
        timeoutID: undefined,
    };
    cvs.oncontextmenu = () => { return false; };
    cvs.addEventListener("pointerdown", (e) => { if (e.button == 2) { e.preventDefault(); return false; } });
    cvs.addEventListener("pointerup", (e) => {
        if (UI.recentClick) {
            onClick(e, cvs, UI);
            UI.recentClick = false;
            window.clearTimeout(UI.timeoutID);
        } else {
            onClick(e, cvs, UI);
            UI.recentClick = true;
            UI.timeoutID = window.setTimeout(() => { UI.recentClick = false; }, clickDelay);
        }
    });
    cvs.onpointermove = () => { UI.recentClick = false; };
    createUI(cvs, UI, main);
}

/**
 *  @param {HTMLCanvasElement} cvs 
 *  @param {UI} ui 
 *  @param {HTMLDivElement} main 
 * */
function createUI(cvs, ui, main) {
    ui.ctx.imageSmoothingEnabled = false;
    ui.ctx.translate(0.5, 0.5);

    ui.width.type = "text";
    ui.width.name = "Width";
    ui.width.value = 40;
    let labelWidth = document.createElement("p");
    labelWidth.textContent = ui.width.name;
    main.appendChild(labelWidth);
    main.appendChild(ui.width);

    ui.height.type = "text";
    ui.height.name = "Height";
    ui.height.value = 20;
    let labelHeight = document.createElement("p");
    labelHeight.textContent = ui.height.name;
    main.appendChild(labelHeight);
    main.appendChild(ui.height);

    ui.probability.type = "text";
    ui.probability.name = "Probability";
    ui.probability.value = 0.2;
    let labelProb = document.createElement("p");
    labelProb.textContent = ui.probability.name;
    main.appendChild(labelProb);
    main.appendChild(ui.probability);

    ui.size.type = "text";
    ui.size.name = "UI size";
    ui.size.value = 25;
    let labelSize = document.createElement("p");
    labelSize.textContent = ui.size.name;
    main.appendChild(labelSize);
    main.appendChild(ui.size);

    ui.start.type = "button";
    ui.start.value = "Start";
    ui.start.onclick = () => {
        if (!ui.audioCtx) {
            ui.audioCtx = new AudioContext();
            let temp = getAudioFile(ui.audioCtx, "pop.flac");
            temp.then(r => {
                ui.pop = r;
                for (let channel = 0; channel < ui.pop.numberOfChannels; channel += 1) {
                    const channelData = ui.pop.getChannelData(channel);

                    for (let sample = 0; sample < channelData.length; sample += 1) {
                        channelData[sample] *= 0.3;
                    }
                }
            });
        }
        ui.grid = makeGrid(+ui.width.value, +ui.height.value, +ui.size.value, 1, 3, 1, ui.probability.value);
        let size = calcSize(ui.grid);
        cvs.width = size.width;
        cvs.height = size.height;
        if (!debug) {
            ui.open = Array.from({ length: +ui.height.value }, () => Array.from({ length: +ui.width.value }, () => false));
        } else {
            ui.open = Array.from({ length: +ui.height.value }, () => Array.from({ length: +ui.width.value }, () => true));
            makeSolvableField(ui.grid.field, 0.2, 10, 10);
            ui.grid.field.empty = false;
        }
        drawGrid(ui.ctx, ui.grid);
        drawField(ui)
    };
    main.appendChild(ui.start);
}

/** @typedef Grid
 *  @property {number} width 
 *  @property {number} height 
 *  @property {number} size 
 *  @property {number} thickness 
 *  @property {number} outerPadding 
 *  @property {number} innerPadding 
 *  @property {Field} field
 *  @property {number} part
 * */

/** @returns {Grid}
 *  @param {number} width 
 *  @param {number} height 
 *  @param {number} size 
 *  @param {number} thickness 
 *  @param {number} outerPadding 
 *  @param {number} innerPadding 
 *  @param {number} prob 
 * */
function makeGrid(width, height, size, thickness, outerPadding, innerPadding, prob) {
    let result = {
        width: width,
        height: height,
        size: size,
        thickness: thickness,
        outerPadding: outerPadding,
        innerPadding: innerPadding,
        field: makeEmptyField(width, height, prob),
        part: Math.floor((size -
            thickness -
            2 * outerPadding -
            2 * innerPadding) / 3)
    }
    return result;
}

/** @returns {{width: number, height: number}}
 *  @param {Grid} grid 
 * */
function calcSize(grid) {
    return {
        width: grid.width * grid.size + grid.thickness,
        height: grid.height * grid.size + grid.thickness
    }
}

/** @returns {{x: number, y: number}}
 *  @param {Grid} grid 
 *  @param {number} col 
 *  @param {number} row 
 *  @param {number} partX 
 *  @param {number} partY 
 * */
function calcPixelPos(grid, col, row, partX, partY) {
    let colX = grid.size * col + grid.thickness + grid.outerPadding;
    let colY = grid.size * row + grid.thickness + grid.outerPadding;

    return {
        x: colX + partX * (grid.part + grid.innerPadding),
        y: colY + partY * (grid.part + grid.innerPadding)
    }
}

/**
 *  @param {CanvasRenderingContext2D} ctx
 *  @param {Grid} grid 
 * */
function drawGrid(ctx, grid) {
    let dim = calcSize(grid);
    ctx.fillStyle = "#000";
    for (let i = 0; i <= grid.width; i++) {
        ctx.fillRect(i * grid.size, 0, grid.thickness, dim.height);
    }
    for (let i = 0; i <= grid.height; i++) {
        ctx.fillRect(0, i * grid.size, dim.width, grid.thickness);
    }
}

let colors = ["#00f", "#900", "#e22", "#a09", "#0ac", "#0c0", "#e8c", "#333"];

/**
 *  @param {CanvasRenderingContext2D} ctx 
 *  @param {Grid} grid 
 *  @param {number} col 
 *  @param {number} row 
 *  @param {number} n 
 * */
function drawNumber(ctx, grid, col, row, n) {
    let templates = ["    x    ", "x       x", "x   x   x", "x x   x x", "x x x x x", "x xx xx x", "x xxxxx x", "xxxx xxxx"]
    let parts = templates[n - 1];
    ctx.fillStyle = colors[n - 1];
    for (let i = 0; i < 9; i++) {
        if (parts[i] != " ") {
            let pos = calcPixelPos(grid, col, row, i % 3, Math.floor(i / 3));
            ctx.fillRect(pos.x, pos.y, grid.part, grid.part);
        }
    }
}

/** @typedef {"open"|"hidden"|"flagged"} State
 * */

/** @typedef Spot 
 *  @property {boolean} mine
 *  @property {State} state
 * */

/** @returns {Spot}
 *  @param {boolean} mine
 *  @param {State} state
 * */
function makeSpot(mine, state) {
    return { mine: mine, state: state };
}

/** @typedef Field
 *  @property {number} width
 *  @property {number} height
 *  @property {number} probability
 *  @property {Spot[][]} spots
 *  @property {Point[]} border
 *  @property {boolean} empty
 * */

/** @returns {Field}
 *  @param {number} width
 *  @param {number} height
 *  @param {number} prob
 * */
function makeEmptyField(width, height, prob) {
    let spots = Array.from({ length: height }, () => Array.from({ length: width }, () => makeSpot(false, "hidden")));
    return { width: width, height: height, spots: spots, border: [], empty: true, probability: prob };
}

/** @returns {number}
 *  @param {Field} field 
 *  @param {number} col
 *  @param {number} row
 *  @param {(f: Field, c: number, r: number) => number} f 
 * */
function around(field, col, row, f) {
    let result = 0;
    for (let i of [-1, 0, 1]) {
        for (let j of [-1, 0, 1]) {
            if (i == 0 && j == 0) continue;
            if (col + j < 0 || col + j > field.width - 1) continue;
            if (row + i < 0 || row + i > field.height - 1) continue;
            result += f(field, col + j, row + i);
        }
    }
    return result;
}

/**
 *  @param {CanvasRenderingContext2D} ctx 
 *  @param {Grid} grid 
 *  @param {number} col 
 *  @param {number} row 
 *  @param {string} color 
 * */
function drawSquare(ctx, grid, col, row, color) {
    ctx.fillStyle = color;
    let pos = calcPixelPos(grid, col, row, 0, 0);
    let size = grid.size - 2 * grid.innerPadding - 2 * grid.outerPadding;
    ctx.fillRect(pos.x, pos.y, size, size);
}

/**
 *  @param {UI} ui 
 * */
function drawField(ui) {
    let grid = ui.grid;
    for (let col = 0; col < grid.width; col++) {
        for (let row = 0; row < grid.height; row++) {
            let s = grid.field.spots[row][col];
            let open = ui.open[row][col];
            if (s.state == "hidden") {
                drawSquare(ui.ctx, grid, col, row, "#aaa");
            } else if (s.state == "flagged") {
                drawSquare(ui.ctx, grid, col, row, "#a00");
            } else if (s.state == "open" && open) {
                if (s.mine) {
                    drawSquare(ui.ctx, grid, col, row, "#000");
                } else {
                    drawSquare(ui.ctx, grid, col, row, "#ddd");
                    let c = around(grid.field, col, row, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0 });
                    if (c == 0) {
                    } else {
                        drawNumber(ui.ctx, grid, col, row, c);
                    }
                }
            }
        }
    }
    if (!debug) return;
    for (let p of grid.field.border) {
        if (p == null) continue;
        drawSquare(UI.ctx, UI.grid, p.x, p.y, "rgba(0,255,0,0.5)");
    }
}

/** @typedef {"expand"|"none"} Action
 * */

/** @typedef {{prev: State, next: State, action: Action}} Logic
 * */

/** @type {Logic}
 * */
let rLogic = [
    { prev: "hidden", next: "open", action: "expand" },
    { prev: "flagged", next: "open", action: "expand" },
    { prev: "open", next: "open", action: "flagAll" }];
/** @type {Logic}
 * */
let lLogic = [
    { prev: "hidden", next: "flagged", action: "none" },
    { prev: "flagged", next: "hidden", action: "none" },
    { prev: "open", next: "open", action: "expand" }];

/**
 *  @param {Logic} logic 
 *  @param {Spot} spot 
 * */
function applyLogic(logic, spot) {
    let action = "none";
    for (let i = 0; i < logic.length; i++) {
        let rule = logic[i];
        if (spot.state == rule.prev) {
            spot.state = rule.next;
            action = rule.action;
            break;
        }
    }
    return action;
}

/**
 * @param {Field} field 
 * @param {number} col 
 * @param {number} row 
 * */
function expand(field, col, row) {
    let s = field.spots[row][col];
    let n = 0;
    if (s.state == "hidden") {
        s.state = "open";
        n = 1;
    }

    if (s.state == "open") {
        let mines = around(field, col, row, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0 });
        let flags = around(field, col, row, (f, c, r) => { return f.spots[r][c].state == "flagged" ? 1 : 0 });
        if (mines == flags) {
            n += around(field, col, row, (f, c, r) => {
                let sp = f.spots[r][c];
                if (sp.state == "hidden") {
                    sp.state = "open";
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    }

    if (n > 0) {
        around(field, col, row, (f, c, r) => {
            expand(f, c, r);
        });
    }
}

/**
 * @param {Field} field 
 * @param {number} col 
 * @param {number} row 
 * */
function flagAll(field, col, row) {
    let mines = around(field, col, row, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0 });
    let hidds = around(field, col, row, (f, c, r) => { return f.spots[r][c].state == "hidden" ? 1 : 0 });
    let flags = around(field, col, row, (f, c, r) => { return f.spots[r][c].state == "flagged" ? 1 : 0 });
    if (mines == (flags + hidds)) {
        around(field, col, row, (f, c, r) => {
            let sp = f.spots[r][c];
            if (sp.state == "hidden") {
                sp.state = "flagged";
                return 1;
            } else {
                return 0;
            }
        });
    }
}

/**
 *  @param {MouseEvent} e 
 *  @param {HTMLCanvasElement} cvs 
 *  @param {boolean} dblClick 
 *  @param {UI} ui 
 * */
function onClick(e, cvs, ui) {
    let grid = ui.grid;
    let r = cvs.getBoundingClientRect();
    let x = e.clientX - r.x;
    let y = e.clientY - r.y;
    let col = Math.floor(x / grid.size);
    let row = Math.floor(y / grid.size);
    let spot = grid.field.spots[row][col]
    if (
        x % grid.size < calcPixelPos(grid, col, row, 0, 0) ||
        x % grid.size > calcPixelPos(grid, col, row, 3, 3) + grid.part) {
        return;
    }
    let logic = lLogic;
    if (e.button == 2 || (e.button == 0 && ui.recentClick)) {
        if (grid.field.empty) {
            grid.field = randomiseField(grid.field, ui.grid.field.probability, col, row);
        }
        logic = rLogic;
        e.preventDefault();
    }
    let action = applyLogic(logic, spot);
    if (action == "expand") {
        if (!ui.open[row][col]) {
            ui.open[row][col] = true;
            pop(ui, 0.0);
        }
        expand(grid.field, col, row);
    } else if (action == "flagAll") {
        flagAll(grid.field, col, row);
    }
    drawField(ui)
    cascade(ui, 0.0);
}

/**
 *  @param {UI} ui 
 *  @param {CanvasRenderingContext2D} ctx 
 *  @param {number} pitch 
 * */
function cascade(ui, pitch) {
    let toOpen = [];
    for (let col = 0; col < ui.grid.field.width; col++) {
        for (let row = 0; row < ui.grid.field.height; row++) {
            if (!ui.open[row][col]) continue;
            around(ui.grid.field, col, row, (f, c, r) => {
                if (f.spots[r][c].state == "open" && !ui.open[r][c]) {
                    toOpen.push({ x: c, y: r })
                }
            })
        }
    }
    toOpen.forEach(e => ui.open[e.y][e.x] = true);
    if (toOpen.length > 0) pop(ui, 100 * Math.pow(1.5, pitch));

    let dontMatch = false;
    for (let c = 0; c < ui.grid.field.width; c++) {
        if (dontMatch) break;
        for (let r = 0; r < ui.grid.field.height; r++) {
            if ((ui.grid.field.spots[r][c].state == "open") && !ui.open[r][c]) {
                dontMatch = true;
                break;
            }
        }
    }

    drawField(ui);
    if (dontMatch) {
        setTimeout(() => cascade(ui, Math.min(pitch + 1, 7)), 50);
    }
}

/**
 *  @param {Field} field
 *  @param {number} col 
 *  @param {number} row 
 *  @param {number} density 
 * */
function randomiseField(field, density, col, row) {
    field.empty = false;
    for (let c = 0; c < field.width; c++) {
        for (let r = 0; r < field.height; r++) {
            if (c <= col + 1 && c >= col - 1 && r <= row + 1 && r >= row - 1) {
                continue;
            }
            field.spots[r][c].mine = rand() < density;
        }
    }
    return field;
}

/** @typedef {{x: number, y: number, value: number, generated: boolean}} Point
 * */

/** @typedef {Point[]} Border
 * */

/** @returns {number}
 *  @param {Border} border 
 * */
function addToBorder(border, x, y) {
    if (border.findIndex((v) => { if (v == null) return false; return v.x == x && v.y == y; }) != -1) return 0;
    let i = border.findIndex((v) => { return v == null });
    if (i == -1) border.push({ x: x, y: y, value: -1, generated: false });
    else border[i] = { x: x, y: y, value: -1, generated: false };
    return 1;
}

/**
 *  @param {Field} field 
 * */
function getInitialBorder(field) {
    /** @type {Point[]} */
    let border = [];
    function findSmallest(field) {
        let x = 0;
        let y = 0;
        while (!(around(field, x, y, (f, c, r) => { return f.spots[r][c].state == "hidden" ? 1 : 0; }) > 0
            && around(field, x, y, (f, c, r) => { return f.spots[r][c].state == "open" ? 1 : 0; }) > 0)) {
            y--;
            x++;
            if (y < 0) {
                y = x + 1;
                x = 0;
            }
        }
        return { x: x, y: y };
    }
    let smallest = findSmallest(field);
    let x = smallest.x;
    let y = smallest.y;
    border.push({ x: x, y: y, value: -1, generated: false });
    let dir = { x: 1, y: 0 };
    function nextDir(dir) {
        let nextDir;
        if (dir.x != 0) nextDir = { x: 0, y: dir.x };
        else if (dir.y != 0) nextDir = { x: -dir.y, y: 0 };
        return nextDir;
    }
    while (true) {
        let next = nextDir(dir);
        if (field.spots[y + next.y][x + next.x].state == "hidden" && border.length > 1) {
            dir = next;
        }
        x += dir.x;
        y += dir.y;
        if (border.find((p) => { return p.x == x && p.y == y }) != undefined) break;
        border.push({ x: x, y: y, value: -1, generated: false });
    }
    field.border = border;
}

/**
 *  @param {Field} field 
 * */
function updateBorder(field) {
    let changes = 0;
    for (let i = 0; i < field.border.length; i++) {
        let p = field.border[i];
        if (p == null) continue;
        if (field.spots[p.y][p.x].state != "hidden") {
            field.border[i] = null;
            changes++;
        }
        if (field.spots[p.y][p.x].state == "open") {
            changes += around(field, p.x, p.y, (f, c, r) => {
                if (f.spots[r][c].state == "hidden") return addToBorder(f.border, c, r);
                else return 0;
            });
        }
    }
    //sortBorder(field);
    return changes;
}

/**
 *  @param {Field} field 
 * */
function sortBorder(field) {

}

/** @returns {number}
 *  @param {Border} border 
 * */
function getBorderLength(border) {
    return border.filter((e) => { return e != null }).length;
}

/** @returns {Border}
 *  @param {Field} field 
 *  @param {Border} border 
 * */
function innerBorder(field) {
    let inner = [];
    for (let p of field.border) {
        if (p == null) continue;
        around(field, p.x, p.y, (f, c, r) => {
            if (f.spots[r][c].state == "open")
                addToBorder(inner, c, r);
        });
    }
    return inner;
}

/** @typedef {{points: Point[], matrix: number[][]}} Matrix
 * */

/**
 *  @param {Matrix} matrix 
 *  @param {Number} x 
 *  @param {Number} y 
 * */
function printPoint(matrix, x, y) {
    let i = matrix.points.findIndex((e) => { return e.x == x && e.y == y; });
    console.log(`index: ${i}`);
    for (let l of matrix.matrix) {
        if (l[i] != 0) {
            let result = "";
            for (let p of l) {
                let s = p.toString()
                if (s.length == 1) result += " ";
                result += s;
                result += ",";
            }
            console.log(result);
        }
    }
}

/**
 *  @param {Matrix} matrix 
 * */
function printMatrix(matrix) {
    for (let l of matrix.matrix) {
        let result = "";
        for (let p of l) {
            let s = p.toString()
            if (s.length == 1) result += " ";
            result += s;
            result += ",";
        }
        console.log(result.slice(0, result.length - 1));
    }
}

/** @returns {Matrix}
 *  @param {Field} field 
 * */
function getMatrix(field) {
    /** @type {{points: Point[], matrix: number[]}} */
    let result = { points: [], matrix: [] };
    let inner = innerBorder(field);
    for (let point of inner) {
        if (point == null) continue;
        if (field.spots[point.y][point.x].state != "open") console.log("inner border failed");
        let length = getBorderLength(field.border);
        let line = Array.from({ length: length + 1 }, () => 0);
        let mines = around(field, point.x, point.y, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0; });
        let flags = around(field, point.x, point.y, (f, c, r) => { return f.spots[r][c].state == "flagged" ? 1 : 0; });
        if (mines - flags == 0) { console.log("mines equals flags in matrixSolve"); } // shouldn't happen
        around(field, point.x, point.y, (f, c, r) => {
            if (f.spots[r][c].state != "hidden") return; //This assumes that all hidden spots have at least a 1 around them
            let i = result.points.findIndex((s) => { return s.x == c && s.y == r; });
            if (i == -1) {
                i = result.points.length;
                result.points.push({ x: c, y: r, value: -1 });
            }
            line[i] = 1;
        });
        line[length] = mines - flags;
        result.matrix.push(line);
    }
    return result;
}

/** @returns {number}
 *  @param {Field} field 
 * */
function matrixSolve(field) {
    matrix = getMatrix(field);
    rowReduce(matrix.matrix);
    getPointValues(matrix);
    let changes = 0;
    for (let p of matrix.points) {
        if (p.value == 0) {
            field.spots[p.y][p.x].state = "open";
            if (field.spots[p.y][p.x].mine) {
                console.log("Opened mine");
                printPoint(matrix, p.x, p.y);
            }
            changes++;
        }
        else if (p.value == 1) {
            field.spots[p.y][p.x].state = "flagged";
            if (!field.spots[p.y][p.x].mine) {
                console.log("Flagged empty");
                printPoint(matrix, p.x, p.y);
            }
            changes++;
        }
    }
    return changes;
}

/** @returns {number}
 *  @param {Field} field 
 * */
function simpleSolve(field) {
    function clearSpots(fi, inn) {
        let opened = 0;
        for (let i of inn) {
            if (i == null) continue;
            let mines = around(fi, i.x, i.y, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0; });
            let flags = around(fi, i.x, i.y, (f, c, r) => { return f.spots[r][c].state == "flagged" ? 1 : 0; });

            if (mines == flags) {
                opened += around(fi, i.x, i.y, (f, c, r) => {
                    if (f.spots[r][c].state == "hidden") {
                        f.spots[r][c].state = "open";
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        }
        return opened;
    }
    function flagSpots(fi, inn) {
        for (let i of inn) {
            if (i == null) continue;
            let mines = around(fi, i.x, i.y, (f, c, r) => { return f.spots[r][c].mine ? 1 : 0; });
            let flags = around(fi, i.x, i.y, (f, c, r) => { return f.spots[r][c].state == "flagged" ? 1 : 0; });
            let hidden = around(fi, i.x, i.y, (f, c, r) => { return f.spots[r][c].state == "hidden" ? 1 : 0; });

            if (mines - flags == hidden) {
                around(fi, i.x, i.y, (f, c, r) => {
                    if (f.spots[r][c].state == "hidden") {
                        f.spots[r][c].state = "flagged";
                    }
                });
            }
        }
    }
    let inner = innerBorder(field);
    let opened = 1;
    while (opened > 0) {
        opened = clearSpots(field, inner);
        flagSpots(field, inner);
    }
    let changes = updateBorder(field);

    return changes;
}

let matrix = undefined;

/**
 *  @param {Field} field 
 *  @param {number} col 
 *  @param {number} row 
 *  @param {number} p 
 * */
function makeSolvableField(field, p, col, row) {
    function generate(field, prob) {
        for (let p of field.border) {
            if (p == null) continue;
            if (!p.generated) {
                field.spots[p.y][p.x].mine = rand() < prob;
                p.generated = true;
            }
        }
    }
    field.spots[row][col].state = "open";
    around(field, col, row, (f, c, r) => {
        f.spots[r][c].state = "open";
    });
    getInitialBorder(field);
    let n = 1;
    while (n > 0) {
        let changes = 1;
        while (changes > 0) {
            generate(field, p);
            changes = simpleSolve(field);
        }
        if (debug) {
            drawGrid(UI.ctx, UI.grid);
            drawField(UI);
        }
        n = matrixSolve(field);
        updateBorder(field);
    }
}

/** @returns {Promise<AudioBuffer>}
 *  @param {string} filepath 
 *  @param {AudioContext} audioContext 
 * */
async function getAudioFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

/**
 *  @param {UI} ui 
 *  @param {number} pitch 
 * */
function pop(ui, pitch) {
    if (ui.mute) return;

    const pop = new AudioBufferSourceNode(ui.audioCtx, {
        buffer: ui.pop,
    });
    pop.connect(ui.audioCtx.destination);
    pop.detune.value = pitch;
    pop.start();
    return pop;
}
